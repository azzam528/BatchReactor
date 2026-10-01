document.addEventListener("DOMContentLoaded", function () {

    const predictionForm = document.getElementById("predictionForm");

    const predictButton = document.getElementById("predictButton");
    const predictSpinner = document.getElementById("predictSpinner");

    const predictionError = document.getElementById("predictionError");
    const predictionErrorText = document.getElementById(
        "predictionErrorText"
    );

    const predictedTemperature = document.getElementById(
        "predictedTemperature"
    );

    const predictionErrorValue = document.getElementById(
        "predictionErrorValue"
    );

    const monitoringStatus = document.getElementById(
        "monitoringStatus"
    );

    const monitoringIndicator = document.getElementById(
        "monitoringIndicator"
    );

    const monitoringTitle = document.getElementById(
        "monitoringTitle"
    );

    const monitoringDescription = document.getElementById(
        "monitoringDescription"
    );

    const predictionTimestamp = document.getElementById(
        "predictionTimestamp"
    );

    const recommendationAction = document.getElementById(
        "recommendationAction"
    );

    const recommendationDescription = document.getElementById(
        "recommendationDescription"
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
                        label: "Jacket Flow (L/min)",
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

        /*
         * Backend baru seharusnya mengembalikan
         * predicted next reactor temperature.
         */

        const predictedTemp =
            result.predicted_temperature ??
            result.predicted_temperature_next ??
            result.predicted_temp ??
            result.prediction;


        if (
            predictedTemp !== undefined &&
            predictedTemp !== null &&
            !Number.isNaN(Number(predictedTemp))
        ) {

            predictedTemperature.textContent =
                formatNumber(Number(predictedTemp));

        } else {

            predictedTemperature.textContent = "—";
        }


        /*
         * Prediction error hanya tersedia apabila
         * actual T(t+1) tersedia.
         */

        const errorValue =
            result.prediction_error ??
            result.error_value ??
            result.absolute_error;


        if (
            errorValue !== undefined &&
            errorValue !== null &&
            !Number.isNaN(Number(errorValue))
        ) {

            predictionErrorValue.textContent =
                `${formatNumber(Number(errorValue))} °C`;

            updateMonitoringState(Number(errorValue));

        } else {

            predictionErrorValue.textContent = "—";

            setMonitoringWaiting();
        }


        /*
         * RL recommendation
         */

        if (recommendationAction) {

            recommendationAction.textContent =
                result.recommended_action ||
                result.action ||
                "—";
        }


        if (recommendationDescription) {

            recommendationDescription.textContent =
                result.recommendation_description ||
                result.action_description ||
                "RL recommendation akan ditampilkan setelah simulation environment dikonfigurasi.";
        }


        /*
         * Timestamp
         */

        if (result.timestamp) {

            predictionTimestamp.textContent =
                formatTimestamp(result.timestamp);

        } else {

            predictionTimestamp.textContent = "—";
        }
    }


    /* ========================================
       MONITORING STATE
    ======================================== */

    function setMonitoringWaiting() {

        if (monitoringStatus) {
            monitoringStatus.textContent = "Waiting";
        }

        if (monitoringTitle) {
            monitoringTitle.textContent =
                "Waiting for actual next temperature";
        }

        if (monitoringDescription) {
            monitoringDescription.textContent =
                "Prediction error akan dihitung ketika actual T(t+1) tersedia.";
        }

        if (monitoringIndicator) {

            monitoringIndicator.classList.remove(
                "normal",
                "warning",
                "neutral"
            );

            monitoringIndicator.classList.add(
                "neutral"
            );
        }
    }


    function updateMonitoringState(errorValue) {

        /*
         * Jangan membuat threshold anomaly
         * secara sembarangan.
         *
         * Untuk sementara status hanya menunjukkan
         * bahwa prediction error tersedia.
         */

        if (monitoringStatus) {
            monitoringStatus.textContent = "Error Available";
        }

        if (monitoringTitle) {
            monitoringTitle.textContent =
                "Prediction deviation available";
        }

        if (monitoringDescription) {
            monitoringDescription.textContent =
                `Prediction error saat ini ${formatNumber(errorValue)} °C.`;
        }

        if (monitoringIndicator) {

            monitoringIndicator.classList.remove(
                "normal",
                "warning",
                "neutral"
            );

            monitoringIndicator.classList.add(
                "neutral"
            );
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

        if (!predictionError || !predictionErrorText) {
            return;
        }

        predictionErrorText.textContent =
            message;

        predictionError.classList.remove(
            "d-none"
        );
    }


    function hideError() {

        if (!predictionError || !predictionErrorText) {
            return;
        }

        predictionError.classList.add(
            "d-none"
        );

        predictionErrorText.textContent = "";
    }


    /* ========================================
       FORMAT NUMBER
    ======================================== */

    function formatNumber(value) {

        const number = Number(value);

        if (!Number.isFinite(number)) {
            return "—";
        }

        return number.toFixed(2);
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