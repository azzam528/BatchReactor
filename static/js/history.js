document.addEventListener("DOMContentLoaded", function () {

    loadHistory();

    const refreshButton = document.getElementById(
        "refreshHistoryButton"
    );

    if (refreshButton) {
        refreshButton.addEventListener(
            "click",
            loadHistory
        );
    }

});


/* ========================================
   LOAD HISTORY
======================================== */

async function loadHistory() {

    const loading = document.getElementById(
        "historyLoading"
    );

    const empty = document.getElementById(
        "historyEmpty"
    );

    const error = document.getElementById(
        "historyError"
    );

    const errorText = document.getElementById(
        "historyErrorText"
    );

    const tableContainer = document.getElementById(
        "historyTableContainer"
    );

    const tableBody = document.getElementById(
        "historyTableBody"
    );


    // Reset display
    loading.classList.remove("d-none");
    empty.classList.add("d-none");
    error.classList.add("d-none");
    tableContainer.classList.add("d-none");

    tableBody.innerHTML = "";


    try {

        const response = await fetch("/history");


        if (!response.ok) {

            throw new Error(
                "Backend gagal mengambil prediction history."
            );

        }


        const result = await response.json();


        /*
         * Backend may return:
         *
         * [
         *     {...},
         *     {...}
         * ]
         *
         * or:
         *
         * {
         *     "history": [...]
         * }
         */

        const records = Array.isArray(result)
            ? result
            : result.history;


        if (!Array.isArray(records) || records.length === 0) {

            loading.classList.add("d-none");
            empty.classList.remove("d-none");

            return;
        }


        // Add records to table
        records.forEach(function (record) {

            const row = createHistoryRow(record);

            tableBody.appendChild(row);

        });


        loading.classList.add("d-none");
        tableContainer.classList.remove("d-none");


    } catch (errorObject) {

        loading.classList.add("d-none");

        error.classList.remove("d-none");

        errorText.textContent =
            errorObject.message;

    }

}


/* ========================================
   CREATE TABLE ROW
======================================== */

function createHistoryRow(record) {

    const row = document.createElement("tr");


    // Time
    const timeCell = document.createElement("td");

    timeCell.textContent =
        formatTimestamp(record.timestamp);

    row.appendChild(timeCell);


    // Temperature
    const temperatureCell =
        document.createElement("td");

    temperatureCell.textContent =
        formatValue(record.Reactor_Temp_C, "°C");

    row.appendChild(temperatureCell);


    // Coolant Flow
    const coolantCell =
        document.createElement("td");

    coolantCell.textContent =
        formatValue(
            record.Jacket_Flow_Rate_L_min,
            " L/min"
        );

    row.appendChild(coolantCell);


    // Pressure
    const pressureCell =
        document.createElement("td");

    pressureCell.textContent =
        formatValue(
            record.Pressure_atm,
            " atm"
        );

    row.appendChild(pressureCell);


    // Reactant A
    const reactantCell =
        document.createElement("td");

    reactantCell.textContent =
        formatValue(
            record.Reactant_A_Conc_mol_L,
            " mol/L"
        );

    row.appendChild(reactantCell);


    // Product B
    const productCell =
        document.createElement("td");

    productCell.textContent =
        formatValue(
            record.Product_B_Conc_mol_L,
            " mol/L"
        );

    row.appendChild(productCell);


    // Prediction
    const predictionCell =
        document.createElement("td");

    const predictionBadge =
        document.createElement("span");

    predictionBadge.classList.add(
        "badge"
    );


    const status =
        record.status ||
        record.predicted_class;


    if (
        status === "NORMAL" ||
        status === 0 ||
        status === "0"
    ) {

        predictionBadge.classList.add(
            "bg-success"
        );

        predictionBadge.textContent =
            "NORMAL";

    } else if (
        status === "DEFECT" ||
        status === 1 ||
        status === "1"
    ) {

        predictionBadge.classList.add(
            "bg-danger"
        );

        predictionBadge.textContent =
            "DEFECT";

    } else {

        predictionBadge.classList.add(
            "bg-secondary"
        );

        predictionBadge.textContent =
            status || "—";

    }


    predictionCell.appendChild(
        predictionBadge
    );

    row.appendChild(predictionCell);


    // Probability
    const probabilityCell =
        document.createElement("td");

    probabilityCell.textContent =
        formatProbability(
            record.probability
        );

    row.appendChild(probabilityCell);


    return row;

}


/* ========================================
   FORMAT VALUE
======================================== */

function formatValue(value, unit) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {
        return "—";
    }


    const number = Number(value);


    if (Number.isNaN(number)) {
        return value;
    }


    return number + unit;

}


/* ========================================
   FORMAT PROBABILITY
======================================== */

function formatProbability(probability) {

    if (
        probability === undefined ||
        probability === null ||
        probability === ""
    ) {
        return "—";
    }


    let value = Number(probability);


    if (Number.isNaN(value)) {
        return "—";
    }


    /*
     * Support both:
     *
     * 0.93
     * 93
     */

    if (value <= 1) {
        value = value * 100;
    }


    return value.toFixed(2) + "%";

}


/* ========================================
   FORMAT TIMESTAMP
======================================== */

function formatTimestamp(timestamp) {

    if (!timestamp) {
        return "—";
    }


    const date = new Date(timestamp);


    if (Number.isNaN(date.getTime())) {
        return timestamp;
    }


    return date.toLocaleString(
        "id-ID",
        {
            dateStyle: "short",
            timeStyle: "short"
        }
    );

}