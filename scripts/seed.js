require('dotenv').config();

const { query } = require('../lib/db');
const fs = require('fs');
const path = require('path');

function normalizar(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

async function main() {
  const itemsRaw = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/items.json'), 'utf-8'));
  const refs = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/reference_notes.json'), 'utf-8'));

  const vistos = new Set();
  const items = itemsRaw.filter(it => {
    const k = it.i && it.i.length ? it.i : ('sys' + it.s);
    if (vistos.has(k)) return false;
    vistos.add(k);
    return true;
  });

  console.log('Criando/atualizando tabelas...');
  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  for (const stmt of schemaSql.split(';').map(s => s.trim()).filter(Boolean)) {
    await query(stmt);
  }

  console.log('Importando', items.length, 'itens...');
  const CHUNK = 150;
  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK);
    const values = [];
    const placeholders = [];
    chunk.forEach((it, idx) => {
      const codigo = it.i && it.i.length ? it.i : ('sys' + it.s);
      const busca = normalizar(codigo + ' ' + it.d + ' ' + it.s);
      const b = idx * 4;
      placeholders.push('($' + (b + 1) + ',$' + (b + 2) + ',$' + (b + 3) + ',$' + (b + 4) + ')');
      values.push(codigo, it.s, it.d, busca);
    });
    await query(
      'INSERT INTO items (codigo, sistema_id, descricao, busca) VALUES ' +
      placeholders.join(',') +
      ' ON CONFLICT (codigo) DO UPDATE SET sistema_id = EXCLUDED.sistema_id, descricao = EXCLUDED.descricao, busca = EXCLUDED.busca',
      values
    );
    process.stdout.write('.');
  }
  console.log('\nItens importados.');

  const codigosAtuais = items.map(it => (it.i && it.i.length ? it.i : ('sys' + it.s)));
  const rem = await query(
    'DELETE FROM items WHERE codigo <> ALL($1::text[])',
    [codigosAtuais]
  );
  console.log('Itens removidos do banco (fora da planilha atual):', rem.rowCount);

  console.log('Importando', Object.keys(refs).length, 'referencias...');
  for (const codigo of Object.keys(refs)) {
    const ref = refs[codigo];
    await query(
      'INSERT INTO reference_notes (codigo, note, confidence, img_url, source_site) VALUES ($1,$2,$3,$4,$5)' +
      ' ON CONFLICT (codigo) DO UPDATE SET note = EXCLUDED.note, confidence = EXCLUDED.confidence, img_url = EXCLUDED.img_url, source_site = EXCLUDED.source_site',
      [codigo, ref.note, ref.conf, ref.img || null, ref.src || null]
    );
  }
  console.log('Referencias importadas.');
  console.log('Seed finalizado.');
  process.exit(0);
}

main().catch(err => {
  console.error('Erro no seed:', err);
  process.exit(1);
});
