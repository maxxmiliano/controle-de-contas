// sw.js — faz o app abrir e funcionar sem internet.
// Regra: com internet, sempre busca a versão mais nova; sem internet, usa a cópia salva.
// Ao mudar o app, aumente a VERSAO aqui E o ?v= dos arquivos no index.html (mesmo número).
const VERSAO = '3';
const CACHE = 'meu-rendimento-v' + VERSAO;

const ARQUIVOS = [
  './',
  './index.html',
  './style.css?v=' + VERSAO,
  './src/script.js?v=' + VERSAO,
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', evento => {
  // cache: 'reload' ignora a cópia que o navegador já tinha, garantindo arquivos novos
  evento.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ARQUIVOS.map(u => new Request(u, { cache: 'reload' }))))
  );
  self.skipWaiting();
});

self.addEventListener('activate', evento => {
  evento.waitUntil(
    caches.keys()
      .then(nomes => Promise.all(nomes.filter(n => n.startsWith('meu-rendimento-') && n !== CACHE).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', evento => {
  const req = evento.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const mesmoSite = url.origin === self.location.origin;
  const fonte = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  // Fontes do Google: quase nunca mudam, então a cópia salva vale primeiro
  if (fonte) {
    evento.respondWith(
      caches.match(req).then(salvo => salvo || fetch(req).then(resp => { guardar(req, resp.clone()); return resp; }))
    );
    return;
  }
  if (!mesmoSite) return;

  // Arquivos do app: internet primeiro (sem usar cópia antiga do navegador); sem internet, cópia salva
  const chave = req.mode === 'navigate' ? './index.html' : req;
  evento.respondWith(
    fetch(req, { cache: 'no-cache' })
      .then(resp => { if (resp.ok) guardar(chave, resp.clone()); return resp; })
      .catch(() => caches.match(chave).then(salvo => salvo || caches.match('./index.html')))
  );
});

function guardar(chave, resposta) {
  caches.open(CACHE).then(cache => cache.put(chave, resposta)).catch(() => {});
}
