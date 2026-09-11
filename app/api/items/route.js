import { query } from '../../../lib/db';

export const dynamic = 'force-dynamic';

function normalizar(s) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') || '').trim();
  const semFoto = searchParams.get('semfoto') === '1';
  const cliente = (searchParams.get('cliente') || '').trim();
  const pagina = Math.max(1, parseInt(searchParams.get('pagina') || '1', 10) || 1);
  const POR_PAGINA = 60;

  const cond = [];
  const params = [];

  if (q) {
    params.push('%' + normalizar(q) + '%');
    cond.push('(i.busca LIKE $' + params.length + ' OR lower(i.descricao) LIKE $' + params.length + ' OR i.codigo LIKE $' + params.length + ')');
  }
  if (semFoto) {
    cond.push('p.codigo IS NULL');
  }
  if (cliente) {
    params.push(cliente);
    cond.push('EXISTS (SELECT 1 FROM item_clientes ic WHERE ic.codigo = i.codigo AND ic.cliente = $' + params.length + ')');
  }
  const where = cond.length ? 'WHERE ' + cond.join(' AND ') : '';
  const limite = ' LIMIT ' + POR_PAGINA + ' OFFSET ' + ((pagina - 1) * POR_PAGINA);

  const completa =
    `SELECT i.codigo, i.sistema_id, i.descricao,
            p.url AS photo_url,
            r.img_url AS ref_img_url,
            r.confidence AS ref_confidence,
            COALESCE(d.total, 0) AS duvidas,
            (f.codigo IS NOT NULL) AS tem_ficha,
            COALESCE((SELECT array_agg(ic.cliente ORDER BY ic.cliente) FROM item_clientes ic WHERE ic.codigo = i.codigo), '{}') AS clientes
     FROM items i
     LEFT JOIN photos p ON p.codigo = i.codigo
     LEFT JOIN reference_notes r ON r.codigo = i.codigo
     LEFT JOIN duvidas d ON d.codigo = i.codigo
     LEFT JOIN fichas f ON f.codigo = i.codigo
     ${where}
     ORDER BY (p.url IS NULL), (r.img_url IS NULL), COALESCE(d.total, 0) DESC, i.descricao` + limite;

  // Se alguma tabela nova ainda nao existir no banco, cai para a versao simples
  const simples =
    `SELECT i.codigo, i.sistema_id, i.descricao,
            p.url AS photo_url,
            NULL AS ref_img_url,
            NULL AS ref_confidence,
            0 AS duvidas,
            false AS tem_ficha
     FROM items i
     LEFT JOIN photos p ON p.codigo = i.codigo
     ${where}
     ORDER BY (p.url IS NULL), i.descricao` + limite;

  let result;
  try {
    result = await query(completa, params);
  } catch (e) {
    try {
      result = await query(simples, params);
    } catch (e2) {
      return Response.json({ items: [], total: 0, pagina, porPagina: POR_PAGINA, aviso: 'banco desatualizado' });
    }
  }

  let total = result.rows.length;
  try {
    const c = await query(
      `SELECT count(*)::int AS total FROM items i LEFT JOIN photos p ON p.codigo = i.codigo ${where}`,
      params
    );
    total = c.rows[0].total;
  } catch (e) { /* mantem a contagem aproximada */ }

  return Response.json({ items: result.rows, total, pagina, porPagina: POR_PAGINA });
}
