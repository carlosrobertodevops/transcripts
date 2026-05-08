export {};

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const KEY = process.env.INTERNAL_API_KEY!;

async function tick() {
  try {
    const r = await fetch(`${APP_URL}/api/jobs/run`, {
      method: "POST",
      headers: { "x-internal-key": KEY },
    });
    console.log(`[worker] tick ${r.status}`);
  } catch (e) {
    console.error("[worker] err", e);
  }
}

console.log("[worker] starting loop");
await tick();
setInterval(tick, 15000);
