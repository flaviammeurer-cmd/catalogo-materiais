import { query } from '../../../lib/db';
import { papelDaRequisicao } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

// A equipe escreve ou corrige o texto explicativo de um item
export async function POST(request) {
  if (papelDaRequisicao(request) !== 'edicao') {
    return Response.json({ error: 'Sem permissao' }, { status: 403 });
  }
  const { codigo, titulo, texto } = await request.json();
  if (!codigo) return Response.json({ error: 'codigo obrigatorio' }, { status: 400 });

  const t = String(texto || '').trim().slice(0, 4000);
  if (!t) {
    await query('DELETE FROM item_detalhes WHERE codigo = $1', [codigo]);
    return Response.json({ ok: true, removido: true });
  }
  await query(
    `INSERT INTO item_detalhes (codigo, titulo, texto, fonte, confianca, atualizado_em)
     VALUES ($1,$2,$3,'Equipe','alta',now())
     ON CONFLICT (codigo) DO UPDATE SET titulo = EXCLUDED.titulo, texto = EXCLUDED.texto,
       fonte = 'Equipe', confianca = 'alta', atualizado_em = now()`,
    [codigo, String(titulo || '').trim().slice(0, 160) || null, t]
  );
  return Response.json({ ok: true });
}
