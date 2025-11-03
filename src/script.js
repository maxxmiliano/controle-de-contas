

// script.js
let registros = JSON.parse(localStorage.getItem('registros')) || [];
let contas = JSON.parse(localStorage.getItem('contas')) || [];


function atualizarTela() {
const lista = document.getElementById('listaRegistros');
lista.innerHTML = '';
let saldo = 0;


registros.forEach(item => {
const li = document.createElement('li');
li.textContent = `${item.tipo === 'ganho' ? '🟢' : '🔴'} ${item.tipo.toUpperCase()}: R$ ${item.valor.toFixed(2)} ${item.descricao ? '- ' + item.descricao : ''}`;
lista.appendChild(li);
saldo += item.tipo === 'ganho' ? item.valor : -item.valor;
});


document.getElementById('saldoAtual').textContent = `Saldo atual: R$ ${saldo.toFixed(2)}`;
localStorage.setItem('registros', JSON.stringify(registros));


const listaC = document.getElementById('listaContas');
listaC.innerHTML = '';
const hoje = new Date();


contas.forEach(conta => {
const li = document.createElement('li');
const dataVenc = new Date(conta.vencimento);
const diasRestantes = Math.ceil((dataVenc - hoje)/(1000*60*60*24));
li.textContent = `📌 ${conta.nome}: R$ ${conta.valor.toFixed(2)} - Vence em ${conta.vencimento}`;
if (diasRestantes <= 3) li.classList.add('registro-proximo');
listaC.appendChild(li);
});
localStorage.setItem('contas', JSON.stringify(contas));
}


function adicionarGanho() {
const valor = parseFloat(document.getElementById('valorGanho').value);
if (!valor || valor <= 0) return alert('Digite um valor válido.');
registros.push({ tipo: 'ganho', valor });
document.getElementById('valorGanho').value = '';
atualizarTela();
}


function adicionarGasto() {
const valor = parseFloat(document.getElementById('valorGasto').value);
const descricao = document.getElementById('descricaoGasto').value;
if (!valor || valor <= 0) return alert('Digite um valor válido.');
registros.push({ tipo: 'gasto', valor, descricao });
document.getElementById('valorGasto').value = '';
document.getElementById('descricaoGasto').value = '';
atualizarTela();
}


function adicionarConta() {
const nome = document.getElementById('nomeConta').value;
const valor = parseFloat(document.getElementById('valorConta').value);
const vencimento = document.getElementById('vencimentoConta').value;
if (!nome || !valor || !vencimento) return alert('Preencha todos os campos da conta.');
contas.push({ nome, valor, vencimento });
document.getElementById('nomeConta').value = '';
document.getElementById('valorConta').value = '';
document.getElementById('vencimentoConta').value = '';
atualizarTela();
}


atualizarTela();