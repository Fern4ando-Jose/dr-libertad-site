-- Execute no painel do Vercel Postgres ou via psql

CREATE TABLE IF NOT EXISTS posts (
  id               SERIAL PRIMARY KEY,
  topic            TEXT NOT NULL,
  title            TEXT NOT NULL,
  body             TEXT NOT NULL,
  instagram_caption TEXT NOT NULL,
  tags             JSONB NOT NULL DEFAULT '[]',
  instagram_post_id TEXT,
  published_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para buscar posts mais recentes primeiro
CREATE INDEX IF NOT EXISTS idx_posts_published_at ON posts (published_at DESC);

-- Índice para buscar por tags
CREATE INDEX IF NOT EXISTS idx_posts_tags ON posts USING GIN (tags);
