import os, math
from datetime import datetime
import joblib
import numpy as np
import pandas as pd
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

# --- Load model SEKALI saat server start ---
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")

def load(name):
    return joblib.load(os.path.join(MODEL_DIR, name))

sup_model = load("supervised_model.pkl")
sup_scaler = load("supervised_scaler.pkl")
FEATURES = load("supervised_features.pkl")
rl_qtable = load("rl_qtable.pkl")
rl_meta = load("rl_metadata.pkl")


# --- Helper ---
def parse_input(data):
    if not data:
        raise ValueError("Data JSON kosong")
    values = {}
    for f in FEATURES:
        if f not in data or data[f] in ("", None):
            raise ValueError(f"Field '{f}' wajib diisi")
        try:
            v = float(data[f])
        except (TypeError, ValueError):
            raise ValueError(f"Field '{f}' harus berupa angka")
        if not math.isfinite(v):
            raise ValueError(f"Field '{f}' tidak valid")
        values[f] = v
    return values


def discretize_state(state):
    # Sama persis dengan fungsi di notebook Anggota 2
    idx = []
    for v, (low, high), n_bin in zip(state, rl_meta["state_bounds"], rl_meta["n_bins"]):
        norm = np.clip((v - low) / (high - low + 1e-8), 0, 1)
        idx.append(int(norm * (n_bin - 1)))
    return int(np.ravel_multi_index(idx, rl_meta["n_bins"]))


# --- Halaman ---
@app.route("/")
def home():
    return render_template("index.html")

@app.route("/supervised")
def supervised():
    return render_template("supervised.html")

@app.route("/reinforcement")
def reinforcement():
    return render_template("reinforcement.html")


# --- API ---
@app.route("/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/api/predict-defect", methods=["POST"])
def predict_defect():
    try:
        values = parse_input(request.get_json(silent=True))
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    X = pd.DataFrame([[values[f] for f in FEATURES]], columns=FEATURES)
    X_scaled = sup_scaler.transform(X)
    pred = int(sup_model.predict(X_scaled)[0])
    proba = sup_model.predict_proba(X_scaled)[0]
    p = {int(c): float(pr) for c, pr in zip(sup_model.classes_, proba)}

    if pred == 1:
        status = "DEFECT"
        msg = "Terdeteksi kondisi defect. Periksa suhu dan aliran coolant."
    else:
        status = "NORMAL"
        msg = "Kondisi reaktor normal."

    return jsonify({
        "predicted_class": pred,
        "status": status,
        "prediction": status,
        "probability": {"normal": p.get(0, 0.0), "anomali": p.get(1, 0.0)},
        "safety_message": msg,
        "timestamp": datetime.now().isoformat(timespec="seconds"),
    })


@app.route("/api/reactor-control", methods=["POST"])
def reactor_control():
    try:
        v = parse_input(request.get_json(silent=True))
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    # Urutan state sesuai notebook: suhu, tekanan, reaktan, produk, coolant
    state = [v["Reactor_Temp_C"], v["Pressure_atm"], v["Reactant_A_Conc_mol_L"],
             v["Product_B_Conc_mol_L"], v["Jacket_Flow_Rate_L_min"]]
    q = rl_qtable[discretize_state(state)]
    q_values = {"turunkan": float(q[0]), "pertahankan": float(q[1]), "naikkan": float(q[2])}

    if not q.any():
        # Semua Q-value 0 = state ini belum pernah dipelajari agen
        return jsonify({
            "action": "Tidak ada rekomendasi",
            "action_id": None,
            "q_values": q_values,
            "known_state": False,
            "safety_message": "Kondisi ini belum pernah dipelajari agen RL (simulasi).",
        })

    action_id = int(np.argmax(q))
    return jsonify({
        "action": rl_meta["actions"][action_id],
        "action_id": action_id,
        "q_values": q_values,
        "known_state": True,
        "safety_message": "Rekomendasi hasil simulasi Q-Learning, bukan instruksi kontrol otomatis.",
    })


if __name__ == "__main__":
    app.run(debug=True)