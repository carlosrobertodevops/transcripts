/**
 * Backfill SHA-256 hash for existing media rows (T5).
 * Run: bun run src/scripts/backfill-media-hash.ts
 */
import crypto from "crypto";
import { db } from "@/db/client";
import { media } from "@/db/schema";
import { storage } from "@/server/services/storage";
import { eq, isNull } from "drizzle-orm";

const backfill = async (): Promise<void> => {
  const rows = await db
    .select({ id: media.id, storagePath: media.storagePath, filename: media.filename })
    .from(media)
    .where(isNull(media.hash));

  if (rows.length === 0) {
    console.log("Nada a fazer — todas mídias já têm hash.");
    process.exit(0);
  }

  console.log(`Processando ${rows.length} mídias...`);

  let ok = 0;
  let fail = 0;

  for (const row of rows) {
    if (!row.storagePath) {
      console.warn(`↷ ${row.filename}: storagePath nulo, pulando.`);
      fail++;
      continue;
    }
    try {
      const buf = await storage.read(row.storagePath);
      const hash = crypto.createHash("sha256").update(buf).digest("hex");
      await db.update(media).set({ hash }).where(eq(media.id, row.id));
      console.log(`✓ ${row.filename} → ${hash.slice(0, 16)}…`);
      ok++;
    } catch (err) {
      console.error(`✗ ${row.filename}:`, (err as Error).message);
      fail++;
    }
  }

  console.log(`\nResumo: ${ok} ok, ${fail} falhas.`);
  process.exit(fail > 0 ? 1 : 0);
};

backfill().catch((err) => {
  console.error("backfill fatal:", err);
  process.exit(1);
});
