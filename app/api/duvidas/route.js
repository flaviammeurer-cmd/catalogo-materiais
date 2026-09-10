import { query } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function POST(request) {
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
