import { put } from '@vercel/blob';
import { sql } from '../../../lib/db';

export async function POST(request) {
  const formData = await request.formData();
  const codigo = formData.get('codigo');
  const file = formData.get('file');

  if (!codigo || !file) {
    return Response.json({ error: 'codigo e file sao obrigatorios' }, { status: 400 });
  }

  const itemCheck = await sql`SELECT codigo FROM items WHERE codigo = ${codigo}`;
  if (itemCheck.rows.length === 0) {
    return Response.json({ error: 'Item nao encontrado' }, { status: 404 });
  }

  const filename = 'fotos/' + codigo + '-' + Date.now() + '.jpg';
  const blob = await put(filename, file, {
    access: 'public',
    contentType: 'image/jpeg'
  });

  await sql`
    INSERT INTO photos (codigo, url, uploaded_at)
    VALUES (${codigo}, ${blob.url}, now())
    ON CONFLICT (codigo) DO UPDATE SET url = EXCLUDED.url, uploaded_at = now()
  `;

  // Uma foto real confirmada resolve a pendencia de revisao, se existir
  await sql`DELETE FROM reviews WHERE codigo = ${codigo}`;

  return Response.json({ url: blob.url });
}
