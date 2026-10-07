export function createAdminDateInputs({

}) {

    const poolDatePickers = new Map();

    function initializeDateTimePickers() {
        if (!window.flatpickr) {
            console.warn("Flatpickr did not load; using the browser date-time input instead.");
            return;
        }

        document.querySelectorAll(".pool-datetime").forEach((input) => {
            const picker = window.flatpickr(input, {
                dateFormat: "Y-m-d",
                altInput: true,
                altFormat: "Y 年 n 月 j 日（D）",
                allowInput: false,
                locale: window.flatpickr.l10ns?.zh_tw ?? "default"
            });
            poolDatePickers.set(input.id, picker);
        });
    }

    function initializeTimeSelects() {
        document.querySelectorAll(".pool-time-select").forEach((select) => {
            for (let hour = 0; hour < 24; hour += 1) {
                for (let minute = 0; minute < 60; minute += 5) {
                    const value = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
                    const option = new Option(value, value);
                    select.add(option);
                }
            }
            select.value = "00:00";
        });
    }

    function setPoolDateValue(elementId, value) {
        const picker = poolDatePickers.get(elementId);
        const timeSelect = document.getElementById(`${elementId}-time`);
        const [datePart, timePart] = (value || "").split("T");
        if (picker) {
            picker.setDate(datePart || null, false, "Y-m-d");
        } else {
            document.getElementById(elementId).value = datePart || "";
        }
        if (timeSelect) {
            const time = timePart?.slice(0, 5) || "00:00";
            if (!Array.from(timeSelect.options).some((option) => option.value === time)) {
                timeSelect.add(new Option(time, time));
            }
            timeSelect.value = time;
        }
    }

    function setPoolDatePickersDisabled(disabled) {
        poolDatePickers.forEach((picker) => {
            picker.set("clickOpens", !disabled);
            picker.altInput.disabled = disabled;
        });
    }

    function toIsoDate(elementId) {
        const date = document.getElementById(elementId).value;
        const time = document.getElementById(`${elementId}-time`).value;
        return date && time ? new Date(`${date}T${time}`).toISOString() : null;
    }

    function toLocalDateTime(value) {
        if (!value) return "";
        const date = new Date(value);
        const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return offsetDate.toISOString().slice(0, 16);
    }

    function formatDate(value) {
        return value ? new Date(value).toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short" }) : "未設定";
    }
    return { initializeDateTimePickers, initializeTimeSelects, setPoolDateValue, setPoolDatePickersDisabled, toIsoDate, toLocalDateTime, formatDate };
}
