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

  renderResumo();
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

// ===== Resumo da semana / mês =====
const resumo = { periodo: 'semana', deslocamento: 0, metrica: 'lucro', selecionado: null };
const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const nomeMes = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const diaSemanaLongo = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' });

function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function curtoData(d) {
  return dataCurta.format(d).replace('.', '');
}

// Semana de segunda a domingo; mês do dia 1 ao último dia
function intervaloResumo() {
  const hoje = lerData(hojeISO());
  const dias = [];
  let titulo, datas;
  if (resumo.periodo === 'semana') {
    const inicio = new Date(hoje);
    inicio.setDate(hoje.getDate() - ((hoje.getDay() + 6) % 7) + resumo.deslocamento * 7);
    for (let i = 0; i < 7; i++) { const d = new Date(inicio); d.setDate(inicio.getDate() + i); dias.push(d); }
    titulo = resumo.deslocamento === 0 ? 'Esta semana' : resumo.deslocamento === -1 ? 'Semana passada' : 'Semana de ' + curtoData(dias[0]);
    datas = curtoData(dias[0]) + ' – ' + curtoData(dias[6]);
  } else {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() + resumo.deslocamento, 1);
    const ultimo = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= ultimo; i++) dias.push(new Date(inicio.getFullYear(), inicio.getMonth(), i));
    const nome = nomeMes.format(inicio);
    titulo = resumo.deslocamento === 0 ? 'Este mês' : resumo.deslocamento === -1 ? 'Mês passado' : nome.charAt(0).toUpperCase() + nome.slice(1);
    datas = nome.charAt(0).toUpperCase() + nome.slice(1);
  }
  return { dias, titulo, datas };
}

function renderResumo() {
  const { dias, titulo, datas } = intervaloResumo();
  const hoje = hojeISO();
  const porDia = new Map(dias.map(d => [iso(d), { data: d, iso: iso(d), ganhos: 0, gastos: 0, km: 0, futuro: iso(d) > hoje }]));
  const categorias = new Map();

  registros.forEach(r => {
    const dia = porDia.get(r.data);
    if (!dia) return;
    if (r.tipo === 'ganho') dia.ganhos += r.valor;
    else {
      dia.gastos += r.valor;
      const cat = r.categoria || 'Sem categoria';
      categorias.set(cat, (categorias.get(cat) || 0) + r.valor);
    }
  });
  kms.forEach(k => { const dia = porDia.get(k.data); if (dia) dia.km += k.km; });

  const lista = [...porDia.values()];
  lista.forEach(d => { d.lucro = d.ganhos - d.gastos; d.rskm = d.km > 0 ? d.ganhos / d.km : 0; });
  const ganhos = lista.reduce((s, d) => s + d.ganhos, 0);
  const gastos = lista.reduce((s, d) => s + d.gastos, 0);
  const km = lista.reduce((s, d) => s + d.km, 0);
  const lucro = ganhos - gastos;
  const diasTrab = lista.filter(d => d.ganhos > 0 || d.km > 0).length;

  document.getElementById('periodoTitulo').textContent = titulo;
  document.getElementById('periodoDatas').textContent = datas;
  document.getElementById('periodoProximo').disabled = resumo.deslocamento >= 0;

  const lucroEl = document.getElementById('resLucro');
  lucroEl.textContent = moeda.format(lucro);
  lucroEl.classList.toggle('negativo', lucro < 0);
  document.getElementById('resGanhos').textContent = moeda.format(ganhos);
  document.getElementById('resGastos').textContent = moeda.format(gastos);
  document.getElementById('resKm').textContent = formatarKm(km);
  document.getElementById('resRsKm').textContent = km > 0 ? moeda.format(ganhos / km) : '—';
  document.getElementById('resDias').textContent = String(diasTrab);
  const mediaEl = document.getElementById('resMedia');
  mediaEl.textContent = diasTrab ? moeda.format(lucro / diasTrab) : '—';
  mediaEl.classList.toggle('negativo', diasTrab > 0 && lucro < 0);

  desenharGrafico(lista);

  // Gastos por categoria
  const ul = document.getElementById('resCategorias');
  ul.replaceChildren();
  const cats = [...categorias.entries()].sort((a, b) => b[1] - a[1]);
  if (!cats.length) vazio(ul, 'Nenhum gasto neste período.');
  cats.forEach(([nome, valor]) => {
    const li = el('li', 'item');
    const texto = el('div', 'item-texto');
    texto.append(el('p', 'item-titulo', nome));
    const pct = gastos ? valor / gastos * 100 : 0;
    texto.append(el('p', 'item-sub', Math.round(pct) + '% dos gastos'));
    const barra = el('div', 'cat-barra');
    const preenchido = el('i');
    preenchido.style.width = pct.toFixed(1) + '%';
    barra.append(preenchido);
    texto.append(barra);
    li.append(texto);
    li.append(el('span', 'item-valor gasto', moeda.format(valor)));
    ul.append(li);
  });
}

function svgEl(tag, attrs, texto) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
  if (texto !== undefined) e.textContent = texto;
  return e;
}

function textoMetrica(metrica, v) {
  if (metrica === 'km') return formatarKm(v);
  return moeda.format(v);
}

function rotuloCurto(metrica, v) {
  if (metrica === 'km') return String(Math.round(v));
  if (metrica === 'rskm') return v.toFixed(2).replace('.', ',');
  return String(Math.round(v));
}

function desenharGrafico(lista) {
  const svg = document.getElementById('grafico');
  const detalhe = document.getElementById('graficoDetalhe');
  const m = resumo.metrica;
  svg.replaceChildren();

  const W = 340, TOPO = 22, BASE = 160, ESQ = 4, LARG = 332;
  const valores = lista.map(d => d[m]);
  const maxV = Math.max(0, ...valores);
  const minV = Math.min(0, ...valores);
  const faixa = (maxV - minV) || 1;
  const y = v => TOPO + (maxV - v) / faixa * (BASE - TOPO);
  const n = lista.length;
  const slot = LARG / n;
  const largBarra = Math.max(3, slot * (n > 7 ? 0.7 : 0.56));
  const cor = { lucro: null, km: 'var(--km)', rskm: 'var(--destaque)' }[m];

  // linha do zero
  svg.append(svgEl('line', { x1: ESQ, x2: W - ESQ, y1: y(0), y2: y(0), stroke: 'var(--borda)', 'stroke-width': 1 }));

  if (!valores.some(v => v !== 0)) {
    svg.append(svgEl('text', { x: W / 2, y: 95, 'text-anchor': 'middle', fill: 'var(--texto-suave)', 'font-size': 13, 'font-weight': 700 }, 'Sem lançamentos neste período'));
    detalhe.textContent = '';
    return;
  }

  lista.forEach((d, i) => {
    const v = d[m];
    const cx = ESQ + slot * i + slot / 2;
    const topo = Math.min(y(v), y(0));
    const altura = Math.max(Math.abs(y(v) - y(0)), v !== 0 ? 2 : 0);
    const preenchimento = cor || (v < 0 ? 'var(--gasto)' : 'var(--ganho)');

    // área de toque maior que a barra, para facilitar no celular
    const toque = svgEl('rect', { x: ESQ + slot * i, y: TOPO - 10, width: slot, height: BASE - TOPO + 10, fill: 'transparent', class: 'barra' });
    toque.addEventListener('click', () => { resumo.selecionado = d.iso; desenharGrafico(lista); });
    svg.append(toque);

    if (altura > 0) {
      const barra = svgEl('rect', {
        x: cx - largBarra / 2, y: topo, width: largBarra, height: altura,
        rx: Math.min(4, largBarra / 2), fill: preenchimento,
        class: 'barra' + (resumo.selecionado === d.iso ? ' selecionada' : ''),
        'pointer-events': 'none'
      });
      svg.append(barra);
    }

    if (n <= 7 && v !== 0) {
      svg.append(svgEl('text', {
        x: cx, y: v < 0 ? topo + altura + 12 : topo - 5, 'text-anchor': 'middle',
        fill: 'var(--texto)', 'font-size': 11, 'font-weight': 800, 'pointer-events': 'none'
      }, rotuloCurto(m, v)));
    }

    const dia = d.data.getDate();
    const mostrarRotulo = n <= 7 || dia === 1 || dia % 5 === 0;
    if (mostrarRotulo) {
      svg.append(svgEl('text', {
        x: cx, y: 180, 'text-anchor': 'middle',
        fill: d.iso === hojeISO() ? 'var(--destaque)' : 'var(--texto-suave)',
        'font-size': 11, 'font-weight': 700, opacity: d.futuro ? 0.45 : 1, 'pointer-events': 'none'
      }, n <= 7 ? DIAS_SEMANA[i] : String(dia)));
    }
  });

  // Texto abaixo do gráfico: dia tocado, ou o melhor dia
  let alvo = lista.find(d => d.iso === resumo.selecionado);
  let prefixo = '';
  if (!alvo) {
    const comDados = lista.filter(d => d[m] !== 0);
    alvo = comDados.reduce((a, b) => (b[m] > a[m] ? b : a), comDados[0]);
    prefixo = 'Melhor dia: ';
  }
  detalhe.replaceChildren();
  if (alvo) {
    const nomeDia = diaSemanaLongo.format(alvo.data).replace(/\./g, '');
    detalhe.append(prefixo + nomeDia + ' · ');
    detalhe.append(el('b', '', textoMetrica(m, alvo[m]) + (m === 'rskm' ? '/km' : '')));
    if (m !== 'km' && alvo.km) detalhe.append(' · ' + formatarKm(alvo.km));
  }
}

document.querySelectorAll('[data-periodo]').forEach(b => b.addEventListener('click', () => {
  resumo.periodo = b.dataset.periodo;
  resumo.deslocamento = 0;
  resumo.selecionado = null;
  document.querySelectorAll('[data-periodo]').forEach(x => x.classList.toggle('ativo', x === b));
  renderResumo();
}));
document.getElementById('periodoAnterior').addEventListener('click', () => { resumo.deslocamento--; resumo.selecionado = null; renderResumo(); });
document.getElementById('periodoProximo').addEventListener('click', () => {
  if (resumo.deslocamento < 0) { resumo.deslocamento++; resumo.selecionado = null; renderResumo(); }
});
document.querySelectorAll('[data-metrica]').forEach(b => b.addEventListener('click', () => {
  resumo.metrica = b.dataset.metrica;
  document.querySelectorAll('[data-metrica]').forEach(x => x.setAttribute('aria-checked', String(x === b)));
  renderResumo();
}));

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
  // Quando uma versão nova do app assume, recarrega uma vez para já mostrar a novidade
  const tinhaVersaoAnterior = !!navigator.serviceWorker.controller;
  let recarregou = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!tinhaVersaoAnterior || recarregou) return;
    recarregou = true;
    window.location.reload();
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' })
      .then(reg => reg.update())
      .catch(() => {});
  });
  // Ao voltar para o app (ele fica aberto em segundo plano), procura atualização
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.getRegistration().then(reg => reg && reg.update()).catch(() => {});
    }
  });
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

// ===== Foto do perfil (fica só neste celular) =====
(function () {
  const botao = document.getElementById('avatar');
  const img = document.getElementById('avatarImg');
  const vazioIcone = document.getElementById('avatarVazio');
  const mais = document.getElementById('avatarMais');
  const menu = document.getElementById('menuFoto');
  const entrada = document.getElementById('fotoInput');

  function mostrar(foto) {
    const tem = typeof foto === 'string' && foto.startsWith('data:image/jpeg;base64,');
    img.hidden = !tem;
    vazioIcone.toggleAttribute('hidden', tem); // ícone SVG precisa do atributo, não da propriedade
    mais.hidden = tem;
    if (tem) img.src = foto; else img.removeAttribute('src');
    botao.setAttribute('aria-label', tem ? 'Opções da sua foto' : 'Adicionar sua foto');
  }

  let foto = null;
  try { foto = localStorage.getItem('foto'); } catch {}
  mostrar(foto);

  botao.addEventListener('click', e => {
    e.stopPropagation();
    if (img.hidden) entrada.click();
    else menu.hidden = !menu.hidden;
  });
  document.addEventListener('click', e => { if (!menu.hidden && !menu.contains(e.target)) menu.hidden = true; });
  document.getElementById('trocarFoto').addEventListener('click', () => { menu.hidden = true; entrada.click(); });
  document.getElementById('removerFoto').addEventListener('click', () => {
    menu.hidden = true;
    try { localStorage.removeItem('foto'); } catch {}
    mostrar(null);
    mostrarAviso('Foto removida');
  });

  entrada.addEventListener('change', () => {
    const arquivo = entrada.files && entrada.files[0];
    entrada.value = '';
    if (!arquivo) return;
    if (!arquivo.type.startsWith('image/')) { mostrarAviso('Escolha uma imagem'); return; }

    // Reduz a foto para 256x256 (recorte quadrado no centro) para ocupar pouco espaço
    const url = URL.createObjectURL(arquivo);
    const imagem = new Image();
    imagem.onload = () => {
      const lado = Math.min(imagem.naturalWidth, imagem.naturalHeight);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      canvas.getContext('2d').drawImage(imagem,
        (imagem.naturalWidth - lado) / 2, (imagem.naturalHeight - lado) / 2, lado, lado, 0, 0, 256, 256);
      URL.revokeObjectURL(url);
      const dados = canvas.toDataURL('image/jpeg', 0.85);
      try {
        localStorage.setItem('foto', dados);
        mostrar(dados);
        mostrarAviso('Foto atualizada');
      } catch {
        mostrarAviso('Não foi possível salvar a foto');
      }
    };
    imagem.onerror = () => { URL.revokeObjectURL(url); mostrarAviso('Não consegui abrir essa imagem'); };
    imagem.src = url;
  });
})();

// ===== Cabeçalho =====
const hora = new Date().getHours();
document.getElementById('saudacao').textContent = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';
document.getElementById('dataHoje').textContent = dataLonga.format(new Date()).split(',')[0];

atualizarTela();
