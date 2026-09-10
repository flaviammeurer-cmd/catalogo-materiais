const crypto = require('crypto');

const COOKIE = 'cm_sessao';

function segredo() {
  return process.env.SESSION_SECRET || 'troque-este-segredo';
}

function assinar(valor) {
  const h = crypto.createHmac('sha256', segredo()).update(valor).digest('hex');
  return valor + '.' + h;
}

function verificar(assinado) {
  if (!assinado || !assinado.includes('.')) return null;
  const i = assinado.lastIndexOf('.');
  const valor = assinado.slice(0, i);
  const h = assinado.slice(i + 1);
  const esperado = crypto.createHmac('sha256', segredo()).update(valor).digest('hex');
  const a = Buffer.from(h);
  const b = Buffer.from(esperado);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return valor;
}

function cookieDeSessao(papel) {
  const valor = assinar(papel);
  return COOKIE + '=' + valor + '; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=2592000';
}

function cookieDeSaida() {
  return COOKIE + '=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0';
}

function papelDaRequisicao(request) {
  const bruto = request.headers.get('cookie') || '';
  const parte = bruto.split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='));
  if (!parte) return null;
  const papel = verificar(parte.slice(COOKIE.length + 1));
  return papel === 'edicao' || papel === 'consulta' ? papel : null;
}

function comparaSenha(informada, correta) {
  if (!correta) return false;
  const a = Buffer.from(String(informada));
  const b = Buffer.from(String(correta));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

module.exports = { cookieDeSessao, cookieDeSaida, papelDaRequisicao, comparaSenha };
