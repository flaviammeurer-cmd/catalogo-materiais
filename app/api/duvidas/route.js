import { query } from '../../../lib/db';
import { papelDaRequisicao } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  if (!papelDaRequisicao(request)) {
    return Response.json({ error: 'Sem permissao' }, { status: 403 });
  }

  const { codigo } = await request.json();
  if (!codigo) {
    return Response.json({ error: 'codigo obrigatorio' }, { status: 400 });
  }

  await query(
    `INSERT INTO duvidas (codigo, total, ultima_em)
     VALUES ($1, 1, now())
     ON CONFLICT (codigo) DO UPDATE SET total = duvidas.total + 1, ultima_em = now()`,
    [codigo]
  );

  return Response.json({ ok: true });
}
