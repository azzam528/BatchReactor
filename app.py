from flask import Flask, render_template, request, jsonify

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/supervised")
def supervised():
    return render_template("supervised.html")

@app.route("/reinforcement")
def reinforcement():
    return render_template("reinforcement.html")

@app.route("/api/predict-defect", methods=["POST"])
def predict_defect():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Data JSON kosong"}), 400

    # DUMMY: nanti diganti pakai model asli
    return jsonify({
        "prediction": "Normal",
        "probability": {"normal": 0.8, "anomali": 0.2},
        "safety_message": "Kondisi reaktor aman."
    })


@app.route("/api/reactor-control", methods=["POST"])
def reactor_control():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Data JSON kosong"}), 400

    # DUMMY: nanti diganti pakai Q-table asli
    return jsonify({
        "action": "Pertahankan",
        "q_values": {"turunkan": 0.1, "pertahankan": 0.5, "naikkan": 0.2},
        "safety_message": "Pertahankan aliran coolant."
    })

if __name__ == "__main__":
    app.run(debug=True)