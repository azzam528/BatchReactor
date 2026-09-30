from flask import Flask, render_template, request, jsonify

app = Flask(__name__)


# ========================================
# PAGE ROUTES
# ========================================

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/simulation")
def simulation():
    return render_template("simulation.html")


@app.route("/history")
def history():
    return render_template("history.html")


@app.route("/model-info")
def model_info():
    return render_template("model_info.html")


# ========================================
# BACKEND HEALTH
# ========================================

@app.route("/health")
def health():
    return jsonify({
        "status": "ok"
    })


# ========================================
# MODEL STATUS
# ========================================

@app.route("/model/status")
def model_status():
    return jsonify({
        "supervised_model": False,
        "scaler": False,
        "features": False,
        "rl_qtable": False,
        "rl_metadata": False
    })


# ========================================
# PREDICTION
# ========================================

@app.route("/predict", methods=["POST"])
def predict():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Data JSON kosong"
        }), 400

    # DUMMY RESPONSE
    # Nanti diganti dengan model Random Forest asli.

    return jsonify({
        "predicted_class": 0,
        "status": "NORMAL",
        "probability": 0.93,
        "timestamp": None
    })


# ========================================
# WHAT-IF SIMULATION
# ========================================

@app.route("/simulate", methods=["POST"])
def simulate():

    data = request.get_json()

    if not data:
        return jsonify({
            "error": "Data JSON kosong"
        }), 400

    # DUMMY RESPONSE
    # Nanti diganti dengan proses simulation/model asli.

    return jsonify({
        "status": "Completed",
        "predicted_class": 0,
        "probability": 0.93,
        "recommended_action": "Pertahankan",
        "recommendation_description":
            "Rekomendasi sementara dari dummy backend."
    })


# ========================================
# PREDICTION HISTORY
# ========================================

@app.route("/history", methods=["GET"])
def prediction_history():

    # DUMMY DATA
    # Nanti diganti dengan history prediction
    # yang disimpan selama aplikasi berjalan.

    return jsonify({
        "history": []
    })


# ========================================
# RUN APPLICATION
# ========================================

if __name__ == "__main__":
    app.run(debug=True)