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

  await query(
    `INSERT INTO reviews (codigo, status, reviewed_at)
     VALUES ($1, $2, now())
     ON CONFLICT (codigo) DO UPDATE SET status = EXCLUDED.status, reviewed_at = now()`,
    [codigo, status]
  );

  return Response.json({ ok: true });
}
