export {};

const APP_URL = process.env.APP_URL ?? "http://localhost:3000";
const KEY = process.env.INTERNAL_API_KEY!;
const WORKER_INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS ?? 3000);

let shuttingDown = false;
let inFlight: Promise<void> | null = null;

const tick = async (): Promise<void> => {
  if (shuttingDown) return;
  try {
    const r = await fetch(`${APP_URL}/api/jobs/run`, {
      method: "POST",
      headers: { "x-internal-key": KEY },
    });
    console.log(`[worker] tick ${r.status}`);
  } catch (e) {
    console.error("[worker] err", e);
  }
};

const runTick = (): void => {
  if (shuttingDown) return;
  inFlight = tick().finally(() => {
    inFlight = null;
  });
};

console.log(`[worker] starting loop interval=${WORKER_INTERVAL_MS}ms`);
await tick();
const handle = setInterval(runTick, WORKER_INTERVAL_MS);

const shutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[worker] ${signal} received, draining`);
  clearInterval(handle);
  if (inFlight) {
    await Promise.race([
      inFlight,
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
  }
  console.log("[worker] shutdown complete");
  process.exit(0);
};

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
