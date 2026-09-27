import { describe, expect, it } from "vitest";
import { FEE_SURFACES } from "./feeInventory";
import { PROVIDER_FEE_REGISTRY, providerFee, resolveProviderFee } from "./providerFees";

describe("provider fee registry", () => {
  it("records an official source and a check date for every entry", () => {
    for (const entry of PROVIDER_FEE_REGISTRY) {
      expect(entry.sourceUrl).toMatch(/^https:\/\//);
      expect(entry.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(entry.verification).toBe("official_docs");
    }
  });

  it("never resolves a dynamic cost to zero", () => {
    const result = resolveProviderFee("kraken.crypto_withdrawal");
    expect(result.resolved).toBe(false);
    const missing = "missing" in result ? result.missing : [];
    expect(missing.length).toBeGreaterThan(0);
    expect(missing.join(" ")).toMatch(/quote|asset|network/i);
  });

  it("stays unresolved for Stripe until the business country is known", () => {
    const result = resolveProviderFee("stripe.checkout.subscriptions", { currency: "USD" });
    expect(result.resolved).toBe(false);
    const missing = "missing" in result ? result.missing : [];
    expect(missing.join(" ")).toMatch(/country/i);
  });

  it("lets an authenticated quote override the published schedule", () => {
    const result = resolveProviderFee("kraken.crypto_withdrawal", {
      authenticatedQuote: {
        component: { percentBps: 0, fixedMinor: 150, minorUnitScale: 2, currency: "USD", payer: "sender" },
        asOf: "2026-09-14T10:00:00Z",
        reference: "kraken-quote-123",
      },
    });
    expect(result.resolved).toBe(true);
    if (result.resolved) {
      expect(result.source).toBe("authenticated_quote");
      expect(result.component.fixedMinor).toBe(150);
    }
  });

  it("reports an unknown reference rather than inventing one", () => {
    const result = resolveProviderFee("nope");
    expect(result.resolved).toBe(false);
    if (!result.resolved) expect(result.entry).toBeNull();
  });

  it("carries no CyberLink price: no entry fixes a percentage or fixed amount", () => {
    for (const entry of PROVIDER_FEE_REGISTRY) {
      expect(entry.component).toBeNull();
    }
  });
});

describe("fee surface inventory", () => {
  it("points every cited registry id at a real entry", () => {
    for (const surface of FEE_SURFACES) {
      for (const id of surface.registryIds) {
        expect(providerFee(id), `${surface.id} cites ${id}`).toBeDefined();
      }
    }
  });

  it("covers the wallet, exchange, subscription and marketplace surfaces", () => {
    const routes = new Set(FEE_SURFACES.map((s) => s.route));
    expect(routes.has("/wallet")).toBe(true);
    expect(routes.has("/exchange")).toBe(true);
    expect(routes.has("/subscription")).toBe(true);
    expect(routes.has("/shop")).toBe(true);
  });
});
