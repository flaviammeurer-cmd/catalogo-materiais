import { getStore } from '@netlify/blobs';
import { query } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
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

  const url = '/api/photo-file/' + encodeURIComponent(codigo);

  await query(
    `INSERT INTO photos (codigo, url, uploaded_at)
     VALUES ($1, $2, now())
     ON CONFLICT (codigo) DO UPDATE SET url = EXCLUDED.url, uploaded_at = now()`,
    [codigo, url]
  );

  await query('DELETE FROM reviews WHERE codigo = $1', [codigo]);

  return Response.json({ url });
}
