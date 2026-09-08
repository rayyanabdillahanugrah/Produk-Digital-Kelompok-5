# Tata Surya 3D

Simulasi edukasi interaktif Tata Surya berbasis Three.js — 100% berjalan di browser (HTML5, CSS3, Vanilla JavaScript), tanpa backend/server, dan siap dijalankan langsung di **GitHub Pages**.

## Menjalankan secara lokal

Karena proyek ini menggunakan ES Modules, buka lewat server lokal (bukan `file://`), misalnya:

```bash
npx serve .
# atau
python3 -m http.server 8000
```

Lalu buka `http://localhost:8000` (atau port yang ditampilkan).

## Deploy ke GitHub Pages

1. Push folder ini ke sebuah repository GitHub.
2. Buka **Settings → Pages**.
3. Pilih branch (mis. `main`) dan folder root (`/`).
4. Simpan — situs akan aktif di `https://<username>.github.io/<repo>/`.

## Struktur proyek

```
solar-system/
├── index.html
├── css/
│   ├── style.css        # design system utama (White Minimalist Space)
│   └── responsive.css   # tablet & mobile, termasuk bottom sheet
├── js/
│   ├── main.js          # inisialisasi renderer, kamera, raycasting, render loop
│   ├── solarSystem.js   # scene 3D: Matahari, planet, orbit, sabuk asteroid
│   ├── planets.js       # data astronomi (dipisah dari rendering)
│   ├── camera.js        # OrbitControls + animasi fokus kamera
│   └── ui.js             # quick nav, panel informasi, kontrol, foto NASA
└── assets/               # (opsional, tidak wajib diisi — foto diambil live dari NASA API)
```

## Catatan teknis

- **Foto planet**: diambil langsung dari [NASA Image and Video Library](https://images.nasa.gov) melalui `images-api.nasa.gov` saat runtime di browser pengguna — tidak ada foto yang di-hardcode, dan kredit sumber selalu ditampilkan di panel informasi.
- **Skala visual** (ukuran planet & jarak orbit) dikompresi agar nyaman dijelajahi; data astronomi yang ditampilkan (diameter, jarak, periode orbit, dst.) tetap nilai sebenarnya.
- **Periode orbit** memakai nilai astronomi asli (mis. Bumi 365,25 hari, Jupiter 11,86 tahun) sebagai dasar animasi, bukan simulasi gravitasi/N-body.
- **Performa**: pixel ratio dibatasi maksimum 2, jumlah partikel sabuk asteroid dan starfield dibatasi, dan kualitas otomatis diturunkan pada perangkat dengan CPU terbatas.
