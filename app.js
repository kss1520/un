// app.js — GİBTÜ Duyuru Takip
// Özellikler: liste + arama + YENİ rozeti + favoriler + kategori filtresi
// + uygulama içi okuma + gündüz/gece tema.

const el = (id) => document.getElementById(id);

// ---- Durum ----
let VERI = { duyurular: [], haberler: [] };
let HARITA = {};          // id -> öğe (okuma penceresi için)
let ILK_ZIYARET = false;
let SON_GORULEN = 0;      // YENİ hesabı
let FAVORILER = new Set(); // kaydedilen id'ler
let AKTIF_FILTRE = "hepsi"; // hepsi | duyuru | haber | favori

// ---- Yardımcılar ----
function guvenli(m) {
    return String(m == null ? "" : m).replace(/[&<>"]/g, (c) => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]
    ));
}
function kucuk(s) { return String(s || "").toLocaleLowerCase("tr"); }
function yeniMi(id) { return !ILK_ZIYARET && id > SON_GORULEN; }
function favoriMi(id) { return FAVORILER.has(id); }

function favorileriKaydet() {
    try { localStorage.setItem("favoriler", JSON.stringify([...FAVORILER])); } catch (e) {}
}
function favoriToggle(id) {
    if (FAVORILER.has(id)) FAVORILER.delete(id); else FAVORILER.add(id);
    favorileriKaydet();
    ciz();
}

// ---- Kart şablonları ----
function yildiz(id) {
    const dolu = favoriMi(id);
    return `<span class="yildiz ${dolu ? "dolu" : ""}" data-yildiz="${id}" role="button"
        title="${dolu ? "Kaydı kaldır" : "Kaydet"}" aria-label="Kaydet">${dolu ? "★" : "☆"}</span>`;
}
function yeniRozet(id) {
    return yeniMi(id) ? '<span class="yeni-rozet">YENİ</span>' : "";
}
function duyuruKarti(d) {
    return `<div class="kart duyuru-kart" data-id="${d.id}">
        ${yildiz(d.id)}
        <div class="tarih-rozet"><span class="rz-gun">${guvenli(d.gun)}</span><span class="rz-ay">${guvenli(d.ay)}</span></div>
        <div class="kart-govde">${yeniRozet(d.id)}<p class="kart-baslik">${guvenli(d.baslik)}</p></div>
    </div>`;
}
function haberKarti(h) {
    const ozet = h.ozet ? `<p class="haber-ozet">${guvenli(h.ozet)}</p>` : "";
    return `<div class="kart haber-kart" data-id="${h.id}">
        ${yildiz(h.id)}
        <div class="haber-ust"><span class="haber-tarih">${guvenli(h.tarih)}</span>${yeniRozet(h.id)}</div>
        <p class="kart-baslik">${guvenli(h.baslik)}</p>
        ${ozet}
    </div>`;
}

function suz(liste, q) {
    if (!q) return liste;
    const s = kucuk(q);
    return liste.filter((x) => kucuk(x.baslik).includes(s) || kucuk(x.ozet).includes(s));
}

// Aktif filtre + aramaya göre gösterilecek liste
function gorunenler(tur) {
    let liste = (tur === "duyuru" ? VERI.duyurular : VERI.haberler) || [];
    if (AKTIF_FILTRE === "favori") liste = liste.filter((x) => favoriMi(x.id));
    return suz(liste, el("aramaKutusu").value.trim());
}

function ciz() {
    const d = gorunenler("duyuru");
    const h = gorunenler("haber");

    el("duyurular").innerHTML = d.map(duyuruKarti).join("");
    el("haberler").innerHTML = h.map(haberKarti).join("");
    el("duyuruSayi").textContent = d.length ? `(${d.length})` : "";
    el("haberSayi").textContent = h.length ? `(${h.length})` : "";

    // Hangi bölümler görünsün?
    const duyuruGoster = (AKTIF_FILTRE === "hepsi" || AKTIF_FILTRE === "duyuru" ||
                          (AKTIF_FILTRE === "favori" && d.length > 0));
    const haberGoster = (AKTIF_FILTRE === "hepsi" || AKTIF_FILTRE === "haber" ||
                         (AKTIF_FILTRE === "favori" && h.length > 0));
    el("secDuyuru").hidden = !duyuruGoster;
    el("secHaber").hidden = !haberGoster;

    // Favorilerde hiç sonuç yoksa mesaj göster
    el("bosFavori").hidden = !(AKTIF_FILTRE === "favori" && d.length === 0 && h.length === 0);
}

// ---- Okuma penceresi ----
function oku(id) {
    const o = HARITA[id];
    if (!o) return;
    el("okuTur").textContent = o.kategori || "";
    el("okuBaslik").textContent = o.baslik || "";
    el("okuTarih").textContent = "Yayın tarihi: " + (o.tarih || "");
    const metin = (o.icerik && o.icerik.trim()) ? o.icerik
                 : (o.ozet && o.ozet.trim()) ? o.ozet
                 : "Bu içeriğin metni alınamadı. Aşağıdan orijinal sayfada açabilirsin.";
    el("okuMetin").textContent = metin;   // textContent => güvenli, satır sonları CSS ile korunur
    el("okuKaynak").href = o.link || "#";
    el("okuOverlay").hidden = false;
    document.body.classList.add("kilit");
}
function okuKapat() {
    el("okuOverlay").hidden = true;
    document.body.classList.remove("kilit");
}

// ---- Olay dinleyiciler ----
// Kartlara tıklama (yıldız = favori, diğer yer = oku)
document.querySelector("main").addEventListener("click", (e) => {
    const yild = e.target.closest("[data-yildiz]");
    if (yild) {
        favoriToggle(parseInt(yild.getAttribute("data-yildiz"), 10));
        return;
    }
    const kart = e.target.closest(".kart");
    if (kart) oku(parseInt(kart.getAttribute("data-id"), 10));
});

// Filtre çipleri
el("filtreSatir").addEventListener("click", (e) => {
    const cip = e.target.closest(".cip");
    if (!cip) return;
    AKTIF_FILTRE = cip.getAttribute("data-f");
    [...el("filtreSatir").children].forEach((c) => c.classList.toggle("aktif", c === cip));
    ciz();
});

el("aramaKutusu").addEventListener("input", ciz);
el("okuKapat").addEventListener("click", okuKapat);
el("okuOverlay").addEventListener("click", (e) => { if (e.target === el("okuOverlay")) okuKapat(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") okuKapat(); });

// ---- Veri yükle ----
async function yukle() {
    try {
        const cevap = await fetch("data/duyurular.json?_=" + Date.now());
        if (!cevap.ok) throw new Error("veri dosyası bulunamadı");
        VERI = await cevap.json();
        el("guncelleme").textContent = VERI.guncelleme || "—";

        // id -> öğe haritası (okuma için)
        HARITA = {};
        [...(VERI.duyurular || []), ...(VERI.haberler || [])].forEach((x) => { HARITA[x.id] = x; });

        // Favoriler
        try {
            const f = JSON.parse(localStorage.getItem("favoriler") || "[]");
            FAVORILER = new Set(f);
        } catch (e) { FAVORILER = new Set(); }

        // YENİ hesabı
        try {
            const kayit = localStorage.getItem("sonGorulenId");
            ILK_ZIYARET = !kayit;
            SON_GORULEN = parseInt(kayit || "0", 10) || 0;
        } catch (e) { ILK_ZIYARET = true; SON_GORULEN = 0; }

        ciz();

        try {
            const idler = Object.keys(HARITA).map(Number);
            const enBuyuk = idler.length ? Math.max(...idler) : 0;
            localStorage.setItem("sonGorulenId", String(enBuyuk));
        } catch (e) {}

        el("hata").hidden = true;
    } catch (e) {
        el("hata").hidden = false;
        el("hata").textContent = "⚠️ Veriler yüklenemedi: " + e.message;
    }
}
yukle();

// ---- Gündüz / gece tema ----
function temaUygula(t) {
    document.documentElement.setAttribute("data-theme", t);
    el("temaBtn").textContent = (t === "dark") ? "☀️ Gündüz" : "🌙 Gece";
}
function temaBaslat() {
    let t = null;
    try { t = localStorage.getItem("tema"); } catch (e) {}
    if (!t) t = (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light";
    temaUygula(t);
}
el("temaBtn").addEventListener("click", () => {
    const yeni = (document.documentElement.getAttribute("data-theme") === "dark") ? "light" : "dark";
    try { localStorage.setItem("tema", yeni); } catch (e) {}
    temaUygula(yeni);
});
temaBaslat();

// ---- Service worker ----
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch((e) => console.log("SW:", e));
}
