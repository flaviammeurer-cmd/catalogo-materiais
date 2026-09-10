import { query } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const codigo = params.codigo;

  const result = await query(
    `SELECT
       i.codigo,
       i.sistema_id,
       i.descricao,
       p.url AS photo_url,
       r.note AS ref_note,
       r.confidence AS ref_confidence,
       r.img_url AS ref_img_url,
       r.source_site AS ref_source,
       rv.status AS review_status,
       f.nome_arquivo AS ficha_nome
     FROM items i
     LEFT JOIN photos p ON p.codigo = i.codigo
     LEFT JOIN reference_notes r ON r.codigo = i.codigo
     LEFT JOIN reviews rv ON rv.codigo = i.codigo
     LEFT JOIN fichas f ON f.codigo = i.codigo
     WHERE i.codigo = $1`,
    [codigo]
  );

  if (result.rows.length === 0) {
    return Response.json({ error: 'Item nao encontrado' }, { status: 404 });
  }

  return Response.json({ item: result.rows[0] });
}
