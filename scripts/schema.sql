-- Tabela principal: todos os itens ativos importados da planilha
CREATE TABLE IF NOT EXISTS items (
  codigo TEXT PRIMARY KEY,
  sistema_id BIGINT,
  descricao TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_items_descricao ON items USING gin (to_tsvector('portuguese', descricao));

-- Foto real, tirada e enviada pela equipe (fonte confiavel)
CREATE TABLE IF NOT EXISTS photos (
  codigo TEXT PRIMARY KEY REFERENCES items(codigo) ON DELETE CASCADE,
  url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Referencia sugerida (foto e nota vindas de busca na web, ainda nao confirmada)
CREATE TABLE IF NOT EXISTS reference_notes (
  codigo TEXT PRIMARY KEY REFERENCES items(codigo) ON DELETE CASCADE,
  note TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('alta', 'media', 'baixa')),
  img_url TEXT,
  source_site TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Decisao da equipe sobre uma referencia sugerida (sim / nao)
CREATE TABLE IF NOT EXISTS reviews (
  codigo TEXT PRIMARY KEY REFERENCES items(codigo) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('sim', 'nao')),
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
