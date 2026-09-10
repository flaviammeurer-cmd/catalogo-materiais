'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

function imgSearchUrl(codigo, descricao) {
  const q = (codigo ? codigo + ' ' : '') + descricao;
  return 'https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(q);
}

function resizeImage(file, maxDim, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => { img.src = reader.result; };
    reader.onerror = reject;
    img.onload = () => {
      let w = img.width, h = img.height;
      if (w > h && w > maxDim) { h = Math.round(h * maxDim / w); w = maxDim; }
      else if (h >= w && h > maxDim) { w = Math.round(w * maxDim / h); h = maxDim; }
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', quality);
    };
    img.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function Placeholder({ label }) {
  return (
    <div className="placeholder">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="9" cy="11" r="2" />
        <path d="M21 15l-4.5-4.5L9 18" />
      </svg>
      <span>{label || 'Sem foto'}</span>
    </div>
  );
}

function ConfTag({ confidence }) {
  const label = { alta: 'confianca alta', media: 'confianca media', baixa: 'confianca baixa' }[confidence] || confidence;
  return <span className={'conftag conf-' + confidence}>{label}</span>;
}

export default function Page() {
  const [tab, setTab] = useState('catalogo');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ total: 0, withPhoto: 0, pendingReview: 0, duvidas: 0 });
  const [semFoto, setSemFoto] = useState(false);
  const [papel, setPapel] = useState(undefined);
  const [senha, setSenha] = useState('');
  const [loginErro, setLoginErro] = useState('');
  const [pagina, setPagina] = useState(1);
  const porPagina = 60;
  const [duvidaMsg, setDuvidaMsg] = useState('');
  const [modalItem, setModalItem] = useState(null);
  const [modalDetail, setModalDetail] = useState(null);
  const [uploadMsg, setUploadMsg] = useState({ text: '', kind: '' });
  const fileInputRef = useRef(null);
  const fichaInputRef = useRef(null);
  const debounceRef = useRef(null);

  const [queue, setQueue] = useState([]);
  const [queueLoaded, setQueueLoaded] = useState(false);

  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats({
        total: Number(data.total) || 0,
        withPhoto: Number(data.withPhoto) || 0,
        pendingReview: Number(data.pendingReview) || 0,
        duvidas: Number(data.duvidas) || 0
      });
    } catch (e) { /* silencioso */ }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/me');
        const data = await res.json();
        setPapel(data.papel);
      } catch (e) {
        setPapel(null);
      }
    })();
  }, []);

  useEffect(() => { if (papel) refreshStats(); }, [papel, refreshStats]);

  useEffect(() => { setPagina(1); }, [query, semFoto]);

  useEffect(() => {
    if (!papel) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/items?q=' + encodeURIComponent(query.trim()) + (semFoto ? '&semfoto=1' : '') + '&pagina=' + pagina);
        const data = await res.json();
        setResults(Array.isArray(data.items) ? data.items : []);
        setTotal(Number(data.total) || 0);
      } catch (e) {
        setResults([]);
        setTotal(0);
      }
      setLoading(false);
    }, 150);
  }, [query, semFoto, papel, pagina]);

  async function openModal(item) {
    setModalItem(item);
    setModalDetail(null);
    setUploadMsg({ text: '', kind: '' });
    setDuvidaMsg('');
    try {
      const res = await fetch('/api/items/' + encodeURIComponent(item.codigo));
      const data = await res.json();
      setModalDetail(data.item);
    } catch (e) {
      setModalDetail(item);
    }
  }

  function closeModal() {
    setModalItem(null);
    setModalDetail(null);
  }

  async function handleFileChange(e) {
    const file = e.target.files[0];
    if (!file || !modalItem) return;
    setUploadMsg({ text: 'Preparando imagem...', kind: '' });
    try {
      const blob = await resizeImage(file, 640, 0.62);
      setUploadMsg({ text: 'Enviando...', kind: '' });
      const form = new FormData();
      form.append('codigo', modalItem.codigo);
      form.append('file', blob, modalItem.codigo + '.jpg');
      const res = await fetch('/api/photos', { method: 'POST', body: form });
      if (!res.ok) throw new Error('falha no envio');
      const data = await res.json();
      setModalDetail(prev => ({ ...prev, photo_url: data.url }));
      setUploadMsg({ text: 'Foto salva. Visivel para toda a equipe.', kind: 'ok' });
      refreshStats();
      setResults(prev => prev.map(it => it.codigo === modalItem.codigo ? { ...it, photo_url: data.url } : it));
    } catch (err) {
      setUploadMsg({ text: 'Nao foi possivel salvar a foto. Tente novamente.', kind: 'err' });
    }
    e.target.value = '';
  }

  async function loadQueue() {
    try {
      const res = await fetch('/api/confirm-queue');
      const data = await res.json();
      setQueue(Array.isArray(data.items) ? data.items : []);
    } catch (e) {
      setQueue([]);
    }
    setQueueLoaded(true);
  }

  function switchTab(next) {
    setTab(next);
    if (next === 'confirmar' && !queueLoaded) loadQueue();
  }

  async function entrar() {
    setLoginErro('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha })
      });
      if (!res.ok) {
        setLoginErro('Senha incorreta.');
        return;
      }
      const data = await res.json();
      setPapel(data.papel);
      setSenha('');
    } catch (e) {
      setLoginErro('Nao foi possivel entrar agora.');
    }
  }

  async function sair() {
    try { await fetch('/api/logout', { method: 'POST' }); } catch (e) {}
    setPapel(null);
    setResults([]);
    setQuery('');
    setTab('catalogo');
  }

  async function excluirFoto() {
    if (!modalItem) return;
    if (!window.confirm('Excluir a foto deste item?')) return;
    setUploadMsg({ text: 'Excluindo...', kind: '' });
    try {
      const res = await fetch('/api/photos?codigo=' + encodeURIComponent(modalItem.codigo), { method: 'DELETE' });
      if (!res.ok) throw new Error('falha');
      setModalDetail(prev => ({ ...prev, photo_url: null }));
      setResults(prev => prev.map(it => it.codigo === modalItem.codigo ? { ...it, photo_url: null } : it));
      setUploadMsg({ text: 'Foto excluida.', kind: 'ok' });
      refreshStats();
    } catch (e) {
      setUploadMsg({ text: 'Nao foi possivel excluir.', kind: 'err' });
    }
  }

  async function removerReferencia() {
    if (!modalItem) return;
    if (!window.confirm('Remover a foto/nota de referencia deste item?')) return;
    setUploadMsg({ text: 'Removendo...', kind: '' });
    try {
      const res = await fetch('/api/referencias?codigo=' + encodeURIComponent(modalItem.codigo), { method: 'DELETE' });
      if (!res.ok) throw new Error('falha');
      setModalDetail(prev => ({ ...prev, ref_img_url: null, ref_note: null }));
      setResults(prev => prev.map(it => it.codigo === modalItem.codigo ? { ...it, ref_img_url: null } : it));
      setUploadMsg({ text: 'Referencia removida.', kind: 'ok' });
      refreshStats();
    } catch (e) {
      setUploadMsg({ text: 'Nao foi possivel remover.', kind: 'err' });
    }
  }

  async function enviarFicha(e) {
    const file = e.target.files[0];
    if (!file || !modalItem) return;
    setUploadMsg({ text: 'Enviando ficha...', kind: '' });
    try {
      const form = new FormData();
      form.append('codigo', modalItem.codigo);
      form.append('file', file, file.name);
      const res = await fetch('/api/fichas', { method: 'POST', body: form });
      if (!res.ok) throw new Error('falha');
      const data = await res.json();
      setModalDetail(prev => ({ ...prev, ficha_nome: data.nome }));
      setResults(prev => prev.map(it => it.codigo === modalItem.codigo ? { ...it, tem_ficha: true } : it));
      setUploadMsg({ text: 'Ficha tecnica anexada.', kind: 'ok' });
    } catch (err) {
      setUploadMsg({ text: 'Nao foi possivel anexar a ficha.', kind: 'err' });
    }
    e.target.value = '';
  }

  async function removerFicha() {
    if (!modalItem) return;
    if (!window.confirm('Remover a ficha tecnica deste item?')) return;
    try {
      const res = await fetch('/api/fichas?codigo=' + encodeURIComponent(modalItem.codigo), { method: 'DELETE' });
      if (!res.ok) throw new Error('falha');
      setModalDetail(prev => ({ ...prev, ficha_nome: null }));
      setResults(prev => prev.map(it => it.codigo === modalItem.codigo ? { ...it, tem_ficha: false } : it));
      setUploadMsg({ text: 'Ficha removida.', kind: 'ok' });
    } catch (e) {
      setUploadMsg({ text: 'Nao foi possivel remover a ficha.', kind: 'err' });
    }
  }

  async function marcarDuvida() {
    if (!modalItem) return;
    try {
      await fetch('/api/duvidas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: modalItem.codigo })
      });
      setDuvidaMsg('Marcado. Esse item entra na frente da fila de fotos.');
      refreshStats();
    } catch (e) {
      setDuvidaMsg('Nao foi possivel marcar agora.');
    }
  }

  async function decide(codigo, status) {
    setQueue(prev => prev.filter(it => it.codigo !== codigo));
    try {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo, status })
      });
    } catch (e) { /* segue mesmo se falhar */ }
    refreshStats();
  }


  if (papel === undefined) {
    return <main><div className="empty">Carregando...</div></main>;
  }

  if (!papel) {
    return (
      <main>
        <div className="confirmwrap" style={{ maxWidth: 380 }}>
          <div className="confirmcard">
            <h1 style={{ marginBottom: 4 }}>Catalogo de materiais</h1>
            <p className="sub" style={{ marginBottom: 18 }}>Informe a senha de acesso.</p>
            <input
              type="password"
              placeholder="Senha"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') entrar(); }}
              style={{ width: '100%', height: 44, borderRadius: 'var(--radius)', border: '1px solid var(--line-strong)', padding: '0 14px', fontSize: 15, outline: 'none' }}
            />
            <div className="filerow">
              <button className="btn btn-primary" onClick={entrar}>Entrar</button>
            </div>
            {loginErro && <div className="uploadstate err">{loginErro}</div>}
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <header>
        <div className="wrap">
          <h1>Catalogo de materiais</h1>
          <p className="sub">Busque por codigo ou descricao para conferir o item certo antes de separar.</p>
          <div className="searchrow">
            <div className="searchbox">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Codigo ou parte da descricao"
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="stat">
              <b>{(stats.withPhoto || 0).toLocaleString('pt-BR')}</b> de {(stats.total || 0).toLocaleString('pt-BR')} com foto
            </div>
            <button className="tabbtn" onClick={sair} title={papel === 'edicao' ? 'Acesso para contribuir' : 'Acesso de consulta'}>
              {papel === 'edicao' ? 'Contribuindo' : 'Consulta'} · sair
            </button>
          </div>
          <div className="tabs">
            <button className={'tabbtn' + (tab === 'catalogo' ? ' active' : '')} onClick={() => switchTab('catalogo')}>
              Catalogo
            </button>
            <button className={'tabbtn' + (tab === 'confirmar' ? ' active' : '')} onClick={() => switchTab('confirmar')}>
              Confirmar referencias
              {stats.pendingReview > 0 && <span className="count">{' ' + stats.pendingReview}</span>}
            </button>
          </div>
          {tab === 'catalogo' && (
            <div className="tabs" style={{ marginTop: 8 }}>
              <button
                className={'tabbtn' + (semFoto ? ' active' : '')}
                onClick={() => setSemFoto(v => !v)}
              >
                Só os que faltam foto
              </button>
              {stats.duvidas > 0 && (
                <span className="stat" style={{ padding: '7px 12px' }}>
                  <b>{stats.duvidas}</b> marcados como dúvida
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      <main>
        {tab === 'catalogo' && (
          <div>
            {!loading && results.length === 0 && (
              <div className="empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <p>{query.trim() ? 'Nenhum item encontrado para "' + query + '". Tente outro trecho do codigo ou da descricao.' : 'Nenhum item para mostrar.'}</p>
              </div>
            )}
            {results.length > 0 && (
              <>
                <p className="resultcount">{query.trim() || semFoto ? (total || 0).toLocaleString('pt-BR') + ' resultado(s)' : (total || 0).toLocaleString('pt-BR') + ' itens no catalogo'}</p>
                <div className="grid">
                  {results.map(it => (
                    <button className="card" key={it.codigo} onClick={() => openModal(it)}>
                      <div className="thumb">
                        {it.photo_url ? (
                          <>
                            <img src={it.photo_url} alt="" />
                            <span className="badge-photo">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                            </span>
                          </>
                        ) : it.ref_img_url ? (
                          <>
                            <img src={it.ref_img_url} alt="" onError={e => { e.target.style.display = 'none'; }} />
                            <span className={'badge-ref conf-' + it.ref_confidence} title="Foto de referencia, ainda nao confirmada">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="13" /><circle cx="12" cy="16.3" r="0.4" fill="currentColor" stroke="none" /></svg>
                            </span>
                          </>
                        ) : (
                          <Placeholder />
                        )}
                      </div>
                      <div className="cardbody">
                        <span className="code">{it.codigo}</span>
                        <span className="desc">{it.descricao}</span>
                        {it.tem_ficha && (
                          <span style={{ fontSize: 11, color: 'var(--blue)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 11, height: 11 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                            ficha tecnica
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
                {total > porPagina && (
                  <div className="more" style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                    <button onClick={() => { setPagina(p => Math.max(1, p - 1)); window.scrollTo(0, 0); }} disabled={pagina <= 1}>
                      Anterior
                    </button>
                    <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                      Pagina {pagina} de {Math.max(1, Math.ceil((total || 0) / porPagina)).toLocaleString('pt-BR')}
                    </span>
                    <button onClick={() => { setPagina(p => p + 1); window.scrollTo(0, 0); }} disabled={pagina >= Math.ceil((total || 0) / porPagina)}>
                      Proxima
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'confirmar' && (
          <div>
            {!queueLoaded && <div className="confirmempty">Carregando...</div>}
            {queueLoaded && queue.length === 0 && (
              <div className="confirmempty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="20 6 9 17 4 12" /></svg>
                <p>Nenhuma referencia pendente de confirmacao agora.</p>
              </div>
            )}
            {queueLoaded && queue.length > 0 && (
              <>
                <p className="resultcount">{queue.length} referencia(s) aguardando confirmacao</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {queue.map(item => (
                    <div className="confirmcard" key={item.codigo} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{ flex: '0 0 110px' }}>
                        <div className="modal-photo" style={{ marginBottom: 0, maxHeight: 110 }}>
                          {item.ref_img_url
                            ? <img src={item.ref_img_url} alt="" onError={e => { e.target.style.display = 'none'; }} />
                            : <Placeholder label="Sem foto" />}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span className="code">{item.codigo}</span>
                        <p className="modal-desc" style={{ marginTop: 8, fontSize: 14 }}>{item.descricao}</p>
                        <div className="refnote">
                          <ConfTag confidence={item.ref_confidence} />
                          {item.ref_note}
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginTop: 10 }}>
                          <a className="weblink" href={imgSearchUrl(item.codigo, item.descricao)} target="_blank" rel="noopener noreferrer" style={{ marginTop: 0 }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                            Ver na internet
                          </a>
                          {papel === 'edicao' && (
                            <>
                              <button className="btn btn-no" style={{ flex: '0 0 auto', padding: '0 14px' }} onClick={() => decide(item.codigo, 'nao')}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                                Nao e isso
                              </button>
                              <button className="btn btn-yes" style={{ flex: '0 0 auto', padding: '0 14px' }} onClick={() => decide(item.codigo, 'sim')}>
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                                Sim, confere
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </main>

      {modalItem && (
        <div className="overlay open" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal">
            <div className="modal-top">
              <div className="modal-code">{modalItem.codigo}</div>
              <button className="closebtn" onClick={closeModal} aria-label="Fechar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="modal-photo">
              {modalDetail?.photo_url ? (
                <img src={modalDetail.photo_url} alt="" />
              ) : modalDetail?.ref_img_url ? (
                <img src={modalDetail.ref_img_url} alt="" onError={e => { e.target.style.display = 'none'; }} />
              ) : (
                <Placeholder label="Sem foto ainda" />
              )}
            </div>
            <p className="modal-desc">{modalItem.descricao}</p>
            <p className="modal-sys">Codigo interno do sistema: {modalItem.sistema_id}</p>
            {modalDetail && !modalDetail.photo_url && modalDetail.ref_note && (
              <div className="refnote">
                <ConfTag confidence={modalDetail.ref_confidence} />
                {modalDetail.ref_note}
              </div>
            )}
            {modalDetail?.ficha_nome && (
              <a
                className="weblink"
                href={(modalDetail?.ficha_nome || '').toLowerCase().endsWith('.pdf') && !String(modalDetail?.ficha_nome).startsWith('upload:') ? '/fichas/' + modalDetail.ficha_nome : '/api/ficha-file/' + encodeURIComponent(modalItem.codigo)}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'flex', justifyContent: 'center', marginBottom: 2 }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /></svg>
                Ver ficha tecnica
              </a>
            )}
            <a className="weblink" href={imgSearchUrl(modalItem.codigo, modalItem.descricao)} target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              Ver fotos na internet
            </a>
            {papel === 'edicao' && !modalDetail?.photo_url && (modalDetail?.ref_img_url || modalDetail?.ref_note) && (
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <button
                  className="btn"
                  style={{ border: 'none', color: 'var(--red)', fontSize: 12.5 }}
                  onClick={removerReferencia}
                >
                  Remover esta referencia
                </button>
              </div>
            )}
            {papel === 'edicao' && (
              <div className="filerow">
                <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                  {modalDetail?.photo_url ? 'Trocar foto' : 'Tirar ou enviar foto'}
                </button>
                {modalDetail?.photo_url && (
                  <button className="btn btn-no" onClick={excluirFoto} style={{ flex: '0 0 auto', padding: '0 14px' }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>
                    Excluir
                  </button>
                )}
              </div>
            )}
            {papel === 'edicao' && (
              <div style={{ textAlign: 'center', marginTop: 6 }}>
                <button
                  className="btn"
                  style={{ border: 'none', color: 'var(--blue)', fontSize: 12.5 }}
                  onClick={() => fichaInputRef.current?.click()}
                >
                  {modalDetail?.ficha_nome ? 'Trocar ficha tecnica' : 'Anexar ficha tecnica (PDF)'}
                </button>
                {modalDetail?.ficha_nome && (
                  <button
                    className="btn"
                    style={{ border: 'none', color: 'var(--red)', fontSize: 12.5 }}
                    onClick={removerFicha}
                  >
                    Remover ficha
                  </button>
                )}
              </div>
            )}
            <input ref={fichaInputRef} type="file" accept="application/pdf" onChange={enviarFicha} />
            <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} />
            <div className={'uploadstate' + (uploadMsg.kind ? ' ' + uploadMsg.kind : '')}>{uploadMsg.text}</div>
            {!modalDetail?.photo_url && (
              <div style={{ marginTop: 4, textAlign: 'center' }}>
                <button
                  className="btn"
                  style={{ border: 'none', color: 'var(--ink-soft)', fontSize: 12.5 }}
                  onClick={marcarDuvida}
                  disabled={!!duvidaMsg}
                >
                  Não sei o que é esse item
                </button>
                {duvidaMsg && <div className="uploadstate ok">{duvidaMsg}</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
