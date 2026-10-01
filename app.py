from flask import Flask, render_template

app = Flask(__name__)


@app.route("/")
def index():
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
    return render_template("history.html")


if __name__ == "__main__":
    app.run(debug=True)