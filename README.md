# Hunting 2D Ranau 2026 — PWA Pertandingan Memanah (KTACR)

Aplikasi Web Progresif (**PWA**) rasmi yang ringkas, pantas dan **100% boleh berfungsi tanpa internet (offline / tanpa server)** untuk:

- **Acara:** Pertandingan Memanah Hunting 2D Ranau 2026
- **Tarikh:** 25 Oktober 2026 (Ahad), 7.30 Pagi
- **Tempat:** Sobou Range, Kampung Lasing, Ranau
- **Anjuran:** Kinabalu Traditional Archery Club Ranau (KTACR)

---

## Format Pertandingan & Sistem Kiraan

| Perkara | Tetapan |
| --- | --- |
| **Kategori** | Lelaki & Wanita |
| **Ahli Kumpulan** | Maksimum 8 orang satu kumpulan (**1 Kumpulan = 1 Kategori sahaja**, tidak bercampur L & W) |
| **Checkpoints (CP)** | 21 CP (setiap kumpulan bebas bermula & menyambung di mana-mana CP 1 – CP 21) |
| **Anak Panah / CP** | 3 batang (`A1, A2, A3`; 63 anak panah keseluruhan, maksimum 504 mata) |
| **Jarak Sasaran** | 7 ~ 20 meter |
| **Matriks Skor** | `8`, `5`, `3`, `M` (`0` mata) |
| **Penentu Seri (Tie-Break)** | **Jumlah Mata → Kiraan `8` → Kiraan `5` → Kiraan `3`** (+ sokongan *Shoot-Off*) |
| **Zon Hadiah** | Top 1–3 (Piala + Wang Tunai) & Tempat Ke-4 hingga Ke-15 (Medal) |

---

## Ciri-Ciri Utama

1. **Info Acara & Pasang PWA (`Info Acara`)**
   - Paparan maklumat rasmi pertandingan, poster iklan penuh, matriks skor, peraturan tie-break, dan senarai arahan 21 Check Point.
   - Menyokong pemasangan terus ke skrin utama telefon Android & iPhone (*Add to Home Screen*) serta caching penuh Service Worker.

2. **Pemarkahan Ketua / Pencatat Kumpulan (`Skor Kumpulan`)**
   - Pilih Kumpulan (`Kumpulan 1` – `Kumpulan 21`, setiap kumpulan khusus 1 kategori sahaja) dan bebas mula atau menyambung rekod skor dari **mana-mana Check Point (CP 1 – CP 21)** mengikut arahan penganjur.
   - Paparan sasaran haiwan 2D, jarak (7m–20m), arahan khusus di setiap CP, serta penanda pantas bagi CP yang belum lengkap.
   - Butang skor kontras tinggi (`8`, `5`, `3`, `M`) dengan kotak anak panah `A1, A2, A3` mesra cahaya matahari luar (*outdoor*), susunan automatik markah tertinggi ke terendah (`8-5-3-M`), dan simpanan automatik ke storan tempatan (`localStorage` + `IndexedDB`).
   - Kongsi skor Kumpulan yang selesai melalui **Kod QR (0% internet)**, **WhatsApp**, atau fail `.JSON`.

3. **Papan Keputusan & Cetakan Rasmi (`Keputusan`)**
   - Kedudukan penuh mengikut kategori **Lelaki** & **Wanita** dengan kiraan automatik Tie-Break (`Points - 8 - 5 - 3`).
   - Penandaan jelas bagi **Juara**, **Naib Juara**, **Tempat Ketiga**, dan **Zon Medal (Tempat 4–15)**.
   - Klik mana-mana nama pemanah untuk melihat & berkongsi **Kad Skor Penuh 21 CP**.
   - **Cetak / Simpan PDF Keputusan Rasmi (A4)** lengkap dengan ruangan tandatangan Ketua Hakim & Pengerusi KTACR, serta **Eksport CSV (Excel)**.

4. **Panel Pengurusan Urusetia (`Urusetia`)**
   - Tambah peserta individu atau **Import Pukal** terus daripada CSV / Excel / senarai WhatsApp.
   - **Agih Sekata Kumpulan** secara automatik mengikut kategori (Kumpulan Lelaki & Kumpulan Wanita berasingan, maks. 8 orang).
   - Kongsi senarai ahli Kumpulan & arahan 21 CP ke telefon Ketua Kumpulan melalui **Kod QR** atau **Pautan Pantas WhatsApp**.
   - **Gabung Skor Kumpulan** di meja Urusetia dengan mengimbas Kod QR dari skrin telefon Ketua Kumpulan (tanpa internet) atau menampal mesej laporan WhatsApp.

---

## Pembangunan & Penggunaan Tempatan

```bash
# Pasang kebergantungan
npm install

# Jalankan pelayan pembangunan
npm run dev

# Bina pakej produksi PWA (ke dalam folder dist/)
npm run build
```

## Deploy Percuma ke GitHub Pages

Repositori ini telah dilengkapi fail aliran kerja `.github/workflows/deploy.yml`:
1. Buka tetapan repositori GitHub: **Settings → Pages**.
2. Di bawah **Build and deployment → Source**, pilih **GitHub Actions**.
3. Setiap kali kod digabungkan ke cawangan `main`, PWA akan diterbitkan secara automatik.
