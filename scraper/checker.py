# -*- coding: utf-8 -*-
"""
checker.py — GİBTÜ sitesini okur, DUYURULAR + HABERLER'i ../data/duyurular.json
dosyasına yazar.

Bu dosya GitHub'ın ücretsiz botu (GitHub Actions) tarafından günde 1 kez
çalıştırılacak. Her çalıştığında JSON dosyasını günceller; uygulama da bu
JSON'u okuyup gösterir.

ÖNEMLİ: gibtu.edu.tr sayfası "utf-8" dese de aslında windows-1254 (Türkçe)
kodlaması kullanıyor. Doğru kodlamayı vermezsek Türkçe harfler bozulur.
"""

import os
import re
import json
from datetime import datetime, timezone, timedelta

import requests
from bs4 import BeautifulSoup

BASE_URL = "https://www.gibtu.edu.tr/"
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
    )
}
# Türkiye saati (UTC+3). GitHub botu UTC ile çalışır, biz TR saati gösterelim.
TR_SAAT = timezone(timedelta(hours=3))


def _icerik_id(href: str) -> int:
    m = re.search(r"Icerik/(\d+)/", href)
    return int(m.group(1)) if m else 0


def _tam_link(href: str) -> str:
    if href.startswith("http"):
        return href
    return BASE_URL + href.lstrip("/")


def html_getir() -> str:
    cevap = requests.get(BASE_URL, headers=HEADERS, timeout=20)
    cevap.raise_for_status()
    cevap.encoding = "windows-1254"   # Türkçe harfler için ŞART
    return cevap.text


def duyurulari_ayikla(soup) -> list:
    duyurular = []
    for kart in soup.select("div.card.horizontal.duyuru"):
        a = kart.find_parent("a")
        if not a:
            continue
        href = a.get("href", "")
        gun = kart.select_one(".duyuru-tarih .gun")
        ay = kart.select_one(".duyuru-tarih .ay")
        baslik = kart.select_one(".duyuru-baslik")
        duyurular.append({
            "id": _icerik_id(href),
            "baslik": baslik.get_text(strip=True) if baslik else "(başlık yok)",
            "tarih": f"{gun.get_text(strip=True)} {ay.get_text(strip=True)}" if (gun and ay) else "",
            "link": _tam_link(href),
        })
    return duyurular


def haberleri_ayikla(soup) -> list:
    haberler = []
    for a in soup.select("section.haber_listesi a"):
        href = a.get("href", "")
        if "Icerik/" not in href:
            continue
        tarih = a.select_one(".tarih")
        baslik = a.select_one("h5")
        ozet = a.select_one(".ozet")
        haberler.append({
            "id": _icerik_id(href),
            "baslik": baslik.get_text(strip=True) if baslik else "(başlık yok)",
            "tarih": tarih.get_text(strip=True) if tarih else "",
            "ozet": ozet.get_text(strip=True) if ozet else "",
            "link": _tam_link(href),
        })
    return haberler


def main():
    html = html_getir()
    soup = BeautifulSoup(html, "html.parser")

    veri = {
        "guncelleme": datetime.now(TR_SAAT).strftime("%d.%m.%Y %H:%M"),
        "duyurular": duyurulari_ayikla(soup),
        "haberler": haberleri_ayikla(soup),
    }

    # ../data/duyurular.json yolunu bu dosyaya göre hesapla
    kok = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    veri_klasoru = os.path.join(kok, "data")
    os.makedirs(veri_klasoru, exist_ok=True)
    dosya = os.path.join(veri_klasoru, "duyurular.json")

    with open(dosya, "w", encoding="utf-8") as f:
        json.dump(veri, f, ensure_ascii=False, indent=2)

    print(f"{len(veri['duyurular'])} duyuru, {len(veri['haberler'])} haber yazıldı -> {dosya}")


if __name__ == "__main__":
    main()
