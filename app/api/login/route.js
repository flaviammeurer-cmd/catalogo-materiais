import { cookieDeSessao, comparaSenha } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const { senha } = await request.json();

  let papel = null;
  if (comparaSenha(senha, process.env.SENHA_EDICAO)) papel = 'edicao';
  else if (comparaSenha(senha, process.env.SENHA_CONSULTA)) papel = 'consulta';

  if (!papel) {
    return Response.json({ error: 'Senha incorreta' }, { status: 401 });
  }

  return new Response(JSON.stringify({ papel }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookieDeSessao(papel)
    }
  });
}
