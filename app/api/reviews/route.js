import { query } from '../../../lib/db';

export async function POST(request) {
  const body = await request.json();
  const { codigo, status } = body;

  if (!codigo || !['sim', 'nao'].includes(status)) {
    return Response.json({ error: 'codigo e status (sim/nao) sao obrigatorios' }, { status: 400 });
  }

  await query(
    `INSERT INTO reviews (codigo, status, reviewed_at)
     VALUES ($1, $2, now())
     ON CONFLICT (codigo) DO UPDATE SET status = EXCLUDED.status, reviewed_at = now()`,
    [codigo, status]
  );

  return Response.json({ ok: true });
}
