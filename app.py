import os, math, pickle
from datetime import datetime
import joblib
import pandas as pd
from flask import Flask, render_template, request, jsonify

from database import SessionLocal
from models_db import PredictionHistory, SimulationHistory
# Logika RL resmi dari tim RL (jangan ditulis ulang, supaya sama persis dengan training)
from training.Reinforcement_Learning.rl_inference import recommend as rl_recommend

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SUP_PATH = os.path.join(BASE_DIR, "models", "Supervised_Learning", "reactor_temp_model.joblib")
RL_PATH = os.path.join(BASE_DIR, "models", "Reinforcement_Learning", "rl_agent_batch_reactor.pkl")

# --- Load model SEKALI saat server start ---
sup_bundle = joblib.load(SUP_PATH)            # dict: model + metadata
sup_model = sup_bundle["model"]               # RandomForestRegressor (target: suhu t+1)
FEATURES = sup_bundle["features_in_order"]    # urutan fitur HARUS sama dengan saat training
SUP_RANGES = sup_bundle["train_ranges"]
with open(RL_PATH, "rb") as f:
    rl_agent = pickle.load(f)

# Threshold anomaly SEMENTARA (belum diputuskan tim, lihat metadata model)
_anom = sup_bundle["anomaly"]
ANOMALY_KEY = _anom["provisional_threshold_key"]
ANOMALY_THRESHOLD = float(_anom["threshold_options_celsius"][ANOMALY_KEY])

# Nama field dari frontend -> nama field untuk rl_inference
RL_KEYS = {
    "Reactor_Temp_C": "reactor_temp_c",
    "Jacket_Flow_Rate_L_min": "jacket_flow_rate_l_min",
    "Pressure_atm": "pressure_atm",
    "Reactant_A_Conc_mol_L": "reactant_a_conc_mol_l",
    "Product_B_Conc_mol_L": "product_b_conc_mol_l",
}


# ========================================
# HELPER
# ========================================

def to_number(data, name, required=True):
    if name not in data or data[name] in ("", None):
        if required:
            raise ValueError(f"Field '{name}' wajib diisi")
        return None
    try:
        v = float(data[name])
    except (TypeError, ValueError):
        raise ValueError(f"Field '{name}' harus berupa angka")
    if not math.isfinite(v):
        raise ValueError(f"Field '{name}' tidak valid")
    return v


def parse_input(data):
    if not data:
        raise ValueError("Data JSON kosong")
    values = {f: to_number(data, f) for f in FEATURES}
    # Opsional: suhu aktual t+1, hanya untuk menghitung prediction error (monitoring)
    values["Actual_Next_Temp_C"] = to_number(data, "Actual_Next_Temp_C", required=False)
    return values


def range_warnings(values):
    out = []
    for f in FEATURES:
        lo, hi = SUP_RANGES[f]
        if not (lo <= values[f] <= hi):
            out.append(f"{f} di luar rentang data training ({lo} - {hi}); "
                       "hasil perlu diinterpretasikan dengan hati-hati")
    return out


def run_prediction(values):
    X = pd.DataFrame([[values[f] for f in FEATURES]], columns=FEATURES)
    predicted = float(sup_model.predict(X)[0])
    result = {"predicted_temperature": predicted,
              "prediction_error": None, "anomaly_status": None}
    actual = values.get("Actual_Next_Temp_C")
    if actual is not None:
        err = abs(actual - predicted)
        result["prediction_error"] = err
        result["anomaly_status"] = "potential_anomaly" if err > ANOMALY_THRESHOLD else "normal_pattern"
    return result


def run_recommendation(values):
    state = {RL_KEYS[f]: values[f] for f in FEATURES}
    r = rl_recommend(rl_agent, state)
    label = r["recommended_action"]["action_label"]
    nxt = r["simulation_result"]["simulated_next_state"]["reactor_temp_c"]
    desc = (f"Hasil simulasi: suhu berikutnya sekitar {nxt:.2f} °C "
            f"(reward {r['simulation_result']['reward']:.2f}). {r['simulation_note']}")
    if any("belum pernah dipelajari" in w for w in r["warnings"]):
        desc += " Catatan: kondisi ini belum pernah dipelajari agen, aksi default Maintain."
    return {"label": label, "action_id": r["recommended_action"]["action_id"],
            "description": desc, "warnings": r["warnings"],
            "simulated_next_temperature": nxt}


def build_response(values, with_status=False):
    pred = run_prediction(values)
    rec = run_recommendation(values)
    # Peringatan rentang sudah dibuat sendiri di range_warnings, jadi yang dari RL hanya sisanya
    warnings = range_warnings(values) + [w for w in rec["warnings"] if "di luar rentang" not in w]
    resp = {
        "predicted_temperature": pred["predicted_temperature"],
        "predicted_temperature_next": pred["predicted_temperature"],
        "prediction_error": pred["prediction_error"],
        "anomaly_status": pred["anomaly_status"],
        "anomaly_threshold_c": ANOMALY_THRESHOLD,
        "anomaly_threshold_note": f"Threshold {ANOMALY_KEY} SEMENTARA, bukan batas keselamatan.",
        "recommended_action": rec["label"],
        "recommendation_description": rec["description"],
        "warnings": warnings,
        "model_information": {
            "model_type": sup_bundle["model_type"],
            "model_version": sup_bundle["model_version"],
            "trained_at": sup_bundle["trained_at"],
        },
        "timestamp": datetime.now().isoformat(timespec="seconds"),
    }
    if with_status:
        resp["status"] = "Completed"
    return resp, pred, rec


def db_fields(v, pred):
    return dict(
        reactor_temperature=v["Reactor_Temp_C"],
        jacket_flow_rate=v["Jacket_Flow_Rate_L_min"],
        pressure=v["Pressure_atm"],
        reactant_a_concentration=v["Reactant_A_Conc_mol_L"],
        product_b_concentration=v["Product_B_Conc_mol_L"],
        predicted_temperature=pred["predicted_temperature"],
        prediction_error=pred["prediction_error"],
    )


def save_record(model_cls, **fields):
    """Simpan ke database. Kalau DB error, prediksi tetap jalan."""
    try:
        with SessionLocal() as session:
            session.add(model_cls(**fields))
            session.commit()
    except Exception as e:
        app.logger.error(f"Gagal simpan ke database: {e}")


# ========================================
# HALAMAN
# ========================================

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/simulation")
def simulation():
    return render_template("simulation.html")

@app.route("/reinforcement")
def reinforcement():
    return render_template("reinforcement.html")

@app.route("/model-info")
def model_info():
    return render_template("model_info.html")

@app.route("/history")
def history():
    # Alamat sama untuk halaman (browser kirim Accept: text/html) dan data JSON (fetch)
    if "text/html" in request.headers.get("Accept", ""):
        return render_template("history.html")
    return history_data()


# ========================================
# API
# ========================================

@app.route("/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/model/status")
def model_status():
    return jsonify({
        "supervised_model": sup_model is not None,
        "scaler": True,                 # model baru tidak memakai scaler (preprocessing: none)
        "scaler_required": False,
        "features": bool(FEATURES),
        "rl_qtable": rl_agent.get("q_table") is not None,
        "rl_metadata": bool(rl_agent.get("action_labels")),
        "supervised_version": sup_bundle["model_version"],
        "rl_version": rl_agent.get("model_version"),
    })


@app.route("/predict", methods=["POST"])
def predict():
    try:
        v = parse_input(request.get_json(silent=True))
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    try:
        resp, pred, _ = build_response(v)
    except Exception as e:
        app.logger.error(f"Prediksi gagal: {e}")
        return jsonify({"error": "Prediksi tidak tersedia saat ini"}), 500
    save_record(PredictionHistory, **db_fields(v, pred))
    return jsonify(resp)


@app.route("/simulate", methods=["POST"])
def simulate():
    try:
        v = parse_input(request.get_json(silent=True))
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    try:
        resp, pred, rec = build_response(v, with_status=True)
    except Exception as e:
        app.logger.error(f"Simulasi gagal: {e}")
        return jsonify({"error": "Simulasi tidak tersedia saat ini"}), 500
    save_record(SimulationHistory, **db_fields(v, pred), recommended_action=rec["label"])
    return jsonify(resp)


def history_data():
    rows = []
    try:
        with SessionLocal() as session:
            for cls, source in ((PredictionHistory, "predict"), (SimulationHistory, "simulate")):
                for r in session.query(cls).order_by(cls.id.desc()).limit(50):
                    rows.append({
                        "timestamp": r.created_at.isoformat(timespec="seconds"),
                        "Reactor_Temp_C": r.reactor_temperature,
                        "Jacket_Flow_Rate_L_min": r.jacket_flow_rate,
                        "Pressure_atm": r.pressure,
                        "Reactant_A_Conc_mol_L": r.reactant_a_concentration,
                        "Product_B_Conc_mol_L": r.product_b_concentration,
                        "predicted_temperature": r.predicted_temperature,
                        "prediction_error": r.prediction_error,
                        "recommended_action": getattr(r, "recommended_action", None),
                        "source": source,
                    })
    except Exception as e:
        app.logger.error(f"Gagal baca history: {e}")
        return jsonify({"error": "Database tidak tersedia"}), 500
    rows.sort(key=lambda x: x["timestamp"], reverse=True)
    return jsonify(rows[:50])


if __name__ == "__main__":
    app.run(debug=True)
