import { query } from '../../../lib/db';
import { papelDaRequisicao } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (papelDaRequisicao(request) !== 'edicao') {
    return Response.json({ error: 'Sem permissao' }, { status: 403 });
  }

  const { codigo, status } = await request.json();

  if (!codigo || !['sim', 'nao'].includes(status)) {
    return Response.json({ error: 'codigo e status (sim/nao) sao obrigatorios' }, { status: 400 });
  }

  if (status === 'nao') {
    // referencia errada: sai do catalogo
    await query('DELETE FROM reference_notes WHERE codigo = $1', [codigo]);
    await query('DELETE FROM reviews WHERE codigo = $1', [codigo]);
    return Response.json({ ok: true, removida: true });
  }

  // "sim, confere": se a referencia tem foto, ela vira a foto oficial do item
  const r = await query('SELECT img_url FROM reference_notes WHERE codigo = $1', [codigo]);
  const img = r.rows[0] && r.rows[0].img_url;

  if (img && img.startsWith('/')) {
    await query(
      `INSERT INTO photos (codigo, url, uploaded_at) VALUES ($1,$2,now())
       ON CONFLICT (codigo) DO UPDATE SET url = EXCLUDED.url, uploaded_at = now()`,
      [codigo, img]
    );
    await query('DELETE FROM reference_notes WHERE codigo = $1', [codigo]);
    await query('DELETE FROM duvidas WHERE codigo = $1', [codigo]);
    return Response.json({ ok: true, virouFoto: true });
  }

  await query(
    `INSERT INTO reviews (codigo, status, reviewed_at) VALUES ($1,$2,now())
     ON CONFLICT (codigo) DO UPDATE SET status = EXCLUDED.status, reviewed_at = now()`,
    [codigo, status]
  );
  return Response.json({ ok: true });
}
