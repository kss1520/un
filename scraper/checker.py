# -*- coding: utf-8 -*-
"""
checker.py — GİBTÜ İçerik Arşivi'ni okur, DUYURULAR + HABERLER'i (her birinin
tam metniyle birlikte) ../data/duyurular.json dosyasına yazar.

Kaynak liste: https://www.gibtu.edu.tr/IcerikRehberi.aspx  (tablo)
Her satır:  Başlık | Kategori | Yayın Tarihi
Sonra her içeriğin detay sayfasına gidip tam metnini (icerik) + özetini çekiyoruz
ki kullanıcı uygulama içinde okuyabilsin.

GitHub botu (Actions) bunu 6 saatte bir çalıştırır.

NOTLAR:
- Site utf-8 değil windows-1254 (Türkçe) kodlaması kullanıyor.
- Liste başlıkları harf harf <span class="ara_boya"> ile bölünmüş; get_text().split()
  ile temizleniyor (strip=True boşlukları siler, KULLANMA).
- Detay sayfasında: span.icerik_detay (tam metin), ...lbl_ozet (özet),
  span.icerik_baslik (başlık).
"""

import os
import re
import json
from datetime import datetime, timezone, timedelta

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.gibtu.edu.tr/"
ARSIV_URL = BASE_URL + "IcerikRehberi.aspx"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    )
}
TR_SAAT = timezone(timedelta(hours=3))

AYLAR = {
    "01": "Oca", "02": "Şub", "03": "Mar", "04": "Nis",
    "05": "May", "06": "Haz", "07": "Tem", "08": "Ağu",
    "09": "Eyl", "10": "Eki", "11": "Kas", "12": "Ara",
}


def _icerik_id(href: str) -> int:
    m = re.search(r"Icerik/(\d+)/", href)
    return int(m.group(1)) if m else 0


def _tam_link(href: str) -> str:
    if href.startswith("http"):
        return href
    return BASE_URL + href.lstrip("/")


def _temiz(hucre) -> str:
    # strip=True YOK: kelime boşlukları korunmalı
    return " ".join(hucre.get_text().split())


def _gun_ay(tarih: str):
    p = tarih.split(".")
    if len(p) >= 2:
        return p[0], AYLAR.get(p[1], p[1])
    return "", ""


def detay_getir(url: str):
    """Detay sayfasından (özet, tam_metin) döndürür. Hata olursa ('', '')."""
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.encoding = "windows-1254"
        s = BeautifulSoup(r.text, "html.parser")

        detay_el = s.select_one(".icerik_detay") or s.select_one("[id$='lbl_detay']")
        ozet_el = s.select_one("[id$='lbl_ozet']") or s.select_one(".icerik_ozet")

        metin = detay_el.get_text("\n", strip=True) if detay_el else ""
        ozet = ozet_el.get_text(" ", strip=True) if ozet_el else ""

        # 3+ boş satırı 2'ye indir
        metin = re.sub(r"\n{3,}", "\n\n", metin).strip()
        return ozet, metin
    except Exception:
        return "", ""


def verileri_cek() -> dict:
    cevap = requests.get(ARSIV_URL, headers=HEADERS, timeout=20)
    cevap.raise_for_status()
    cevap.encoding = "windows-1254"
    soup = BeautifulSoup(cevap.text, "html.parser")

    duyurular, haberler = [], []
    for a in soup.select("a.truncate[href*='Icerik/']"):
        satir = a.find_parent("tr")
        if not satir:
            continue
        tds = satir.find_all("td")
        if len(tds) < 3:
            continue
        href = a.get("href", "")
        kategori = tds[1].get_text(strip=True)
        tarih = tds[2].get_text(strip=True)
        gun, ay = _gun_ay(tarih)
        oge = {
            "id": _icerik_id(href),
            "baslik": _temiz(tds[0]),
            "tarih": tarih,
            "gun": gun,
            "ay": ay,
            "kategori": kategori,
            "link": _tam_link(href),
        }
        if kategori == "Duyuru":
            duyurular.append(oge)
        elif kategori == "Haber":
            haberler.append(oge)

    # Her içeriğin tam metnini (uygulama içi okuma için) çek
    hepsi = duyurular + haberler
    for i, oge in enumerate(hepsi, 1):
        ozet, icerik = detay_getir(oge["link"])
        oge["ozet"] = ozet
        oge["icerik"] = icerik
        print(f"  detay {i}/{len(hepsi)} alındı", end="\r")
    print()

    return {
        "guncelleme": datetime.now(TR_SAAT).strftime("%d.%m.%Y %H:%M"),
        "duyurular": duyurular,
        "haberler": haberler,
    }


def main():
    veri = verileri_cek()
    kok = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    veri_klasoru = os.path.join(kok, "data")
    os.makedirs(veri_klasoru, exist_ok=True)
    dosya = os.path.join(veri_klasoru, "duyurular.json")
    with open(dosya, "w", encoding="utf-8") as f:
        json.dump(veri, f, ensure_ascii=False, indent=2)
    print(f"{len(veri['duyurular'])} duyuru, {len(veri['haberler'])} haber yazıldı -> {dosya}")


if __name__ == "__main__":
    main()
