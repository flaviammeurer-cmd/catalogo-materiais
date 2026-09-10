import { getStore } from '@netlify/blobs';
import { query } from '../../../lib/db';
import { papelDaRequisicao } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (papelDaRequisicao(request) !== 'edicao') {
    return Response.json({ error: 'Sem permissao' }, { status: 403 });
  }

  const formData = await request.formData();
  const codigo = formData.get('codigo');
  const file = formData.get('file');

  if (!codigo || !file) {
    return Response.json({ error: 'codigo e file sao obrigatorios' }, { status: 400 });
  }

  const existe = await query('SELECT codigo FROM items WHERE codigo = $1', [codigo]);
  if (existe.rows.length === 0) {
    return Response.json({ error: 'Item nao encontrado' }, { status: 404 });
  }

  const store = getStore('fichas');
  const arrayBuffer = await file.arrayBuffer();
  await store.set(codigo, arrayBuffer);

  const nome = 'upload:' + (file.name || (codigo + '.pdf'));
  await query(
    `INSERT INTO fichas (codigo, nome_arquivo, enviada_em)
     VALUES ($1, $2, now())
     ON CONFLICT (codigo) DO UPDATE SET nome_arquivo = EXCLUDED.nome_arquivo, enviada_em = now()`,
    [codigo, nome]
  );

  return Response.json({ ok: true, nome });
}

export async function DELETE(request) {
  if (papelDaRequisicao(request) !== 'edicao') {
    return Response.json({ error: 'Sem permissao' }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const codigo = searchParams.get('codigo');
  if (!codigo) return Response.json({ error: 'codigo obrigatorio' }, { status: 400 });

  try {
    const store = getStore('fichas');
    await store.delete(codigo);
  } catch (e) { /* segue */ }

  await query('DELETE FROM fichas WHERE codigo = $1', [codigo]);
  return Response.json({ ok: true });
}
