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
  const [duvidaMsg, setDuvidaMsg] = useState('');
  const [modalItem, setModalItem] = useState(null);
  const [modalDetail, setModalDetail] = useState(null);
  const [uploadMsg, setUploadMsg] = useState({ text: '', kind: '' });
  const fileInputRef = useRef(null);
  const debounceRef = useRef(null);

  const [queue, setQueue] = useState([]);
  const [queueIdx, setQueueIdx] = useState(0);
  const [queueLoaded, setQueueLoaded] = useState(false);

  const refreshStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      const data = await res.json();
      setStats(data);
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

  useEffect(() => {
    if (!papel) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/items?q=' + encodeURIComponent(query.trim()) + (semFoto ? '&semfoto=1' : ''));
        const data = await res.json();
        setResults(data.items);
        setTotal(data.total);
      } catch (e) {
        setResults([]);
        setTotal(0);
      }
      setLoading(false);
    }, 150);
  }, [query, semFoto, papel]);

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
      setQueue(data.items);
      setQueueIdx(0);
    } catch (e) {
      setQueue([]);
    }
    setQueueLoaded(true);
  }

  function switchTab(next) {
    setTab(next);
    if (next === 'confirmar' && !queueLoaded) loadQueue();
  }

  async function decide(status) {
    const item = queue[queueIdx];
    if (!item) return;
    try {
      await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: item.codigo, status })
      });
    } catch (e) { /* segue mesmo se falhar, tenta de novo depois */ }
    setQueueIdx(i => i + 1);
    refreshStats();
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
  }

  async function excluirFoto() {
    if (!modalItem) return;
    if (!confirm('Excluir a foto deste item?')) return;
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

  const currentQueueItem = queue[queueIdx];

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
              <b>{stats.withPhoto.toLocaleString('pt-BR')}</b> de {stats.total.toLocaleString('pt-BR')} com foto
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
                <p className="resultcount">{query.trim() || semFoto ? total.toLocaleString('pt-BR') + ' resultado(s)' : total.toLocaleString('pt-BR') + ' itens no catalogo'}{total > results.length ? ' - mostrando 60, use a busca para filtrar' : ''}</p>
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
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {tab === 'confirmar' && (
          <div className="confirmwrap">
            {!queueLoaded && <div className="confirmempty">Carregando...</div>}
            {queueLoaded && !currentQueueItem && (
              <div className="confirmempty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polyline points="20 6 9 17 4 12" /></svg>
                <p>Nenhuma referencia pendente de confirmacao agora. Volte depois que mais lotes forem adicionados.</p>
              </div>
            )}
            {queueLoaded && currentQueueItem && (
              <>
                <div className="confirmprogress">Item {queueIdx + 1} de {queue.length} pendentes</div>
                <div className="confirmcard">
                  {currentQueueItem.ref_img_url && (
                    <div className="modal-photo" style={{ marginBottom: 14 }}>
                      <img src={currentQueueItem.ref_img_url} alt="" onError={e => { e.target.parentElement.innerHTML = ''; }} />
                    </div>
                  )}
                  <span className="code">{currentQueueItem.codigo}</span>
                  <p className="modal-desc" style={{ marginTop: 10 }}>{currentQueueItem.descricao}</p>
                  <div className="refnote">
                    <ConfTag confidence={currentQueueItem.ref_confidence} />
                    {currentQueueItem.ref_note}
                  </div>
                  <a className="weblink" href={imgSearchUrl(currentQueueItem.codigo, currentQueueItem.descricao)} target="_blank" rel="noopener noreferrer">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                    Ver fotos na internet
                  </a>
                  {papel === 'edicao' && (
                  <div className="confirmbtns">
                    <button className="btn btn-no" onClick={() => decide('nao')}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                      Nao e isso
                    </button>
                    <button className="btn btn-yes" onClick={() => decide('sim')}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                      Sim, confere
                    </button>
                  </div>
                  )}
                  <div style={{ textAlign: 'center', marginTop: 10 }}>
                    <button className="btn" style={{ border: 'none', color: 'var(--ink-faint)' }} onClick={() => setQueueIdx(i => i + 1)}>
                      Pular por agora
                    </button>
                  </div>
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
            <a className="weblink" href={imgSearchUrl(modalItem.codigo, modalItem.descricao)} target="_blank" rel="noopener noreferrer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              Ver fotos na internet
            </a>
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
