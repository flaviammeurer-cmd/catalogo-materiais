import { query } from '../../../lib/db';
import { papelDaRequisicao } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function DELETE(request) {
  if (papelDaRequisicao(request) !== 'edicao') {
    return Response.json({ error: 'Sem permissao' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const codigo = searchParams.get('codigo');
  if (!codigo) {
    return Response.json({ error: 'codigo obrigatorio' }, { status: 400 });
  }

  await query('DELETE FROM reference_notes WHERE codigo = $1', [codigo]);
  await query('DELETE FROM reviews WHERE codigo = $1', [codigo]);

  return Response.json({ ok: true });
}
