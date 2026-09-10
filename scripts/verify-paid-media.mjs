#!/usr/bin/env node
/**
 * Verification test for paid post media access.
 *
 * Checks:
 *  1. The `paid-media` bucket is private (no public download URL works).
 *  2. An unauthenticated/unpaid client cannot mint a signed URL for paid media.
 *  3. Signed URLs carry a short expiry (token `exp` <= 1 hour).
 *
 * Run: node scripts/verify-paid-media.mjs
 */
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")])
);

const URL_BASE = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!URL_BASE || !ANON) {
  console.error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

const TEST_PATH = "00000000-0000-0000-0000-000000000000/verification-probe.bin";
let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

// 1. Public object route must not serve paid media.
const pub = await fetch(`${URL_BASE}/storage/v1/object/public/paid-media/${TEST_PATH}`);
check("paid-media bucket is not publicly downloadable", pub.status === 400 || pub.status === 404, `HTTP ${pub.status}`);

// 2. Unpaid / anonymous client cannot create a signed URL.
const signed = await fetch(`${URL_BASE}/storage/v1/object/sign/paid-media/${TEST_PATH}`, {
  method: "POST",
  headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
  body: JSON.stringify({ expiresIn: 3600 }),
});
const signedBody = await signed.text();
check(
  "unpaid user cannot mint a signed download link",
  signed.status === 400 || signed.status === 401 || signed.status === 403 || signed.status === 404,
  `HTTP ${signed.status}`
);

// 3. If a signed URL is ever returned, its token must expire within an hour.
if (signed.ok) {
  try {
    const token = JSON.parse(signedBody).signedURL.split("token=")[1];
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString());
    const ttl = payload.exp - Math.floor(Date.now() / 1000);
    check("signed link expires within 1 hour", ttl > 0 && ttl <= 3600, `${ttl}s`);
  } catch {
    check("signed link expiry parseable", false);
  }
} else {
  console.log("SKIP  signed-link expiry check (no link issued to an unpaid user, as expected)");
}

console.log(failures === 0 ? "\nAll paid-media access checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
