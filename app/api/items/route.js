import { sql } from '../../../lib/db';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();

  if (!q) {
    return Response.json({ items: [], total: 0 });
  }

  const like = '%' + q + '%';

  const result = await sql`
    SELECT
      i.codigo,
      i.sistema_id,
      i.descricao,
      p.url AS photo_url,
      r.img_url AS ref_img_url,
      r.confidence AS ref_confidence
    FROM items i
    LEFT JOIN photos p ON p.codigo = i.codigo
    LEFT JOIN reference_notes r ON r.codigo = i.codigo
    WHERE i.codigo ILIKE ${like}
       OR i.descricao ILIKE ${like}
       OR i.sistema_id::text ILIKE ${like}
    ORDER BY i.descricao
    LIMIT 60
  `;

  const countResult = await sql`
    SELECT count(*)::int AS total
    FROM items i
    WHERE i.codigo ILIKE ${like}
       OR i.descricao ILIKE ${like}
       OR i.sistema_id::text ILIKE ${like}
  `;

  return Response.json({
    items: result.rows,
    total: countResult.rows[0].total
  });
}
