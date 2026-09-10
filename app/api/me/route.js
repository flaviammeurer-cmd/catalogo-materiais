import { papelDaRequisicao } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  return Response.json({ papel: papelDaRequisicao(request) });
}
