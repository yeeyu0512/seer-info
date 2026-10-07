const RUFFLE_URL = "https://cdn.jsdelivr.net/npm/@ruffle-rs/ruffle@0.6.0/ruffle.js";
let runtime;

export function loadRuffleRuntime() {
    if (!runtime) runtime = new Promise((resolve, reject) => {
        window.RufflePlayer = window.RufflePlayer || {};
        window.RufflePlayer.config = { ...window.RufflePlayer.config, polyfills: false };
        const script = document.createElement("script");
        script.src = RUFFLE_URL;
        script.async = true;
        const timeout = setTimeout(() => reject(new Error("圖片渲染器載入逾時")), 30000);
        script.onload = () => { clearTimeout(timeout); resolve(window.RufflePlayer.newest()); };
        script.onerror = () => { clearTimeout(timeout); reject(new Error("圖片渲染器載入失敗")); };
        document.head.append(script);
    });
    return runtime;
}
