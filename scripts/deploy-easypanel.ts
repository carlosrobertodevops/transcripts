#!/usr/bin/env bun
/**
 * Trigger Easypanel deploy via webhook.
 * Reads EASYPANEL_DEPLOY_URL from .env.deploy.local (gitignored) or process.env.
 */

export {};

const url = process.env.EASYPANEL_DEPLOY_URL;

if (!url) {
  console.error("✗ EASYPANEL_DEPLOY_URL not set");
  console.error("  Adicionar em .env.deploy.local (gitignored):");
  console.error(
    "  EASYPANEL_DEPLOY_URL=http://http://65.109.164.19:3000/api/compose/deploy/{token}",
  );
  process.exit(1);
}

console.log("→ Triggering Easypanel deploy...");
const start = Date.now();

try {
  const res = await fetch(url, { method: "GET" });
  const body = await res.text();
  const ms = Date.now() - start;

  if (!res.ok) {
    console.error(`✗ Deploy trigger failed: HTTP ${res.status} (${ms}ms)`);
    console.error(body);
    process.exit(1);
  }

  console.log(`✓ Deploy triggered: HTTP ${res.status} (${ms}ms)`);
  if (body.trim()) console.log(body);
} catch (err) {
  console.error("✗ Network error:", err instanceof Error ? err.message : err);
  process.exit(1);
}
