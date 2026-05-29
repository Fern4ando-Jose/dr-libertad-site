/**
 * Sistema de fila de temas — alternativa ao DAILY_TOPIC fixo.
 * Salva os temas no banco e pega o próximo que ainda não foi publicado.
 *
 * USO:
 *   1. Insira temas na tabela `topic_queue` via painel ou script.
 *   2. Substitua a linha `const topic = ...` na route.ts por:
 *        const topic = await getNextTopic();
 */

import { sql } from "@vercel/postgres";

export interface TopicRow {
  id: number;
  topic: string;
  scheduled_for: string | null;
  used: boolean;
}

/** Cria a tabela se não existir */
export async function ensureTopicTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS topic_queue (
      id            SERIAL PRIMARY KEY,
      topic         TEXT NOT NULL,
      scheduled_for DATE,
      used          BOOLEAN NOT NULL DEFAULT FALSE,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

/** Retorna o próximo tema não utilizado e marca como usado */
export async function getNextTopic(): Promise<string> {
  await ensureTopicTable();

  const { rows } = await sql<TopicRow>`
    SELECT id, topic
    FROM topic_queue
    WHERE used = FALSE
    ORDER BY scheduled_for ASC NULLS LAST, id ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  `;

  if (rows.length === 0) {
    // Fallback se a fila estiver vazia
    return "como recuperar atenção e foco em um mundo de distrações constantes";
  }

  const { id, topic } = rows[0];

  await sql`UPDATE topic_queue SET used = TRUE WHERE id = ${id}`;

  return topic;
}

/** Adiciona um ou mais temas à fila */
export async function enqueueTopic(topic: string, scheduledFor?: string) {
  await ensureTopicTable();
  await sql`
    INSERT INTO topic_queue (topic, scheduled_for)
    VALUES (${topic}, ${scheduledFor ?? null})
  `;
}
