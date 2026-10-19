// sw.js — faz o app abrir e funcionar sem internet.
// Ao mudar arquivos do app, aumente a VERSAO para os celulares baixarem a versão nova.
const VERSAO = 'v1';
const CACHE = 'meu-rendimento-' + VERSAO;

const ARQUIVOS = [
  './',
  './index.html',
  './style.css',
  './src/script.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', evento => {
  evento.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ARQUIVOS)));
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
  if (!mesmoSite && !fonte) return;

  // Página: tenta a internet primeiro (para pegar atualizações); sem internet, usa a cópia salva.
  if (req.mode === 'navigate') {
    evento.respondWith(
      fetch(req)
        .then(resp => { guardar('./index.html', resp.clone()); return resp; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Demais arquivos: responde na hora com a cópia salva e atualiza em segundo plano.
  evento.respondWith(
    caches.match(req).then(salvo => {
      const daRede = fetch(req)
        .then(resp => { if (resp.ok || resp.type === 'opaque') guardar(req, resp.clone()); return resp; })
        .catch(() => salvo);
      return salvo || daRede;
    })
  );
});

function guardar(chave, resposta) {
  caches.open(CACHE).then(cache => cache.put(chave, resposta)).catch(() => {});
}
