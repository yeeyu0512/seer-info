import { TAIWAN_CONTENT_KINDS, parseTaiwanExclusions } from "../shared/taiwan-availability.js";

export function createAdminServerSettings({
    getSeerServerSettings,
    getAdminErrorMessage,
    updateSeerServerSettings
}) {
    const taiwanSeerSettingsForm = document.getElementById("taiwan-seer-settings-form");
    const taiwanLatestPetIdInput = document.getElementById("taiwan-latest-pet-id");
    const taiwanLatestSkinIdInput = document.getElementById("taiwan-latest-skin-id");
    const taiwanLatestMintmarkIdInput = document.getElementById("taiwan-latest-mintmark-id");
    const taiwanLatestSuitIdInput = document.getElementById("taiwan-latest-suit-id");
    const saveTaiwanSeerSettingsButton = document.getElementById("save-taiwan-seer-settings-button");
    const taiwanSeerSettingsMessage = document.getElementById("taiwan-seer-settings-message");
    const exclusionsFields = document.getElementById("taiwan-exclusions-fields");
    const exclusionsSchema = document.getElementById("taiwan-exclusions-schema");
    const exclusionInputs = Object.fromEntries(TAIWAN_CONTENT_KINDS.map(kind => [kind, document.getElementById(`taiwan-exclusions-${kind}`)]));
    const kindLabels = { pet: "精靈", skin: "皮膚", mintmark: "刻印", suit: "套裝" };
    let ready = false;
    saveTaiwanSeerSettingsButton.disabled = true;

    function validateExclusions(kind) {
        const input = exclusionInputs[kind];
        const summary = document.querySelector(`[data-exclusions-summary="${kind}"]`);
        try {
            const ranges = parseTaiwanExclusions(input.value);
            input.setCustomValidity("");
            input.removeAttribute("aria-invalid");
            summary.textContent = ranges.length ? `已辨識 ${ranges.length} 筆排除規則（範圍含起訖）。` : "未設定額外排除。";
            return true;
        } catch (error) {
            input.setCustomValidity(error.message);
            input.setAttribute("aria-invalid", "true");
            summary.textContent = error.message;
            return false;
        }
    }
    for (const kind of TAIWAN_CONTENT_KINDS) exclusionInputs[kind].addEventListener("input", () => validateExclusions(kind));

    taiwanSeerSettingsForm.addEventListener("submit", saveTaiwanSeerSettings);

    async function loadTaiwanSeerSettings() {
        ready = false;
        saveTaiwanSeerSettingsButton.disabled = true;
        exclusionsFields.disabled = true;
        taiwanSeerSettingsMessage.textContent = "正在載入台服設定…";
        try {
            const settings = await getSeerServerSettings();
            taiwanLatestPetIdInput.value = settings.latestPetId ?? "";
            taiwanLatestSkinIdInput.value = settings.latestSkinId ?? "";
            taiwanLatestMintmarkIdInput.value = settings.latestMintmarkId ?? "";
            taiwanLatestMintmarkIdInput.disabled = !settings.hasMintmarkProgressField;
            taiwanLatestSuitIdInput.value = settings.latestSuitId ?? "";
            taiwanLatestSuitIdInput.disabled = !settings.hasExclusionsField;
            exclusionsFields.disabled = !settings.hasExclusionsField;
            exclusionsSchema.textContent = settings.hasExclusionsField ? "" : "排除清單尚未啟用，請先套用 sql/add_taiwan_exclusions.sql，再重新整理。原有進度仍可儲存。";
            for (const kind of TAIWAN_CONTENT_KINDS) {
                exclusionInputs[kind].value = settings.exclusions?.[kind] ?? "";
                validateExclusions(kind);
            }
            ready = true;
            saveTaiwanSeerSettingsButton.disabled = false;
            taiwanSeerSettingsMessage.textContent = settings.latestPetId && settings.latestSkinId
                ? settings.latestMintmarkId ? "台服設定已載入。" : "精靈與皮膚設定已載入，刻印進度尚未設定。"
                : "請填寫台服目前最新的精靈與皮膚編號。";
            if (!settings.hasMintmarkProgressField) taiwanSeerSettingsMessage.textContent += " 請先執行 sql/add_mintmark_server_progress.sql，再重新整理以設定刻印進度。";
        } catch (error) {
            console.error("Load Taiwan Seer settings error:", error);
            taiwanSeerSettingsMessage.textContent = `載入台服設定失敗：${getAdminErrorMessage(error)}`;
        }
    }

    async function saveTaiwanSeerSettings(event) {
        event.preventDefault();
        if (!ready || saveTaiwanSeerSettingsButton.disabled) return;
        if (!exclusionsFields.disabled) {
            for (const kind of TAIWAN_CONTENT_KINDS) {
                if (!validateExclusions(kind)) {
                    taiwanSeerSettingsMessage.textContent = `${kindLabels[kind]}排除清單格式有誤，請修正後儲存。`;
                    exclusionInputs[kind].reportValidity();
                    return;
                }
            }
        }
        const latestPetId = Number(taiwanLatestPetIdInput.value);
        const latestSkinId = Number(taiwanLatestSkinIdInput.value);
        const latestMintmarkId = taiwanLatestMintmarkIdInput.value.trim() === "" ? null : Number(taiwanLatestMintmarkIdInput.value);
        const latestSuitId = taiwanLatestSuitIdInput.value.trim() === "" ? null : Number(taiwanLatestSuitIdInput.value);
        if (
            !Number.isSafeInteger(latestPetId) || latestPetId < 1
            || !Number.isSafeInteger(latestSkinId) || latestSkinId < 1
            || (latestMintmarkId !== null && (!Number.isSafeInteger(latestMintmarkId) || latestMintmarkId < 1))
            || (!taiwanLatestSuitIdInput.disabled && latestSuitId !== null && (!Number.isSafeInteger(latestSuitId) || latestSuitId < 1))
        ) {
            taiwanSeerSettingsMessage.textContent = "請輸入有效的正整數編號。";
            return;
        }

        saveTaiwanSeerSettingsButton.disabled = true;
        taiwanSeerSettingsMessage.textContent = "正在儲存台服設定…";
        try {
            const exclusions = exclusionsFields.disabled ? undefined : { ...Object.fromEntries(TAIWAN_CONTENT_KINDS.map(kind => [kind, exclusionInputs[kind].value])), latestSuitId };
            await updateSeerServerSettings(latestPetId, latestSkinId, taiwanLatestMintmarkIdInput.disabled ? undefined : latestMintmarkId, exclusions);
            taiwanSeerSettingsMessage.textContent = "台服設定已儲存。";
        } catch (error) {
            console.error("Save Taiwan Seer settings error:", error);
            taiwanSeerSettingsMessage.textContent = `儲存台服設定失敗：${getAdminErrorMessage(error)}`;
        } finally {
            saveTaiwanSeerSettingsButton.disabled = false;
        }
    }
    return { loadTaiwanSeerSettings, saveTaiwanSeerSettings };
}
