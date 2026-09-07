// app.js — sayfayı çalıştıran JavaScript.
// data/duyurular.json'u okur; arama yapar; son ziyaretten beri gelenlere
// "YENİ" rozeti koyar.

const el = (id) => document.getElementById(id);

// Bellekte tutulan veri + YENİ hesabı için durum
let VERI = { duyurular: [], haberler: [] };
let ILK_ZIYARET = false;
let SON_GORULEN = 0;   // en son bakışta görülen en büyük id

// Metni HTML'e basmadan önce güvenli hale getir
function guvenli(metin) {
    return String(metin == null ? "" : metin).replace(/[&<>"]/g, (c) => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]
    ));
}

// Türkçe'ye uygun küçük harfe çevir (arama için)
function kucuk(s) {
    return String(s || "").toLocaleLowerCase("tr");
}

// Bu içerik son ziyaretten sonra mı geldi?
function yeniMi(id) {
    return !ILK_ZIYARET && id > SON_GORULEN;
}

function yeniRozet(id) {
    return yeniMi(id) ? '<span class="yeni-rozet">YENİ</span>' : "";
}

function duyuruKarti(d) {
    return `<a class="kart duyuru-kart" href="${guvenli(d.link)}" target="_blank" rel="noopener">
        <div class="tarih-rozet"><span class="rz-gun">${guvenli(d.gun)}</span><span class="rz-ay">${guvenli(d.ay)}</span></div>
        <div class="kart-govde">${yeniRozet(d.id)}<p class="kart-baslik">${guvenli(d.baslik)}</p></div>
    </a>`;
}

function haberKarti(h) {
    const ozet = h.ozet ? `<p class="haber-ozet">${guvenli(h.ozet)}</p>` : "";
    return `<a class="kart haber-kart" href="${guvenli(h.link)}" target="_blank" rel="noopener">
        <div class="haber-ust"><span class="haber-tarih">${guvenli(h.tarih)}</span>${yeniRozet(h.id)}</div>
        <p class="kart-baslik">${guvenli(h.baslik)}</p>
        ${ozet}
    </a>`;
}

// Arama metnine göre listeyi süz (başlıkta arar)
function suz(liste, q) {
    if (!q) return liste;
    const s = kucuk(q);
    return liste.filter((x) => kucuk(x.baslik).includes(s));
}

function bosMesaj(q) {
    return q
        ? '<p class="bos">Aramaya uygun sonuç yok.</p>'
        : '<p class="bos">Şu an gösterilecek içerik yok.</p>';
}

// Ekranı (yeniden) çiz — hem ilk yüklemede hem arama yazıldıkça çalışır
function ciz() {
    const q = el("aramaKutusu").value.trim();
    const d = suz(VERI.duyurular || [], q);
    const h = suz(VERI.haberler || [], q);

    el("duyurular").innerHTML = d.map(duyuruKarti).join("") || bosMesaj(q);
    el("haberler").innerHTML = h.map(haberKarti).join("") || bosMesaj(q);
    el("duyuruSayi").textContent = d.length ? `(${d.length})` : "";
    el("haberSayi").textContent = h.length ? `(${h.length})` : "";
}

async function yukle() {
    try {
        const cevap = await fetch("data/duyurular.json?_=" + Date.now());
        if (!cevap.ok) throw new Error("veri dosyası bulunamadı");
        VERI = await cevap.json();
        el("guncelleme").textContent = VERI.guncelleme || "—";

        // "YENİ" için: en son görülen id'yi hafızadan (localStorage) oku
        try {
            const kayit = localStorage.getItem("sonGorulenId");
            ILK_ZIYARET = !kayit;                       // ilk açılışta rozet gösterme
            SON_GORULEN = parseInt(kayit || "0", 10) || 0;
        } catch (e) {
            ILK_ZIYARET = true;
            SON_GORULEN = 0;
        }

        ciz();

        // Şimdi "görüldü" say: en büyük id'yi kaydet (rozet in-memory kalır,
        // sonraki AÇILIŞTA sıfırlanır)
        try {
            const idler = [...(VERI.duyurular || []), ...(VERI.haberler || [])].map((x) => x.id || 0);
            const enBuyuk = idler.length ? Math.max(...idler) : 0;
            localStorage.setItem("sonGorulenId", String(enBuyuk));
        } catch (e) { /* localStorage kapalıysa sorun değil */ }

        el("hata").hidden = true;
    } catch (e) {
        el("hata").hidden = false;
        el("hata").textContent = "⚠️ Veriler yüklenemedi: " + e.message;
    }
}

el("yenileBtn").addEventListener("click", yukle);
el("aramaKutusu").addEventListener("input", ciz);
yukle();

// Service worker: uygulama gibi kurulabilsin + çevrimdışı açılsın
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch((e) =>
        console.log("Service worker kaydı başarısız:", e)
    );
}
