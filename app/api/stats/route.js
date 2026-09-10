import { query } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const total = await query('SELECT count(*)::int AS n FROM items');
  const comFoto = await query('SELECT count(*)::int AS n FROM photos');
  const pendentes = await query(
    `SELECT count(*)::int AS n
     FROM items i
     JOIN reference_notes r ON r.codigo = i.codigo
     LEFT JOIN photos p ON p.codigo = i.codigo
     LEFT JOIN reviews rv ON rv.codigo = i.codigo
     WHERE p.codigo IS NULL AND rv.codigo IS NULL`
  );
  const duvidas = await query(
    `SELECT count(*)::int AS n
     FROM duvidas d
     LEFT JOIN photos p ON p.codigo = d.codigo
     WHERE p.codigo IS NULL`
  );

  return Response.json({
    total: total.rows[0].n,
    withPhoto: comFoto.rows[0].n,
    pendingReview: pendentes.rows[0].n,
    duvidas: duvidas.rows[0].n
  });
}
