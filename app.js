// app.js — Sayfayı çalıştıran JavaScript.
// data/duyurular.json dosyasını okur, kartları ekrana basar.

const el = (id) => document.getElementById(id);

// Metindeki < > & " karakterlerini güvenli hale getirir (HTML'e basmadan önce).
function guvenli(metin) {
    return String(metin).replace(/[&<>"]/g, (c) => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]
    ));
}

function duyuruKarti(d) {
    return `<a class="kart duyuru-kart" href="${guvenli(d.link)}" target="_blank" rel="noopener">
        <div class="tarih-rozet">${guvenli(d.tarih)}</div>
        <div class="kart-govde"><p class="kart-baslik">${guvenli(d.baslik)}</p></div>
    </a>`;
}

function haberKarti(h) {
    const ozet = h.ozet ? `<p class="haber-ozet">${guvenli(h.ozet)}</p>` : "";
    return `<a class="kart haber-kart" href="${guvenli(h.link)}" target="_blank" rel="noopener">
        <span class="haber-tarih">${guvenli(h.tarih)}</span>
        <p class="kart-baslik">${guvenli(h.baslik)}</p>
        ${ozet}
    </a>`;
}

async function yukle() {
    try {
        // ?_=... : tarayıcı eski veriyi önbellekten vermesin diye
        const cevap = await fetch("data/duyurular.json?_=" + Date.now());
        if (!cevap.ok) throw new Error("veri dosyası bulunamadı");
        const veri = await cevap.json();

        el("guncelleme").textContent = veri.guncelleme || "—";
        el("duyurular").innerHTML =
            (veri.duyurular || []).map(duyuruKarti).join("") ||
            '<p class="bos">Şu an duyuru yok.</p>';
        el("haberler").innerHTML =
            (veri.haberler || []).map(haberKarti).join("") ||
            '<p class="bos">Şu an haber yok.</p>';

        el("hata").hidden = true;
    } catch (e) {
        el("hata").hidden = false;
        el("hata").textContent = "⚠️ Veriler yüklenemedi: " + e.message;
    }
}

el("yenileBtn").addEventListener("click", yukle);
yukle();

// Service worker: uygulamanın "app gibi" kurulabilmesi ve çevrimdışı
// çalışabilmesi için gerekli. İleride bildirimi de bu yönetecek.
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch((e) =>
        console.log("Service worker kaydı başarısız:", e)
    );
}
