/* ConsultaJá24h · demo-review.js
 * Demonstração visual do painel médico com DADOS 100% FICTÍCIOS.
 * - Não chama APIs (fetch/XHR/WebSocket/sendBeacon bloqueados aqui e via CSP).
 * - Não autentica de verdade, não grava localStorage/sessionStorage/cookies.
 * - Não carrega Memed nem qualquer script externo.
 * Os nomes das funções globais coincidem com os handlers on* do markup real
 * (copiado do index.html por scripts/build_demo_review.py) apenas para que os
 * botões funcionem na demonstração; a lógica aqui é toda simulada.
 */
(function () {
  'use strict';

  // ── Guarda de rede: nenhuma requisição sai desta página ───────────────────
  var bloqueado = function () { return Promise.reject(new Error('demo: rede desativada')); };
  try { window.fetch = bloqueado; } catch (_) {}
  try {
    window.XMLHttpRequest = function () { throw new Error('demo: rede desativada'); };
    window.WebSocket = function () { throw new Error('demo: rede desativada'); };
    window.EventSource = function () { throw new Error('demo: rede desativada'); };
    if (navigator.sendBeacon) navigator.sendBeacon = function () { return false; };
  } catch (_) {}

  var $ = function (id) { return document.getElementById(id); };
  var qsa = function (sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); };
  var ico = function (n) { try { return (window.cjIcon && window.cjIcon(n)) || ''; } catch (_) { return ''; } };
  window.cjIco = ico;
  var esc = function (v) {
    return String(v == null ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  };
  var isMobile = function () { return window.innerWidth <= 768; };
  window.isMobile = isMobile;

  // ── Dados fictícios ───────────────────────────────────────────────────────
  var MEDICOS = {
    medico: { nome: 'Dra. Helena Prado', crm: '000000', uf: 'CE' },
    admin: { nome: 'Dr. Rafael Moura', crm: '000001', uf: 'CE' }
  };
  var agora = Date.now();
  var minAtras = function (m) { return new Date(agora - m * 60000).toISOString(); };
  var FILA = [
    { id: 'd1', nome: 'Ana Beatriz Lima', tipo: 'chat', status: 'aguardando', criado_em: minAtras(2), idade: '29 anos', sexo: 'Feminino',
      cpf: '000.111.222-33', nasc: '14/03/1997', tel: '(85) 90000-0001', email: 'ana.demo@example.com',
      alergias: 'Dipirona', cronicas: 'Nega', medicacoes: 'Anticoncepcional oral', solicita: 'Atestado',
      queixa: 'Dor de garganta e febre de 38 °C há 2 dias, dor ao engolir. Nega falta de ar.' },
    { id: 'd2', nome: 'Carlos Eduardo Nascimento de Albuquerque Nunes', tipo: 'video', status: 'aguardando', criado_em: minAtras(6), idade: '41 anos', sexo: 'Masculino',
      cpf: '000.333.444-55', nasc: '02/09/1985', tel: '(85) 90000-0002', email: 'carlos.demo@example.com',
      alergias: 'Nega', cronicas: 'Hipertensão arterial', medicacoes: 'Losartana 50 mg', solicita: 'Receita',
      queixa: 'Lombalgia após esforço físico há 3 dias, sem irradiação. Melhora parcial com repouso.' },
    { id: 'd3', nome: 'Juliana Martins', tipo: 'chat', status: 'aguardando', criado_em: minAtras(12), idade: '34 anos', sexo: 'Feminino',
      cpf: '000.555.666-77', nasc: '21/11/1991', tel: '(85) 90000-0003', email: 'juliana.demo@example.com',
      alergias: 'Penicilina', cronicas: 'Nega', medicacoes: 'Nenhuma', solicita: 'Avaliação', especialidade: 'Dermatologia',
      queixa: 'Lesões avermelhadas e pruriginosas nos antebraços há uma semana.' },
    { id: 'd4', nome: 'Pedro Henrique Alves', tipo: 'chat', status: 'assumido', medico_nome: 'Dr. Lucas Teixeira', criado_em: minAtras(18), idade: '52 anos', sexo: 'Masculino',
      cpf: '000.777.888-99', nasc: '05/06/1974', tel: '(85) 90000-0004', email: 'pedro.demo@example.com',
      alergias: 'Nega', cronicas: 'Diabetes tipo 2', medicacoes: 'Metformina 850 mg', solicita: 'Renovação',
      queixa: 'Renovação de receita de uso contínuo.' }
  ];
  var RENOVACOES = [
    { id: 'r1', nome: 'Marcos Vinícius Rocha', tipo: 'renovacao_digital', criado_em: minAtras(9), triagem: 'Levotiroxina 50 mcg — uso contínuo há 4 anos.', receita: true },
    { id: 'r2', nome: 'Sônia Ribeiro', tipo: 'renovacao_fisica', criado_em: minAtras(27), triagem: 'Sinvastatina 20 mg e Losartana 50 mg.', receita: false }
  ];
  var AGENDAMENTOS = [
    { id: 71, nome: 'Fernanda Castro', modalidade: 'video', quando: 'qua., 19/11 · 14:30', tel: '(85) 90000-0011', cpf: '000.123.456-00' }
  ];
  var PENDENTES = [
    { id: 501, nome: 'Dra. Camila Fontes', crm: '000002', uf: 'PI', especialidade: 'Clínica médica', email: 'camila.demo@example.com', tel: '(86) 90000-0021', cadastro: '15/11/2026' }
  ];
  var HISTORICO = [
    { id: 901, nome: 'Roberta Dias', tipo: 'chat', encerrado: '17/11 · 09:42', cpf: '000.222.333-44', tel: '(85) 90000-0031', pront: true,
      hda: 'Coriza, espirros e obstrução nasal há 4 dias. Sem febre.', conduta: 'Lavagem nasal com soro fisiológico. Orientados sinais de alarme.', docs: 'Receita' },
    { id: 902, nome: 'André Luiz Costa', tipo: 'video', encerrado: '16/11 · 21:10', cpf: '000.444.555-66', tel: '(85) 90000-0032', pront: true,
      hda: 'Cefaleia tensional recorrente, sem sinais neurológicos focais.', conduta: 'Analgesia simples e higiene do sono. Retorno se piora.', docs: 'Receita, Atestado' },
    { id: 903, nome: 'Registro anterior', recuperado: true, inicio: '02/01/2026', fim: '28/02/2026' }
  ];
  var HIST_GERAL = [
    { id: 911, nome: 'Roberta Dias', status: 'encerrado', medico: 'Helena Prado', data: '17/11 09:42', queixa: 'Coriza e obstrução nasal há 4 dias' },
    { id: 912, nome: 'Gabriel Sousa', status: 'assumido', medico: 'Lucas Teixeira', data: '17/11 10:05', queixa: 'Dor abdominal leve desde ontem' },
    { id: 913, nome: 'Luciana Freitas', status: 'cancelado', medico: 'Helena Prado', data: '16/11 18:20', queixa: 'Paciente desistiu antes do início' },
    { id: 914, nome: 'Registro anterior', recuperado: true, medico: 'Equipe', inicio: '01/01/2026', fim: '31/01/2026' }
  ];
  var CHAT_INICIAL = function (p) {
    return [
      { autor: 'paciente', texto: 'Boa tarde, doutora. ' + (p.queixa || ''), hora: '14:02' },
      { autor: 'medico', texto: 'Boa tarde, ' + p.nome.split(' ')[0] + '. Sou a ' + estado.medico.nome + '. Vou avaliar seu caso agora.', hora: '14:03' },
      { autor: 'medico', texto: 'Você tomou alguma medicação para esses sintomas?', hora: '14:03' },
      { autor: 'paciente', texto: 'Tomei paracetamol ontem à noite, aliviou um pouco.', hora: '14:04' },
      { autor: 'paciente', arquivo: 'exame-hemograma-demo.pdf', hora: '14:05' }
    ];
  };
  var RESPOSTAS = ['Entendi, obrigada.', 'Certo, doutora.', 'Não tenho mais nenhum sintoma além desses.', 'Pode enviar o atestado por aqui?'];

  // ── Estado ───────────────────────────────────────────────────────────────
  var estado = {
    perfil: 'medico', medico: MEDICOS.medico, plantao: false,
    slots: [], ativo: -1, historico: null, timer: null, seg: 252,
    vis: { renov: true, agend: false, admin: false, hist: false, histGeral: false }
  };
  var isAdmin = function () { return estado.perfil === 'admin'; };

  // ── Toast ────────────────────────────────────────────────────────────────
  var toastT = null;
  function toast(msg, tipo) {
    var t = $('toast'); if (!t) return;
    t.textContent = msg; t.className = 'toast ' + (tipo || 'info') + ' show';
    clearTimeout(toastT); toastT = setTimeout(function () { t.className = 'toast'; }, 2600);
  }
  window.mostrarToast = toast;
  var simulado = function (acao) { return function () { toast(acao + ' — ação simulada na demo', 'info'); }; };

  // ── Login / sessão (simulados) ───────────────────────────────────────────
  function entrar() {
    var adminPwd = ($('inp-admin-pwd') || {}).value;
    if (adminPwd) definirPerfil('admin', true);
    $('screen-login').style.display = 'none';
    $('screen-app').style.display = 'block';
    document.body.classList.add('app-autenticado');
    $('sidebar-toggle').style.display = 'flex';
    renderTudo();
    mostrarEstadoMain();
  }
  window.logout = function () {
    pararTimer();
    estado.slots = []; estado.ativo = -1; estado.historico = null; estado.plantao = false;
    document.body.classList.remove('app-autenticado', 'chat-fullscreen');
    $('screen-app').style.display = 'none';
    $('screen-login').style.display = 'flex';
    atualizarPlantaoUI();
  };
  window.toggleAdminField = function () { var f = $('field-admin-pwd'); f.style.display = f.style.display === 'none' ? 'block' : 'none'; };
  window.abrirRecuperacao = function () { var r = $('recovery-section'); r.style.display = r.style.display === 'none' ? 'block' : 'none'; };
  window.enviarRecuperacao = function () {
    var m = $('recovery-msg'); m.textContent = 'Demo: nenhum e-mail é enviado. No painel real, as instruções chegam ao e-mail cadastrado.';
    m.className = 'recovery-msg ok'; m.style.display = 'block';
  };
  window.trocarSenha = function () { $('trocar-overlay').classList.remove('open'); toast('Senha atualizada (simulado)', 'success'); };

  // ── Perfil (médico/admin) ────────────────────────────────────────────────
  function definirPerfil(perfil, silencioso) {
    estado.perfil = perfil;
    estado.medico = MEDICOS[perfil];
    $('nav-nome').textContent = estado.medico.nome;
    var adm = perfil === 'admin';
    $('renov-tab-btn').style.display = adm ? 'flex' : 'none';
    $('renov-lista').style.display = adm && estado.vis.renov ? 'block' : 'none';
    $('admin-tab-btn').style.display = adm ? 'flex' : 'none';
    $('admin-medicos-lista').style.display = adm && estado.vis.admin ? 'block' : 'none';
    $('admin-hist-tab-btn').style.display = adm ? 'flex' : 'none';
    $('admin-hist-lista').style.display = adm && estado.vis.histGeral ? 'block' : 'none';
    $('admin-hist-filtros').style.display = adm && estado.vis.histGeral ? 'flex' : 'none';
    $('admin-manual-btn').style.display = adm ? 'flex' : 'none';
    $('escala-prioridade-btn').style.display = adm ? 'flex' : 'none';
    qsa('[data-demo-perfil]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-demo-perfil') === perfil ? 'true' : 'false'); });
    renderTudo();
    if (!silencioso) toast(adm ? 'Modo administrador (fictício)' : 'Modo médico (fictício)', 'info');
  }

  // ── Plantão ──────────────────────────────────────────────────────────────
  function atualizarPlantaoUI() {
    var b = $('btn-plantao');
    b.className = 'plantao-btn ' + (estado.plantao ? 'online' : 'offline');
    $('plantao-txt').textContent = estado.plantao ? 'Sair do plantão' : 'Entrar em plantão';
  }
  window.togglePlantao = function () {
    estado.plantao = !estado.plantao;
    atualizarPlantaoUI();
    renderFila();
    if (!estado.slots.length && !estado.historico) mostrarEstadoMain();
    toast(estado.plantao ? 'Plantão iniciado (simulado)' : 'Plantão encerrado (simulado)', estado.plantao ? 'success' : 'info');
  };

  function mostrarEstadoMain() {
    var temAtend = estado.ativo >= 0 || !!estado.historico;
    $('state-offline').style.display = !estado.plantao && !temAtend ? 'flex' : 'none';
    $('state-empty').style.display = estado.plantao && !temAtend ? 'flex' : 'none';
    $('state-atend').style.display = temAtend ? 'block' : 'none';
  }

  // ── Fila ─────────────────────────────────────────────────────────────────
  function minutos(iso) { return Math.max(0, Math.floor((Date.now() - new Date(iso)) / 60000)); }
  function renderFila() {
    var lista = $('fila-lista');
    var itens = FILA.filter(function (p) { return isAdmin() || String(p.tipo).indexOf('renovacao') !== 0; });
    var aguardando = itens.filter(function (p) { return p.status === 'aguardando'; }).length;
    $('fila-count').textContent = estado.plantao ? aguardando : 0;
    $('nav-fila-badge').textContent = aguardando;
    $('nav-fila-badge').classList.toggle('visivel', estado.plantao && aguardando > 0);
    $('rail-badge').textContent = aguardando;
    $('rail-badge').classList.toggle('visivel', estado.plantao && aguardando > 0);
    if (!estado.plantao && !estado.slots.length) { lista.innerHTML = '<div class="fila-vazia"><p>Entre em plantão para ver a fila</p></div>'; return; }
    if (!itens.length) { lista.innerHTML = '<div class="fila-vazia"><p>Nenhum paciente<br>aguardando atendimento</p></div>'; return; }
    lista.innerHTML = itens.map(function (p) {
      var mins = minutos(p.criado_em);
      var tempoClass = mins >= 10 ? 'critico' : mins >= 5 ? 'urgente' : '';
      var slotIdx = estado.slots.findIndex(function (s) { return s.p.id === p.id; });
      var isAtual = slotIdx >= 0;
      var assumido = p.status === 'assumido' && !isAtual;
      var onclick = isAtual ? 'onclick="ativarSlot(' + slotIdx + ')"' : assumido ? '' : 'onclick="abrirPreviewFila(\'' + p.id + '\')"';
      var esp = p.especialidade ? '<div class="pc-especialidade">' + esc(p.especialidade) + ' · especialista</div>' : '';
      var acao = isAtual ? '<span class="pc-status-badge is-ok" style="pointer-events:none">Abrir</span>'
        : p.status === 'aguardando' ? '<button class="btn-assumir" onclick="assumirAtendimento(\'' + p.id + '\',event)">Assumir</button>'
        : isAdmin() ? '<button class="cj-chip-btn cj-chip-btn--danger" onclick="encerrarTravado(\'' + p.id + '\',event)">Encerrar</button>'
        : '<span class="pc-status-badge">Em atendimento</span>';
      return '<div class="paciente-card ' + (isAtual ? 'active ' : '') + (assumido ? 'assumido ' : '') + (isAtual ? 'clicavel-slot' : '') + '" ' + onclick + '> ' + esp +
        '<div class="pc-header"><div class="pc-nome">' + esc(p.nome) + '</div><span class="pc-tipo ' + p.tipo + '">' + ico(p.tipo === 'video' ? 'video' : 'chat') + (p.tipo === 'video' ? 'Vídeo' : 'Chat') + '</span></div>' +
        '<div class="pc-queixa">' + esc(p.queixa) + '</div>' +
        '<div class="pc-footer"><div class="pc-tempo ' + tempoClass + '">' + mins + 'min</div>' + acao + '</div></div>';
    }).join('');
  }
  window.encerrarTravado = function (id, ev) { if (ev) ev.stopPropagation(); toast('Atendimento travado encerrado (simulado)', 'success'); };

  // Preview da triagem
  window.abrirPreviewFila = function (id) {
    var p = FILA.find(function (x) { return x.id === id; }); if (!p) return;
    $('fp-nome').textContent = p.nome;
    $('fp-meta').textContent = (p.tipo === 'video' ? 'Vídeo' : 'Chat') + ' · ' + p.idade + ' · aguardando há ' + minutos(p.criado_em) + ' min';
    $('fp-queixa').textContent = p.queixa;
    $('fp-assumir-btn').onclick = function () { window.assumirAtendimento(id); };
    $('fila-preview').classList.add('open');
  };
  window.fecharPreviewFila = function (ev) {
    if (ev && ev.target && ev.target.closest && ev.target.closest('.fila-preview-card')) return;
    $('fila-preview').classList.remove('open');
  };

  // ── Renovações (somente admin) ───────────────────────────────────────────
  function renderRenovacoes() {
    $('renov-count').textContent = RENOVACOES.length;
    var c = $('renov-lista');
    if (!isAdmin()) { c.innerHTML = ''; return; }
    c.innerHTML = RENOVACOES.map(function (r) {
      var link = r.receita ? '<a class="cj-card-link" href="#" onclick="event.preventDefault();event.stopPropagation();mostrarToast(\'Anexo fictício — não há arquivo na demo\',\'info\')">' + ico('file') + 'Receita anterior</a>' : '';
      return '<div class="paciente-card cj-renov-card"> <div class="pc-header"><div class="pc-nome">' + esc(r.nome) + '</div><span class="pc-tipo chat">' + ico('refresh') + (r.tipo === 'renovacao_fisica' ? 'Física' : 'Digital') + '</span></div>' +
        '<div class="pc-queixa">' + esc(r.triagem) + '</div>' + (link ? '<div>' + link + '</div>' : '') +
        '<div class="pc-footer"><div class="pc-tempo">' + minutos(r.criado_em) + 'min</div><span class="cj-actions"><button class="cj-chip-btn" onclick="abrirMemedRenovacao(\'' + r.id + '\',event)">' + ico('file') + 'Prescrever</button><button class="btn-assumir" onclick="mostrarToast(\'Renovação assumida (simulado)\',\'success\')">Assumir</button><button class="cj-chip-btn cj-chip-btn--ok" onclick="encerrarRenovacaoResolvida(\'' + r.id + '\',event)">Resolvida</button></span></div></div>';
    }).join('');
  }
  window.toggleRenovacoes = function () { estado.vis.renov = !estado.vis.renov; $('renov-lista').style.display = estado.vis.renov && isAdmin() ? 'block' : 'none'; };
  window.abrirMemedRenovacao = function (id, ev) { if (ev) ev.stopPropagation(); toast('A prescrição (Memed) não é carregada na demo', 'info'); };
  window.encerrarRenovacaoResolvida = function (id, ev) { if (ev) ev.stopPropagation(); toast('Renovação marcada como resolvida (simulado)', 'success'); };

  // ── Agendamentos ─────────────────────────────────────────────────────────
  function renderAgendamentos() {
    $('agend-count').textContent = AGENDAMENTOS.length;
    $('agend-lista').innerHTML = AGENDAMENTOS.map(function (a) {
      return '<div class="fila-card cj-agend-card" style="cursor:default"> <button class="cj-agend-cancel" onclick="mostrarToast(\'Agendamento cancelado (simulado)\',\'info\')" title="Cancelar agendamento" aria-label="Cancelar agendamento">' + ico('x') + '</button>' +
        ' <div class="cj-agend-nome">' + esc(a.nome) + '</div> <div class="cj-agend-meta">' + ico(a.modalidade === 'video' ? 'video' : 'chat') + ' ' + esc(a.quando) + '</div>' +
        ' <div class="cj-agend-meta">' + ico('phone') + ' ' + esc(a.tel) + ' · CPF: ' + esc(a.cpf) + '</div>' +
        ' <button class="btn-iniciar-agora" onclick="mostrarToast(\'Consulta agendada iniciada (simulado)\',\'success\')">' + ico('play') + 'Iniciar consulta agora</button> </div>';
    }).join('');
  }
  window.toggleAgendamentos = function () { estado.vis.agend = !estado.vis.agend; $('agend-lista').style.display = estado.vis.agend ? 'block' : 'none'; };

  // ── Médicos pendentes (admin) ────────────────────────────────────────────
  function renderPendentes() {
    $('admin-pendente-count').textContent = PENDENTES.length;
    $('admin-medicos-lista').innerHTML = PENDENTES.map(function (m) {
      return '<div class="medico-card"><div class="medico-card-nome">' + esc(m.nome) + '</div><div class="medico-card-meta">CRM ' + m.crm + '/' + m.uf + ' · ' + esc(m.especialidade) + '<br>' + esc(m.email) + ' · ' + ico('phone') + ' ' + esc(m.tel) + '<br>' + ico('pill') + ' Memed · cadastro informado<br>Cadastro: ' + m.cadastro + '</div>' +
        '<div class="medico-card-btns"><button class="btn-aprovar" onclick="mostrarToast(\'Médico aprovado (simulado)\',\'success\')">' + ico('check') + 'Aprovar</button><button class="btn-aprovar cj-btn-alt" onclick="mostrarToast(\'Movido para especialista (simulado)\',\'info\')">' + ico('external') + 'Especialista</button><button class="btn-rejeitar" onclick="mostrarToast(\'Cadastro rejeitado (simulado)\',\'error\')">' + ico('x') + 'Rejeitar</button></div></div>';
    }).join('');
  }
  window.toggleAdmin = function () { estado.vis.admin = !estado.vis.admin; $('admin-medicos-lista').style.display = estado.vis.admin ? 'block' : 'none'; };

  // ── Históricos ───────────────────────────────────────────────────────────
  window.renderHistorico = function () {
    var q = (($('hist-busca') || {}).value || '').toLowerCase().trim();
    var lista = q ? HISTORICO.filter(function (a) { return (a.nome || '').toLowerCase().indexOf(q) >= 0 || (a.cpf || '').indexOf(q) >= 0; }) : HISTORICO;
    $('hist-count').textContent = HISTORICO.length;
    if (!lista.length) { $('hist-lista').innerHTML = '<div class="fila-vazia" style="padding:14px 12px"><p>Nenhum atendimento encontrado</p></div>'; return; }
    $('hist-lista').innerHTML = lista.map(function (a) {
      if (a.recuperado) return '<div class="hist-card" style="cursor:default"><div class="hist-card-nome">' + esc(a.nome) + '</div><div class="hist-card-meta">Atendimento histórico recuperado · ' + a.inicio + ' a ' + a.fim + '<br>Registro anterior à recuperação do banco. Sem prontuário digital disponível.</div></div>';
      return '<div class="hist-card" onclick="abrirHistoricoAtendimento(' + a.id + ')"><div class="hist-card-nome">' + esc(a.nome) + '</div><div class="hist-card-meta">' + ico(a.tipo === 'video' ? 'video' : 'chat') + ' ' + (a.tipo === 'video' ? 'Vídeo' : 'Chat') + ' · ' + esc(a.encerrado) + '<br>CPF: ' + esc(a.cpf) + ' · Tel.: ' + esc(a.tel) + '</div>' + (a.pront ? '<div class="hist-card-pront-badge">' + ico('file') + 'Prontuário salvo</div>' : '') + '</div>';
    }).join('');
  };
  window.toggleHistorico = function () {
    estado.vis.hist = !estado.vis.hist;
    $('hist-lista').style.display = estado.vis.hist ? 'block' : 'none';
    $('hist-busca-wrap').style.display = estado.vis.hist ? 'block' : 'none';
    if (estado.vis.hist) window.renderHistorico();
  };
  window.carregarHistoricoGeral = function () {
    var q = (($('admin-hist-busca') || {}).value || '').toLowerCase().trim();
    var lista = q ? HIST_GERAL.filter(function (a) { return a.nome.toLowerCase().indexOf(q) >= 0; }) : HIST_GERAL;
    $('admin-hist-count').textContent = lista.length;
    $('admin-hist-lista').innerHTML = lista.length ? lista.map(function (a) {
      if (a.recuperado) return '<div class="hist-card" style="cursor:default"><div class="cj-hist-top"><strong class="cj-hist-nome">' + esc(a.nome) + '</strong><span class="cj-status cj-status--recuperado">Recuperado</span></div><div class="cj-hist-meta">' + esc(a.medico) + ' · ' + a.inicio + ' a ' + a.fim + '</div><div class="cj-hist-meta">Atendimento histórico sem prontuário digital disponível</div></div>';
      return '<div class="hist-card" onclick="abrirHistoricoAtendimento(901)" style="cursor:pointer"> <div class="cj-hist-top"> <strong class="cj-hist-nome">' + esc(a.nome) + '</strong> <span class="cj-status cj-status--' + a.status + '">' + a.status + '</span> </div> <div class="cj-hist-meta"> Dr(a) ' + esc(a.medico) + ' · ' + esc(a.data) + ' </div> <div class="cj-hist-queixa">' + esc(a.queixa) + '</div> <div class="hist-card-actions"><button class="hist-card-action" onclick="event.stopPropagation();abrirChatHistorico()">Chat</button><button class="hist-card-action" onclick="event.stopPropagation();mostrarToast(\'Link fictício copiado\',\'success\')">Copiar link</button></div> </div>';
    }).join('') : '<div class="cj-list-msg">Nenhum atendimento encontrado.</div>';
  };
  window.toggleHistoricoGeral = function () {
    estado.vis.histGeral = !estado.vis.histGeral;
    $('admin-hist-lista').style.display = estado.vis.histGeral ? 'block' : 'none';
    $('admin-hist-filtros').style.display = estado.vis.histGeral ? 'flex' : 'none';
    if (estado.vis.histGeral) window.carregarHistoricoGeral();
    if (estado.vis.histGeral && !$('admin-hist-medico').options[1]) {
      ['Helena Prado', 'Lucas Teixeira'].forEach(function (n) { var o = document.createElement('option'); o.textContent = n; $('admin-hist-medico').appendChild(o); });
    }
  };

  function renderTudo() {
    renderFila(); renderRenovacoes(); renderAgendamentos(); renderPendentes(); window.renderHistorico(); window.carregarHistoricoGeral();
  }

  // ── Atendimento ──────────────────────────────────────────────────────────
  function pararTimer() { clearInterval(estado.timer); estado.timer = null; }
  function iniciarTimer() {
    pararTimer();
    var fmt = function (s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); };
    var tick = function () { $('atend-timer').textContent = fmt(estado.seg); $('cmh-timer').textContent = fmt(estado.seg); estado.seg += 1; };
    tick(); estado.timer = setInterval(tick, 1000);
  }

  window.assumirAtendimento = function (id, ev) {
    if (ev) ev.stopPropagation();
    $('fila-preview').classList.remove('open');
    var p = FILA.find(function (x) { return x.id === id; }); if (!p) return;
    var idx = estado.slots.findIndex(function (s) { return s.p.id === id; });
    if (idx < 0) {
      if (estado.slots.length >= 2) { toast('Limite de 2 atendimentos simultâneos', 'error'); return; }
      estado.slots.push({ p: p, msgs: CHAT_INICIAL(p) });
      idx = estado.slots.length - 1;
    }
    estado.historico = null;
    window.ativarSlot(idx);
    if (isMobile()) window.fecharSidebarMobile();
  };
  window.retomarAtendimento = window.assumirAtendimento;

  function renderSlots() {
    var wrap = $('slot-tabs');
    if (estado.slots.length < 2) { wrap.classList.remove('visivel'); wrap.innerHTML = ''; return; }
    wrap.classList.add('visivel');
    wrap.innerHTML = estado.slots.map(function (s, i) {
      var novaMsg = !!s.nova && i !== estado.ativo;
      return '<button type="button" class="slot-tab-btn ' + (i === estado.ativo ? 'active' : '') + '" onclick="ativarSlot(' + i + ')" aria-pressed="' + (i === estado.ativo) + '" aria-label="' + esc('Atendimento ' + (i + 1) + ': ' + s.p.nome + (novaMsg ? ' (nova mensagem)' : '')) + '"> <span class="slot-dot"></span><span class="slot-name">' + ico(s.p.tipo === 'video' ? 'video' : 'chat') + ' ' + esc(s.p.nome) + '</span>' + (novaMsg ? '<span class="slot-badge-nova" title="Nova mensagem"></span>' : '') + '</button>';
    }).join('');
  }

  // Atendimentos anteriores do paciente: ILUSTRAÇÃO da demo, dados 100% fictícios,
  // sem nome de médico. No painel real não há endpoint escopado para isso (ver docs/).
  var ANTERIORES = { d1: ['02/10/2026 · 21:14', '18/07/2026 · 09:03'], d2: ['11/09/2026 · 14:40'], d3: [], d4: ['01/08/2026 · 08:12', '03/05/2026 · 19:55', '02/02/2026 · 10:20'] };
  function renderAnteriores(p) {
    var body = $('triagem-body'); if (!body) return;
    var sec = body.querySelector('.cj-demo-prev');
    if (!sec) { sec = document.createElement('section'); sec.className = 'triagem-section cj-demo-prev'; body.appendChild(sec); }
    var lista = (p && ANTERIORES[p.id]) || [];
    sec.innerHTML = '<div class="triagem-section-head"><span class="triagem-section-title">Atendimentos anteriores</span><span class="demo-ficticio">Ilustrativo · fictício</span></div>' +
      (lista.length ? '<ul class="demo-prev-lista">' + lista.map(function (d) { var x = d.split(' · '); return '<li><time>' + x[0] + '</time><span>' + x[1] + '</span></li>'; }).join('') + '</ul>'
        : '<p class="demo-nota" style="margin:0">Nenhum atendimento anterior (exemplo).</p>');
  }

  function preencherTriagem(p) {
    renderAnteriores(p);
    var set = function (id, v) { var el = $(id); if (el) el.textContent = v || '-'; };
    set('tr-cpf-pac', p.cpf); set('tr-nascimento-pac', p.nasc); set('tr-tel-pac', p.tel); set('tr-teldoc-pac', p.tel);
    set('tr-email-pac', p.email); set('tr-idade', p.idade); set('tr-sexo', p.sexo); set('tr-alergias', p.alergias);
    set('tr-cronicas', p.cronicas); set('tr-medicacoes', p.medicacoes); set('tr-solicita', p.solicita); set('tr-queixa', p.queixa);
    $('btn-copiar-email').style.display = p.email ? 'inline-flex' : 'none';
  }

  function msgHtml(m) {
    var corpo = m.arquivo
      ? '<a class="msg-arquivo-pdf" href="#" onclick="event.preventDefault();mostrarToast(\'Arquivo fictício — sem download na demo\',\'info\')"><span class="pdf-ico">' + ico('file') + '</span><span class="pdf-meta"><span class="pdf-nome">' + esc(m.arquivo) + '</span><span class="pdf-sub">PDF · documento fictício</span></span></a>'
      : esc(m.texto);
    return m.arquivo
      ? '<div class="cmsg ' + m.autor + '"><div class="bub-wrap">' + corpo + '<div class="ts">' + m.hora + '</div></div></div>'
      : '<div class="cmsg ' + m.autor + '"><div class="bub-wrap"><div class="bub">' + corpo + '</div><div class="ts">' + m.hora + '</div></div></div>';
  }
  function renderChat() {
    var s = estado.slots[estado.ativo]; if (!s) return;
    qsa('.chat-medico-msgs').forEach(function (c) { c.hidden = c.getAttribute('data-slot') !== String(estado.ativo); });
    var c = $('chat-medico-msgs-' + estado.ativo);
    c.innerHTML = s.msgs.map(msgHtml).join('');
    c.scrollTop = c.scrollHeight;
    renderPip();
  }

  window.ativarSlot = function (i) {
    var s = estado.slots[i]; if (!s) return;
    estado.ativo = i; estado.historico = null; s.nova = false;
    var p = s.p;
    $('atend-nome').textContent = p.nome; $('cmh-nome').textContent = p.nome;
    var tag = $('atend-tipo-tag'); tag.className = 'atend-tag ' + p.tipo; tag.innerHTML = ico(p.tipo === 'video' ? 'video' : 'chat') + (p.tipo === 'video' ? 'Vídeo' : 'Chat');
    $('atend-crm-tag').textContent = 'CRM ' + estado.medico.crm + '/' + estado.medico.uf;
    $('atend-hist-badge').style.display = 'none';
    $('atend-timer-wrap').style.display = '';
    $('atend-actions-live').style.display = 'flex';
    $('atend-actions-hist').style.display = 'none';
    $('hist-consulta-notice').style.display = 'none';
    $('hist-clinico-notice').style.display = 'none';
    $('btn-wpp').href = '#';
    $('meet-section').style.display = p.tipo === 'video' ? 'block' : 'none';
    $('meet-badge-wrap').innerHTML = p.tipo === 'video' ? '<span class="meet-badge pendente">' + ico('alert') + 'Meet pendente</span>' : '';
    $('chat-section').style.display = 'flex';
    preencherTriagem(p);
    qsa('#tab-clinico textarea').forEach(function (t) { t.disabled = false; });
    if (!$('cl-hda').value) {
      $('cl-hda').value = p.queixa;
      $('cl-comorbidades').value = p.cronicas === 'Nega' ? '' : p.cronicas;
      $('cl-medicacoes').value = p.medicacoes === 'Nenhuma' ? '' : p.medicacoes;
      $('cl-alergias').value = p.alergias === 'Nega' ? '' : p.alergias;
    }
    mostrarEstadoMain();
    renderSlots(); renderChat(); renderFila(); iniciarTimer();
    var ativa = qsa('.tab').findIndex(function (t) { return t.classList.contains('active'); });
    window.switchTab(['consulta', 'clinico', 'prontuario'][ativa < 0 ? 0 : ativa]);
  };

  window.enviarMensagemMedico = function () {
    var ta = $('chat-medico-textarea'); var txt = (ta.value || '').trim();
    var s = estado.slots[estado.ativo]; if (!txt || !s) return;
    var h = new Date(); var hora = String(h.getHours()).padStart(2, '0') + ':' + String(h.getMinutes()).padStart(2, '0');
    s.msgs.push({ autor: 'medico', texto: txt, hora: hora }); ta.value = ''; renderChat();
    setTimeout(function () {
      s.msgs.push({ autor: 'paciente', texto: RESPOSTAS[s.msgs.length % RESPOSTAS.length], hora: hora });
      if (estado.slots[estado.ativo] === s) renderChat(); else { s.nova = true; renderSlots(); }
      var aba = qsa('.tab')[0]; if (aba && !aba.classList.contains('active')) $('tab-consulta-badge').classList.add('visivel');
    }, 1400);
  };
  window.enviarMensagemPip = function () {
    var ta = $('chat-pip-textarea'); $('chat-medico-textarea').value = ta.value; ta.value = ''; window.enviarMensagemMedico();
  };
  window.onArquivoSelecionado = function (inp) { if (inp) inp.value = ''; toast('Envio de arquivos desativado na demo', 'info'); };
  window.cancelarArquivo = function () { $('chat-preview-wrap').classList.remove('visivel'); };

  // Abas
  window.switchTab = function (nome) {
    qsa('.tab').forEach(function (t, i) { t.classList.toggle('active', ['consulta', 'clinico', 'prontuario'][i] === nome); });
    qsa('.tab-panel').forEach(function (p) { p.classList.remove('active'); });
    $('tab-' + nome).classList.add('active');
    if (nome === 'consulta') $('tab-consulta-badge').classList.remove('visivel');
    if (nome === 'prontuario') renderProntuario();
    var chatAtivo = estado.ativo >= 0 && !estado.historico;
    if (nome !== 'consulta' && chatAtivo) $('chat-pip').classList.add('visivel'); else $('chat-pip').classList.remove('visivel');
    if (isMobile()) {
      window.fecharSidebarMobile();
      if (nome === 'consulta' && chatAtivo) entrarChatFullscreen(); else window.sairChatFullscreen();
    }
  };
  function entrarChatFullscreen() {
    if (!isMobile()) return;
    document.body.classList.add('chat-fullscreen');
    $('cmh-nome').textContent = $('atend-nome').textContent;
  }
  window.sairChatFullscreen = function () { document.body.classList.remove('chat-fullscreen'); window.fecharDadosPacienteSheet(); };
  window.abrirDadosPacienteSheet = function () {
    $('chat-dados-panel-body').innerHTML = $('triagem-body').innerHTML;
    $('chat-dados-sheet').classList.add('open');
    requestAnimationFrame(function () { $('chat-dados-panel').style.transform = 'translateY(0)'; });
  };
  window.fecharDadosPacienteSheet = function () { $('chat-dados-sheet').classList.remove('open'); };
  window.abrirEdicaoPacienteMobile = function () { window.fecharDadosPacienteSheet(); requestAnimationFrame(window.abrirModalEditarPaciente); };

  // PiP
  function renderPip() {
    var s = estado.slots[estado.ativo]; if (!s) return;
    $('chat-pip-msgs').innerHTML = s.msgs.filter(function (m) { return !m.arquivo; }).slice(-4).map(function (m) {
      return '<div class="' + (m.autor === 'medico' ? 'msg-medico' : 'msg-paciente') + '">' + esc(m.texto) + '</div>';
    }).join('');
  }
  window.toggleChatPip = function () { $('chat-pip').classList.toggle('minimizado'); };
  window.fecharChatPip = function () { window.switchTab('consulta'); };

  // Triagem
  window.toggleTriagem = function () {
    var b = $('triagem-body'); var c = b.classList.toggle('collapsed'); $('triagem-toggle-btn').classList.toggle('collapsed', c);
  };
  window.copiarEmailPaciente = function () { toast('E-mail fictício copiado', 'success'); };
  window.copiarLinkPaciente = function () { toast('Link fictício copiado', 'success'); };

  // Avaliação clínica
  window.inserirConduta = function (t) { var c = $('cl-conduta'); c.value = (c.value ? c.value.replace(/\s+$/, '') + '\n' : '') + t; c.focus(); };
  window.toggleDoc = function (el) { el.classList.toggle('checked'); var i = el.querySelector('input'); if (i) i.checked = el.classList.contains('checked'); };
  qsa('.doc-check').forEach(function (l) { l.addEventListener('click', function (e) { if (e.target.tagName === 'INPUT') e.preventDefault(); }); });

  // Prontuário (mesma estrutura de classes do painel)
  function cjEmoVisual(html) { try { return String(html).replace(/(?:\p{Extended_Pictographic}️?)+/gu, function (m) { return '<span class="cj-emo" aria-hidden="true">' + m + '</span>'; }); } catch (_) { return html; } }
  function renderProntuario() {
    var out = $('pront-output'); var p, dados;
    if (estado.historico) {
      p = estado.historico; dados = { hda: p.hda, com: '', med: '', ale: '', obs: '', conduta: p.conduta, docs: p.docs };
    } else {
      var s = estado.slots[estado.ativo]; if (!s) { out.style.display = 'none'; return; }
      p = s.p;
      dados = { hda: $('cl-hda').value.trim(), com: $('cl-comorbidades').value.trim(), med: $('cl-medicacoes').value.trim(), ale: $('cl-alergias').value.trim(), obs: $('cl-obs').value.trim(), conduta: $('cl-conduta').value.trim(),
        docs: qsa('.doc-check.checked').map(function (d) { return d.querySelector('.dc-text').textContent; }).join(', ') || 'Nenhum' };
    }
    var vazio = function (v) { return v ? '<span>' + esc(v) + '</span>' : '<span class="pront-empty">Não informado</span>'; };
    out.style.display = 'block';
    out.innerHTML = '<div class="pront-header"><div><div class="pront-paciente">' + esc(p.nome) + '</div><div class="pront-meta">CPF: ' + esc(p.cpf || '-') + ' · Nasc.: ' + esc(p.nasc || '-') + ' · ' + (p.tipo === 'video' ? ico('video') + ' Vídeo' : ico('chat') + ' Chat') + '</div><div class="pront-meta">17/11/2026 14:20 · Res. CFM 2.314/2022</div></div></div>' +
      '<div class="pront-card"><div class="pront-card-title">Queixa principal / HDA</div><div class="pront-card-body">' + vazio(dados.hda) + '</div></div>' +
      '<div class="pront-card"><div class="pront-card-title">Antecedentes</div><div class="pront-card-body">Comorbidades: ' + esc(dados.com || 'Nega comorbidades referidas') + '\nMedicações em uso: ' + esc(dados.med || 'Nega uso contínuo de medicações') + '\nAlergias: ' + esc(dados.ale || 'Nega alergias medicamentosas') + '</div></div>' +
      (dados.obs ? '<div class="pront-card"><div class="pront-card-title">Observações (telemedicina)</div><div class="pront-card-body">' + esc(dados.obs) + '</div></div>' : '') +
      '<div class="pront-card"><div class="pront-card-title">Conduta</div><div class="pront-card-body">' + vazio(dados.conduta) + '</div></div>' +
      '<div class="pront-card"><div class="pront-card-title">Documentos emitidos</div><div class="pront-card-body">' + cjEmoVisual(esc(dados.docs)) + '</div></div>';
    $('btn-copiar').style.display = 'inline-flex';
    var st = $('autosave-status'); st.className = 'autosave-status visible ok'; st.textContent = estado.historico ? 'Prontuário salvo' : 'Salvo';
  }
  window.copiarProntuario = function () {
    var b = $('btn-copiar'); b.classList.add('copied'); b.textContent = 'Copiado';
    setTimeout(function () { b.classList.remove('copied'); b.textContent = 'Copiar texto'; }, 2000);
    toast('Texto fictício copiado (simulado)', 'success');
  };

  // Histórico aberto
  window.abrirHistoricoAtendimento = function (id) {
    var h = HISTORICO.find(function (x) { return x.id === id; }) || HISTORICO[0];
    estado.historico = h; pararTimer();
    $('atend-nome').textContent = h.nome;
    var tag = $('atend-tipo-tag'); tag.className = 'atend-tag ' + h.tipo; tag.innerHTML = ico(h.tipo === 'video' ? 'video' : 'chat') + (h.tipo === 'video' ? 'Vídeo' : 'Chat');
    $('atend-crm-tag').textContent = 'Encerrado ' + h.encerrado;
    $('atend-hist-badge').style.display = 'inline-flex';
    $('atend-timer-wrap').style.display = 'none';
    $('atend-actions-live').style.display = 'none';
    $('atend-actions-hist').style.display = 'flex';
    $('btn-reabrir-atend').style.display = 'inline-flex';
    $('btn-memed-hist').style.display = 'inline-flex';
    $('hist-consulta-notice').style.display = 'flex';
    $('hist-clinico-notice').style.display = 'flex';
    $('chat-section').style.display = 'none';
    $('meet-section').style.display = 'none';
    $('chat-pip').classList.remove('visivel');
    preencherTriagem({ cpf: h.cpf, tel: h.tel, nasc: '-', email: '', idade: '-', sexo: '-', alergias: 'Nega', cronicas: 'Nega', medicacoes: '-', solicita: h.docs, queixa: h.hda });
    $('cl-hda').value = h.hda; $('cl-conduta').value = h.conduta;
    mostrarEstadoMain(); renderSlots();
    window.switchTab('prontuario');
    if (isMobile()) window.fecharSidebarMobile();
  };
  window.fecharHistoricoAtendimento = function () {
    estado.historico = null;
    if (estado.slots.length) window.ativarSlot(Math.max(0, estado.ativo)); else { mostrarEstadoMain(); }
    if (!estado.vis.hist) window.toggleHistorico();
    if (isMobile()) window.toggleSidebarMobile();
  };
  window.reabrirAtendimento = simulado('Reabrir consulta');
  window.abrirChatHistorico = function () {
    var h = estado.historico || HISTORICO[0];
    $('chat-hist-sub').textContent = h.nome + ' · ' + (h.encerrado || '');
    $('chat-hist-msgs').innerHTML = CHAT_INICIAL({ nome: h.nome, queixa: h.hda }).filter(function (m) { return !m.arquivo; }).map(msgHtml).join('');
    $('chat-hist-overlay').classList.add('open');
  };
  window.fecharChatHistorico = function () { $('chat-hist-overlay').classList.remove('open'); };

  // Ganhos: a UI é a REAL (panel-v6.js). Na demo a fonte é local e fictícia (sem rede).
  // Cenário consistente: médico da regra padrão, hoje = 17/11/2026, vigência desde 16/11/2026.
  // Os valores em centavos são escritos já prontos (como viriam do backend); nada é calculado aqui.
  var GANHOS_FICTICIOS = {
    ok: true, natureza: 'estimativa', moeda: 'BRL',
    aviso: 'Valores estimados a partir dos atendimentos registrados. Não representam pagamento efetuado.',
    periodo: { inicio: '2026-11-16', ate: '2026-11-17', fuso: 'America/Fortaleza' },
    hoje: { data: '2026-11-17', atendimentos: 7, valor_centavos: 24451 },
    total: { atendimentos: 16, valor_centavos: 55888, situacao: 'pendente_estimado' },
    por_dia: [
      { data: '2026-11-17', atendimentos: 7, valor_centavos: 24451 },
      { data: '2026-11-16', atendimentos: 9, valor_centavos: 31437 }
    ],
    quinzenas: [
      { id: '2026-11-Q2', inicio: '2026-11-16', fim: '2026-11-30', atendimentos: 16, valor_centavos: 55888,
        situacao: 'pendente_estimado', data_pagamento: null, data_pagamento_status: 'a_definir' }
    ],
    pagamento: { regra_definida: false, data_prevista: null, status: 'a_definir' },
    nao_contabilizados: { total: 1, motivos: { pagamento_nao_confirmado: 1 } },
    atualizado_em: '2026-11-17T17:42:00.000Z'
  };
  var ganhosModo = 'ok'; // 'ok' | 'indisponivel' (simula 404 enquanto o backend não está publicado)
  window.cjGanhosRotulo = 'Demonstração · valores fictícios';
  window.cjGanhosFonte = function () {
    return new Promise(function (resolve) {
      setTimeout(function () { resolve(ganhosModo === 'ok' ? JSON.parse(JSON.stringify(GANHOS_FICTICIOS)) : {}); }, 350);
    });
  };
  function abrirGanhosDemo(modo) {
    ganhosModo = modo || 'ok';
    if (window.cjAbrirGanhos) window.cjAbrirGanhos();
  }
  function abrirMenuStatus() {
    var b = $('cj-status-btn'); if (b && $('cj-status-pop').hidden) b.click();
  }

  // Prescrição (Memed não é carregada na demo)
  window.abrirMemed = function () { toast('A prescrição (Memed) não é carregada na demo', 'info'); };
  window.fecharMemedDrawer = function () {};

  // Encerrar
  window.abrirModalEncerrar = function () {
    qsa('#rg-status .radio-opt').forEach(function (r, i) { r.classList.toggle('selected', i === 0); });
    $('modal-encerrar').classList.add('open');
  };
  window.fecharModal = function () { $('modal-encerrar').classList.remove('open'); };
  window.selectRadio = function (el) { qsa('.radio-opt', el.closest('.radio-group')).forEach(function (r) { r.classList.remove('selected'); }); el.classList.add('selected'); };
  window.toggleCheck = function (el) { el.classList.toggle('selected'); };
  window.confirmarEncerramento = function () {
    window.fecharModal();
    var s = estado.slots[estado.ativo];
    if (s) {
      HISTORICO.unshift({ id: 990 + estado.slots.length, nome: s.p.nome, tipo: s.p.tipo, encerrado: 'hoje · agora', cpf: s.p.cpf, tel: s.p.tel, pront: true, hda: $('cl-hda').value, conduta: $('cl-conduta').value, docs: 'Receita' });
      FILA = FILA.filter(function (p) { return p.id !== s.p.id; });
      estado.slots.splice(estado.ativo, 1);
    }
    qsa('#tab-clinico textarea').forEach(function (t) { t.value = ''; });
    qsa('.doc-check').forEach(function (d) { d.classList.remove('checked'); });
    document.body.classList.remove('chat-fullscreen');
    $('chat-pip').classList.remove('visivel');
    if (estado.slots.length) window.ativarSlot(0); else { estado.ativo = -1; pararTimer(); mostrarEstadoMain(); renderSlots(); }
    renderTudo();
    toast('Atendimento encerrado (simulado)', 'success');
  };

  // Editar paciente
  window.abrirModalEditarPaciente = function () {
    var s = estado.slots[estado.ativo]; var p = s ? s.p : FILA[0];
    $('editar-paciente-nome').value = p.nome; $('editar-paciente-cpf').value = p.cpf || '';
    $('editar-paciente-nascimento').value = '1997-03-14';
    $('modal-editar-paciente').classList.add('open');
  };
  window.fecharModalEditarPaciente = function () { $('modal-editar-paciente').classList.remove('open'); };
  window.salvarEdicaoPaciente = function () { window.fecharModalEditarPaciente(); toast('Dados salvos (simulado)', 'success'); };
  window.mascararCpfEdicao = function (el) {
    var d = el.value.replace(/\D/g, '').slice(0, 11);
    el.value = d.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  // Admin: atendimento manual e turnos
  window.abrirAtendimentoManual = function () { $('modal-atendimento-manual').classList.add('open'); };
  window.fecharAtendimentoManual = function () { $('modal-atendimento-manual').classList.remove('open'); };
  window.criarAtendimentoManual = function () { window.fecharAtendimentoManual(); toast('Atendimento manual criado (simulado)', 'success'); };
  var DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  function turnoHtml(t) {
    return '<div class="escala-turno"><select class="escala-dia" aria-label="Dia da semana">' + DIAS.map(function (d, i) { return '<option value="' + i + '"' + (i === t.dia ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select>' +
      '<input class="escala-inicio" type="time" value="' + t.ini + '" aria-label="Início"><input class="escala-fim" type="time" value="' + t.fim + '" aria-label="Fim"><button class="escala-remover" type="button" onclick="this.closest(\'.escala-turno\').remove()" aria-label="Remover turno">' + ico('x') + '</button></div>';
  }
  window.abrirEscalaPrioridade = function () {
    $('escala-prioridade-lista').innerHTML = [{ dia: 1, ini: '08:00', fim: '12:00' }, { dia: 3, ini: '19:00', fim: '23:00' }].map(turnoHtml).join('');
    $('modal-escala-prioridade').classList.add('open');
  };
  window.adicionarTurnoPrioridade = function () { $('escala-prioridade-lista').insertAdjacentHTML('beforeend', turnoHtml({ dia: 5, ini: '14:00', fim: '18:00' })); };
  window.fecharEscalaPrioridade = function () { $('modal-escala-prioridade').classList.remove('open'); };
  window.salvarEscalaPrioridade = function () { window.fecharEscalaPrioridade(); toast('Turnos salvos (simulado)', 'success'); };

  // Dados de prescrição do médico
  window.abrirDadosRegulatorios = function () {
    $('reg-crm').value = estado.medico.crm; $('reg-uf').value = estado.medico.uf; $('reg-cpf').value = '000.000.000-00'; $('reg-nascimento').value = '1985-05-20';
    var f = $('dados-regulatorios-faltantes'); f.textContent = 'Exemplo de aviso: confira os dados antes da primeira prescrição.'; f.style.display = 'block';
    $('modal-dados-regulatorios').classList.add('open');
  };
  window.fecharDadosRegulatorios = function () { $('modal-dados-regulatorios').classList.remove('open'); };
  window.salvarDadosRegulatorios = function () { window.fecharDadosRegulatorios(); toast('Dados salvos (simulado)', 'success'); };

  // Vídeo
  window.salvarMeetLink = function () {
    var v = ($('meetLinkInput').value || '').trim() || 'https://meet.example.com/demo-sala';
    $('meetLinkAtualUrl').textContent = v; $('meetLinkAtualUrl').href = '#'; $('meetLinkAtual').style.display = 'block';
    $('meet-badge-wrap').innerHTML = '<span class="meet-badge ok">' + ico('check') + 'Meet configurado</span>';
  };

  // Sidebar desktop/mobile (mesma mecânica de classes do painel)
  window.toggleSidebarDesktop = function () {
    var body = $('app-body'), inner = $('sidebar-inner'), rail = $('sidebar-rail');
    if (!body.classList.contains('sidebar-collapsed')) {
      body.classList.add('sidebar-collapsed');
      setTimeout(function () { inner.classList.add('sidebar-inner-hidden'); rail.style.display = 'flex'; requestAnimationFrame(function () { rail.classList.add('visivel'); }); }, 200);
    } else {
      rail.classList.remove('visivel'); rail.style.display = 'none';
      inner.classList.remove('sidebar-inner-hidden');
      body.classList.remove('sidebar-collapsed');
    }
  };
  window.toggleSidebarMobile = function () { if ($('sidebar').classList.contains('open')) window.fecharSidebarMobile(); else if (isMobile()) { $('sidebar').classList.add('open'); $('sidebar-overlay').classList.add('open'); } };
  window.fecharSidebarMobile = function () { $('sidebar').classList.remove('open'); $('sidebar-overlay').classList.remove('open'); };
  function ajustarMobile() {
    var m = isMobile();
    $('btn-fechar-sidebar').style.display = m ? 'inline-flex' : 'none';
    if (!m) { document.body.classList.remove('chat-fullscreen'); window.fecharSidebarMobile(); }
  }
  window.addEventListener('resize', ajustarMobile);

  // ── Barra de revisão ─────────────────────────────────────────────────────
  var TELAS = {
    login: function () { window.logout(); },
    offline: function () { garantirApp(); estado.plantao = false; limparAtend(); },
    vazia: function () { garantirApp(); FILA = []; estado.plantao = true; limparAtend(); },
    fila: function () { garantirApp(); estado.plantao = true; limparAtend(); if (isMobile()) window.toggleSidebarMobile(); },
    chat: function () { abrirAtend(); window.switchTab('consulta'); },
    triagem: function () { abrirAtend(); window.switchTab('consulta'); if (isMobile()) { window.abrirDadosPacienteSheet(); } else { var t = $('triagem-body'); if (t.classList.contains('collapsed')) window.toggleTriagem(); $('state-atend').scrollTop = 0; } },
    avaliacao: function () { abrirAtend(); qsa('.doc-check')[0].classList.add('checked'); qsa('.doc-check')[1].classList.add('checked'); window.switchTab('clinico'); },
    prontuario: function () { abrirAtend(); if (!$('cl-conduta').value) window.inserirConduta('Paciente orientado sobre sinais de alarme. Retorno se piora clínica.'); window.switchTab('prontuario'); },
    multi: function () { garantirApp(); estado.plantao = true; atualizarPlantaoUI(); window.assumirAtendimento('d1'); window.assumirAtendimento('d2'); window.switchTab('consulta'); },
    historico: function () { garantirApp(); estado.plantao = true; atualizarPlantaoUI(); if (!estado.vis.hist) window.toggleHistorico(); window.abrirHistoricoAtendimento(901); },
    renovacoes: function () { garantirApp(); definirPerfil('admin', true); estado.plantao = true; limparAtend(); estado.vis.renov = true; $('renov-lista').style.display = 'block'; if (!estado.vis.histGeral) window.toggleHistoricoGeral(); if (!estado.vis.admin) window.toggleAdmin(); if (isMobile()) window.toggleSidebarMobile(); else $('sidebar-inner').scrollTop = 0; }
  };
  var MODAIS = {
    encerrar: function () { abrirAtend(); window.abrirModalEncerrar(); },
    preview: function () { garantirApp(); estado.plantao = true; limparAtend(); window.abrirPreviewFila('d2'); },
    editar: function () { abrirAtend(); window.abrirModalEditarPaciente(); },
    regulatorios: function () { garantirApp(); window.abrirDadosRegulatorios(); },
    manual: function () { garantirApp(); definirPerfil('admin', true); window.abrirAtendimentoManual(); },
    turnos: function () { garantirApp(); definirPerfil('admin', true); window.abrirEscalaPrioridade(); },
    chathist: function () { garantirApp(); window.abrirChatHistorico(); },
    senha: function () { garantirApp(); $('trocar-overlay').classList.add('open'); },
    menu: function () { garantirApp(); setTimeout(abrirMenuStatus, 0); },
    ganhos: function () { garantirApp(); abrirGanhosDemo('ok'); },
    ganhos404: function () { garantirApp(); abrirGanhosDemo('indisponivel'); }
  };
  function fecharModais() {
    qsa('.modal-overlay.open,.chat-hist-overlay.open,.trocar-overlay.open,.fila-preview.open').forEach(function (m) { m.classList.remove('open'); });
  }
  function garantirApp() {
    fecharModais();
    if ($('screen-app').style.display !== 'block') entrar();
  }
  function limparAtend() {
    estado.slots = []; estado.ativo = -1; estado.historico = null; pararTimer();
    document.body.classList.remove('chat-fullscreen'); $('chat-pip').classList.remove('visivel');
    atualizarPlantaoUI(); renderSlots(); renderTudo(); mostrarEstadoMain();
  }
  function abrirAtend() {
    garantirApp(); estado.plantao = true; atualizarPlantaoUI();
    if (!estado.slots.length || estado.historico) { estado.historico = null; window.assumirAtendimento(estado.slots.length ? estado.slots[0].p.id : 'd1'); }
  }
  function aplicarTela(nome) {
    fecharModais(); window.fecharSidebarMobile();
    (TELAS[nome] || TELAS.fila)();
    var sel = $('demo-tela'); if (sel) sel.value = nome;
  }

  function montarBarra() {
    var bar = $('demo-bar'); if (!bar) return;
    $('demo-tela').addEventListener('change', function (e) { aplicarTela(e.target.value); });
    $('demo-modal').addEventListener('change', function (e) { var v = e.target.value; e.target.value = ''; if (MODAIS[v]) MODAIS[v](); });
    qsa('[data-demo-perfil]').forEach(function (b) { b.addEventListener('click', function () { garantirApp(); definirPerfil(b.getAttribute('data-demo-perfil')); }); });
    $('demo-tema').addEventListener('click', function () { if (window.cjPanelTheme) window.cjPanelTheme.alternar(); });
    $('demo-mobile').addEventListener('click', abrirFrameMobile);
    $('demo-recolher').addEventListener('click', function () { bar.classList.toggle('is-min'); $('demo-recolher').setAttribute('aria-expanded', bar.classList.contains('is-min') ? 'false' : 'true'); });
  }
  function abrirFrameMobile() {
    var tema = document.documentElement.getAttribute('data-theme');
    var tela = ($('demo-tela') || {}).value || 'chat';
    var url = location.pathname.split('/').pop() + '?embed=1&tema=' + tema + '&perfil=' + estado.perfil + '&tela=' + tela;
    var ov = $('demo-frame'); var f = $('demo-frame-iframe');
    f.src = url; ov.classList.add('open');
  }
  window.fecharFrameMobile = function () { $('demo-frame').classList.remove('open'); $('demo-frame-iframe').src = 'about:blank'; };

  // ── Inicialização ────────────────────────────────────────────────────────
  function init() {
    var q = new URLSearchParams(location.search);
    if (q.get('embed') === '1') document.documentElement.classList.add('demo-embed');
    $('btn-login').addEventListener('click', entrar);
    ['inp-email', 'inp-senha', 'inp-admin-pwd'].forEach(function (id) { var el = $(id); if (el) el.addEventListener('keydown', function (e) { if (e.key === 'Enter') entrar(); }); });
    $('chat-medico-textarea').addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); window.enviarMensagemMedico(); } });
    $('inp-email').value = 'medico.demo@example.com';
    $('inp-senha').value = 'demo-sem-senha';
    definirPerfil(q.get('perfil') === 'admin' ? 'admin' : 'medico', true);
    atualizarPlantaoUI(); ajustarMobile(); montarBarra();
    var tela = q.get('tela') || 'login';
    if (tela !== 'login') aplicarTela(tela); else { var sel = $('demo-tela'); if (sel) sel.value = 'login'; }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
