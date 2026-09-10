import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

const logStep = (step: string, details?: unknown) => {
  console.log(`[VERIFY-CRYPTO-PAYMENT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

const REQUIRED_CONFIRMATIONS = 6;

// EVM-compatible chains we can verify against a public/configured RPC endpoint.
const EVM_RPC: Record<string, string | undefined> = {
  ethereum: Deno.env.get("ETHEREUM_RPC_URL"),
  polygon: Deno.env.get("POLYGON_RPC_URL"),
  bsc: Deno.env.get("BSC_RPC_URL"),
  base: Deno.env.get("BASE_RPC_URL"),
  arbitrum: Deno.env.get("ARBITRUM_RPC_URL"),
};

const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

async function rpc(url: string, method: string, params: unknown[]) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`RPC request failed: ${res.status}`);
  const body = await res.json();
  if (body.error) throw new Error(`RPC error: ${body.error.message}`);
  return body.result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);

    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    const user = userData?.user;
    if (userError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const transactionHash = typeof body.transactionHash === "string" ? body.transactionHash.trim() : "";
    const chain = typeof body.chain === "string" ? body.chain.trim().toLowerCase() : "";
    const currency = typeof body.currency === "string" ? body.currency.trim().toUpperCase() : "";

    if (!transactionHash || !chain || !currency) {
      return json({ error: "Missing required parameters" }, 400);
    }
    if (!TX_HASH_RE.test(transactionHash)) {
      return json({ error: "Invalid transaction hash" }, 400);
    }

    // A transaction hash may only ever be claimed once, by anyone.
    const { data: existing } = await supabaseClient
      .from("crypto_transactions")
      .select("id")
      .eq("transaction_hash", transactionHash)
      .maybeSingle();

    if (existing) return json({ error: "This transaction has already been submitted" }, 409);

    const depositAddress = (Deno.env.get("PLATFORM_DEPOSIT_ADDRESS") ?? "").toLowerCase();
    const rpcUrl = EVM_RPC[chain];

    // --- Nothing is credited unless the transfer is confirmed on-chain ---
    if (!rpcUrl || !depositAddress) {
      logStep("Verification unavailable, recording as pending", { chain });
      await supabaseClient.from("crypto_transactions").insert({
        user_id: user.id,
        transaction_hash: transactionHash,
        chain,
        crypto_currency: currency,
        crypto_amount: 0,
        usd_value: 0,
        transaction_type: "deposit",
        wallet_address: "",
        status: "pending_verification",
        confirmations: 0,
        metadata: { reason: "chain_verification_unavailable" },
      });

      return json({
        success: false,
        status: "pending_verification",
        message:
          "Your deposit was recorded and is awaiting on-chain verification. Your balance updates once the transfer is confirmed.",
      }, 202);
    }

    const tx = await rpc(rpcUrl, "eth_getTransactionByHash", [transactionHash]);
    if (!tx) return json({ error: "Transaction not found on chain" }, 404);

    const receipt = await rpc(rpcUrl, "eth_getTransactionReceipt", [transactionHash]);
    if (!receipt || receipt.status !== "0x1") {
      return json({ error: "Transaction is not confirmed or has failed" }, 400);
    }

    const latestBlock = BigInt(await rpc(rpcUrl, "eth_blockNumber", []));
    const txBlock = BigInt(receipt.blockNumber);
    const confirmations = Number(latestBlock - txBlock) + 1;

    if (confirmations < REQUIRED_CONFIRMATIONS) {
      return json({
        success: false,
        status: "pending_confirmations",
        confirmations,
        message: `Waiting for ${REQUIRED_CONFIRMATIONS} confirmations (currently ${confirmations}).`,
      }, 202);
    }

    // The funds must actually have been sent to the platform deposit address
    if (String(tx.to ?? "").toLowerCase() !== depositAddress) {
      return json({ error: "Transaction was not sent to the platform deposit address" }, 400);
    }

    // Amount is read from the chain, never from the client
    const onChainAmount = Number(BigInt(tx.value)) / 1e18;
    if (!(onChainAmount > 0)) return json({ error: "Transaction transferred no value" }, 400);

    const priceResponse = await fetch(
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/get-crypto-prices`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currencies: [currency] }),
      }
    );
    const priceData = await priceResponse.json().catch(() => ({}));
    const unitPrice = priceData?.prices?.[currency]?.usd || 0;
    const usdValue = unitPrice * onChainAmount;

    const { data: transaction, error: txError } = await supabaseClient
      .from("crypto_transactions")
      .insert({
        user_id: user.id,
        transaction_hash: transactionHash,
        chain,
        crypto_currency: currency,
        crypto_amount: onChainAmount,
        usd_value: usdValue,
        transaction_type: "deposit",
        wallet_address: String(tx.from ?? ""),
        status: "confirmed",
        confirmations,
      })
      .select()
      .single();

    if (txError) throw txError;

    const { data: wallet } = await supabaseClient
      .from("user_wallets")
      .select("crypto_balance")
      .eq("user_id", user.id)
      .maybeSingle();

    const currentBalance = (wallet?.crypto_balance as Record<string, any>) || {};
    const previousAmount = currentBalance[currency]?.amount || 0;
    const newAmount = previousAmount + onChainAmount;

    const { error: updateError } = await supabaseClient
      .from("user_wallets")
      .upsert(
        {
          user_id: user.id,
          crypto_balance: {
            ...currentBalance,
            [currency]: { amount: newAmount, usdValue: newAmount * unitPrice },
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

    if (updateError) throw updateError;

    logStep("Deposit verified and credited", { transactionId: transaction.id });

    return json({
      success: true,
      transaction_id: transaction.id,
      crypto_amount: onChainAmount,
      usd_value: usdValue,
      confirmations,
      message: "Crypto deposit verified on-chain and credited.",
    });
  } catch (error) {
    logStep("ERROR", { message: error instanceof Error ? error.message : String(error) });
    return json({ error: "Unable to verify this crypto payment" }, 400);
  }
});
