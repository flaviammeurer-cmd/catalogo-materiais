import { getStore } from '@netlify/blobs';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const codigo = params.codigo;
  const store = getStore('fichas');
  const blob = await store.get(codigo, { type: 'arrayBuffer' });

  if (!blob) {
    return new Response('Nao encontrado', { status: 404 });
  }

  return new Response(blob, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'inline; filename="ficha-' + codigo + '.pdf"',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}
