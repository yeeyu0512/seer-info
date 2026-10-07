export function createAdminServerSettings({
    getSeerServerSettings,
    getAdminErrorMessage,
    updateSeerServerSettings
}) {
    const taiwanSeerSettingsForm = document.getElementById("taiwan-seer-settings-form");
    const taiwanLatestPetIdInput = document.getElementById("taiwan-latest-pet-id");
    const taiwanLatestSkinIdInput = document.getElementById("taiwan-latest-skin-id");
    const taiwanLatestMintmarkIdInput = document.getElementById("taiwan-latest-mintmark-id");
    const saveTaiwanSeerSettingsButton = document.getElementById("save-taiwan-seer-settings-button");
    const taiwanSeerSettingsMessage = document.getElementById("taiwan-seer-settings-message");

    taiwanSeerSettingsForm.addEventListener("submit", saveTaiwanSeerSettings);

    async function loadTaiwanSeerSettings() {
        taiwanSeerSettingsMessage.textContent = "正在載入台服設定…";
        try {
            const settings = await getSeerServerSettings();
            taiwanLatestPetIdInput.value = settings.latestPetId ?? "";
            taiwanLatestSkinIdInput.value = settings.latestSkinId ?? "";
            taiwanLatestMintmarkIdInput.value = settings.latestMintmarkId ?? "";
            taiwanLatestMintmarkIdInput.disabled = !settings.hasMintmarkProgressField;
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
        const latestPetId = Number(taiwanLatestPetIdInput.value);
        const latestSkinId = Number(taiwanLatestSkinIdInput.value);
        const latestMintmarkId = taiwanLatestMintmarkIdInput.value.trim() === "" ? null : Number(taiwanLatestMintmarkIdInput.value);
        if (
            !Number.isSafeInteger(latestPetId) || latestPetId < 1
            || !Number.isSafeInteger(latestSkinId) || latestSkinId < 1
            || (latestMintmarkId !== null && (!Number.isSafeInteger(latestMintmarkId) || latestMintmarkId < 1))
        ) {
            taiwanSeerSettingsMessage.textContent = "請輸入有效的正整數編號。";
            return;
        }

        saveTaiwanSeerSettingsButton.disabled = true;
        taiwanSeerSettingsMessage.textContent = "正在儲存台服設定…";
        try {
            await updateSeerServerSettings(latestPetId, latestSkinId, taiwanLatestMintmarkIdInput.disabled ? undefined : latestMintmarkId);
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
