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


        const records = Array.isArray(result)
            ? result
            : result.history;


        if (!Array.isArray(records) || records.length === 0) {

            loading.classList.add("d-none");
            empty.classList.remove("d-none");

            return;
        }


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


    /* ------------------------------------
       Time
    ------------------------------------ */

    const timeCell = document.createElement("td");

    timeCell.textContent =
        formatTimestamp(record.timestamp);

    row.appendChild(timeCell);


    /* ------------------------------------
       Current Temperature
    ------------------------------------ */

    const temperatureCell =
        document.createElement("td");

    temperatureCell.textContent =
        formatValue(
            record.Reactor_Temp_C,
            " °C"
        );

    row.appendChild(temperatureCell);


    /* ------------------------------------
       Jacket Flow
    ------------------------------------ */

    const coolantCell =
        document.createElement("td");

    coolantCell.textContent =
        formatValue(
            record.Jacket_Flow_Rate_L_min,
            " L/min"
        );

    row.appendChild(coolantCell);


    /* ------------------------------------
       Pressure
    ------------------------------------ */

    const pressureCell =
        document.createElement("td");

    pressureCell.textContent =
        formatValue(
            record.Pressure_atm,
            " atm"
        );

    row.appendChild(pressureCell);


    /* ------------------------------------
       Reactant A
    ------------------------------------ */

    const reactantCell =
        document.createElement("td");

    reactantCell.textContent =
        formatValue(
            record.Reactant_A_Conc_mol_L,
            " mol/L"
        );

    row.appendChild(reactantCell);


    /* ------------------------------------
       Product B
    ------------------------------------ */

    const productCell =
        document.createElement("td");

    productCell.textContent =
        formatValue(
            record.Product_B_Conc_mol_L,
            " mol/L"
        );

    row.appendChild(productCell);


    /* ------------------------------------
       Predicted T(t+1)
    ------------------------------------ */

    const predictionCell =
        document.createElement("td");

    predictionCell.textContent =
        formatValue(
            record.predicted_temperature ??
            record.predicted_temperature_next ??
            record.prediction,
            " °C"
        );

    row.appendChild(predictionCell);


    /* ------------------------------------
       Prediction Error
    ------------------------------------ */

    const errorCell =
        document.createElement("td");

    const predictionError =
        record.prediction_error ??
        record.error_value ??
        record.absolute_error;


    errorCell.textContent =
        formatValue(
            predictionError,
            " °C"
        );

    row.appendChild(errorCell);


    /* ------------------------------------
       Monitoring
    ------------------------------------ */

    const monitoringCell =
        document.createElement("td");

    const monitoringBadge =
        document.createElement("span");

    monitoringBadge.classList.add(
        "badge"
    );


    /*
     * Kita belum menetapkan threshold anomaly.
     *
     * Jadi untuk sementara UI hanya membedakan:
     * - Error tersedia
     * - Belum ada actual T(t+1)
     */

    if (
        predictionError !== undefined &&
        predictionError !== null &&
        predictionError !== ""
    ) {

        monitoringBadge.classList.add(
            "bg-secondary"
        );

        monitoringBadge.textContent =
            "Error Available";

    } else {

        monitoringBadge.classList.add(
            "bg-light",
            "text-dark"
        );

        monitoringBadge.textContent =
            "Waiting";
    }


    monitoringCell.appendChild(
        monitoringBadge
    );

    row.appendChild(monitoringCell);


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


    return number.toFixed(2) + unit;

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