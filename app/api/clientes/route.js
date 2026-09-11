import { query } from '../../../lib/db';
import { papelDaRequisicao } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

// lista os clientes existentes, com quantos itens cada um
export async function GET() {
  try {
    const r = await query(
      `SELECT cliente, count(*)::int AS total
       FROM item_clientes GROUP BY cliente ORDER BY total DESC`
    );
    return Response.json({ clientes: r.rows });
  } catch (e) {
    return Response.json({ clientes: [] });
  }
}

// marca ou desmarca um cliente num item
export async function POST(request) {
  if (papelDaRequisicao(request) !== 'edicao') {
    return Response.json({ error: 'Sem permissao' }, { status: 403 });
  }
  const { codigo, cliente, acao } = await request.json();
  if (!codigo || !cliente) {
    return Response.json({ error: 'codigo e cliente sao obrigatorios' }, { status: 400 });
  }
  const nome = String(cliente).trim().slice(0, 40);
  if (!nome) return Response.json({ error: 'cliente invalido' }, { status: 400 });

  if (acao === 'remover') {
    await query('DELETE FROM item_clientes WHERE codigo = $1 AND cliente = $2', [codigo, nome]);
  } else {
    await query(
      'INSERT INTO item_clientes (codigo, cliente) VALUES ($1,$2) ON CONFLICT DO NOTHING',
      [codigo, nome]
    );
  }
  const r = await query('SELECT cliente FROM item_clientes WHERE codigo = $1 ORDER BY cliente', [codigo]);
  return Response.json({ clientes: r.rows.map(x => x.cliente) });
}
