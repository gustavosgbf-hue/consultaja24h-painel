// Testes visuais/funcionais do painel v6 (demo-review.html + index.html estático).
// TODA requisição fora do servidor local 127.0.0.1 é abortada — nenhuma chamada sai para a API real.
// Uso: PW=/caminho/para/node_modules/playwright node scripts/test_painel_v6.mjs [pasta_screenshots]
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import url from 'url';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || 'playwright');
const RAIZ = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const SHOTS = process.argv[2] || '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

let falhas = 0, oks = 0;
const ok = (c, msg) => { if (c) { oks++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ ' + msg); } };

async function novaPagina(browser, w, h, arquivo, query = '') {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 769 });
  const page = await ctx.newPage();
  const externas = [];
  const erros = [];
  await page.route('**/*', r => { const u = r.request().url(); if (u.startsWith(BASE)) return r.continue(); externas.push(u); return r.abort(); });
  page.on('pageerror', e => erros.push(String(e)));
  await page.goto(BASE + arquivo + query);
  await page.waitForTimeout(250);
  return { page, ctx, externas, erros };
}
const shot = async (page, nome) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); };

async function semRolagemHorizontal(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}
async function dentroDaTela(page, sel) {
  return page.evaluate(s => [...document.querySelectorAll(s)].filter(e => e.offsetParent).every(e => {
    const r = e.getBoundingClientRect(); return r.left >= -0.5 && r.right <= window.innerWidth + 0.5 && r.width > 0;
  }), sel);
}
async function semReticencias(page, sel) {
  return page.evaluate(s => [...document.querySelectorAll(s)].filter(e => e.offsetParent).every(e => e.scrollWidth <= e.clientWidth + 1 && getComputedStyle(e).textOverflow !== 'ellipsis'), sel);
}

// Servidor estático local só para os arquivos do repositório (index.html usa caminhos absolutos).
import http from 'http';
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '') || 'index.html';
  const arq = path.join(RAIZ, rel);
  if (!arq.startsWith(RAIZ) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(arq)] || 'application/octet-stream' });
  fs.createReadStream(arq).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const BASE = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch();

// ── 1. index.html real (estático, rede bloqueada) ────────────────────────────
console.log('index.html (real, rede bloqueada)');
{
  const { page, ctx, externas, erros } = await novaPagina(browser, 1280, 800, 'index.html');
  ok((await page.textContent('#screen-login .cj-wordmark')).trim() === 'ConsultaJá24h', 'wordmark exato no login');
  ok(await page.$eval('#screen-login .cj-wordmark', e => getComputedStyle(e).fontStyle === 'normal'), 'wordmark sem itálico');
  ok((await page.$$('svg.cj-mark')).length === 0, 'sem ícone quadrado de marca');
  ok((await page.textContent('.login-title')).trim() === 'Acesso médico', 'título "Acesso médico"');
  ok(!(await page.content()).includes('com foco'), 'headline antiga removida');
  const sw = page.locator('#screen-login .cj-theme-toggle');
  ok(await sw.getAttribute('role') === 'switch', 'tema no login é role=switch');
  const t0 = await page.getAttribute('html', 'data-theme');
  await sw.click();
  const t1 = await page.getAttribute('html', 'data-theme');
  ok(t0 !== t1 && (await sw.getAttribute('aria-checked')) === String(t1 === 'dark'), 'switch alterna tema e aria-checked');
  ok(/Tema (claro|escuro)/.test(await sw.getAttribute('aria-label')), 'aria-label claro/escuro');
  await shot(page, 'real-login-desktop');
  ok(await page.$eval('#cj-menu-ganhos', e => !e.disabled && !e.hasAttribute('aria-disabled') && e.getAttribute('aria-haspopup') === 'dialog' && !!e.querySelector('svg')), 'Ganhos habilitado no sistema real, com ícone SVG $');

  // Sessão simulada (dados fictícios), rede abortada: valida que NÃO há autoconexão de plantão.
  await page.evaluate(() => { localStorage.setItem('token', 'teste-local'); localStorage.setItem('medico', JSON.stringify({ id: 0, nome: 'Dra. Teste Fictícia', email: 'teste@example.com', status_online: false })); });
  await page.reload(); await page.waitForTimeout(600);
  ok(!externas.some(u => u.includes('/api/plantao/entrar')), 'nenhuma chamada a /api/plantao/entrar no carregamento');
  ok(!externas.some(u => u.includes('/api/medico/ganhos')), 'nenhuma chamada a /api/medico/ganhos no carregamento');
  ok(await page.$eval('#btn-plantao', e => e.classList.contains('offline')), 'plantão permanece offline sem clique');
  ok(await page.$eval('#cj-status-menu', e => e.dataset.plantao === 'off'), 'badge "fora do plantão"');
  ok(await page.$eval('#cj-status-pop', e => e.hidden), 'menu fechado por padrão');
  await page.click('#cj-status-btn');
  ok(await page.$eval('#cj-status-pop', e => !e.hidden) && await page.isVisible('#btn-plantao'), 'menu abre e mostra ação de plantão');
  await shot(page, 'real-menu-status');
  await page.click('#btn-plantao'); await page.waitForTimeout(200);
  ok(externas.some(u => u.includes('/api/plantao/entrar')), 'clique explícito chama togglePlantao (requisição abortada no teste)');
  ok(await page.$eval('#cj-status-menu', e => e.dataset.plantao === 'on') && (await page.textContent('#plantao-txt')) === 'Sair do plantão', 'badge reflete plantão ativo');
  ok(await page.$eval('#cj-status-pop', e => e.hidden), 'menu fecha após a ação');
  // Slots reais: renderSlotTabs com objetos fictícios
  await page.evaluate(() => { slots[0] = { atendimento: { nome: 'Maria Aparecida dos Santos Oliveira Pereira', tipo: 'chat' } }; slots[1] = { atendimento: { nome: 'João Pedro', tipo: 'video' }, temMsgNova: true }; slotAtivo = 0; renderSlotTabs(); });
  const nomes = await page.$$eval('#slot-tabs .slot-name', l => l.map(e => e.textContent.trim()));
  ok(nomes[0] === 'Maria Aparecida dos Santos Oliveira Pereira', 'renderSlotTabs real usa nome completo');
  ok(await page.$eval('#slot-tabs .slot-tab-btn:nth-child(2)', e => e.getAttribute('onclick') === 'ativarSlot(1)' && /nova mensagem/.test(e.getAttribute('aria-label'))), 'troca de slot mantém ativarSlot(i) + aria');

  // Ganhos real: apiFetch('/api/medico/ganhos') só por clique explícito. Rota mockada localmente (nada sai para a rede).
  const ganhosReqs = [];
  let ganhosResp = { status: 404, contentType: 'text/html; charset=utf-8', body: '<pre>Cannot GET /api/medico/ganhos</pre>' };
  await page.route('**/api/medico/ganhos', r => { ganhosReqs.push({ url: r.request().url(), auth: r.request().headers()['authorization'] || '' }); return r.fulfill(ganhosResp); });
  await page.waitForTimeout(300);
  ok(ganhosReqs.length === 0, 'ganhos: nenhuma requisição sem clique');
  await page.click('#cj-status-btn'); await page.click('#cj-menu-ganhos');
  await page.waitForSelector('#cj-ganhos .cj-g-empty');
  ok(ganhosReqs.length === 1 && ganhosReqs[0].url === 'https://triagem-api.onrender.com/api/medico/ganhos' && ganhosReqs[0].auth === 'Bearer teste-local', 'clique faz 1 GET via apiFetch com token');
  const txt404 = await page.textContent('#cj-ganhos');
  ok(/indisponíveis/.test(txt404) && /ainda não foi publicado/.test(txt404), '404: estado "indisponível" explicado');
  ok(!/R\$|0,00/.test(txt404), '404: nenhum valor (sem zero enganoso)');
  ok(await page.$eval('#cj-ganhos .modal', e => e.getAttribute('role') === 'dialog' && e.getAttribute('aria-modal') === 'true'), 'modal acessível (role=dialog, aria-modal)');
  await page.waitForTimeout(300); await shot(page, 'real-ganhos-404');
  await page.keyboard.press('Escape');
  ok(await page.$eval('#cj-ganhos', e => !e.classList.contains('open')), 'Esc fecha o modal de ganhos');
  ok(await page.evaluate(() => document.activeElement && document.activeElement.id === 'cj-status-btn'), 'foco volta ao botão de status');
  ok(await page.$eval('#cj-status-pop', e => e.hidden), 'menu de status fechado após abrir ganhos');
  ganhosResp = { status: 200, contentType: 'application/json', body: JSON.stringify({
    ok: true, natureza: 'estimativa', moeda: 'BRL', aviso: 'x', periodo: { inicio: '2026-11-16', ate: '2026-11-17', fuso: 'America/Fortaleza' },
    valor_por_atendimento_centavos: 3493,
    hoje: { data: '2026-11-17', atendimentos: 3, valor_centavos: 10479 },
    total: { atendimentos: 1234, valor_centavos: 4310362, situacao: 'pendente_estimado' },
    por_dia: [], quinzenas: [
      { id: '2026-11-Q2', inicio: '2026-11-16', fim: '2026-11-30', atendimentos: 1234, valor_centavos: 4310362, situacao: 'pendente_estimado', data_pagamento: null, data_pagamento_status: 'a_definir' }],
    pagamento: { regra_definida: false, data_prevista: null, status: 'a_definir' }, nao_contabilizados: { total: 2, motivos: { estorno: 2 } },
    atualizado_em: '2026-11-17T18:00:00.000Z' }) };
  await page.click('#cj-status-btn'); await page.click('#cj-menu-ganhos');
  await page.waitForSelector('#cj-ganhos .cj-fin-ringcard');
  const t200 = await page.textContent('#cj-ganhos');
  ok(ganhosReqs.length === 2, 'reabrir = nova ação explícita = nova requisição');
  ok(t200.includes('R$\u00a0104,79') && t200.includes('R$\u00a043.103,62') && /3 atendimentos contabilizados hoje/.test(t200), 'valores do backend exibidos sem recalcular');
  ok(!t200.includes('34,93') && !/%|faixa|percentual/i.test(t200), 'sem percentual/faixa/valor unitário');
  ok(/data a definir/.test(t200) && /16\/11\/2026/.test(t200) && /2ª quinzena · nov\/2026/.test(t200), 'quinzena, desde 16/11 e pagamento a definir');
  await page.waitForTimeout(300); await shot(page, 'real-ganhos-ok');
  await page.click('#cj-ganhos .cj-g-actions .btn-confirm');
  ok(await page.$eval('#cj-ganhos', e => !e.classList.contains('open')), 'botão Fechar fecha o modal');
  ok(erros.length === 0, 'sem erros JS (' + erros.join(' | ') + ')');
  await ctx.close();
}

// ── 2. demo-review.html: desktop ─────────────────────────────────────────────
console.log('demo-review.html (desktop)');
{
  const { page, ctx, externas, erros } = await novaPagina(browser, 1366, 860, 'demo-review.html');
  await shot(page, 'demo-login-desktop');
  await page.click('#btn-login');
  await page.click('#demo-recolher');
  ok(await page.$eval('#cj-status-menu', e => e.dataset.plantao === 'off'), 'demo: login não liga plantão');
  ok(!(await page.isVisible('#renov-tab-btn')), 'médico: renovações ocultas');
  await page.click('[data-demo-perfil="admin"]');
  ok(await page.isVisible('#renov-tab-btn'), 'admin: renovações visíveis');
  await page.click('[data-demo-perfil="medico"]');
  ok(!(await page.isVisible('#renov-tab-btn')) && !(await page.isVisible('#renov-lista')), 'volta a médico: renovações ocultas de novo');
  await page.selectOption('#demo-tela', 'fila');
  ok(await semReticencias(page, '.pc-nome'), 'fila: nomes completos sem reticências');
  ok((await page.textContent('#fila-lista')).includes('Carlos Eduardo Nascimento de Albuquerque Nunes'), 'nome longo exibido inteiro');
  await shot(page, 'demo-fila-desktop');
  await page.selectOption('#demo-tela', 'multi');
  ok((await page.$$('#slot-tabs .slot-tab-btn')).length === 2, 'dois atendimentos simultâneos (limite 2 mantido)');
  await page.evaluate(() => window.assumirAtendimento('d3'));
  ok((await page.$$('#slot-tabs .slot-tab-btn')).length === 2, 'terceiro paciente recusado (sem aumentar capacidade)');
  ok(await page.isVisible('.cj-demo-prev') && (await page.textContent('.cj-demo-prev')).includes('fictício'), 'histórico anterior só ilustrativo e rotulado');
  ok(!/Dr\.|Dra\./.test(await page.textContent('.cj-demo-prev')), 'histórico sem nome de médico');
  await shot(page, 'demo-multi-desktop');
  // PiP × modal encerrar
  await page.evaluate(() => window.switchTab('clinico'));
  ok(await page.$eval('#chat-pip', e => e.classList.contains('visivel') && getComputedStyle(e).visibility === 'visible'), 'PiP visível fora da aba consulta');
  await page.evaluate(() => window.abrirModalEncerrar());
  await page.waitForTimeout(250);
  ok(await page.$eval('#chat-pip', e => getComputedStyle(e).visibility === 'hidden'), 'PiP oculto com modal encerrar aberto');
  ok(await page.$eval('#chat-pip', e => e.classList.contains('visivel')), 'estado do PiP preservado (classe visivel intacta)');
  const zOk = await page.evaluate(() => +getComputedStyle(document.getElementById('modal-encerrar')).zIndex > +getComputedStyle(document.getElementById('chat-pip')).zIndex);
  ok(zOk, 'modal acima do PiP (z-index)');
  const topo = await page.evaluate(() => { const b = document.querySelector('#modal-encerrar .btn-confirm'); const r = b.getBoundingClientRect(); return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === b; });
  ok(topo, 'botão Confirmar encerramento clicável (nada por cima)');
  await shot(page, 'demo-encerrar-desktop');
  await page.click('#modal-encerrar .btn-cancel');
  await page.waitForTimeout(300);
  ok(await page.$eval('#chat-pip', e => getComputedStyle(e).visibility === 'visible'), 'PiP volta ao fechar o modal');
  // Ganhos (demo)
  await page.click('#cj-status-btn'); await page.click('#cj-menu-ganhos');
  await page.waitForSelector('#cj-ganhos .cj-fin-ringcard');
  const tg = await page.textContent('#cj-ganhos');
  ok(tg.includes('fictícios'), 'ganhos (demo) rotulado como fictício');
  ok(tg.includes('R$\u00a0244,51') && tg.includes('R$\u00a0558,88') && /7 atendimentos contabilizados hoje/.test(tg) && /16 atendimentos/.test(tg), 'demo: dados fictícios consistentes');
  ok(!/%|faixa/i.test(tg), 'demo: sem percentual/faixa');
  await shot(page, 'demo-ganhos');
  await page.keyboard.press('Escape');
  ok(await page.$eval('#cj-ganhos', e => !e.classList.contains('open')), 'demo: Esc fecha ganhos');
  await page.selectOption('#demo-modal', 'ganhos404');
  await page.waitForSelector('#cj-ganhos .cj-g-empty');
  ok(!/R\$/.test(await page.textContent('#cj-ganhos .cj-g-body')), 'demo 404: indisponível sem valores');
  await shot(page, 'demo-ganhos-404');
  await page.keyboard.press('Escape');
  const infinitas = await page.evaluate(() => document.getAnimations().filter(a => a.effect && a.effect.getTiming().iterations === Infinity).length);
  ok(infinitas === 0, 'nenhuma animação infinita ativa (' + infinitas + ')');
  ok(externas.length === 0, 'demo sem requisições externas');
  ok(erros.length === 0, 'sem erros JS (' + erros.join(' | ') + ')');
  await ctx.close();
}

// ── 3. demo mobile 320/375/390/430 × claro/escuro ────────────────────────────
for (const w of [320, 375, 390, 430]) {
  for (const tema of ['light', 'dark']) {
    console.log(`demo mobile ${w}px · ${tema}`);
    const { page, ctx, erros } = await novaPagina(browser, w, 760, 'demo-review.html', `?embed=1&tema=${tema}&tela=multi`);
    ok(await page.evaluate(() => document.body.classList.contains('chat-fullscreen')), 'chat em fullscreen');
    ok(await page.isVisible('#slot-tabs') && (await page.$$('#slot-tabs .slot-tab-btn')).length === 2, 'abas de atendimentos visíveis no fullscreen');
    const ordem = await page.evaluate(() => document.getElementById('slot-tabs').getBoundingClientRect().top >= document.getElementById('chat-mobile-header').getBoundingClientRect().bottom - 1);
    ok(ordem, 'abas logo abaixo do header compacto');
    ok(await semReticencias(page, '#slot-tabs .slot-name, #cmh-nome'), 'nomes completos nas abas e no header');
    ok(await dentroDaTela(page, '#chat-mobile-header .cmh-btn'), 'Dados/Prescrever/Encerrar dentro da tela');
    ok((await page.textContent('#chat-mobile-header .cmh-btn.red')).trim() === 'Encerrar', '"Encerrar" por extenso');
    ok(await page.$$eval('#chat-mobile-header .cmh-btn', l => l.every(b => b.scrollWidth <= b.clientWidth + 1)), 'rótulos dos botões não cortados');
    ok(await semRolagemHorizontal(page), 'sem rolagem horizontal');
    await shot(page, `mob-${w}-${tema}-multi`);
    // troca de slot com 1 toque
    await page.tap('#slot-tabs .slot-tab-btn:nth-child(2)');
    ok(await page.$eval('#slot-tabs .slot-tab-btn:nth-child(2)', e => e.classList.contains('active')) && (await page.textContent('#cmh-nome')).includes('Albuquerque'), '1 toque troca de paciente sem voltar à fila');
    ok(await page.evaluate(() => document.body.classList.contains('chat-fullscreen')), 'continua no chat após trocar');
    // modal encerrar em mobile
    await page.tap('#chat-mobile-header .cmh-btn.red');
    await page.waitForTimeout(250);
    const conf = await page.evaluate(() => { const b = document.querySelector('#modal-encerrar .btn-confirm'); const r = b.getBoundingClientRect(); return r.bottom <= innerHeight + 0.5 && r.top >= 0 && document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === b; });
    ok(conf, 'Confirmar encerramento visível e livre em mobile');
    await shot(page, `mob-${w}-${tema}-encerrar`);
    await page.tap('#modal-encerrar .btn-cancel');
    // menu de status
    await page.tap('#cj-status-btn');
    ok(await dentroDaTela(page, '#cj-status-pop'), 'menu de status cabe na tela');
    ok(await semRolagemHorizontal(page), 'nav sem rolagem horizontal');
    await shot(page, `mob-${w}-${tema}-menu`);
    await page.tap('#cj-menu-ganhos');
    await page.waitForSelector('#cj-ganhos .cj-fin-ringcard');
    ok(await dentroDaTela(page, '#cj-ganhos .modal, #cj-ganhos .cj-fin-ringcard, #cj-ganhos .cj-g-actions .btn-confirm'), 'ganhos cabe na tela');
    ok(await semRolagemHorizontal(page), 'ganhos sem rolagem horizontal');
    ok(await page.$eval('#chat-pip', e => getComputedStyle(e).visibility !== 'visible'), 'PiP oculto com ganhos aberto');
    await shot(page, `mob-${w}-${tema}-ganhos`);
    await page.tap('#cj-ganhos .cj-g-close');
    ok(await page.$eval('#cj-ganhos', e => !e.classList.contains('open')), 'X fecha ganhos');
    ok(erros.length === 0, 'sem erros JS (' + erros.join(' | ') + ')');
    await ctx.close();
  }
}

// ── 4. login e fila mobile ───────────────────────────────────────────────────
for (const tema of ['light', 'dark']) {
  const { page, ctx } = await novaPagina(browser, 320, 640, 'demo-review.html', `?embed=1&tema=${tema}&tela=login`);
  console.log(`demo login 320 · ${tema}`);
  ok(await semRolagemHorizontal(page), 'login 320px sem rolagem horizontal');
  ok((await page.textContent('#screen-login .cj-wordmark')).trim() === 'ConsultaJá24h', 'wordmark completo em 320px');
  await shot(page, `mob-320-${tema}-login`);
  await page.goto(BASE + `demo-review.html?embed=1&tema=${tema}&tela=fila`);
  await page.waitForTimeout(300);
  ok(await semReticencias(page, '.pc-nome'), 'fila mobile: nomes completos');
  await shot(page, `mob-320-${tema}-fila`);
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\n${oks} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
