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
      "Reunião comercial — Cliente Acme",
      "Operação Atendimento 0421",
      "Consulta jurídica Souza & Lima",
      "Briefing campanha Q2",
      "Ata diretoria 12/04",
    ];

    const operationNames = [
      "Negociação contrato anual",
      "Suporte técnico — Incidente crítico",
      "Parecer jurídico contratual",
      "Planejamento estratégico — Marketing",
      "Decisões administrativas",
    ];

    const analyses = [
      "Discussão sobre termos comerciais e prazos de entrega para novo contrato com cliente Acme. Acordadas metas de margem e SLA.",
      "Atendimento ao cliente sobre falha no sistema de pagamento. Problemas resolvidos com reinicialização de servidor e validação de integrações.",
      "Consulta jurídica para revisão de cláusulas de não-competição e sigilo em contrato de parceria. Recomendações legais documentadas.",
      "Brainstorm da campanha de marketing para Q2. Aprovados canais digitais, orçamento alocado e cronograma de lançamento.",
      "Aprovação de políticas de trabalho remoto, aumento de benefícios e metas de 2026. Atas documentadas para arquivo.",
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
