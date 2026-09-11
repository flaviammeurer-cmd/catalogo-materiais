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

  // Fotos e fichas do fornecedor: arquivos em public/fotos e public/fichas,
  // servidos direto pelo site (nao precisam de upload)
  const dirFotos = path.join(__dirname, '../public/fotos');
  const dirFichas = path.join(__dirname, '../public/fichas');

  if (fs.existsSync(dirFotos)) {
    const arquivos = fs.readdirSync(dirFotos).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f));
    let n = 0;
    for (const arq of arquivos) {
      const codigo = arq.replace(/\.[^.]+$/, '');
      const existe = await query('SELECT codigo FROM items WHERE codigo = $1', [codigo]);
      if (existe.rows.length === 0) continue;
      await query(
        'INSERT INTO photos (codigo, url, uploaded_at) VALUES ($1,$2,now()) ON CONFLICT (codigo) DO UPDATE SET url = EXCLUDED.url, uploaded_at = now()',
        [codigo, '/fotos/' + arq]
      );
      await query('DELETE FROM reference_notes WHERE codigo = $1', [codigo]);
      await query('DELETE FROM duvidas WHERE codigo = $1', [codigo]);
      n++;
    }
    console.log('Fotos do fornecedor registradas:', n);
  }

  // Fichas: data/fichas.json mapeia codigo do item -> arquivo em public/fichas
  const arqMapa = path.join(__dirname, '../data/fichas.json');
  if (fs.existsSync(arqMapa)) {
    const mapaFichas = JSON.parse(fs.readFileSync(arqMapa, 'utf-8'));
    let n = 0, faltando = 0;
    for (const codigo of Object.keys(mapaFichas)) {
      const nome = mapaFichas[codigo];
      if (!fs.existsSync(path.join(dirFichas, nome))) { faltando++; continue; }
      const existe = await query('SELECT codigo FROM items WHERE codigo = $1', [codigo]);
      if (existe.rows.length === 0) continue;
      await query(
        'INSERT INTO fichas (codigo, nome_arquivo, enviada_em) VALUES ($1,$2,now()) ON CONFLICT (codigo) DO UPDATE SET nome_arquivo = EXCLUDED.nome_arquivo, enviada_em = now()',
        [codigo, nome]
      );
      n++;
    }
    console.log('Fichas tecnicas registradas:', n + (faltando ? ' (arquivo ausente em ' + faltando + ')' : ''));
  }

  console.log('Seed finalizado.');
  process.exit(0);
}

main().catch(err => {
  console.error('Erro no seed:', err);
  process.exit(1);
});
