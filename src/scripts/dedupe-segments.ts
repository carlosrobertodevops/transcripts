/**
 * Dedupe transcript_segments: remove linhas com (mediaId, startMs, endMs, text) repetido,
 * mantendo o `id` mais antigo. Causa raiz: corridas/retries antes do fix em `runPendingJobs`.
 * Run: bun run src/scripts/dedupe-segments.ts
 */
import { db } from "@/db/client";
import { transcriptSegments } from "@/db/schema";
import { sql } from "drizzle-orm";

const dedupe = async (): Promise<void> => {
  const result = await db.execute(sql`
    WITH ranked AS (
      SELECT id,
             row_number() OVER (
               PARTITION BY "media_id", "start_ms", "end_ms", "text"
               ORDER BY id
             ) AS rn
      FROM ${transcriptSegments}
    )
    DELETE FROM ${transcriptSegments}
    WHERE id IN (SELECT id FROM ranked WHERE rn > 1)
    RETURNING id
  `);

  const removed = Array.isArray(result) ? result.length : (result as { rowCount?: number }).rowCount ?? 0;
  console.log(`Removidos ${removed} segmentos duplicados.`);
  process.exit(0);
};

dedupe().catch((err) => {
  console.error(err);
  process.exit(1);
});
