# GİBTÜ Duyuru Takip

Gaziantep İslam Bilim ve Teknoloji Üniversitesi'nin ([gibtu.edu.tr](https://www.gibtu.edu.tr/))
**duyuru ve haberlerini** takip eden ücretsiz bir uygulama. Telefona "ana ekrana ekle"
ile kurulabilir (PWA).

## Nasıl çalışıyor?

1. **`scraper/checker.py`** — GİBTÜ sitesini okur, duyuru/haberleri `data/duyurular.json`
   dosyasına yazar.
2. **GitHub Actions** (`.github/workflows/check.yml`) — bu botu **günde 1 kez** otomatik
   çalıştırıp veriyi tazeler.
3. **`index.html` + `app.js`** — bu JSON'u okuyup güzel bir arayüzde gösterir.
   GitHub Pages ile bedava yayınlanır.

## Yerelde denemek

```bash
# veriyi üret
python scraper/checker.py
# siteyi başlat
python -m http.server 8000
# tarayıcıda aç: http://localhost:8000
```

## Notlar

- Site `windows-1254` (Türkçe) kodlaması kullanıyor; `checker.py` bunu doğru okur.
- Her duyurunun `Icerik/<numara>` linki var; numara her yeni içerikte büyür →
  "yeni duyuru geldi mi?" kontrolü buradan yapılır.
- Bildirim (push) özelliği sonraki adımda eklenecek.

> Bu bir öğrenci projesidir, resmî üniversite uygulaması değildir.
