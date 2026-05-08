export {};

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const KEY = process.env.INTERNAL_API_KEY!;

const r = await fetch(`${APP_URL}/api/jobs/run`, {
  method: "POST",
  headers: { "x-internal-key": KEY },
});

const j = await r.json().catch(() => ({}));
console.log(r.status, j);

process.exit(r.ok ? 0 : 1);
