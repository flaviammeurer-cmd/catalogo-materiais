import { query } from '../../../lib/db';

export async function GET() {
  const totalResult = await query('SELECT count(*)::int AS total FROM items');
  const withPhotoResult = await query('SELECT count(*)::int AS total FROM photos');
  const pendingResult = await query(
    `SELECT count(*)::int AS total
     FROM items i
     JOIN reference_notes r ON r.codigo = i.codigo
     LEFT JOIN photos p ON p.codigo = i.codigo
     LEFT JOIN reviews rv ON rv.codigo = i.codigo
     WHERE p.codigo IS NULL AND rv.codigo IS NULL`
  );

  return Response.json({
    total: totalResult.rows[0].total,
    withPhoto: withPhotoResult.rows[0].total,
    pendingReview: pendingResult.rows[0].total
  });
}
