// script.js — Meu Rendimento Driver

// ===== Dados (mesmas chaves de antes, então nada do que já foi salvo se perde) =====
function carregar(chave) {
  try {
    const dados = JSON.parse(localStorage.getItem(chave));
    return Array.isArray(dados) ? dados : [];
  } catch {
    return [];
  }
}

function salvar() {
  try {
    localStorage.setItem('registros', JSON.stringify(registros));
    localStorage.setItem('contas', JSON.stringify(contas));
    localStorage.setItem('kms', JSON.stringify(kms));
  } catch {
    mostrarAviso('Não foi possível salvar no aparelho');
  }
}

function novoId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

let registros = carregar('registros').map(r => ({ ...r, id: r.id || novoId(), valor: Number(r.valor) || 0 }));
let kms = carregar('kms').map(k => ({ ...k, id: k.id || novoId(), km: Number(k.km) || 0 }));
let contas = carregar('contas').map(c => ({ ...c, id: c.id || novoId(), valor: Number(c.valor) || 0, paga: !!c.paga }));

const CATEGORIAS = ['Combustível', 'Peças do carro', 'Manutenção', 'Alimentação', 'Lavagem', 'Outros'];

// ===== Formatação no padrão brasileiro =====
const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numero = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const formatarKm = v => numero.format(v) + ' km';
const dataCurta = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
const dataLonga = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

// "2026-10-20" vira data local (evita o erro de 1 dia do fuso)
function lerData(texto) {
  if (!texto) return null;
  const [a, m, d] = texto.slice(0, 10).split('-').map(Number);
  return new Date(a, m - 1, d);
}

function hojeISO() {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, '0')}-${String(h.getDate()).padStart(2, '0')}`;
}

function diasAte(texto) {
  const hoje = lerData(hojeISO());
  return Math.round((lerData(texto) - hoje) / 86400000);
}

function textoDia(texto) {
  const dias = diasAte(texto);
  if (dias === 0) return 'Hoje';
  if (dias === -1) return 'Ontem';
  if (dias === 1) return 'Amanhã';
  return dataCurta.format(lerData(texto)).replace('.', '');
}

// ===== Ajudantes de tela =====
function el(tag, classe, texto) {
  const e = document.createElement(tag);
  if (classe) e.className = classe;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

const icones = {
  apagar: '<svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12l5 5 9-10"/></svg>'
};

function iconeBotao(nome, rotulo, aoClicar, classeExtra = '') {
  const b = el('button', 'icone-botao ' + classeExtra);
  b.type = 'button';
  b.setAttribute('aria-label', rotulo);
  b.title = rotulo;
  b.innerHTML = icones[nome]; // ícone fixo do próprio app, não vem do usuário
  b.addEventListener('click', aoClicar);
  return b;
}

function vazio(lista, mensagem) {
  lista.append(el('li', 'vazio', mensagem));
}

// ===== Itens =====
function itemRegistro(r, comAcoes) {
  const li = el('li', 'item');
  const simbolo = { ganho: '+', gasto: '−', km: 'KM' }[r.tipo];
  li.append(el('div', 'item-icone ' + r.tipo, simbolo));

  const titulo = r.tipo === 'km'
    ? 'Km rodados'
    : r.descricao || r.categoria || (r.tipo === 'ganho' ? 'Ganho' : 'Gasto');
  const partes = [];
  if (r.categoria && r.descricao) partes.push(r.categoria);
  partes.push(r.data ? textoDia(r.data) : 'Sem data');

  const texto = el('div', 'item-texto');
  texto.append(el('p', 'item-titulo', titulo));
  texto.append(el('p', 'item-sub', partes.join(' · ')));
  li.append(texto);

  const valor = r.tipo === 'km'
    ? formatarKm(r.km)
    : (r.tipo === 'ganho' ? '+ ' : '− ') + moeda.format(r.valor);
  li.append(el('span', 'item-valor ' + r.tipo, valor));

  if (comAcoes) {
    const acoes = el('div', 'item-acoes');
    acoes.append(iconeBotao('apagar', r.tipo === 'km' ? 'Apagar km' : 'Apagar lançamento', () => apagarRegistro(r.id)));
    li.append(acoes);
  }
  return li;
}

function itemConta(c) {
  const dias = diasAte(c.vencimento);
  let estado = '', etiqueta = '';
  if (c.paga) { estado = 'paga'; etiqueta = 'Paga'; }
  else if (dias < 0) { estado = 'vencida'; etiqueta = 'Vencida'; }
  else if (dias <= 3) { estado = 'proxima'; etiqueta = dias === 0 ? 'Vence hoje' : `${dias} dia${dias > 1 ? 's' : ''}`; }

  const li = el('li', 'item ' + estado);
  li.append(el('div', 'item-icone conta', c.nome.charAt(0).toUpperCase()));

  const texto = el('div', 'item-texto');
  const titulo = el('p', 'item-titulo', c.nome);
  texto.append(titulo);
  const quando = textoDia(c.vencimento);
  const sub = el('p', 'item-sub');
  sub.append(el('strong', 'conta-valor', moeda.format(c.valor)));
  sub.append(el('span', '', (/^\d/.test(quando) ? 'vence em ' + quando : 'vence ' + quando.toLowerCase())));
  if (etiqueta) sub.append(el('span', 'etiqueta', etiqueta));
  texto.append(sub);
  li.append(texto);

  const acoes = el('div', 'item-acoes');
  acoes.append(iconeBotao('check', c.paga ? 'Marcar como não paga' : 'Marcar como paga',
    () => alternarPaga(c.id), 'marcar' + (c.paga ? ' feito' : '')));
  acoes.append(iconeBotao('apagar', 'Apagar conta', () => apagarConta(c.id)));
  li.append(acoes);
  return li;
}

// ===== Atualizar a tela =====
function ordenarRegistros() {
  // mais recentes primeiro; os antigos sem data ficam por último, na ordem em que foram lançados
  const todos = [...registros, ...kms.map(k => ({ ...k, tipo: 'km' }))];
  return todos
    .map((r, i) => ({ r, i }))
    .sort((a, b) => (b.r.data || '').localeCompare(a.r.data || '') || b.i - a.i)
    .map(x => x.r);
}

function ordenarContas() {
  return [...contas].sort((a, b) => (a.paga - b.paga) || a.vencimento.localeCompare(b.vencimento));
}

function atualizarTela() {
  // Totais
  let ganhos = 0, gastos = 0;
  registros.forEach(r => { if (r.tipo === 'ganho') ganhos += r.valor; else gastos += r.valor; });
  const saldo = ganhos - gastos;
  const saldoEl = document.getElementById('saldoAtual');
  saldoEl.textContent = moeda.format(saldo);
  saldoEl.classList.toggle('negativo', saldo < 0);
  document.getElementById('totalGanhos').textContent = moeda.format(ganhos);
  document.getElementById('totalGastos').textContent = moeda.format(gastos);

  // Resumo de hoje
  const hoje = hojeISO();
  let ganhosHoje = 0, gastosHoje = 0;
  registros.forEach(r => {
    if (r.data !== hoje) return;
    if (r.tipo === 'ganho') ganhosHoje += r.valor; else gastosHoje += r.valor;
  });
  const kmDoDia = kms.filter(k => k.data === hoje).reduce((soma, k) => soma + k.km, 0);
  const lucroHoje = ganhosHoje - gastosHoje;
  const lucroEl = document.getElementById('lucroHoje');
  lucroEl.textContent = moeda.format(lucroHoje);
  lucroEl.classList.toggle('negativo', lucroHoje < 0);
  document.getElementById('kmHoje').textContent = formatarKm(kmDoDia);
  document.getElementById('rsKmHoje').textContent = kmDoDia > 0 ? moeda.format(ganhosHoje / kmDoDia) : '—';

  const ordenados = ordenarRegistros();

  // Últimos lançamentos (início)
  const ultimos = document.getElementById('ultimosRegistros');
  ultimos.replaceChildren();
  if (!ordenados.length) vazio(ultimos, 'Nenhum lançamento ainda. Toque em + Ganho para começar.');
  ordenados.slice(0, 4).forEach(r => ultimos.append(itemRegistro(r, false)));

  // Histórico completo, agrupado por dia
  const hist = document.getElementById('listaRegistros');
  hist.replaceChildren();
  if (!ordenados.length) vazio(hist, 'Seu histórico aparece aqui.');
  let diaAtual = null;
  ordenados.forEach(r => {
    const dia = r.data || 'sem-data';
    if (dia !== diaAtual) {
      diaAtual = dia;
      hist.append(el('li', 'grupo-dia', r.data ? textoDia(r.data) : 'Lançamentos antigos'));
    }
    hist.append(itemRegistro(r, true));
  });

  // Contas
  const ordContas = ordenarContas();
  const listaC = document.getElementById('listaContas');
  listaC.replaceChildren();
  if (!ordContas.length) vazio(listaC, 'Nenhuma conta cadastrada.');
  ordContas.forEach(c => listaC.append(itemConta(c)));

  const proximas = document.getElementById('proximasContas');
  proximas.replaceChildren();
  const abertas = ordContas.filter(c => !c.paga);
  if (!abertas.length) vazio(proximas, 'Nenhuma conta em aberto 🎉');
  abertas.slice(0, 3).forEach(c => proximas.append(itemConta(c)));

  salvar();
}

// ===== Ações =====
function apagarRegistro(id) {
  if (!confirm('Apagar este lançamento?')) return;
  registros = registros.filter(r => r.id !== id);
  kms = kms.filter(k => k.id !== id);
  atualizarTela();
  mostrarAviso('Lançamento apagado');
}

function apagarConta(id) {
  if (!confirm('Apagar esta conta?')) return;
  contas = contas.filter(c => c.id !== id);
  atualizarTela();
  mostrarAviso('Conta apagada');
}

function alternarPaga(id) {
  const c = contas.find(c => c.id === id);
  if (!c) return;
  c.paga = !c.paga;
  atualizarTela();
  mostrarAviso(c.paga ? 'Conta marcada como paga' : 'Conta reaberta');
}

// ===== Formulário (folha) =====
const folha = document.getElementById('folha');
const fundo = document.getElementById('fundo');
const campoValor = document.getElementById('campoValor');
const campoNome = document.getElementById('campoNome');
const campoData = document.getElementById('campoData');
const erroForm = document.getElementById('erroForm');
const grupoNome = document.getElementById('grupoNome');
const grupoCategoria = document.getElementById('grupoCategoria');
const chips = document.getElementById('chipsCategoria');
let modo = 'ganho';
let categoria = '';

CATEGORIAS.forEach(nome => {
  const c = el('button', 'chip', nome);
  c.type = 'button';
  c.setAttribute('role', 'radio');
  c.setAttribute('aria-checked', 'false');
  c.addEventListener('click', () => escolherCategoria(nome));
  chips.append(c);
});

function escolherCategoria(nome) {
  categoria = nome;
  chips.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-checked', String(c.textContent === nome)));
}

const configs = {
  ganho: { titulo: 'Novo ganho', nome: 'Descrição (opcional)', exemplo: 'Ex: corridas da manhã', data: 'Data', botao: 'ganho' },
  gasto: { titulo: 'Novo gasto', nome: 'Descrição (opcional)', exemplo: 'Ex: pastilha de freio', data: 'Data', botao: 'gasto' },
  km: { titulo: 'Km rodados', nome: '', exemplo: '', data: 'Dia', botao: 'km', prefixo: 'km' },
  conta: { titulo: 'Nova conta', nome: 'Nome da conta', exemplo: 'Ex: aluguel do carro', data: 'Vencimento', botao: '' }
};

function abrirFolha(tipo) {
  modo = tipo;
  const cfg = configs[tipo];
  document.getElementById('folhaTitulo').textContent = cfg.titulo;
  document.getElementById('rotuloNome').textContent = cfg.nome;
  document.getElementById('rotuloData').textContent = cfg.data;
  campoNome.placeholder = cfg.exemplo;
  document.getElementById('prefixoValor').textContent = cfg.prefixo || 'R$';
  campoValor.step = tipo === 'km' ? '0.1' : '0.01';
  campoValor.placeholder = tipo === 'km' ? '0' : '0,00';
  grupoNome.hidden = tipo === 'km';
  grupoCategoria.hidden = tipo !== 'gasto';
  escolherCategoria('');
  document.getElementById('salvar').className = 'botao-principal ' + cfg.botao;
  folha.reset();
  campoData.value = hojeISO();
  erroForm.hidden = true;
  fundo.hidden = false;
  folha.hidden = false;
  setTimeout(() => campoValor.focus(), 50);
}

function fecharFolha() {
  folha.hidden = true;
  fundo.hidden = true;
}

folha.addEventListener('submit', e => {
  e.preventDefault();
  const valor = parseFloat(campoValor.value);
  const nome = campoNome.value.trim();
  const data = campoData.value;

  let erro = '';
  if (!valor || valor <= 0) erro = modo === 'km' ? 'Digite quantos km rodou.' : 'Digite um valor maior que zero.';
  else if (modo === 'gasto' && !categoria) erro = 'Escolha a categoria do gasto.';
  else if (modo === 'conta' && !nome) erro = 'Dê um nome para a conta.';
  else if (!data) erro = 'Escolha a data.';
  if (erro) { erroForm.textContent = erro; erroForm.hidden = false; return; }

  if (modo === 'km') {
    kms.push({ id: novoId(), km: valor, data });
    mostrarAviso('Km registrados');
  } else if (modo === 'gasto') {
    registros.push({ id: novoId(), tipo: 'gasto', valor, categoria, descricao: nome, data });
    mostrarAviso('Gasto registrado');
  } else if (modo === 'conta') {
    contas.push({ id: novoId(), nome, valor, vencimento: data, paga: false });
    mostrarAviso('Conta adicionada');
  } else {
    registros.push({ id: novoId(), tipo: modo, valor, descricao: nome, data });
    mostrarAviso(modo === 'ganho' ? 'Ganho registrado' : 'Gasto registrado');
  }
  fecharFolha();
  atualizarTela();
});

document.getElementById('cancelar').addEventListener('click', fecharFolha);
fundo.addEventListener('click', fecharFolha);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !folha.hidden) fecharFolha(); });

// ===== Navegação entre telas =====
function irPara(tela) {
  document.querySelectorAll('.tela').forEach(t => t.classList.toggle('ativa', t.id === 'tela-' + tela));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('ativo', n.dataset.ir === tela));
  window.scrollTo({ top: 0 });
}

document.addEventListener('click', e => {
  const ir = e.target.closest('[data-ir]');
  if (ir) irPara(ir.dataset.ir);
  const abrir = e.target.closest('[data-abrir]');
  if (abrir) abrirFolha(abrir.dataset.abrir);
});

// ===== Aviso rápido =====
let timerAviso;
function mostrarAviso(texto) {
  const a = document.getElementById('aviso');
  a.textContent = texto;
  a.hidden = false;
  clearTimeout(timerAviso);
  timerAviso = setTimeout(() => { a.hidden = true; }, 2200);
}

// ===== Instalação como app =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

(function () {
  const caixa = document.getElementById('instalar');
  const botao = document.getElementById('instalarBotao');
  const dica = document.getElementById('instalarDica');
  const jaInstalado = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  let dispensado = false;
  try { dispensado = localStorage.getItem('instalarDispensado') === '1'; } catch {}
  if (jaInstalado || dispensado) return;

  const ehIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  let pedidoInstalacao = null;

  if (ehIOS) {
    // iPhone não tem botão de instalar automático: mostramos o passo a passo
    botao.textContent = 'Como?';
    botao.addEventListener('click', () => {
      dica.textContent = 'No Safari, toque em Compartilhar e depois em "Adicionar à Tela de Início".';
      botao.hidden = true;
    });
    caixa.hidden = false;
  }

  // Android/Chrome avisa quando o app pode ser instalado
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    pedidoInstalacao = e;
    caixa.hidden = false;
  });

  botao.addEventListener('click', async () => {
    if (!pedidoInstalacao) return;
    pedidoInstalacao.prompt();
    await pedidoInstalacao.userChoice.catch(() => {});
    pedidoInstalacao = null;
    caixa.hidden = true;
  });

  window.addEventListener('appinstalled', () => { caixa.hidden = true; });

  document.getElementById('instalarFechar').addEventListener('click', () => {
    caixa.hidden = true;
    try { localStorage.setItem('instalarDispensado', '1'); } catch {}
  });
})();

// ===== Cabeçalho =====
const hora = new Date().getHours();
document.getElementById('saudacao').textContent = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
document.getElementById('dataHoje').textContent = dataLonga.format(new Date()).split(',')[0];

atualizarTela();
