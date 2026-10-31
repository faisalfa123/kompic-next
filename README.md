# ⚡ kompic-next — Immich Media Optimizer (Amlogic S905X Edition)

Aplikasi kompresi media latar belakang dan dashboard pemantau otomatis yang dirancang khusus untuk server STB **HG680P / ODROID-C2 (Amlogic S905X, Cortex-A53 4-Core, 2GB RAM)** yang menjalankan **Immich Self-Hosted**.

Dibangun dengan **murni Go (Golang)** dengan jejak memori ultra-rendah (~12 MB RAM) dan tampilan modern bertema **Immich Web UI** di port `3333`.

---

## 🌟 Fitur Utama & Optimalisasi S905X

1. **🎨 Tampilan Web UI Senada Immich (Port 3333)**:
   - Palet warna dark mode modern `#0f1117` dan `#171b24` dengan aksen Immich indigo `#6366f1`.
   - Circular dynamic CPU thermal gauge meter.
   - Monitor penggunaan RAM dan kapasitas media disk `/mnt/hdd1`.
   - Navigasi responsif mobile-friendly.
2. **⚙️ Kontrol Penuh via Web UI (`/api/settings`)**:
   - Ganti port, password admin SHA-256, path direktori upload Immich, suhu thermal guard, resolusi dan kualitas foto/video langsung dari browser.
3. **📐 Preservasi Aspek Rasio Asli 100% (Scale by Longest Edge)**:
   - Menggunakan algoritma `-resize 2560x2560\>` dan `scale='min(iw,2560)':-2` sehingga foto vertikal, horizontal, maupun panorama tidak pernah terpotong atau terdistorsi rasio aslinya.
4. **📍 Zero GPS & Metadata Loss**:
   - Seluruh tag koordinat GPS, EXIF kamera, tanggal asli (`DateTimeOriginal`), profil warna, dan Apple Live Photo ID (`ContentIdentifier`, `MediaGroupUUID`) disalin utuh via ExifTool.
   - Pengecekan otomatis: file asli tidak akan diganti jika GPS hilang.
5. **🛡️ Prioritas Rendah & Ramah Immich (Low-Priority Execution)**:
   - Dijalankan dengan `nice -n 15` dan `ionice -c 3` (idle I/O). Immich web dan database PostgreSQL tidak akan pernah mengalami lag.
6. **🌡️ Thermal Guard Otomatis**:
   - Auto-pause jika suhu SoC > 68°C dan auto-resume setelah dingin < 60°C.

---

## 🚀 Cara Pasang di Server DietPi STB HG680P

Salin folder `kompic-next` ke STB Anda, lalu jalankan:

```bash
cd /opt/kompic-next  # atau lokasi clone repo ini
chmod +x install-service.sh
sudo ./install-service.sh
```

Setelah selesai, buka di browser:
👉 **`http://192.168.1.2:3333`**
- **Password Default**: `admin`

---

## 🔗 Menambahkan Pintasan di Immich Web UI

Agar `kompic-next` dapat dibuka langsung dari dalam web Immich:
1. Buka Web Immich (`http://192.168.1.2:2283`).
2. Masuk ke **Administration** -> **Settings**.
3. Di tab navigasi custom / external links (jika didukung di versi Anda) atau bookmark browser, arahkan ke `http://192.168.1.2:3333`.
