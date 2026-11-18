// Testes da camada v16 (abas compactas, ocultar só na barra, menu ⋯, composer, ganhos, histórico).
// Usa demo-review.html (dados fictícios) e index.html estático. TODA requisição fora do
// servidor local 127.0.0.1 é abortada — nada sai para a API real.
// Uso: PW=/caminho/para/node_modules/playwright node scripts/test_painel_v16.mjs [pasta_screenshots]
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import url from 'url';
import http from 'http';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW || 'playwright');
const RAIZ = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), '..');
const SHOTS = process.argv[2] || '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

let falhas = 0, oks = 0;
const ok = (c, msg) => { if (c) { oks++; console.log('  ✓ ' + msg); } else { falhas++; console.log('  ✗ ' + msg); } };

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

async function abrir(w, h, arquivo, query = '') {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 769 });
  const page = await ctx.newPage();
  const externas = [], erros = [];
  await page.route('**/*', r => { const u = r.request().url(); if (u.startsWith(BASE)) return r.continue(); externas.push(u); return r.abort(); });
  page.on('pageerror', e => erros.push(String(e)));
  await page.goto(BASE + arquivo + query);
  await page.waitForTimeout(300);
  return { page, ctx, externas, erros };
}
const escolher = (page, sel, v) => page.evaluate(([s, v]) => { const e = document.querySelector(s); e.value = v; e.dispatchEvent(new Event('change', { bubbles: true })); }, [sel, v]);
const shot = async (page, nome) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, nome + '.png') }); };
const semRolagemH = page => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
const dentro = (page, sel) => page.evaluate(s => [...document.querySelectorAll(s)].filter(e => e.offsetParent).every(e => {
  const r = e.getBoundingClientRect(); return r.left >= -0.5 && r.right <= window.innerWidth + 0.5 && r.width > 0;
}), sel);

// ── 1. Unidade: rótulos curtos e homônimos ────────────────────────────────
console.log('rótulos curtos');
{
  const { page, ctx } = await abrir(1280, 800, 'demo-review.html');
  const r = await page.evaluate(() => {
    const u = window.cjSlotsUI;
    return {
      a: u.rotuloCurto('Juliana Martins'), b: u.rotuloCurto('Carlos Eduardo Nascimento de Albuquerque Nunes'), c: u.rotuloCurto('Ana Beatriz Lima'),
      d: u.rotuloCurto('JOÃO DA SILVA FILHO'), e: u.rotuloCurto('Maria'),
      hom: u.rotulosUnicos(['Ana Beatriz Lima', 'Ana Luíza Lima', 'Carlos Nunes']),
      hom2: u.rotulosUnicos(['Ana Lima', 'Ana Lopes']),
      igual: u.rotulosUnicos(['Ana Lima', 'Ana Lima'])
    };
  });
  ok(r.a === 'Juliana M.' && r.b === 'Carlos N.' && r.c === 'Ana L.', 'Primeiro nome + inicial do último sobrenome');
  ok(r.d === 'João S.', 'caixa normalizada e sufixo "Filho" ignorado');
  ok(r.e === 'Maria', 'nome único sem sobrenome');
  ok(r.hom[0] !== r.hom[1] && r.hom[2] === 'Carlos N.', 'homônimos desambiguados: ' + r.hom.join(' | '));
  ok(r.hom2[0] === 'Ana Lima' && r.hom2[1] === 'Ana Lopes', 'mesma inicial → sobrenome completo: ' + r.hom2.join(' | '));
  ok(r.igual[0] !== r.igual[1], 'nomes idênticos numerados: ' + r.igual.join(' | '));
  await ctx.close();
}

// ── 2. Demo mobile: abas, ocultar, alertas, menu ⋯, composer ─────────────
for (const w of [320, 375, 390, 430]) {
  for (const tema of ['light', 'dark']) {
    console.log(`demo mobile ${w}px · ${tema}`);
    const { page, ctx, externas, erros } = await abrir(w, 760, 'demo-review.html', `?embed=1&tema=${tema}&tela=multi`);
    ok(await page.isVisible('#slot-tabs') && (await page.$$('#slot-tabs .slot-tab-btn')).length === 4, '4 abas visíveis no chat fullscreen');
    const nomes = await page.$$eval('#slot-tabs .slot-name', l => l.map(e => e.textContent.trim()));
    ok(!nomes.some(n => /Atual/.test(n)), 'sem texto "Atual": ' + nomes.join(' | '));
    ok(nomes.includes('Carlos N.') && nomes.includes('Juliana M.'), 'nomes curtos (Carlos N., Juliana M.)');
    ok(new Set(nomes).size === nomes.length, 'rótulos únicos com homônimos (Ana)');
    ok(await page.$eval('#slot-tabs .slot-tab-btn.active', e => /Ana Beatriz Lima/.test(e.getAttribute('aria-label')) && e.getAttribute('aria-pressed') === 'true'), 'aria-label com nome completo na ativa');
    ok((await page.textContent('#cmh-nome')).trim() === 'Ana Beatriz Lima', 'nome completo no cabeçalho do chat');
    ok(await page.$$eval('#slot-tabs .slot-tab-btn', l => l.every(b => b.getBoundingClientRect().height <= 40)), 'abas compactas (≤ 40px)');
    ok(await semRolagemH(page), 'sem rolagem horizontal da página');
    ok(await dentro(page, '#chat-mobile-header .cmh-btn, #chat-mobile-header .cmh-back'), 'botões do cabeçalho dentro da tela');
    ok(!(await page.isVisible('#chat-mobile-header .cmh-btn.red')), 'Encerrar fora da linha de botões (está no menu)');
    ok(!(await page.isVisible('.nav .cj-fin-direct')) && await page.$eval('#cj-status-pop #cj-menu-ganhos', el => el.getAttribute('role') === 'menuitem'), 'Ganhos no menu pessoal, acessível também durante o chat');
    ok(await page.$eval('#chat-mobile-header .cj16-dados', e => e.getAttribute('aria-label') === 'Dados do paciente'), 'Dados com aria-label');
    // Composer: cresce até 104px, sem rolagem horizontal
    const ta = page.locator('#chat-medico-textarea');
    const h0 = await ta.evaluate(e => e.getBoundingClientRect().height);
    await ta.fill('linha\n'.repeat(12));
    await ta.dispatchEvent('input');
    const h1 = await ta.evaluate(e => e.getBoundingClientRect().height);
    ok(h0 <= 42 && h1 > h0 && h1 <= 104.5, `textarea cresce ${Math.round(h0)}→${Math.round(h1)}px (máx 104)`);
    ok(await page.evaluate(() => { const c = document.querySelector('.chat-medico-input').getBoundingClientRect(); return c.bottom <= window.innerHeight + 0.5 && c.right <= window.innerWidth + 0.5; }), 'composer inteiro no viewport');
    await ta.fill('');
    await ta.dispatchEvent('input');
    await shot(page, `v16-${w}-${tema}-multi`);
    // Menu ⋯ → Encerrar abre a confirmação com nome
    await page.tap('#chat-mobile-header .cj16-more-btn');
    ok(await page.isVisible('#chat-mobile-header .cj16-menu'), 'menu ⋯ abre');
    ok(await dentro(page, '#chat-mobile-header .cj16-menu'), 'menu ⋯ dentro da tela');
    ok((await page.textContent('#chat-mobile-header .cj16-menu [data-acao="encerrar"]')).includes('Ana Beatriz Lima'), 'Encerrar no menu mostra o nome completo');
    await shot(page, `v16-${w}-${tema}-menu`);
    await page.tap('#chat-mobile-header .cj16-menu [data-acao="encerrar"]');
    ok(await page.isVisible('#modal-encerrar.open') && (await page.textContent('#modal-encerrar .cj16-encerrar-nome')).includes('Ana Beatriz Lima'), 'modal de encerrar (confirmação) com nome do paciente');
    await page.evaluate(() => window.fecharModal());
    // Ocultar da barra (ativo) → troca aba, consulta permanece
    await page.tap('#chat-mobile-header .cj16-more-btn');
    await page.tap('#chat-mobile-header .cj16-menu [data-acao="ocultar"]');
    ok((await page.$$('#slot-tabs .slot-tab-btn')).length === 3 && await page.isVisible('#slot-tabs .cj16-slot-more'), 'ocultar: 3 abas + chip "+1"');
    ok((await page.textContent('#slot-tabs .cj16-slot-more')).includes('+1'), 'chip mostra +1');
    ok(await page.evaluate(() => typeof window.cjSlotsUI.ocultos === 'function' && window.cjSlotsUI.ocultos().length === 1), 'estado oculto só no cliente');
    // Não deixa a barra vazia
    await page.evaluate(() => { window.cjSlotsUI.ocultar('d2'); window.cjSlotsUI.ocultar('d3'); window.cjSlotsUI.ocultar('d5'); });
    ok((await page.$$('#slot-tabs .slot-tab-btn')).length >= 1, 'último atendimento nunca fica invisível');
    // Mensagem nova em oculto: alerta no "+N"
    const ocultoId = await page.evaluate(() => window.cjSlotsUI.ocultos()[0]);
    await page.evaluate(id => window.demoMensagemPaciente(id), ocultoId);
    ok(await page.$eval('#slot-tabs .cj16-slot-more', e => e.classList.contains('is-alert') && /mensagem nova/.test(e.getAttribute('aria-label'))), 'alerta de mensagem nova no "+N" (oculto)');
    // Folha: restaurar
    await page.tap('#slot-tabs .cj16-slot-more');
    ok(await page.isVisible('#cj16-atendimentos .cj16-sheet-panel'), 'folha "Atendimentos ativos" abre');
    ok(await dentro(page, '#cj16-atendimentos .cj16-sheet-panel'), 'folha dentro da tela');
    ok((await page.$$('#cj16-atendimentos .cj16-sheet-item')).length === 4, 'folha lista todos os 4 atendimentos');
    ok(!/\d{3}\.\d{3}|\(85\)/.test(await page.textContent('#cj16-atendimentos')), 'folha sem CPF/telefone');
    await shot(page, `v16-${w}-${tema}-folha`);
    await page.tap(`#cj16-atendimentos button[data-acao="abrir"][data-id="${ocultoId}"]`);
    ok(!(await page.isVisible('#cj16-atendimentos')), 'Abrir fecha a folha');
    ok(await page.$eval('#slot-tabs .slot-tab-btn.active', e => e.getAttribute('title')) !== null && !(await page.evaluate(id => window.cjSlotsUI.ocultos().includes(id), ocultoId)), 'aberto pela folha volta à barra');
    // Abrir pela fila restaura exibição
    const outro = await page.evaluate(() => window.cjSlotsUI.ocultos()[0]);
    if (outro) {
      await page.evaluate(id => window.assumirAtendimento(id), outro);
      ok(!(await page.evaluate(id => window.cjSlotsUI.ocultos().includes(id), outro)), 'abrir pela fila restaura a aba');
    }
    ok(await semRolagemH(page), 'sem rolagem horizontal após ocultar/restaurar');
    ok(externas.length === 0, 'nenhuma requisição externa');
    ok(erros.length === 0, 'sem erros JS' + (erros.length ? ': ' + erros.join(' | ') : ''));
    await ctx.close();
  }
}

// ── 3. Demo: tela "ocultos" e desktop ──────────────────────────────────
for (const tema of ['light', 'dark']) {
  console.log(`demo desktop · ${tema}`);
  const { page, ctx, erros } = await abrir(1366, 860, 'demo-review.html', `?tema=${tema}&tela=ocultos`);
  ok((await page.$$('#slot-tabs .slot-tab-btn')).length === 2 && (await page.textContent('#slot-tabs .cj16-slot-more')).includes('+2'), 'desktop: 2 abas + "+2" ocultos');
  ok(await page.$eval('#slot-tabs .cj16-slot-more', e => e.classList.contains('is-alert')), 'desktop: alerta de nova mensagem em oculto');
  ok(await page.$eval('#slot-tabs .cj16-slot-more .slot-badge-nova', e => e.textContent.trim() === '2'), 'contador real (2 mensagens)');
  ok(await page.isVisible('#atend-actions-live .cj16-more-btn'), 'desktop: menu ⋯ no cabeçalho');
  ok(await page.isVisible('#atend-actions-live .btn-encerrar'), 'desktop: Encerrar permanece visível');
  await shot(page, `v16-desk-${tema}-ocultos`);
  await page.click('#atend-actions-live .cj16-more-btn');
  ok(await page.isVisible('#atend-actions-live .cj16-menu [data-acao="lista"]'), 'desktop: menu lista Atendimentos ativos');
  await page.keyboard.press('Escape');
  ok(!(await page.isVisible('#atend-actions-live .cj16-menu')), 'Esc fecha o menu');
  // Ganhos: Dia X de Y e repasse em destaque
  await escolher(page, '#demo-modal', 'ganhos');
  await page.waitForSelector('#cj-ganhos .cj-fin-summary');
  const tg = await page.textContent('#cj-ganhos');
  ok(/Dia 2 de 15/.test(tg), 'ganhos: legenda "Dia 2 de 15"');
  ok(/Repasse previsto/.test(tg) && /01\/12\/2026/.test(tg), 'ganhos: repasse previsto em destaque');
  ok(!/meta/i.test(tg) && !/%/.test(tg), 'ganhos: sem meta nem percentual');
  await shot(page, `v16-desk-${tema}-ganhos`);
  await page.keyboard.press('Escape');
  // Histórico: linhas sem CPF/telefone/médico
  await escolher(page, '#demo-tela', 'historico');
  await page.waitForTimeout(200);
  const hist = await page.$$eval('#hist-lista .cj-hist-minimal', l => l.map(e => e.textContent));
  ok(hist.length > 0 && hist.every(t => !/\d{3}\.\d{3}|\(85\)|Dr\.|Dra\./.test(t)), 'histórico em linhas sem CPF/telefone/médico');
  await shot(page, `v16-desk-${tema}-historico`);
  ok(erros.length === 0, 'sem erros JS' + (erros.length ? ': ' + erros.join(' | ') : ''));
  await ctx.close();
}

// ── 4. Fuso de Fortaleza (bug UTC) ─────────────────────────────────────
console.log('fuso America/Fortaleza');
{
  const { page, ctx } = await abrir(800, 600, 'demo-review.html');
  const r = await page.evaluate(() => ({
    noite: window.cjHojeFortaleza(new Date('2026-11-17T23:30:00-03:00')),
    madrugada: window.cjHojeFortaleza(new Date('2026-11-18T00:10:00-03:00')),
    utc: new Date('2026-11-17T23:30:00-03:00').toISOString().slice(0, 10)
  }));
  ok(r.noite === '2026-11-17' && r.utc === '2026-11-18', '23:30 em Fortaleza continua 17/11 (UTC diria 18/11)');
  ok(r.madrugada === '2026-11-18', '00:10 em Fortaleza já é 18/11');
  await ctx.close();
}

// ── 5. index.html real: abas via v16 mantendo ativarSlot ───────────────
console.log('index.html (real, rede bloqueada)');
{
  const { page, ctx, externas } = await abrir(390, 800, 'index.html');
  await page.evaluate(() => {
    slots[0] = { atendimento: { id: 11, nome: 'Maria Aparecida dos Santos Oliveira Pereira', tipo: 'chat' } };
    slots[1] = { atendimento: { id: 12, nome: 'João Pedro', tipo: 'video' }, temMsgNova: true, naoLidas: 3 };
    slotAtivo = 0; renderSlotTabs();
  });
  const nomes = await page.$$eval('#slot-tabs .slot-name', l => l.map(e => e.textContent.trim()));
  ok(nomes.join('|') === 'Maria P.|João P.', 'real: rótulos curtos ' + nomes.join(' | '));
  ok(await page.$eval('#slot-tabs .slot-tab-btn:nth-child(2)', e => /3 mensagens novas/.test(e.getAttribute('aria-label')) && e.querySelector('.slot-badge-nova').textContent === '3'), 'real: contador de não lidas (3)');
  await page.evaluate(() => { window.ativarSlot = i => { slotAtivo = i; slots[i].temMsgNova = false; slots[i].naoLidas = 0; renderSlotTabs(); }; });
  await page.$eval('#slot-tabs .slot-tab-btn:nth-child(2)', e => e.click());
  ok(await page.evaluate(() => slotAtivo === 1), 'real: clique na aba chama ativarSlot(i)');
  ok(!externas.some(u => /\/api\/(chat|atendimento|plantao)/.test(u)), 'real: renderizar/trocar abas não chama API');
  ok(await page.$eval('meta[name=viewport]', e => /interactive-widget=resizes-content/.test(e.content)), 'real: viewport ajusta ao teclado virtual');
  await ctx.close();
}

await browser.close();
server.close();
console.log(`\n${oks} ok, ${falhas} falha(s)`);
process.exit(falhas ? 1 : 0);
