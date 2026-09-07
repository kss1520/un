# -*- coding: utf-8 -*-
"""
checker.py — GİBTÜ İçerik Arşivi'ni okur, DUYURULAR + HABERLER'i
../data/duyurular.json dosyasına yazar.

Kaynak: https://www.gibtu.edu.tr/IcerikRehberi.aspx
Bu sayfa bir tablo: her satırda  Başlık | Kategori | Yayın Tarihi  var.
Ana sayfadaki 8 kayıt yerine buradan ~50 kayıt geliyor; kategori sütunu
sayesinde Duyuru / Haber ayrımını da yapabiliyoruz.

GitHub botu (GitHub Actions) bunu 6 saatte bir çalıştırıp JSON'u günceller.

NOTLAR:
- Site "utf-8" dese de aslında windows-1254 (Türkçe) kodlaması kullanıyor.
- Başlıklar harf harf <span class="ara_boya"> etiketleriyle bölünmüş; kelime
  boşlukları metin düğümü olarak duruyor. get_text().split() ile temizliyoruz
  (strip=True KULLANMA, boşlukları siler!).
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
TR_SAAT = timezone(timedelta(hours=3))   # Türkiye saati

# Ay numarasını kısa Türkçe ada çevirir (tarih rozeti için)
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


def _temiz_baslik(hucre) -> str:
    """Harf harf bölünmüş başlığı temiz metne çevirir."""
    # strip=True YOK: kelime boşlukları korunmalı
    return " ".join(hucre.get_text().split())


def _gun_ay(tarih: str):
    """'03.09.2026' -> ('03', 'Eyl')"""
    parcalar = tarih.split(".")
    if len(parcalar) >= 2:
        return parcalar[0], AYLAR.get(parcalar[1], parcalar[1])
    return "", ""


def verileri_cek() -> dict:
    cevap = requests.get(ARSIV_URL, headers=HEADERS, timeout=20)
    cevap.raise_for_status()
    cevap.encoding = "windows-1254"          # Türkçe için ŞART
    soup = BeautifulSoup(cevap.text, "html.parser")

    duyurular, haberler = [], []

    for a in soup.select("a.truncate[href*='Icerik/']"):
        satir = a.find_parent("tr")
        if not satir:
            continue
        hucreler = satir.find_all("td")
        if len(hucreler) < 3:
            continue

        href = a.get("href", "")
        baslik = _temiz_baslik(hucreler[0])
        kategori = hucreler[1].get_text(strip=True)
        tarih = hucreler[2].get_text(strip=True)
        gun, ay = _gun_ay(tarih)

        oge = {
            "id": _icerik_id(href),
            "baslik": baslik,
            "tarih": tarih,          # 03.09.2026
            "gun": gun,              # 03
            "ay": ay,                # Eyl
            "kategori": kategori,
            "link": _tam_link(href),
        }

        if kategori == "Duyuru":
            duyurular.append(oge)
        elif kategori == "Haber":
            haberler.append(oge)
        # Etkinlik/Konferans/Seminer vb. şimdilik almıyoruz

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
