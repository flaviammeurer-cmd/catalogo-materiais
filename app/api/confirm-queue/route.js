import { query } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const result = await query(
    `SELECT
       i.codigo,
       i.sistema_id,
       i.descricao,
       r.note AS ref_note,
       r.confidence AS ref_confidence,
       r.img_url AS ref_img_url
     FROM items i
     JOIN reference_notes r ON r.codigo = i.codigo
     LEFT JOIN photos p ON p.codigo = i.codigo
     LEFT JOIN reviews rv ON rv.codigo = i.codigo
     WHERE p.codigo IS NULL AND rv.codigo IS NULL
     ORDER BY r.confidence DESC, i.descricao
     LIMIT 300`
  );

  return Response.json({ items: result.rows });
}