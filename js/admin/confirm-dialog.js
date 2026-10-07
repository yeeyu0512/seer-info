export function createAdminDialogs({

}) {
    const adminConfirmModal = document.getElementById("admin-confirm-modal");
    const adminConfirmMessage = document.getElementById("admin-confirm-message");
    const adminConfirmCancelButton = document.getElementById("admin-confirm-cancel");
    const adminConfirmAcceptButton = document.getElementById("admin-confirm-accept");
    const adminConfirmTitle = document.getElementById("admin-confirm-title");

    let confirmDialogResolve = null;

    let confirmDialogReturnFocus = null;

    const adminNotificationQueue = [];

    let showingAdminNotification = false;

    adminConfirmCancelButton.addEventListener("click", () => finishConfirmDialog(false));

    adminConfirmAcceptButton.addEventListener("click", () => finishConfirmDialog(true));

    adminConfirmModal.addEventListener("click", (event) => {
        if (event.target === adminConfirmModal && !adminConfirmModal.classList.contains("is-closing")) {
            finishConfirmDialog(false);
        }
    });

    adminConfirmModal.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            finishConfirmDialog(false);
            return;
        }
        if (event.key !== "Tab") return;

        const buttons = [adminConfirmCancelButton, adminConfirmAcceptButton].filter((button) => !button.hidden);
        const currentIndex = buttons.indexOf(document.activeElement);
        const nextIndex = event.shiftKey
            ? (currentIndex <= 0 ? buttons.length - 1 : currentIndex - 1)
            : (currentIndex === buttons.length - 1 ? 0 : currentIndex + 1);
        event.preventDefault();
        buttons[nextIndex].focus();
    });

    function showConfirmDialog(message, {
        title = "請確認操作",
        confirmLabel = "確定",
        cancelLabel = "取消",
        showCancel = true,
        danger = false,
        focusConfirm = false
    } = {}) {
        if (confirmDialogResolve) finishConfirmDialog(false);
        confirmDialogReturnFocus = document.activeElement;
        adminConfirmTitle.textContent = title;
        adminConfirmMessage.textContent = message;
        adminConfirmCancelButton.hidden = !showCancel;
        adminConfirmCancelButton.textContent = cancelLabel;
        adminConfirmAcceptButton.textContent = confirmLabel;
        adminConfirmAcceptButton.classList.toggle("danger-button", danger);
        adminConfirmModal.classList.remove("is-closing");
        adminConfirmModal.hidden = false;
        document.body.classList.add("has-admin-confirm-modal");
        (focusConfirm ? adminConfirmAcceptButton : adminConfirmCancelButton).focus();

        return new Promise((resolve) => {
            confirmDialogResolve = resolve;
        });
    }

    function showAdminNotification(message, type = "info") {
        adminNotificationQueue.push({ message, type });
        if (!showingAdminNotification) void showNextAdminNotification();
    }

    async function showNextAdminNotification() {
        showingAdminNotification = true;
        while (adminNotificationQueue.length > 0) {
            const { message, type } = adminNotificationQueue.shift();
            await showConfirmDialog(message, {
                title: type === "error" ? "操作未完成" : type === "success" ? "操作完成" : "通知",
                confirmLabel: "關閉",
                showCancel: false,
                focusConfirm: true
            });
        }
        showingAdminNotification = false;
    }

    function finishConfirmDialog(confirmed) {
        if (!confirmDialogResolve) return;
        const resolve = confirmDialogResolve;
        confirmDialogResolve = null;
        adminConfirmModal.classList.add("is-closing");
        window.setTimeout(() => {
            adminConfirmModal.hidden = true;
            adminConfirmModal.classList.remove("is-closing");
            document.body.classList.remove("has-admin-confirm-modal");
            if (confirmDialogReturnFocus instanceof HTMLElement && confirmDialogReturnFocus.isConnected) {
                confirmDialogReturnFocus.focus();
            }
            confirmDialogReturnFocus = null;
            resolve(confirmed);
        }, 180);
    }
    return { showConfirmDialog, showAdminNotification, showNextAdminNotification, finishConfirmDialog };
}
