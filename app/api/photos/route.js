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

  const itemCheck = await query('SELECT codigo FROM items WHERE codigo = $1', [codigo]);
  if (itemCheck.rows.length === 0) {
    return Response.json({ error: 'Item nao encontrado' }, { status: 404 });
  }

  const store = getStore('fotos');
  const arrayBuffer = await file.arrayBuffer();
  await store.set(codigo, arrayBuffer);

  const url = '/api/photo-file/' + encodeURIComponent(codigo) + '?v=' + Date.now();

  await query(
    `INSERT INTO photos (codigo, url, uploaded_at)
     VALUES ($1, $2, now())
     ON CONFLICT (codigo) DO UPDATE SET url = EXCLUDED.url, uploaded_at = now()`,
    [codigo, url]
  );

  await query('DELETE FROM reviews WHERE codigo = $1', [codigo]);
  await query('DELETE FROM duvidas WHERE codigo = $1', [codigo]);

  return Response.json({ url });
}

export async function DELETE(request) {
  if (papelDaRequisicao(request) !== 'edicao') {
    return Response.json({ error: 'Sem permissao' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const codigo = searchParams.get('codigo');
  if (!codigo) {
    return Response.json({ error: 'codigo obrigatorio' }, { status: 400 });
  }

  try {
    const store = getStore('fotos');
    await store.delete(codigo);
  } catch (e) {
    // segue mesmo se o arquivo ja nao existir
  }

  await query('DELETE FROM photos WHERE codigo = $1', [codigo]);

  return Response.json({ ok: true });
}
