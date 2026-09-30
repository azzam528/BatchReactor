document.addEventListener("DOMContentLoaded", function () {
    checkBackendHealth();
    checkModelStatus();
});


/* ========================================
   BACKEND HEALTH CHECK
======================================== */

async function checkBackendHealth() {

    const statusText = document.getElementById("backendStatus");
    const statusIndicator = document.getElementById(
        "backendStatusIndicator"
    );

    if (!statusText || !statusIndicator) {
        return;
    }

    try {

        const response = await fetch("/health");

        if (!response.ok) {
            throw new Error("Backend tidak merespons.");
        }

        const result = await response.json();

        if (result.status === "ok") {

            statusText.textContent = "Connected";

            statusIndicator.classList.remove("status-unknown");
            statusIndicator.classList.add("status-online");

        } else {

            statusText.textContent = "Warning";

            statusIndicator.classList.remove("status-unknown");
            statusIndicator.classList.add("status-warning");

        }

    } catch (error) {

        statusText.textContent = "Offline";

        statusIndicator.classList.remove("status-unknown");
        statusIndicator.classList.add("status-offline");
    }
}


/* ========================================
   MODEL STATUS CHECK
======================================== */

async function checkModelStatus() {

    const statusText = document.getElementById("modelStatus");
    const statusIndicator = document.getElementById(
        "modelStatusIndicator"
    );

    if (!statusText || !statusIndicator) {
        return;
    }

    try {

        const response = await fetch("/model/status");

        if (!response.ok) {
            throw new Error("Model status tidak tersedia.");
        }

        const result = await response.json();

        const modelReady =
            result.supervised_model === true &&
            result.scaler === true &&
            result.features === true &&
            result.rl_qtable === true &&
            result.rl_metadata === true;

        if (modelReady) {

            statusText.textContent = "Ready";

            statusIndicator.classList.remove("status-unknown");
            statusIndicator.classList.add("status-online");

        } else {

            statusText.textContent = "Not Ready";

            statusIndicator.classList.remove("status-unknown");
            statusIndicator.classList.add("status-warning");

        }

    } catch (error) {

        statusText.textContent = "Unavailable";

        statusIndicator.classList.remove("status-unknown");
        statusIndicator.classList.add("status-offline");
    }
}