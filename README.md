# 🧪 Batch Reactor Anomaly Temperature Prediction — Reactor Monitoring & Anomaly Simulation Dashboard

![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-Backend-000000?logo=flask&logoColor=white)
![scikit-learn](https://img.shields.io/badge/scikit--learn-1.6.1-F7931E?logo=scikitlearn&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5-7952B3?logo=bootstrap&logoColor=white)

Aplikasi web untuk memantau kondisi reaktor batch dan mensimulasikan skenario *what-if*.
Proyek ini menggabungkan dua pendekatan Machine Learning dalam satu dashboard:

| Modul | Algoritma | Fungsi |
|---|---|---|
| **Supervised Learning** | Random Forest | Klasifikasi kondisi reaktor: `NORMAL` atau `DEFECT` |
| **Reinforcement Learning** | Q-Learning | Rekomendasi aksi coolant: *Turunkan / Pertahankan / Naikkan* |

> ⚠️ **Catatan penting:** aplikasi ini adalah dashboard **monitoring dan simulasi**, **bukan** sistem
> keselamatan atau kontrol otomatis reaktor. Hasil model tidak boleh dihubungkan langsung ke
> aktuator fisik. Lihat bagian [Keterbatasan](#-keterbatasan).

---

## ✨ Fitur

- 📊 **Dashboard** — input 5 parameter reaktor, status NORMAL/DEFECT, probabilitas, grafik tren, dan rekomendasi aksi
- 🎛️ **Simulation (What-If)** — coba kombinasi parameter tanpa dianggap sebagai data sensor asli
- 🕘 **History** — riwayat prediksi dan simulasi yang tersimpan di database
- ℹ️ **Model Info** — informasi model dan status file model
- 💾 **Database PostgreSQL** — riwayat tersimpan permanen (migrasi dengan Alembic)
- 🛡️ **Validasi input** — field kosong, bukan angka, atau tidak valid ditolak dengan pesan yang jelas
- ❤️ **Health check** — `/health` dan `/model/status`

---

## 🧰 Tech Stack

- **Backend:** Flask, joblib, NumPy, pandas, scikit-learn
- **Database:** PostgreSQL, SQLAlchemy, Alembic, psycopg2
- **Frontend:** HTML, Bootstrap 5, JavaScript (Fetch API), Chart.js
- **ML:** Random Forest (supervised), Q-Learning dengan environment Gymnasium (RL)

---

## 📁 Struktur Proyek

```text
BatchReactor/
├── app.py                 # Aplikasi Flask (routing + API + logika prediksi)
├── database.py            # Koneksi database (SQLAlchemy)
├── models_db.py           # Definisi tabel database
├── alembic.ini            # Konfigurasi migrasi
├── migrations/            # Skrip migrasi database
├── models/                # File model (.pkl) yang dibaca aplikasi
│   ├── supervised_model.pkl
│   ├── supervised_scaler.pkl
│   ├── supervised_features.pkl
│   ├── rl_qtable.pkl
│   └── rl_metadata.pkl
├── notebooks/             # Notebook EDA dan training
├── templates/             # Halaman HTML (Jinja2)
├── static/                # CSS dan JavaScript
├── images/                # Grafik hasil evaluasi model
├── requirements.txt
├── .env.example           # Contoh konfigurasi environment
├── API.md                 # Dokumentasi endpoint
└── README.md
```

---

## 🚀 Cara Menjalankan dari Nol

### 1. Clone repositori

```bash
git clone https://github.com/azzam528/BatchReactor.git
cd BatchReactor
```

### 2. Buat virtual environment dan install dependensi

**Windows (PowerShell):**

```bash
python -m venv venv
venv\Scripts\activate
python -m pip install -r requirements.txt
```

**macOS / Linux:**

```bash
python3 -m venv venv
source venv/bin/activate
python -m pip install -r requirements.txt
```

> Versi `scikit-learn` sengaja dikunci ke **1.6.1** karena model dilatih dengan versi tersebut.

### 3. Siapkan database PostgreSQL

1. Install PostgreSQL (postgresql.org/download) dan catat password user `postgres`.
2. Buat database lewat **SQL Shell (psql)** atau pgAdmin:

   ```sql
   CREATE DATABASE nama_database;
   ```

3. Salin `.env.example` menjadi `.env`, lalu isi:

   ```env
   DATABASE_URL=postgresql://postgres:PASSWORDMU@localhost:5432/nama_database
   ```

   > Jika password mengandung simbol, ubah menjadi kode URL: `@` → `%40`, `#` → `%23`, `:` → `%3A`, `/` → `%2F`.
   > File `.env` **tidak boleh** di-commit.

4. Buat tabel dengan migrasi:

   ```bash
   alembic upgrade head
   ```

### 4. Jalankan aplikasi

```bash
python app.py
```

Buka **http://127.0.0.1:5000** di browser.

---

## 🖥️ Halaman

| URL | Fungsi |
|---|---|
| `/` | Dashboard monitoring |
| `/simulation` | Simulasi What-If |
| `/history` | Riwayat prediksi dan simulasi |
| `/model-info` | Informasi model |

Daftar endpoint API lengkap ada di **[API.md](API.md)**.

---

## 🧠 Cara Kerja Singkat

**Prediksi (supervised):**

```text
Input 5 parameter → susun sesuai supervised_features.pkl → StandardScaler.transform()
                  → RandomForest.predict() + predict_proba() → NORMAL / DEFECT
```

**Rekomendasi (RL):**

```text
Input 5 parameter → diskretisasi jadi state (20×5×5×5×10 = 25.000 state)
                  → ambil baris Q-table → aksi dengan Q-value tertinggi
```

Lima parameter input:

| Parameter | Satuan |
|---|---|
| `Reactor_Temp_C` | °C |
| `Jacket_Flow_Rate_L_min` | L/min |
| `Pressure_atm` | atm |
| `Reactant_A_Conc_mol_L` | mol/L |
| `Product_B_Conc_mol_L` | mol/L |

---

## ⚠️ Keterbatasan

Bagian ini sengaja ditulis jujur agar hasil model tidak disalahartikan:

1. **Target supervised dibuat dari suhu.** Label `DEFECT` didefinisikan sebagai `Reactor_Temp_C > 100`, sementara suhu juga menjadi fitur input. Akurasi yang tinggi tidak membuktikan model mampu mendeteksi anomali yang kompleks (*data leakage*).
2. **Modul RL baru dilatih pada satu run.** Training Q-Learning hanya memakai satu `Reactor_Run_ID`, sehingga Q-table hanya terisi untuk sebagian kecil state. Untuk kebanyakan input, dashboard akan menampilkan *"Tidak ada rekomendasi"*. Ini perilaku yang diharapkan, bukan error.
3. **Efek aksi RL bersifat simulasi.** Environment memakai efek aksi sederhana dan bukan hubungan fisik reaktor yang sudah divalidasi. Batas nilai coolant di environment (0–50) juga berbeda dari skala dataset (sekitar 1000 L/min).
4. **Bukan sistem keselamatan.** Tidak ada integrasi sensor real-time maupun kontrol aktuator.

---

## 🛠️ Troubleshooting

| Masalah | Solusi |
|---|---|
| `DATABASE_URL is not set` | File `.env` belum dibuat, salah nama (`.env.txt`), atau salah folder |
| `password authentication failed` | Password di `.env` salah atau simbol belum di-encode |
| `connection refused` | Service PostgreSQL belum berjalan (`services.msc` → start `postgresql-x64-…`) |
| `database "..." does not exist` | Database belum dibuat atau namanya berbeda dengan `.env` |
| `alembic` tidak dikenali | Gunakan `python -m alembic upgrade head` |
| Peringatan versi scikit-learn | Pastikan memakai `scikit-learn==1.6.1` |
| Tampilan tidak berubah setelah edit JS | Tekan **Ctrl+F5** untuk membersihkan cache browser |

---

## 👥 Tim

Proyek kelompok mata kuliah Machine Learning.

| Peran | Tanggung jawab |
|---|---|
| Data & ML Engineer — Supervised | EDA, preprocessing, training Random Forest |
| Data & ML Engineer — Reinforcement Learning | EDA time-series, environment, Q-Learning |
| Backend Web Developer | Flask, API, integrasi model, database |
| Frontend Web Developer | Template HTML, Bootstrap, CSS |
| Web Integrator, Visualization & Project Manager | Fetch API, Chart.js, Git, laporan |
