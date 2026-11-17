// Caderno de Campo — arranque público.
// Este ficheiro só mostra a entrada na conta. O código da app é entregue pelo servidor
// apenas a contas autorizadas e fica guardado no dispositivo para funcionar sem rede.
(function () {
  const SB_URL = 'https://jqclehlrcvwwklwfosjh.supabase.co', SB_KEY = 'sb_publishable_ODxw3OwUZJLsrQeU8_3RmQ_ZnwAWotD';
  const $app = () => document.getElementById('app');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  let SBc = null;
  try { SBc = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }); } catch (e) {}
  window.__SB = SBc;

  // ---- guarda local do código (IndexedDB)
  const idb = () => new Promise((res, rej) => { const r = indexedDB.open('cdc-code', 1); r.onupgradeneeded = () => r.result.createObjectStore('c'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  async function getCode() { try { const d = await idb(); return await new Promise(r => { const q = d.transaction('c').objectStore('c').get('b'); q.onsuccess = () => r(q.result || null); q.onerror = () => r(null); }); } catch (e) { return null; } }
  async function putCode(v) { try { const d = await idb(); await new Promise(r => { const t = d.transaction('c', 'readwrite'); t.objectStore('c').put(v, 'b'); t.oncomplete = r; t.onerror = r; }); } catch (e) {} }
  window.__cdcClearCode = async () => { try { const d = await idb(); await new Promise(r => { const t = d.transaction('c', 'readwrite'); t.objectStore('c').delete('b'); t.oncomplete = r; t.onerror = r; }); } catch (e) {} };
  const verOf = c => (String(c).match(/^\/\*CDC (\S+)\*\//) || [])[1] || '';

  let running = false;
  function run(code) { if (running) return; running = true; const s = document.createElement('script'); s.textContent = code + '\n//# sourceURL=caderno.js'; document.body.appendChild(s); }

  async function token() { if (!SBc) return null; try { const { data } = await SBc.auth.getSession(); return data.session?.access_token || null; } catch (e) { return null; } }
  async function fetchCode(have) {
    const tok = await token(); if (!tok) { const e = new Error('login'); e.code = 'login'; throw e; }
    const r = await fetch(`${SB_URL}/functions/v1/code${have ? '?have=' + encodeURIComponent(have) : ''}`, { headers: { Authorization: 'Bearer ' + tok, apikey: SB_KEY }, cache: 'no-store' });
    if (r.status === 204) return null;
    if (r.status === 403) { const e = new Error('not_allowed'); e.code = 'not_allowed'; throw e; }
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const c = await r.text(); if (!verOf(c)) throw new Error('resposta inválida do servidor'); return c;
  }

  // ---- atualizações: verifica ao abrir e quando a app volta ao ecrã (no máximo de 20 em 20 min)
  let lastCheck = 0, pending = false;
  const busy = () => { try { return !!(S.active || document.querySelector('.sheet')); } catch (e) { return false; } };
  async function update(have) {
    if (!navigator.onLine || Date.now() - lastCheck < 20 * 60e3) return; lastCheck = Date.now();
    try { const c = await fetchCode(have); if (!c) return; await putCode({ v: verOf(c), code: c }); pending = true; maybeReload(); } catch (e) {}
  }
  function maybeReload() { if (pending && !busy()) { pending = false; location.reload(); } }
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible' || !running) return;
    if (pending) return maybeReload();
    const c = await getCode(); if (c) update(c.v);
  });

  // ---- arranque
  async function start() {
    const c = await getCode();
    if (c && c.code) { run(c.code); setTimeout(() => update(c.v), 4000); return; }
    let s = null; try { s = SBc && (await SBc.auth.getSession()).data.session; } catch (e) {}
    if (!s) return login();
    loadFirst();
  }
  async function loadFirst() {
    shell(`<div class="card"><b>A preparar a app…</b><p class="small muted" style="margin-top:4px">Na primeira vez é preciso rede. Depois fica guardada neste dispositivo.</p></div>`);
    try { const c = await fetchCode(); await putCode({ v: verOf(c), code: c }); run(c); }
    catch (e) {
      if (e.code === 'login') return login();
      if (e.code === 'not_allowed') return shell(`<div class="card"><b>Conta sem autorização</b><p class="small muted" style="margin-top:4px">Este email ainda não tem acesso ao Caderno de Campo.</p></div><button class="btn ghost block" onclick="__cdcOut()">Sair e entrar com outro email</button>`);
      shell(`<div class="card"><b>Não foi possível descarregar a app</b><p class="small muted" style="margin-top:4px">${navigator.onLine ? esc(e.message) : 'Sem rede. Liga-te à internet e tenta outra vez.'}</p></div><button class="btn block" onclick="location.reload()">Tentar outra vez</button>`);
    }
  }
  window.__cdcOut = async () => { try { await SBc.auth.signOut(); } catch (e) {} login(); };

  // ---- ecrã de entrada
  let MODE = 'pw';
  function shell(inner) { const a = $app(); if (a) a.innerHTML = `<div class="top"><div><div class="sub">Caderno de Campo</div><h1>Entrar</h1></div></div><div class="wrap">${inner}</div>`; const n = document.getElementById('nav'); if (n) n.innerHTML = ''; }
  function login() {
    const tab = (k, l) => `<button class="${MODE === k ? 'on' : ''}" onclick="__cdcMode('${k}')">${l}</button>`;
    shell(`<div class="seg" style="margin-bottom:10px">${tab('pw', 'Entrar')}${tab('new', 'Criar conta')}${tab('link', 'Link por email')}</div>
    <div class="card"><label class="f" style="margin-top:0">Email</label><input id="lg-email" type="email" autocomplete="email" placeholder="o.teu@email.pt" inputmode="email">
     ${MODE !== 'link' ? `<label class="f">Palavra-passe</label><input id="lg-pw" type="password" autocomplete="${MODE === 'new' ? 'new-password' : 'current-password'}" placeholder="${MODE === 'new' ? 'pelo menos 6 caracteres' : ''}">` : ''}
     <button class="btn block" style="margin-top:12px" onclick="__cdcGo()">${MODE === 'pw' ? 'Entrar' : MODE === 'new' ? 'Criar conta' : 'Enviar link de entrada'}</button>
     <div id="lg-msg" class="small" style="margin-top:10px">${MODE === 'link' ? 'Recebes um link no email. O serviço gratuito só envia alguns por hora.' : ''}</div></div>
    <div class="card"><p class="small muted">App privada. Só contas autorizadas conseguem entrar.</p></div>`);
  }
  window.__cdcMode = m => { MODE = m; login(); };
  const msg = (t, ok) => { const m = document.getElementById('lg-msg'); if (m) m.innerHTML = ok ? `<b style="color:var(--moss)">${t}</b>` : `<span style="color:var(--rust)">${t}</span>`; };
  const ERR = m => /rate limit/i.test(m) ? 'Limite de emails atingido. Espera um pouco ou entra com palavra-passe.' : /Invalid login/i.test(m) ? 'Email ou palavra-passe errados.' : /Email not confirmed/i.test(m) ? 'Falta confirmar o email (link enviado na criação da conta).' : /already registered/i.test(m) ? 'Este email já tem conta — usa "Entrar".' : /at least 6/i.test(m) ? 'A palavra-passe tem de ter pelo menos 6 caracteres.' : esc(m);
  window.__cdcGo = async () => {
    if (!SBc) return msg('Sem ligação ao servidor.');
    const em = (document.getElementById('lg-email').value || '').trim(), pw = document.getElementById('lg-pw')?.value || '';
    if (!/.+@.+\..+/.test(em)) return msg('Email inválido.');
    const redirect = location.origin + location.pathname;
    if (MODE === 'link') { msg('A enviar…', true); const { error } = await SBc.auth.signInWithOtp({ email: em, options: { emailRedirectTo: redirect } }); return error ? msg(ERR(error.message)) : msg(`✓ Link enviado para ${esc(em)}. Abre o email neste dispositivo e toca no link.`, true); }
    if (pw.length < 6) return msg('A palavra-passe tem de ter pelo menos 6 caracteres.');
    if (MODE === 'new') { msg('A criar conta…', true); const { data, error } = await SBc.auth.signUp({ email: em, password: pw, options: { emailRedirectTo: redirect } }); if (error) return msg(ERR(error.message)); if (data.session) return loadFirst(); return msg('✓ Conta criada. Confirma o email e depois entra aqui.', true); }
    msg('A entrar…', true); const { error } = await SBc.auth.signInWithPassword({ email: em, password: pw }); if (error) return msg(ERR(error.message)); loadFirst();
  };

  // ---- service worker (funcionamento sem rede)
  if ('serviceWorker' in navigator && !/localhost|127\.0\.0\.1/.test(location.hostname)) {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => { r.update(); setInterval(() => r.update(), 30 * 60e3); }).catch(() => {});
    let reloaded = false; navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloaded || busy()) return; reloaded = true; location.reload(); });
  }
  start();
})();
