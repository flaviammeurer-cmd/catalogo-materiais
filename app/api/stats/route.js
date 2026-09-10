import { query } from '../../../lib/db';

export const dynamic = 'force-dynamic';

async function contar(sql) {
  try {
    const r = await query(sql);
    return r.rows[0].n;
  } catch (e) {
    return 0;
  }
}

export async function GET() {
  return Response.json({
    total: await contar('SELECT count(*)::int AS n FROM items'),
    withPhoto: await contar('SELECT count(*)::int AS n FROM photos'),
    pendingReview: await contar(
      `SELECT count(*)::int AS n FROM items i
       JOIN reference_notes r ON r.codigo = i.codigo
       LEFT JOIN photos p ON p.codigo = i.codigo
       LEFT JOIN reviews rv ON rv.codigo = i.codigo
       WHERE p.codigo IS NULL AND rv.codigo IS NULL`
    ),
    duvidas: await contar(
      `SELECT count(*)::int AS n FROM duvidas d
       LEFT JOIN photos p ON p.codigo = d.codigo
       WHERE p.codigo IS NULL`
    )
  });
}
