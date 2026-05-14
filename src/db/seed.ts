import { db } from "./client";
import { users, transcripts, media, transcriptSegments } from "./schema";
import { eq } from "drizzle-orm";
import bcryptjs from "bcryptjs";
import type { UserRole } from "@/lib/auth";

interface SeedUser {
  email: string;
  name: string;
  password: string;
  role: UserRole;
}

const SEED_USERS: SeedUser[] = [
  { email: "superadmin@transcripts.dev", name: "Super Admin", password: "super123", role: "super_admin" },
  { email: "admin@transcripts.dev", name: "Admin", password: "admin123", role: "admin" },
  { email: "pro@transcripts.dev", name: "Pro", password: "pro123", role: "pro" },
  { email: "viewer@transcripts.dev", name: "Viewer", password: "viewer123", role: "viewer" },
];

const upsertUser = async (input: SeedUser): Promise<{ id: string; created: boolean }> => {
  const existing = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (existing) return { id: existing.id, created: false };
  const passwordHash = await bcryptjs.hash(input.password, 12);
  const [row] = await db
    .insert(users)
    .values({ email: input.email, name: input.name, passwordHash, role: input.role })
    .returning();
  return { id: row.id, created: true };
};

async function seed() {
  try {
    const results = [];
    for (const u of SEED_USERS) {
      const r = await upsertUser(u);
      results.push({ email: u.email, role: u.role, ...r });
      console.log(`${r.created ? "✓ Criado" : "↻ Já existe"}: ${u.email} (${u.role})`);
    }

    const superAdmin = results.find((r) => r.role === "super_admin");
    if (!superAdmin) {
      console.log("✗ super_admin ausente — abortando seed de transcripts");
      process.exit(0);
    }

    const existingTranscripts = await db
      .select({ id: transcripts.id })
      .from(transcripts)
      .where(eq(transcripts.ownerId, superAdmin.id))
      .limit(1);

    if (existingTranscripts.length > 0) {
      console.log("↻ Transcripts já existem para super_admin — pulando demo data");
      process.exit(0);
    }

    const transcriptTitles = [
      "Interceptação telemática — alvo TX-001 — sessão 03",
      "Comunicação monitorada — ID 2026-AB-417",
      "Sessão de monitoramento — protocolo 0421",
      "Captação ambiental — ponto focal Norte",
      "Ligação intercedida — alvo secundário TX-014",
    ];

    const operationNames = [
      "Operação Sentinela — Protocolo CX-2026/04",
      "Operação Águia Branca — Fase 2",
      "Protocolo Vigilância Contínua — CX-2026",
      "Operação Guarda-Chuva — Bloco 4",
      "Operação Linha Dura — Etapa Alfa",
    ];

    const analyses = [
      "Diálogo entre alvo principal e contato não identificado. Mencionados encontro em local público e troca de pacote. Encaminhado para análise de equipe técnica.",
      "Comunicação telefônica curta. Alvo confirma recebimento de valores e cita codinomes recorrentes (\"o velho\", \"a casa\"). Indícios de articulação logística.",
      "Sessão prolongada com discussão sobre rotas de deslocamento e horários de movimentação. Trechos relevantes marcados para correlação com vigilância física.",
      "Captação ambiental em ponto focal. Conversa entre dois indivíduos sobre transferência financeira. Vocabulário codificado identificado para futura cross-reference.",
      "Ligação interceptada de alvo secundário. Mencionados nomes presentes em outras sessões. Recomenda-se elevar prioridade do alvo no plano operacional.",
    ];

    const insertedTranscripts = await db
      .insert(transcripts)
      .values(
        transcriptTitles.map((title, i) => ({
          ownerId: superAdmin.id,
          title,
          operationName: operationNames[i],
          analysis: analyses[i],
          status: "done" as const,
          position: i,
        }))
      )
      .returning();

    for (let i = 0; i < insertedTranscripts.length; i++) {
      const transcript = insertedTranscripts[i];
      const [mediaRecord] = await db
        .insert(media)
        .values({
          transcriptId: transcript.id,
          filename: `audio-${i}.mp3`,
          mime: "audio/mpeg",
          sizeBytes: Math.floor(Math.random() * 50000000) + 1000000,
          storagePath: `seed/audio-${i}.mp3`,
          durationSeconds: Math.floor(Math.random() * 240) + 60,
        })
        .returning();

      const segmentTexts = [
        "Primeira parte da transcrição com conteúdo relevante sobre o tema discutido.",
        "Segunda parte continuando a discussão com mais detalhes e conclusões.",
        "Terceira parte finalizando o tópico com ações e próximos passos.",
      ];

      await db.insert(transcriptSegments).values(
        segmentTexts.map((text, j) => ({
          mediaId: mediaRecord.id,
          startMs: j * 30000,
          endMs: (j + 1) * 30000,
          text,
        }))
      );
    }

    console.log("✓ Seed aplicado com sucesso");
    console.log(`✓ ${insertedTranscripts.length} transcrições + mídias + segmentos`);
    process.exit(0);
  } catch (error) {
    console.error("✗ Erro ao executar seed:", error);
    process.exit(1);
  }
}

seed();
