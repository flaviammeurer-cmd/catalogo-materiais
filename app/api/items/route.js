import { query } from '../../../lib/db';

export const dynamic = 'force-dynamic';

function normalizar(s) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const semFoto = searchParams.get('semfoto') === '1';

  if (!q && !semFoto) {
    return Response.json({ items: [], total: 0 });
  }

  const like = '%' + normalizar(q) + '%';
  const cond = [];
  const params = [];

  if (q) {
    params.push(like);
    cond.push('i.busca LIKE $' + params.length);
  }
  if (semFoto) {
    cond.push('p.codigo IS NULL');
  }
  const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';

  const result = await query(
    `SELECT i.codigo, i.sistema_id, i.descricao,
            p.url AS photo_url,
            r.img_url AS ref_img_url,
            r.confidence AS ref_confidence,
            COALESCE(d.total, 0) AS duvidas
     FROM items i
     LEFT JOIN photos p ON p.codigo = i.codigo
     LEFT JOIN reference_notes r ON r.codigo = i.codigo
     LEFT JOIN duvidas d ON d.codigo = i.codigo
     ${where}
     ORDER BY COALESCE(d.total, 0) DESC, i.descricao
     LIMIT 60`,
    params
  );

  const countResult = await query(
    `SELECT count(*)::int AS total
     FROM items i
     LEFT JOIN photos p ON p.codigo = i.codigo
     ${where}`,
    params
  );

  return Response.json({ items: result.rows, total: countResult.rows[0].total });
}
