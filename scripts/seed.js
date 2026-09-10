// Carrega data/items.json (planilha completa) e data/reference_notes.json
// (referencias ja pesquisadas) no banco Postgres da Vercel.
// Rodar com: npm run seed
// Precisa das variaveis de ambiente do Postgres (arquivo .env, veja .env.example).

const { sql } = require('@vercel/postgres');
const fs = require('fs');
const path = require('path');

async function main() {
  const items = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/items.json'), 'utf-8'));
  const refs = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/reference_notes.json'), 'utf-8'));

  console.log('Criando tabelas (se ainda nao existirem)...');
  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  const statements = schemaSql.split(';').map(s => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    await sql.query(stmt);
  }

  console.log('Importando', items.length, 'itens...');
  const CHUNK = 200;
  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK);
    const values = [];
    const placeholders = [];
    chunk.forEach((it, idx) => {
      const codigo = it.i && it.i.length ? it.i : ('sys' + it.s);
      const base = idx * 3;
      placeholders.push('($' + (base + 1) + ',$' + (base + 2) + ',$' + (base + 3) + ')');
      values.push(codigo, it.s, it.d);
    });
    const query =
      'INSERT INTO items (codigo, sistema_id, descricao) VALUES ' +
      placeholders.join(',') +
      ' ON CONFLICT (codigo) DO UPDATE SET sistema_id = EXCLUDED.sistema_id, descricao = EXCLUDED.descricao';
    await sql.query(query, values);
    process.stdout.write('.');
  }
  console.log('\nItens importados.');

  console.log('Importando', Object.keys(refs).length, 'referencias sugeridas...');
  for (const codigo of Object.keys(refs)) {
    const ref = refs[codigo];
    await sql`
      INSERT INTO reference_notes (codigo, note, confidence, img_url, source_site)
      VALUES (${codigo}, ${ref.note}, ${ref.conf}, ${ref.img || null}, ${ref.src || null})
      ON CONFLICT (codigo) DO UPDATE SET
        note = EXCLUDED.note,
        confidence = EXCLUDED.confidence,
        img_url = EXCLUDED.img_url,
        source_site = EXCLUDED.source_site
    `;
  }
  console.log('Referencias importadas.');
  console.log('Seed finalizado.');
}

main().catch(err => {
  console.error('Erro no seed:', err);
  process.exit(1);
});
