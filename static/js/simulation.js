document.addEventListener("DOMContentLoaded", function () {

    const simulationForm = document.getElementById("simulationForm");

    if (!simulationForm) {
        return;
    }

    simulationForm.addEventListener("submit", runSimulation);

});


/* ========================================
   RUN SIMULATION
======================================== */

async function runSimulation(event) {

    event.preventDefault();

    const button = document.getElementById("simulationButton");
    const spinner = document.getElementById("simulationSpinner");
    const buttonText = document.getElementById("simulationButtonText");

    const errorBox = document.getElementById("simulationError");
    const errorText = document.getElementById("simulationErrorText");


    // Hide previous error
    errorBox.classList.add("d-none");


    // Get input values
    const temperature = document.getElementById(
        "simulationTemp"
    ).value;

    const coolant = document.getElementById(
        "simulationCoolant"
    ).value;

    const pressure = document.getElementById(
        "simulationPressure"
    ).value;

    const reactant = document.getElementById(
        "simulationReactant"
    ).value;

    const product = document.getElementById(
        "simulationProduct"
    ).value;


    // Convert input to number
    const data = {
        Reactor_Temp_C: Number(temperature),
        Jacket_Flow_Rate_L_min: Number(coolant),
        Pressure_atm: Number(pressure),
        Reactant_A_Conc_mol_L: Number(reactant),
        Product_B_Conc_mol_L: Number(product)
    };


    // Validate input
    const hasInvalidValue =
        Object.values(data).some(
            value => Number.isNaN(value)
        );

    if (hasInvalidValue) {

        showSimulationError(
            "Semua parameter harus diisi dengan angka."
        );

        return;
    }


    // Loading state
    button.disabled = true;
    spinner.classList.remove("d-none");
    buttonText.textContent = "Running...";


    try {

        const response = await fetch("/simulate", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify(data)

        });


        if (!response.ok) {

            throw new Error(
                "Backend gagal memproses simulasi."
            );

        }


        const result = await response.json();


        // Display simulation result
        displaySimulationResult(result);


    } catch (error) {

        showSimulationError(
            error.message
        );

    } finally {

        // Restore button
        button.disabled = false;
        spinner.classList.add("d-none");
        buttonText.textContent = "Run Simulation";

    }

}


/* ========================================
   DISPLAY RESULT
======================================== */

function displaySimulationResult(result) {

    const statusElement = document.getElementById(
        "simulationStatus"
    );

    const predictionElement = document.getElementById(
        "simulationPrediction"
    );

    const probabilityElement = document.getElementById(
        "simulationProbability"
    );

    const recommendationElement = document.getElementById(
        "simulationRecommendation"
    );

    const recommendationDescription =
        document.getElementById(
            "simulationRecommendationDescription"
        );


    /*
     * The exact response fields will follow
     * the backend API contract.
     */

    statusElement.textContent =
        result.status || "Completed";


    predictionElement.textContent =
        result.predicted_class !== undefined
            ? result.predicted_class
            : "—";


    if (result.probability !== undefined) {

        probabilityElement.textContent =
            formatProbability(result.probability);

    } else {

        probabilityElement.textContent = "—";

    }


    /*
     * Recommendation is optional because
     * the backend response structure has not
     * been finalized yet.
     */

    if (result.recommended_action) {

        recommendationElement.textContent =
            result.recommended_action;

    } else {

        recommendationElement.textContent = "—";

    }


    if (result.recommendation_description) {

        recommendationDescription.textContent =
            result.recommendation_description;

    } else {

        recommendationDescription.textContent =
            "Hasil rekomendasi akan ditampilkan dari model backend.";

    }

}


/* ========================================
   FORMAT PROBABILITY
======================================== */

function formatProbability(probability) {

    let value = Number(probability);

    if (Number.isNaN(value)) {
        return "—";
    }


    /*
     * Backend may return:
     * 0.93
     * or
     * 93
     */

    if (value <= 1) {
        value = value * 100;
    }


    return value.toFixed(2) + "%";

}


/* ========================================
   ERROR HANDLING
======================================== */

function showSimulationError(message) {

    const errorBox = document.getElementById(
        "simulationError"
    );

    const errorText = document.getElementById(
        "simulationErrorText"
    );


    errorText.textContent = message;

    errorBox.classList.remove("d-none");

}