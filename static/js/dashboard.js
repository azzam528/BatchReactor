document.addEventListener("DOMContentLoaded", function () {

    const predictionForm = document.getElementById("predictionForm");

    const predictButton = document.getElementById("predictButton");
    const predictSpinner = document.getElementById("predictSpinner");

    const predictionError = document.getElementById("predictionError");
    const predictionErrorText = document.getElementById(
        "predictionErrorText"
    );

    const reactorStatus = document.getElementById("reactorStatus");
    const reactorStatusIndicator = document.getElementById(
        "reactorStatusIndicator"
    );

    const predictionProbability = document.getElementById(
        "predictionProbability"
    );

    const predictionTimestamp = document.getElementById(
        "predictionTimestamp"
    );

    const temperatureValue = document.getElementById(
        "temperatureValue"
    );

    const coolantValue = document.getElementById(
        "coolantValue"
    );

    const pressureValue = document.getElementById(
        "pressureValue"
    );

    const reactantValue = document.getElementById(
        "reactantValue"
    );

    const productValue = document.getElementById(
        "productValue"
    );

    let sensorTrendChart = null;


    /* ========================================
       CHART
    ======================================== */

    initializeChart();


    function initializeChart() {

        const canvas = document.getElementById("sensorTrendChart");

        if (!canvas) {
            return;
        }

        sensorTrendChart = new Chart(canvas, {
            type: "line",

            data: {
                labels: [],

                datasets: [
                    {
                        label: "Temperature (°C)",
                        data: [],
                        tension: 0.3
                    },
                    {
                        label: "Pressure (atm)",
                        data: [],
                        tension: 0.3
                    },
                    {
                        label: "Coolant Flow (L/min)",
                        data: [],
                        tension: 0.3
                    }
                ]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                interaction: {
                    mode: "index",
                    intersect: false
                },

                scales: {
                    y: {
                        beginAtZero: false
                    }
                }
            }
        });
    }


    /* ========================================
       PREDICTION FORM
    ======================================== */

    if (predictionForm) {

        predictionForm.addEventListener(
            "submit",
            async function (event) {

                event.preventDefault();

                hideError();

                const data = getInputData();

                if (!validateInput(data)) {
                    return;
                }

                setLoading(true);

                try {

                    const response = await fetch("/predict", {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify(data)
                    });

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(
                            result.error ||
                            "Prediksi gagal dilakukan."
                        );
                    }

                    updateSensorCards(data);

                    updatePredictionResult(result);

                    updateChart(data);

                } catch (error) {

                    showError(
                        error.message ||
                        "Terjadi kesalahan saat melakukan prediksi."
                    );

                } finally {

                    setLoading(false);

                }
            }
        );
    }


    /* ========================================
       GET INPUT DATA
    ======================================== */

    function getInputData() {

        return {

            Reactor_Temp_C: parseFloat(
                document.getElementById("reactorTemp").value
            ),

            Jacket_Flow_Rate_L_min: parseFloat(
                document.getElementById("jacketFlow").value
            ),

            Pressure_atm: parseFloat(
                document.getElementById("pressure").value
            ),

            Reactant_A_Conc_mol_L: parseFloat(
                document.getElementById("reactantA").value
            ),

            Product_B_Conc_mol_L: parseFloat(
                document.getElementById("productB").value
            )
        };
    }


    /* ========================================
       VALIDATION
    ======================================== */

    function validateInput(data) {

        const values = Object.values(data);

        const hasInvalidValue = values.some(
            value => Number.isNaN(value)
        );

        if (hasInvalidValue) {

            showError(
                "Semua parameter harus diisi dengan angka yang valid."
            );

            return false;
        }

        return true;
    }


    /* ========================================
       UPDATE SENSOR CARDS
    ======================================== */

    function updateSensorCards(data) {

        temperatureValue.textContent =
            formatNumber(data.Reactor_Temp_C);

        coolantValue.textContent =
            formatNumber(data.Jacket_Flow_Rate_L_min);

        pressureValue.textContent =
            formatNumber(data.Pressure_atm);

        reactantValue.textContent =
            formatNumber(data.Reactant_A_Conc_mol_L);

        productValue.textContent =
            formatNumber(data.Product_B_Conc_mol_L);
    }


    /* ========================================
       UPDATE PREDICTION RESULT
    ======================================== */

    function updatePredictionResult(result) {

        const status = (
            result.status ||
            "UNKNOWN"
        ).toUpperCase();

        reactorStatus.textContent = status;

        reactorStatusIndicator.classList.remove(
            "status-neutral",
            "status-normal",
            "status-defect",
            "status-warning"
        );


        if (status === "NORMAL") {

            reactorStatusIndicator.classList.add(
                "status-normal"
            );

        } else if (status === "DEFECT") {

            reactorStatusIndicator.classList.add(
                "status-defect"
            );

        } else {

            reactorStatusIndicator.classList.add(
                "status-warning"
            );
        }


        /* Probability */

        if (
            result.probability !== undefined &&
            result.probability !== null
        ) {

            let probability = Number(
                result.probability
            );

            /*
             * Backend biasanya mengembalikan
             * probability dalam bentuk 0-1.
             */

            if (probability <= 1) {
                probability *= 100;
            }

            predictionProbability.textContent =
                `Probability: ${probability.toFixed(2)}%`;

        } else {

            predictionProbability.textContent =
                "Probability: -";
        }


        /* Timestamp */

        if (result.timestamp) {

            predictionTimestamp.textContent =
                `Last prediction: ${formatTimestamp(
                    result.timestamp
                )}`;

        } else {

            predictionTimestamp.textContent =
                "Last prediction: -";
        }
    }


    /* ========================================
       UPDATE CHART
    ======================================== */

    function updateChart(data) {

        if (!sensorTrendChart) {
            return;
        }

        const currentTime =
            new Date().toLocaleTimeString(
                "id-ID",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit"
                }
            );


        sensorTrendChart.data.labels.push(
            currentTime
        );

        sensorTrendChart.data.datasets[0].data.push(
            data.Reactor_Temp_C
        );

        sensorTrendChart.data.datasets[1].data.push(
            data.Pressure_atm
        );

        sensorTrendChart.data.datasets[2].data.push(
            data.Jacket_Flow_Rate_L_min
        );


        /*
         * Batasi jumlah titik agar chart
         * tidak terlalu panjang.
         */

        const maxPoints = 10;

        if (
            sensorTrendChart.data.labels.length >
            maxPoints
        ) {

            sensorTrendChart.data.labels.shift();

            sensorTrendChart.data.datasets.forEach(
                dataset => {
                    dataset.data.shift();
                }
            );
        }


        sensorTrendChart.update();
    }


    /* ========================================
       LOADING STATE
    ======================================== */

    function setLoading(isLoading) {

        if (!predictButton || !predictSpinner) {
            return;
        }

        predictButton.disabled = isLoading;

        if (isLoading) {

            predictSpinner.classList.remove(
                "d-none"
            );

            predictButton.childNodes[
                predictButton.childNodes.length - 1
            ].textContent = " Predicting...";

        } else {

            predictSpinner.classList.add(
                "d-none"
            );

            predictButton.childNodes[
                predictButton.childNodes.length - 1
            ].textContent = " Run Prediction";
        }
    }


    /* ========================================
       ERROR
    ======================================== */

    function showError(message) {

        predictionErrorText.textContent =
            message;

        predictionError.classList.remove(
            "d-none"
        );
    }


    function hideError() {

        predictionError.classList.add(
            "d-none"
        );

        predictionErrorText.textContent = "";
    }


    /* ========================================
       FORMAT NUMBER
    ======================================== */

    function formatNumber(value) {

        if (Number.isInteger(value)) {
            return value;
        }

        return Number(value).toFixed(2);
    }


    /* ========================================
       FORMAT TIMESTAMP
    ======================================== */

    function formatTimestamp(timestamp) {

        const date = new Date(timestamp);

        if (Number.isNaN(date.getTime())) {
            return timestamp;
        }

        return date.toLocaleString("id-ID");
    }

});