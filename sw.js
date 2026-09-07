// sw.js — Service Worker
// İki iş yapar:
//  1) Uygulama dosyalarını önbelleğe alır (çevrimdışı da açılsın, "app gibi" olsun).
//  2) Bildirim (push) geldiğinde telefonda gösterir.  (Bildirim kısmı 3. adımda
//     tam devreye girecek; şimdiden hazır dursun.)

const CACHE = "gibtu-duyuru-v6";
const KABUK = [
    ".",
    "index.html",
    "style.css",
    "app.js",
    "manifest.json",
    "icons/icon-192.png",
    "icons/icon-512.png",
];

// Kurulumda uygulama dosyalarını önbelleğe al
self.addEventListener("install", (e) => {
    e.waitUntil(
        caches.open(CACHE).then((c) => c.addAll(KABUK)).then(() => self.skipWaiting())
    );
});

// Eski önbellekleri temizle
self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys()
            .then((anahtarlar) =>
                Promise.all(anahtarlar.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
            )
            .then(() => self.clients.claim())
    );
});

// İstekleri karşıla:
//  - Duyuru verisi (JSON): her zaman önce ağdan (taze olsun), olmazsa önbellekten
//  - Diğer dosyalar: önce önbellekten (hızlı), yoksa ağdan
self.addEventListener("fetch", (e) => {
    const url = new URL(e.request.url);
    if (url.pathname.endsWith("duyurular.json")) {
        e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    } else {
        e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
    }
});

// --- BİLDİRİM ---
// Sunucudan push geldiğinde çalışır, telefonda bildirim kutusu gösterir.
self.addEventListener("push", (e) => {
    let veri = { baslik: "GİBTÜ", govde: "Yeni duyuru var", link: "." };
    try { if (e.data) veri = e.data.json(); } catch (_) {}

    e.waitUntil(
        self.registration.showNotification(veri.baslik || "GİBTÜ Duyuru", {
            body: veri.govde || "Yeni bir duyuru yayınlandı.",
            icon: "icons/icon-192.png",
            badge: "icons/icon-192.png",
            data: { link: veri.link || "." },
        })
    );
});

// Bildirime tıklanınca uygulamayı aç
self.addEventListener("notificationclick", (e) => {
    e.notification.close();
    const hedef = (e.notification.data && e.notification.data.link) || ".";
    e.waitUntil(clients.openWindow(hedef));
});
