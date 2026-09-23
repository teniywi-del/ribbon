// 리본 서비스 워커 v3
// 페이지와 코드는 절대 캐시하지 않아요. 항상 최신을 받아옵니다.
// 아이콘 같은 그림만 캐시해서 빠르게 띄워요.

const CACHE = 'ribbon-assets-v3';
const ASSETS = ['/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/icon-180.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(() => {}));
});

self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isImage = /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(url.pathname);

  // 그림만 캐시 사용
  if (isImage) {
    e.respondWith(
      caches.match(req).then(hit =>
        hit || fetch(req).then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
      )
    );
    return;
  }

  // HTML, JS, manifest는 무조건 최신으로
  e.respondWith(
    fetch(req, { cache: 'no-store' }).catch(() =>
      new Response(
        '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8">' +
        '<meta name="viewport" content="width=device-width,initial-scale=1">' +
        '<title>리본</title><style>' +
        'body{font-family:sans-serif;background:#FFF7F9;color:#3A2C30;' +
        'display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center}' +
        'div{padding:30px}h1{font-size:40px;margin:0 0 14px}p{font-size:14px;line-height:1.8;color:#9C8489}' +
        'button{margin-top:20px;font-size:14px;font-weight:700;color:#fff;border:none;' +
        'padding:14px 28px;border-radius:999px;background:linear-gradient(180deg,#EC93AE,#D9718F)}' +
        '</style></head><body><div><h1>&#127872;</h1>' +
        '<p>인터넷 연결을 확인해주세요.<br>연결되면 다시 열어주세요.</p>' +
        '<button onclick="location.reload()">다시 시도</button>' +
        '</div></body></html>',
        { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
      )
    )
  );
});

/* ===== 푸시 알림 ===== */
self.addEventListener('push', e => {
  let data = { title: '리본', body: '새 알림이 있어요' };
  try {
    if (e.data) data = Object.assign(data, e.data.json());
  } catch (_) {
    if (e.data) data.body = e.data.text();
  }

  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.kind ? 'ribbon-' + data.kind : 'ribbon',
      renotify: true,
      data: { postId: data.postId || null, kind: data.kind || null }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if (c.url.includes(self.location.origin) && 'focus' in c) return c.focus();
      }
      return self.clients.openWindow('/');
    })
  );
});
