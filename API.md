# 📡 Dokumentasi API — Batch Reactor Anomaly

Base URL (lokal): `http://127.0.0.1:5000`

Semua endpoint API menerima dan mengirim **JSON**. Contoh di bawah dijalankan pada server lokal dan
memakai model yang tersimpan di folder `models/`.

## Ringkasan Endpoint

| Method | Endpoint | Fungsi |
|---|---|---|
| `GET` | `/health` | Cek server hidup |
| `GET` | `/model/status` | Cek file model berhasil dimuat |
| `POST` | `/predict` | Prediksi NORMAL/DEFECT + rekomendasi RL (dipakai Dashboard) |
| `POST` | `/simulate` | Simulasi What-If (dipakai halaman Simulation) |
| `GET` | `/history` | Riwayat prediksi dan simulasi dari database |
| `POST` | `/api/predict-defect` | Prediksi lengkap dengan probabilitas kedua kelas (tanpa database) |
| `POST` | `/api/reactor-control` | Rekomendasi Q-Learning lengkap dengan Q-value (tanpa database) |

Halaman web (bukan API): `/`, `/simulation`, `/history` (dibuka lewat browser), `/model-info`, `/reinforcement`.

---

## Input (Request Body)

Endpoint `POST` menerima 5 field berikut. **Nama field harus persis sama** (huruf besar-kecil berpengaruh)
dan semua wajib berupa angka.

| Field | Satuan | Keterangan |
|---|---|---|
| `Reactor_Temp_C` | °C | Suhu reaktor |
| `Jacket_Flow_Rate_L_min` | L/min | Laju aliran jacket/coolant |
| `Pressure_atm` | atm | Tekanan reaktor |
| `Reactant_A_Conc_mol_L` | mol/L | Konsentrasi reaktan A |
| `Product_B_Conc_mol_L` | mol/L | Konsentrasi produk B |

Contoh:

```json
{
  "Reactor_Temp_C": 95.0,
  "Jacket_Flow_Rate_L_min": 1000.0,
  "Pressure_atm": 3.2,
  "Reactant_A_Conc_mol_L": 1.2,
  "Product_B_Conc_mol_L": 0.8
}
```

---

## `GET /health`

Cek server berjalan.

**Response `200`**

```json
{ "status": "ok" }
```

---

## `GET /model/status`

Cek apakah kelima file model berhasil dimuat.

**Response `200`**

```json
{
  "supervised_model": true,
  "scaler": true,
  "features": true,
  "rl_qtable": true,
  "rl_metadata": true
}
```

---

## `POST /predict`

Menjalankan model Random Forest dan modul rekomendasi Q-Learning, lalu **menyimpan hasilnya ke tabel
`prediction_history`**.

**Request:** lihat bagian [Input](#input-request-body).

**Response `200`**

```json
{
  "status": "NORMAL",
  "predicted_class": "NORMAL",
  "probability": 0.99,
  "recommended_action": "Tidak ada rekomendasi",
  "recommendation_description": "Kondisi ini belum pernah dipelajari agen RL (simulasi).",
  "timestamp": "2026-09-30T11:54:45"
}
```

| Field | Keterangan |
|---|---|
| `status` | `NORMAL` atau `DEFECT` |
| `predicted_class` | Sama dengan `status` |
| `probability` | Probabilitas (0–1) untuk **kelas yang diprediksi** |
| `recommended_action` | `Turunkan Coolant`, `Pertahankan`, `Naikkan Coolant`, atau `Tidak ada rekomendasi` |
| `recommendation_description` | Penjelasan rekomendasi |
| `timestamp` | Waktu prediksi (ISO 8601) |

> `Tidak ada rekomendasi` muncul ketika kondisi input belum pernah dipelajari agen RL. Ini perilaku normal.

---

## `POST /simulate`

Sama seperti `/predict`, tetapi hasilnya disimpan ke tabel **`simulation_history`** (dianggap simulasi,
bukan data sensor).

**Response `200`**

```json
{
  "status": "NORMAL",
  "predicted_class": "NORMAL",
  "probability": 0.99,
  "recommended_action": "Pertahankan",
  "recommendation_description": "Rekomendasi hasil simulasi Q-Learning, bukan instruksi kontrol otomatis.",
  "timestamp": "2026-09-30T11:55:10"
}
```

---

## `GET /history`

Mengambil hingga **50 riwayat terbaru** dari gabungan tabel `prediction_history` dan `simulation_history`,
diurutkan dari yang terbaru.

> Alamat `/history` juga membuka halaman riwayat jika diakses lewat browser. Untuk mendapatkan JSON,
> panggil dari `fetch()`/kode (bukan menempelkan alamat di browser).

**Response `200`**

```json
[
  {
    "timestamp": "2026-09-30T11:55:10",
    "Reactor_Temp_C": 90.0,
    "Jacket_Flow_Rate_L_min": 1000.0,
    "Pressure_atm": 3.2,
    "Reactant_A_Conc_mol_L": 3.0,
    "Product_B_Conc_mol_L": 0.5,
    "status": "NORMAL",
    "probability": 0.99,
    "recommended_action": "Pertahankan",
    "source": "simulate"
  }
]
```

| Field | Keterangan |
|---|---|
| `source` | `predict` atau `simulate` |
| `recommended_action` | Terisi untuk `simulate`, `null` untuk `predict` |

**Response `500`** — database tidak tersedia

```json
{ "error": "Database tidak tersedia" }
```

---

## `POST /api/predict-defect`

Endpoint versi awal. Mengembalikan probabilitas **kedua kelas**. Tidak menyimpan ke database.

**Response `200`**

```json
{
  "predicted_class": 0,
  "status": "NORMAL",
  "prediction": "NORMAL",
  "probability": { "normal": 0.99, "anomali": 0.01 },
  "safety_message": "Kondisi reaktor normal.",
  "timestamp": "2026-09-30T11:54:45"
}
```

> Perhatian: pada endpoint ini `predicted_class` berupa angka (`0` = normal, `1` = defect) dan
> `probability` berupa objek, berbeda dengan `/predict`.

---

## `POST /api/reactor-control`

Endpoint versi awal untuk rekomendasi Q-Learning. Mengembalikan Q-value ketiga aksi (cocok untuk
Bar Chart). Tidak menyimpan ke database.

**Response `200`**

```json
{
  "action": "Pertahankan",
  "action_id": 1,
  "q_values": { "turunkan": 97.578, "pertahankan": 100.0, "naikkan": 98.187 },
  "known_state": true,
  "safety_message": "Rekomendasi hasil simulasi Q-Learning, bukan instruksi kontrol otomatis."
}
```

Jika kondisi belum pernah dipelajari agen:

```json
{
  "action": "Tidak ada rekomendasi",
  "action_id": null,
  "q_values": { "turunkan": 0.0, "pertahankan": 0.0, "naikkan": 0.0 },
  "known_state": false,
  "safety_message": "Kondisi ini belum pernah dipelajari agen RL (simulasi)."
}
```

| `action_id` | Aksi |
|---|---|
| `0` | Turunkan Coolant |
| `1` | Pertahankan |
| `2` | Naikkan Coolant |

---

## Kode Error

| Status | Arti | Contoh body |
|---|---|---|
| `400` | Input tidak valid | `{ "error": "Field 'Pressure_atm' wajib diisi" }` |
| `500` | Database tidak tersedia (hanya `/history`) | `{ "error": "Database tidak tersedia" }` |

Pesan `400` yang mungkin muncul:

- `Data JSON kosong`
- `Field '<nama>' wajib diisi`
- `Field '<nama>' harus berupa angka`
- `Field '<nama>' tidak valid` (misalnya `NaN` atau `Infinity`)

> Jika database mati, `/predict` dan `/simulate` **tetap mengembalikan hasil prediksi**. Kegagalan menyimpan
> hanya dicatat di log server.

---

## Contoh Pemakaian

**Python**

```python
import requests

data = {
    "Reactor_Temp_C": 95.0,
    "Jacket_Flow_Rate_L_min": 1000.0,
    "Pressure_atm": 3.2,
    "Reactant_A_Conc_mol_L": 1.2,
    "Product_B_Conc_mol_L": 0.8,
}

r = requests.post("http://127.0.0.1:5000/predict", json=data)
print(r.status_code, r.json())
```

**JavaScript (Fetch API)**

```javascript
const response = await fetch("/predict", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(data),
});
const result = await response.json();
```

**Contoh input yang menghasilkan rekomendasi RL** (Q-table baru terisi untuk sebagian kecil state):

| Suhu | Flow | Tekanan | Reaktan A | Produk B | Rekomendasi |
|---|---|---|---|---|---|
| 90 | 1000 | 3.2 | 3.0 | 0.5 | Pertahankan |
| 80 | 1000 | 3.2 | 2.0 | 0.5 | Naikkan Coolant |
