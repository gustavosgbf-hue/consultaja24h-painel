/* ConsultaJá24h — Preferências Web Push do médico.
 * Apenas Web Push com consentimento explícito. Nunca exibe relato clínico.
 * A demo ativa data-cj-theme-storage=off e nunca pede permissão nem registra SW.
 */
(function () {
  'use strict';
  if (window.__cjDoctorNotify) return;
  window.__cjDoctorNotify = true;
  const byId = id => document.getElementById(id);
  const DEMO = document.documentElement.getAttribute('data-cj-theme-storage') === 'off';
  const state = { enabled: false, busy: false, sub: null, loaded: false };
  let trigger, popup, status, master, dot;
  function api(path, body) {
    if (DEMO) return Promise.resolve({ ok: true, ativo: !!body?.mensagens, mensagens: !!body?.mensagens });
    if (typeof window.cjMedicoPushApi !== 'function') return Promise.reject(new Error('API não carregada'));
    return window.cjMedicoPushApi(path, body || {});
  }
  function mensagem(texto, erro, sucesso) {
    status.textContent = texto;
    status.classList.toggle('is-error', !!erro);
    status.classList.toggle('is-success', !!sucesso);
  }
  function aplicar() {
    master.checked = state.enabled;
    master.disabled = state.busy;
    dot.hidden = !state.enabled;
    if (!state.busy && !status.classList.contains('is-error')) {
      if (state.enabled) mensagem('Ativadas neste dispositivo.', false, true);
      else mensagem('Notificações desativadas.', false, false);
    }
  }
  function suportado() {
    return !!(window.isSecureContext && 'serviceWorker' in navigator &&
      'PushManager' in window && 'Notification' in window);
  }
  function iphoneSemPwa() {
    const ios = /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const standalone = !!(window.navigator.standalone ||
      window.matchMedia?.('(display-mode: standalone)').matches);
    return ios && !standalone;
  }
  function keyBytes(key) {
    const value = (key + '='.repeat((4 - key.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(value), out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  async function subscription(existingOnly) {
    const reg = existingOnly
      ? await navigator.serviceWorker.getRegistration('/')
      : await navigator.serviceWorker.register('/push-sw.js', { scope: '/', updateViaCache: 'none' });
    if (!reg) return null;
    const active = existingOnly ? reg : await navigator.serviceWorker.ready;
    let sub = await active.pushManager.getSubscription();
    if (!sub && !existingOnly) {
      const key = await (typeof window.cjMedicoPushPublicKey === 'function'
        ? window.cjMedicoPushPublicKey() : Promise.resolve(null));
      if (!key?.ok || !key.publicKey) throw new Error('Serviço de notificações indisponível no servidor.');
      sub = await active.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key.publicKey) });
    }
    return sub;
  }
  async function estadoInicial() {
    if (state.loaded || DEMO || !suportado() || Notification.permission !== 'granted') return;
    state.loaded = true;
    try {
      const sub = await subscription(true);
      if (!sub) return;
      state.sub = sub;
      const r = await api('/api/web-push/medico/estado', { endpoint: sub.endpoint });
      if (r.ok) {
        state.enabled = !!r.mensagens;
        if (!state.enabled) {
          // Aparelho compartilhado: inscrição antiga pode pertencer a outro médico.
          // Ela não pode continuar recebendo mensagens após a troca de conta.
          await sub.unsubscribe().catch(() => {});
          state.sub = null;
        }
        aplicar();
      }
    } catch (_) { state.loaded = false; }
  }
  async function salvar() {
    if (!state.sub) throw new Error('Dispositivo ainda não registrado.');
    const r = await api('/api/web-push/medico/preferencias', {
      subscription: state.sub.toJSON(), mensagens: state.enabled
    });
    if (!r?.ok) throw new Error(r?.error || 'Não foi possível salvar as preferências.');
  }
  async function ativar() {
    if (DEMO) { state.enabled = true; aplicar(); return; }
    if (iphoneSemPwa()) throw new Error('No iPhone, abra este painel pelo ícone da Tela de Início: Safari → Compartilhar → Adicionar à Tela de Início.');
    if (!suportado()) throw new Error('Este navegador não oferece notificações web. Use Chrome no Android ou instale o painel na Tela de Início do iPhone.');
    if (Notification.permission === 'denied') throw new Error('Permissão bloqueada. Ative as notificações deste site nas configurações do dispositivo.');
    // O pedido de permissão é iniciado diretamente no clique do usuário (regra do iOS).
    const permissaoPendente = Notification.permission === 'default'
      ? Notification.requestPermission() : Promise.resolve(Notification.permission);
    const permissao = await permissaoPendente;
    if (permissao !== 'granted') throw new Error('Permissão não concedida. As notificações permanecem desativadas.');
    state.sub = await subscription(false);
    if (!state.sub) throw new Error('Não foi possível registrar este dispositivo.');
    state.enabled = true;
    await salvar();
  }
  async function alterarMaster(on) {
    if (state.busy) return;
    const before = { enabled: state.enabled };
    state.busy = true; aplicar(); mensagem(on ? 'Ativando…' : 'Desativando…');
    try {
      if (on) await ativar();
      else {
        state.enabled = false;
        if (!DEMO && !state.sub && suportado() && Notification.permission === 'granted')
          state.sub = await subscription(true);
        if (!DEMO && state.sub) await salvar();
      }
      mensagem(on ? 'Notificações ativadas neste dispositivo.' : 'Notificações desativadas.', false, on);
    } catch (e) {
      Object.assign(state, before);
      mensagem(e?.message || 'Não foi possível alterar as notificações.', true);
    } finally {
      state.busy = false; aplicar();
    }
  }
  function fechar() {
    popup.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
  }
  function abrir() {
    window.cjFecharMenuStatus?.(false);
    popup.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    if (DEMO) mensagem('Notificações desativadas.');
    else if (iphoneSemPwa()) mensagem('iPhone: adicione o painel à Tela de Início e abra pelo ícone para ativar os avisos.');
    else if (!suportado()) mensagem('Notificações indisponíveis neste navegador.', true);
    else if (Notification.permission === 'denied') mensagem('Notificações bloqueadas nas configurações do navegador.', true);
    estadoInicial();
  }
  // Restaura o indicador verde após login, sem pedir permissão ou enviar push.
  window.cjMedicoPushRestore = function () {
    state.loaded = false;
    if (trigger) estadoInicial();
  };
  // Ao sair da conta, revoga a permissão de entrega daquele endpoint local;
  // sem mexer em outros dispositivos do mesmo profissional.
  window.cjMedicoPushOnLogout = function (sessaoExpirada) {
    if (!sessaoExpirada && !DEMO && state.sub && typeof window.cjMedicoPushApi === 'function') {
      // Inicia enquanto o JWT ainda existe (logout limpa localStorage em seguida).
      window.cjMedicoPushApi('/api/web-push/medico/preferencias', {
        subscription: state.sub.toJSON(), mensagens: false
      }).catch(function () {});
    }
    if (!DEMO && 'serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration('/').then(function (reg) {
        return reg?.pushManager?.getSubscription();
      }).then(function (sub) { if (sub) sub.unsubscribe(); }).catch(function () {});
    }
    state.enabled = false; state.sub = null; state.loaded = false; state.busy = false;
    if (trigger && popup) { popup.hidden = true; trigger.setAttribute('aria-expanded', 'false'); aplicar(); }
  };
  function iniciar() {
    trigger = byId('cj-notify-trigger'); popup = byId('cj-notify-pop');
    status = byId('cj-notify-status'); master = byId('cj-notify-enabled');
    dot = byId('cj-notify-live-dot');
    if (!trigger || !popup || !status || !master || !dot) return;
    aplicar();
    trigger.addEventListener('click', e => {
      e.stopPropagation(); if (popup.hidden) abrir(); else fechar();
    });
    byId('cj-notify-close').addEventListener('click', () => { fechar(); trigger.focus(); });
    document.addEventListener('click', e => { if (!popup.hidden && !byId('cj-notify-wrap').contains(e.target)) fechar(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !popup.hidden) { fechar(); trigger.focus(); }
    });
    master.addEventListener('change', () => alterarMaster(master.checked));
    // Se outro médico entrou neste navegador, releia o vínculo do dispositivo.
    window.addEventListener('pageshow', () => { state.loaded = false; });
    // A restauração da sessão pode ocorrer antes do nosso script defer;
    // ler apenas a inscrição previamente concedida não solicita permissão.
    if (document.body.classList.contains('app-autenticado')) estadoInicial();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  else iniciar();
})();
