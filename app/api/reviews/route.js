import { sql } from '../../../lib/db';

export async function POST(request) {
  const body = await request.json();
  const { codigo, status } = body;

  if (!codigo || !['sim', 'nao'].includes(status)) {
    return Response.json({ error: 'codigo e status (sim/nao) sao obrigatorios' }, { status: 400 });
  }

  await sql`
    INSERT INTO reviews (codigo, status, reviewed_at)
    VALUES (${codigo}, ${status}, now())
    ON CONFLICT (codigo) DO UPDATE SET status = EXCLUDED.status, reviewed_at = now()
  `;

  return Response.json({ ok: true });
}
