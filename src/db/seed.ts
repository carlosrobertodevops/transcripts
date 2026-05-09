import { db } from "./client";
import { users, transcripts, media, transcriptSegments } from "./schema";
import { eq } from "drizzle-orm";
import bcryptjs from "bcryptjs";

const ADMIN_EMAIL = "admin@transcripts.dev";
const USER_EMAIL = "user@transcripts.dev";

async function seed() {
  try {
    // Check if admin already exists (idempotent)
    const existingAdmin = await db.query.users.findFirst({
      where: eq(users.email, ADMIN_EMAIL),
    });

    if (existingAdmin) {
      console.log("✓ Seed já aplicado (admin exists)");
      process.exit(0);
    }

    // Create admin user
    const adminHash = await bcryptjs.hash("admin123", 12);
    const [admin] = await db
      .insert(users)
      .values({
        email: ADMIN_EMAIL,
        name: "Admin",
        passwordHash: adminHash,
        role: "admin",
      })
      .returning();

    // Create regular user
    const userHash = await bcryptjs.hash("user123", 12);
    const [regularUser] = await db
      .insert(users)
      .values({
        email: USER_EMAIL,
        name: "User",
        passwordHash: userHash,
        role: "user",
      })
      .returning();

    // Seed transcripts for admin
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
          ownerId: admin.id,
          title,
          operationName: operationNames[i],
          analysis: analyses[i],
          status: "done" as const,
          position: i,
        }))
      )
      .returning();

    // Seed media and segments for each transcript
    for (let i = 0; i < insertedTranscripts.length; i++) {
      const transcript = insertedTranscripts[i];
      const [mediaRecord] = await db
        .insert(media)
        .values({
          transcriptId: transcript.id,
          filename: `audio-${i}.mp3`,
          mime: "audio/mpeg",
          sizeBytes: Math.floor(Math.random() * 50000000) + 1000000, // 1-50 MB
          storagePath: `seed/audio-${i}.mp3`,
          durationSeconds: Math.floor(Math.random() * 240) + 60, // 60-300s
        })
        .returning();

      // Create 3 segments per media
      const segmentTexts = [
        "Primeira parte da transcrição com conteúdo relevante sobre o tema discutido.",
        "Segunda parte continuando a discussão com mais detalhes e conclusões.",
        "Terceira parte finalizando o tópico com ações e próximos passos.",
      ];

      await db
        .insert(transcriptSegments)
        .values(
          segmentTexts.map((text, j) => ({
            mediaId: mediaRecord.id,
            startMs: j * 30000, // Each segment ~30s
            endMs: (j + 1) * 30000,
            text,
          }))
        );
    }

    console.log("✓ Seed aplicado com sucesso");
    console.log(`✓ Admin criado: ${ADMIN_EMAIL} / admin123`);
    console.log(`✓ Usuário criado: ${USER_EMAIL} / user123`);
    console.log(`✓ ${insertedTranscripts.length} transcrições inseridas`);
    console.log(`✓ ${insertedTranscripts.length} mídias + 3 segmentos cada`);

    process.exit(0);
  } catch (error) {
    console.error("✗ Erro ao executar seed:", error);
    process.exit(1);
  }
}

seed();
