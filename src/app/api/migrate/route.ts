import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { sql } = await import("@vercel/postgres");
  const results: string[] = [];

  // Tabela posts — colunas que podem faltar
  const postsCols = [
    { name: "topic", def: "TEXT NOT NULL DEFAULT 'geral'" },
    { name: "slot", def: "TEXT NOT NULL DEFAULT 'manha'" },
    { name: "body", def: "TEXT NOT NULL DEFAULT ''" },
    { name: "instagram_caption", def: "TEXT NOT NULL DEFAULT ''" },
    { name: "tags", def: "JSONB NOT NULL DEFAULT '[]'" },
    { name: "instagram_post_id", def: "TEXT" },
    // Conta/idioma do post — usado pela trava anti-dup POR CONTA (ES e PT não se
    // bloqueiam). Registros antigos são todos ES (conta única original).
    { name: "lang", def: "TEXT NOT NULL DEFAULT 'es'" },
  ];

  for (const col of postsCols) {
    try {
      await sql.query(
        `ALTER TABLE posts ADD COLUMN IF NOT EXISTS ${col.name} ${col.def}`
      );
      results.push(`posts.${col.name}: ok`);
    } catch (e) {
      results.push(`posts.${col.name}: ${String(e)}`);
    }
  }

  // Tabela config — guarda token e outras configs dinâmicas
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS config (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    results.push("config table: ok");
  } catch (e) {
    results.push("config table: " + String(e));
  }

  // Tabela illustration_cache — reuso da ilustração do dia (corta gasto na fal).
  // A mesma (model, cat, subject) gerada e aprovada no QA é reusada por 24h entre
  // publish / preview / dryrun (e entre carrossel e Reel), em vez de regerar.
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS illustration_cache (
        cache_key  TEXT PRIMARY KEY,
        url        TEXT NOT NULL,
        subject    TEXT,
        cat        TEXT,
        model      TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    results.push("illustration_cache table: ok");
  } catch (e) {
    results.push("illustration_cache table: " + String(e));
  }

  // Tabela reel_shared_cache — base do Reel COMPARTILHADA entre idiomas (mesmo
  // vídeo ES/PT): pesquisa (Tavily) + videoQueries + clipes do footage (Pexels)
  // resolvidos UMA vez por (tópico, dia). O 2º idioma reusa → footage idêntico e
  // sem pagar Tavily de novo. Só a copy muda por idioma. Ver src/lib/reel-shared.ts.
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS reel_shared_cache (
        cache_key     TEXT PRIMARY KEY,
        topic         TEXT,
        research      JSONB NOT NULL DEFAULT '[]',
        video_queries JSONB NOT NULL DEFAULT '[]',
        clips         JSONB NOT NULL DEFAULT '[]',
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    results.push("reel_shared_cache table: ok");
  } catch (e) {
    results.push("reel_shared_cache table: " + String(e));
  }

  // Tabela narration_cache — voz TTS do Reel por (tópico, dia, idioma). Re-disparo
  // reusa (não repaga a fal). ES e PT têm narração DIFERENTE (idiomas distintos).
  // Ver src/lib/narration.ts.
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS narration_cache (
        cache_key  TEXT PRIMARY KEY,
        url        TEXT NOT NULL,
        topic      TEXT,
        lang       TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    results.push("narration_cache table: ok");
  } catch (e) {
    results.push("narration_cache table: " + String(e));
  }

  // Tabela published_runs — livro-razão (dia, run, idioma) de publicações. Dá
  // idempotência ao reel (dedup) e alimenta o watchdog (catchup.yml), que redispara
  // só os runs que faltaram no dia. Ver src/lib/run-ledger.ts.
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS published_runs (
        day               TEXT NOT NULL,
        run               INT  NOT NULL,
        lang              TEXT NOT NULL,
        kind              TEXT,
        instagram_post_id TEXT,
        ts                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (day, run, lang)
      )
    `;
    results.push("published_runs table: ok");
  } catch (e) {
    results.push("published_runs table: " + String(e));
  }

  // Coluna published_runs.topic — rastro do tópico por publicação (reel + carrossel)
  // p/ a trava anti-dup CROSS-FORMATO (não repetir o mesmo tema reel↔carrossel).
  try {
    await sql`ALTER TABLE published_runs ADD COLUMN IF NOT EXISTS topic TEXT`;
    results.push("published_runs.topic: ok");
  } catch (e) {
    results.push("published_runs.topic: " + String(e));
  }

  // Coluna published_runs.attempts — DISJUNTOR anti-martelo: conta tentativas FALHAS
  // por vaga/dia; após MAX o catchup para de redisparar (evita o bloqueio da conta no
  // IG por excesso de tentativas). Ver bumpAttempt/attemptsToday em src/lib/run-ledger.ts.
  try {
    await sql`ALTER TABLE published_runs ADD COLUMN IF NOT EXISTS attempts INT NOT NULL DEFAULT 0`;
    results.push("published_runs.attempts: ok");
  } catch (e) {
    results.push("published_runs.attempts: " + String(e));
  }

  // Tabela editions — número de edição (Nº na capa) por VAGA (dia, run), o MESMO
  // p/ ES e PT (é o mesmo conteúdo traduzido). Antes o Nº vinha de COUNT(posts)+1,
  // que NÃO andava pra Reels (só carrossel grava em posts) → "Nº 102" repetia em
  // todo Reel. Aqui cada vaga ganha um número monotônico único. Ver src/lib/edition.ts.
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS editions (
        day        TEXT NOT NULL,
        run        INT  NOT NULL,
        ed         INT  NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (day, run)
      )
    `;
    results.push("editions table: ok");
  } catch (e) {
    results.push("editions table: " + String(e));
  }

  // Tabela run_topics — livro-razão (dia,run)→tema escolhido. O 1º idioma a computar a
  // vaga grava; o 2º lê o MESMO → ES e PT no MESMO tema/vídeo, SEM tirar "hoje" do recent
  // (tirar hoje repetia o tema same-day reel↔carrossel). Ver getOrSetRunTopic (run-ledger.ts).
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS run_topics (
        day        TEXT NOT NULL,
        run        INT  NOT NULL,
        topic      TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (day, run)
      )
    `;
    results.push("run_topics table: ok");
  } catch (e) {
    results.push("run_topics table: " + String(e));
  }

  // Tabela subscribers — inscritos na newsletter (já criada pelo /api/subscribe).
  // Colunas de envio: token de descadastro, soft-unsubscribe e marca do último envio.
  // Ver src/lib/newsletter.ts e /api/newsletter/send.
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS subscribers (
        id              SERIAL PRIMARY KEY,
        email           TEXT NOT NULL UNIQUE,
        lang            TEXT NOT NULL DEFAULT 'pt',
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS unsub_token TEXT`;
    await sql`ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ`;
    await sql`ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ`;
    await sql`UPDATE subscribers SET unsub_token = md5(random()::text || id::text || clock_timestamp()::text) WHERE unsub_token IS NULL`;
    results.push("subscribers (newsletter): ok");
  } catch (e) {
    results.push("subscribers (newsletter): " + String(e));
  }

  // Tabela waitlist — lista de espera do livro (captação na página i-love-dopamina).
  // Criada AQUI (não mais a cada POST em /api/waitlist — evita DDL por request; auditoria 29/06).
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS waitlist (
        id         SERIAL PRIMARY KEY,
        email      TEXT NOT NULL,
        book_slug  TEXT NOT NULL,
        lang       TEXT NOT NULL DEFAULT 'pt',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (email, book_slug)
      )
    `;
    results.push("waitlist: ok");
  } catch (e) {
    results.push("waitlist: " + String(e));
  }

  // Tabela spend_log — contabiliza cada chamada paga (fal/Anthropic/Tavily) por
  // automação, p/ a visão de /api/spend e o teto diário por automação (src/lib/spend.ts).
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS spend_log (
        id         BIGSERIAL PRIMARY KEY,
        ts         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        automation TEXT NOT NULL DEFAULT 'manual',
        platform   TEXT NOT NULL,
        operation  TEXT NOT NULL,
        model      TEXT,
        units      NUMERIC NOT NULL DEFAULT 0,
        cost_usd   NUMERIC NOT NULL DEFAULT 0,
        meta       JSONB
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS spend_log_ts_idx ON spend_log (ts)`;
    await sql`CREATE INDEX IF NOT EXISTS spend_log_auto_ts_idx ON spend_log (automation, ts)`;
    results.push("spend_log table: ok");
  } catch (e) {
    results.push("spend_log table: " + String(e));
  }

  // Capas reprovadas pelo juiz de visão — guardadas p/ revisão manual do dono
  // (/admin/reprovadas). Ver se o QA reprova com razão (pedido do dono 2026-07-06).
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS rejected_covers (
        id         BIGSERIAL PRIMARY KEY,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        day        TEXT,
        topic      TEXT,
        subject    TEXT,
        cat        TEXT,
        lang       TEXT,
        model      TEXT,
        score      INTEGER,
        reason     TEXT,
        url        TEXT
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS rejected_covers_created_idx ON rejected_covers (created_at DESC)`;
    results.push("rejected_covers table: ok");
  } catch (e) {
    results.push("rejected_covers table: " + String(e));
  }

  // Quarentena de temas que reprovam no QA de capa — evita re-selecionar o tema
  // "sem capa possível" todos os dias (queima orçamento). Ver run-ledger.recordQaFail.
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS qa_failed_topics (
        id    BIGSERIAL PRIMARY KEY,
        ts    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        day   TEXT,
        run   INTEGER,
        lang  TEXT,
        topic TEXT
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS qa_failed_topics_ts_idx ON qa_failed_topics (ts)`;
    results.push("qa_failed_topics table: ok");
  } catch (e) {
    results.push("qa_failed_topics table: " + String(e));
  }

  // Cache de veredito do QA de footage por videoId (poster Pexels é imutável →
  // veredito permanente; sem isto o mesmo clipe é re-julgado — e re-pago — todo dia).
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS footage_qa_cache (
        video_id BIGINT PRIMARY KEY,
        reject   BOOLEAN NOT NULL,
        reason   TEXT,
        ts       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    results.push("footage_qa_cache table: ok");
  } catch (e) {
    results.push("footage_qa_cache table: " + String(e));
  }

  // `who` (2026-07-17): QUEM aparece no quadro (man|woman|couple|group|none), respondido
  // pelo MESMO veredito do juiz (custo zero — mesma chamada). É o que deixa o filtro
  // "o sujeito da imagem tem que ser o sujeito da frase" valer também no footage de BUSCA
  // AO VIVO, que não tem curadoria humana. Resposta do CLIPE (não do tema) → permanente,
  // como o resto da linha. Linha antiga fica com who=NULL → sujeito desconhecido → o
  // material ao vivo a descarta em tema com sujeito declarado (fail-closed), e o Reel
  // completa pela whitelist. Ver src/lib/footage-qa.ts e src/lib/footage-subject.ts.
  try {
    await sql`ALTER TABLE footage_qa_cache ADD COLUMN IF NOT EXISTS who TEXT`;
    results.push("footage_qa_cache.who column: ok");
  } catch (e) {
    results.push("footage_qa_cache.who column: " + String(e));
  }

  // Veredito diário do guardião (verifica 6/6 nos 2 IGs) — lido pelo painel-adm p/
  // alertar o dono quando faltou post. Um registro por dia (upsert). Ver /api/guardian.
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS daily_report (
        day          TEXT PRIMARY KEY,
        es_published INTEGER,
        pt_published INTEGER,
        expected     INTEGER NOT NULL DEFAULT 6,
        ok           BOOLEAN,
        missing      JSONB,
        gave_up      JSONB,
        orphans      JSONB,
        duplicates   JSONB,
        note         TEXT,
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    results.push("daily_report table: ok");
  } catch (e) {
    results.push("daily_report table: " + String(e));
  }

  // Tabela survey_responses — pesquisa "Redes Sociais e Relacionamentos"
  // (/pesquisa PT + /investigacion ES → POST /api/survey). Anônima por
  // construção: sem IP/user-agent; e-mail (opcional, convite de entrevista)
  // em coluna SEPARADA, nunca dentro do jsonb. Ver src/lib/survey-schema.ts.
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS survey_responses (
        id         BIGSERIAL PRIMARY KEY,
        lang       TEXT  NOT NULL DEFAULT 'pt',
        answers    JSONB NOT NULL DEFAULT '{}',
        email      TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS survey_responses_created_idx ON survey_responses (created_at)`;
    results.push("survey_responses table: ok");
  } catch (e) {
    results.push("survey_responses table: " + String(e));
  }

  // Tabela dopamina_leads — REDE DE SEGURANÇA do funil "I Love Dopamina": todo lead
  // capturado (quiz ou prévia) vira uma linha AQUI, além de ir para o Brevo. Sem isto,
  // com o Brevo desligado (gated) o e-mail era descartado em silêncio e o lead sumia.
  // Idempotente por (email, lang). Guarda o status de entrega (brevo_upsert/email_status)
  // p/ auditoria e reprocessamento quando as chaves Brevo entrarem. Ver src/lib/dopamina-leads.ts.
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS dopamina_leads (
        id           BIGSERIAL PRIMARY KEY,
        email        TEXT NOT NULL,
        lang         TEXT NOT NULL DEFAULT 'pt',
        source       TEXT NOT NULL DEFAULT 'previa',
        faixa        TEXT,
        score        INTEGER,
        utm          JSONB NOT NULL DEFAULT '{}',
        brevo_upsert TEXT,
        email_status TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (email, lang)
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS dopamina_leads_created_idx ON dopamina_leads (created_at)`;
    results.push("dopamina_leads table: ok");
  } catch (e) {
    results.push("dopamina_leads table: " + String(e));
  }

  // Seed: insere o token atual do env var se a linha ainda não existe
  try {
    const token = process.env.META_ACCESS_TOKEN;
    if (token) {
      // DO NOTHING (não DO UPDATE): só SEMEIA o token se ainda não existir. Após o seed,
      // a fonte da verdade é o DB (renovado por /api/refresh-token). Com DO UPDATE, todo
      // GET /api/migrate REVERTIA o token renovado pelo valor (talvez velho) da env →
      // podia derrubar a publicação. (Auditoria 2026-06-29.)
      await sql`
        INSERT INTO config (key, value, updated_at)
        VALUES ('meta_access_token', ${token}, NOW())
        ON CONFLICT (key) DO NOTHING
      `;
      results.push("config seed token: ok (seed-if-absent)");
    } else {
      results.push("config seed token: META_ACCESS_TOKEN env var nao definida");
    }
  } catch (e) {
    results.push("config seed token: " + String(e));
  }

  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'posts' ORDER BY ordinal_position
  `;

  return NextResponse.json({
    ok: true,
    results,
    posts_columns: cols.rows.map((r) => r.column_name),
  });
}
