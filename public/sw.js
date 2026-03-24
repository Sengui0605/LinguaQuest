/* LinguaQuest Service Worker v1.0 */
const CACHE = 'lq-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/app.html',
  '/styles/style.css',
  '/styles/theory.css',
  '/js/app.js',
  '/js/quizEngine.js',
  '/js/questions.js',
  '/js/questions_intermediate_extra.js',
  '/js/questions_advanced_extra.js',
  '/js/timer.js',
  '/js/soundSystem.js',
  '/js/scoreSystem.js',
  '/js/xpSystem.js',
  '/js/achievements.js',
  '/js/progress.js',
  '/js/analytics.js',
  '/js/theory.js',
  '/data/courses.json',
  '/data/achievements.json',
  '/data/theory.json',
  '/assets/sounds/click.mp3',
  '/assets/sounds/correct.mp3',
  '/assets/sounds/wrong.mp3',
  '/assets/sounds/levelup.mp3',
  '/assets/sounds/perfect.mp3',
  '/assets/icons/icon.svg',
  '/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Firebase requests always go to network
  if (e.request.url.includes('firestore') || e.request.url.includes('firebase')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const fresh = fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fresh;
    })
  );
});
