import { createPlayerPetImages } from './player-pet-images.js';

// Game credentials remain on the server. Region routing is fixed, never user URLs.
const playerPetImages = createPlayerPetImages();
let playerNameConverters = { convertToTraditionalChinese: value => value, convertToSimplifiedChinese: value => value };

export function configurePlayerNameConverters(converters) {
    playerNameConverters = converters;
}

export function formatPlayerPetName(value) {
    const text = String(value || "未知精靈");
    return playerNameConverters.convertToTraditionalChinese(playerNameConverters.convertToSimplifiedChinese(text)).replaceAll("啓", "啟");
}

export function getPlayerLookupEndpoint(region = "tw", purpose = "query") {
    const base = `https://seer-info-tw-api.koreacentral.cloudapp.azure.com/api/${region === "cn" ? "cn" : "tw"}`;
    return purpose === "status" ? `${base}/status` : purpose === "captcha" && region !== "cn" ? `${base}/player/captcha` : `${base}/player/query`;
}
export const PLAYER_LOOKUP_API_ENDPOINT = getPlayerLookupEndpoint();

export function isCnPlayerQueryWindow(now = new Date()) {
    const local = new Date(new Date(now).getTime() + 8 * 60 * 60 * 1000);
    return local.getUTCDay() === 3 && local.getUTCHours() === 23 && local.getUTCMinutes() >= 45;
}

const elements = typeof document === "undefined" ? {} : {
    form: document.getElementById("player-lookup-form"),
    region: document.getElementById("player-lookup-region"),
    mimiId: document.getElementById("player-lookup-mimi-id"),
    submit: document.getElementById("lookup-submit"),
    status: document.getElementById("player-lookup-status"),
    progress: document.getElementById("lookup-progress"),
    captchaPanel: document.getElementById("captcha-panel"),
    captchaDescription: document.getElementById("captcha-description"),
    captchaImage: document.getElementById("captcha-image"),
    captchaAnswer: document.getElementById("captcha-answer"),
    captchaSubmit: document.getElementById("captcha-submit"),
    result: document.getElementById("player-result")
};

const resultFields = typeof document === "undefined" ? {} : {
    userId: document.getElementById("player-user-id"),
    nickname: document.getElementById("player-nickname"),
    online: document.getElementById("player-online"),
    server: document.getElementById("player-server"),
    lastLoginTime: document.getElementById("player-last-login"),
    sportCurrentRank: document.getElementById("sport-current-rank"),
    sportHighestRank: document.getElementById("sport-highest-rank"),
    sportScoreStar: document.getElementById("sport-score-star"),
    wildCurrentRank: document.getElementById("wild-current-rank"),
    wildHighestRank: document.getElementById("wild-highest-rank"),
    wildScoreStar: document.getElementById("wild-score-star"),
    winRate: document.getElementById("win-rate"),
    winRecord: document.getElementById("win-record"),
    wildWinRate: document.getElementById("wild-win-rate"),
    wildWinRecord: document.getElementById("wild-win-record"),
    primaryPet: document.getElementById("primary-pet"),
    secondaryPet: document.getElementById("secondary-pet")
};

let pendingCaptcha = null;
let activeRequest = null;
let requestVersion = 0;
let healthVersion = 0;
let loading = false;
let regionDisabled = false;
const CN_WINDOW_MESSAGE = "每週三台灣時間 23:45～23:59 暫停陸服玩家查詢，週四 00:00 恢復。";
const selectedRegion = () => elements.region?.value === "cn" ? "cn" : "tw";

function updateRegionNote() {
    const cn = selectedRegion() === "cn";
    const blocked = cn && (regionDisabled || isCnPlayerQueryWindow());
    const note = document.getElementById("player-region-note");
    note.hidden = !blocked;
    note.dataset.disabled = String(blocked);
    note.textContent = blocked ? (isCnPlayerQueryWindow() ? CN_WINDOW_MESSAGE
        : "陸服玩家查詢目前暫停，請稍後再試。") : "";
    elements.submit.disabled = loading || blocked;
}

function firstDefined(...values) {
    return values.find((value) => value !== undefined && value !== null && value !== "");
}

function readPath(source, paths) {
    for (const path of paths) {
        const value = path.split(".").reduce((current, key) => current && current[key], source);
        if (value !== undefined && value !== null && value !== "") return value;
    }
    return null;
}

function display(value, fallback = "-") {
    return value === undefined || value === null || value === "" ? fallback : String(value);
}

function formatScoreStar(value) {
    if (value && typeof value === "object") {
        if (value.unit === "star") return `${value.score} 星`;
        const score = firstDefined(value.score, value.points);
        const star = firstDefined(value.star, value.stars);
        if (score !== undefined || star !== undefined) {
            return [score !== undefined ? `${score} 分` : null, star !== undefined ? `${star} 星` : null]
                .filter(Boolean).join("／");
        }
    }
    return display(value);
}

function formatRecord(value) {
    if (value && typeof value === "object") {
        const wins = firstDefined(value.wins, value.win);
        const total = firstDefined(value.total, value.games, value.matches);
        if (wins !== undefined || total !== undefined) return `${display(wins)}／${display(total)}`;
    }
    return display(value);
}

export function normalizePlayerResult(payload) {
    const player = payload?.player || payload?.data || payload?.result || payload || {};
    const sport = player.sport || player.arena || player.competitive || {};
    const wild = player.wild || player.free || player.peak || {};
    const record = player.record || player.stats || {};
    const pets = player.pets || {};
    return {
        userId: readPath(player, ["user_id", "mimi_id", "id"]),
        nickname: readPath(player, ["nickname", "name"]),
        online: readPath(player, ["online", "is_online", "status"]),
        server: readPath(player, ["server", "server_name"]),
        lastLoginTime: readPath(player, ["last_login_time"]),
        sportCurrentRank: readPath(sport, ["current_rank", "rank", "current.rank", "current"]),
        sportHighestRank: readPath(sport, ["highest_rank", "highest.rank", "highest"]),
        sportScoreStar: formatScoreStar(sport.current || sport.score_star || sport),
        wildCurrentRank: readPath(wild, ["current_rank", "rank", "current.rank", "current"]),
        wildHighestRank: readPath(wild, ["highest_rank", "highest.rank", "highest"]),
        wildScoreStar: formatScoreStar(wild.current || wild.score_star || wild),
        winRate: (sport.win_rate ? (sport.win_rate.percent == null ? "無對戰統計" : `${Number(sport.win_rate.percent).toFixed(1)}%`) : null) ?? readPath(player, ["win_rate", "winRate"]) ?? readPath(record, ["rate", "win_rate"]),
        winRecord: formatRecord(firstDefined(
            player.wins !== undefined || player.total !== undefined ? player : null,
            sport.win_rate, record
        )),
        wildWinRate: wild.win_rate?.percent == null ? "無對戰統計" : `${Number(wild.win_rate.percent).toFixed(1)}%`,
        wildWinRecord: formatRecord(wild.win_rate),
        primaryPet: readPath(pets, ["primary", "primary_name"]) ?? readPath(player, ["primary_pet", "primary_pet_name"]),
        secondaryPet: readPath(pets, ["secondary", "secondary_name"]) ?? readPath(player, ["secondary_pet", "secondary_pet_name"])
    };
}

export function formatPlayerLoginTime(value, now = Date.now()) {
    if (!Number.isSafeInteger(value) || value <= 0 || value > now / 1000 + 300) return "未知";
    const date = new Date(value * 1000);
    if (!Number.isFinite(date.getTime())) return "未知";
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
    }).formatToParts(date);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}/${values.month}/${values.day} ${values.hour}:${values.minute}:${values.second}（台灣時間）`;
}

function setStatus(message, type = "") {
    elements.status.textContent = message;
    elements.status.className = `player-lookup-message${type ? ` is-${type}` : ""}`;
}

function setLoading(isLoading) {
    loading = isLoading;
    elements.progress.hidden = !isLoading;
    elements.form.setAttribute("aria-busy", String(isLoading));
    if (!isLoading) refreshServiceStatus();
    updateRegionNote();
    elements.captchaSubmit.disabled = isLoading;
    elements.submit.textContent = isLoading ? "查詢中…" : "查詢";
}

function hideCaptcha() {
    elements.captchaPanel.hidden = true;
    elements.captchaAnswer.value = "";
    elements.captchaImage.removeAttribute("src");
    elements.captchaImage.hidden = true;
    pendingCaptcha = null;
}

function showCaptcha(payload) {
    pendingCaptcha = {
        region: "tw",
        id: firstDefined(payload.captcha_id, payload.challenge_id, payload.challenge),
        challenge: payload.challenge
    };
    const image = payload.captcha_image;
    elements.captchaDescription.textContent = payload.message || "請完成驗證後重新送出查詢。";
    elements.captchaImage.removeAttribute("src");
    elements.captchaImage.hidden = true;
    if (typeof image === "string" && /^data:image\/(png|jpeg|gif);base64,[A-Za-z0-9+/=]+$/.test(image)) {
        elements.captchaImage.src = image;
        elements.captchaImage.hidden = false;
    }
    elements.captchaPanel.hidden = false;
    elements.captchaAnswer.focus();
}

async function requestPlayer(mimiId, captchaAnswer, region, signal) {
    const captcha = region === "tw" && pendingCaptcha?.region === "tw";
    const body = captcha
        ? { challenge_id: pendingCaptcha.id, code: captchaAnswer }
        : { user_id: Number(mimiId) };
    const endpoint = getPlayerLookupEndpoint(region, captcha ? "captcha" : "query");
    const response = await fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.any([signal, AbortSignal.timeout(130000)])
    });
    let payload = {};
    try {
        payload = await response.json();
    } catch (error) {
        if (!response.ok) throw new Error(`查詢失敗（${response.status}）`);
    }
    if (response.status === 428 && region === "tw") {
        const error = new Error(payload.message || "需要驗證");
        error.code = "captcha_required";
        error.payload = payload;
        throw error;
    }
    if (response.status === 429) {
        const error = new Error(payload.message || "目前查詢人數較多，請稍後再試。");
        error.code = "busy";
        throw error;
    }
    if (!response.ok) throw new Error(payload.message || `查詢失敗（${response.status}）`);
    return payload;
}

export function renderPetBag(container, pets) {
    container.replaceChildren();
    container.classList.add("player-pet-list");
    if (!Array.isArray(pets) || !pets.length) {
        container.textContent = pets ? formatPlayerPetName(pets) : "空";
        return;
    }
    for (const pet of pets) {
        const card = container.ownerDocument.createElement("div");
        card.className = "player-pet-card";
        const id = Number(pet?.id);
        if (Number.isInteger(id) && id > 0) {
            const image = container.ownerDocument.createElement("img");
            image.alt = "";
            image.loading = "lazy";
            card.append(image);
        }
        const info = container.ownerDocument.createElement("div");
        const name = container.ownerDocument.createElement("strong");
        name.textContent = formatPlayerPetName(typeof pet === "string" ? pet : pet?.name);
        info.append(name);
        if (Number.isInteger(id) && id > 0) {
            const number = container.ownerDocument.createElement("small");
            number.textContent = `#${id}`;
            info.append(number);
        }
        card.append(info);
        container.append(card);
        const image = card.querySelector("img");
        if (image) playerPetImages.set(image, pet);
    }
}

export function getPeakRankName(value) {
    const rank = typeof value?.rank === "string" ? value.rank.trim() : null;
    const stars = Number(value?.score);
    if (rank === "聖皇" && value.unit === "star" && Number.isFinite(stars) && stars >= 100) {
        return "宇宙聖皇";
    }
    return rank || null;
}

export function formatPeakLines(peak = {}, { expert = false } = {}) {
    const rank = (value) => value ? expert ? `${value.score ?? '-'}分` : `${getPeakRankName(value) || '未知段位'}${value.score ?? '-'}${value.unit === 'star' ? '星' : '分'}` : '-';
    const stats = peak.win_rate || {};
    const percent = stats.percent == null ? '無對戰統計' : `${Number(stats.percent).toFixed(1)}%`;
    return {current: rank(peak.current), highest: rank(peak.highest), rate: `${percent}（${stats.wins ?? '-'}／${stats.total ?? '-'}）`};
}

const PEAK_RANK_ICONS = new Map(
    ["學徒", "猛將", "天驕", "王者", "聖皇", "宇宙聖皇", "專家模式"].map((rank) => [rank, `./assets/icons/peak-level/${rank}.png`])
);

export function getPeakRankIcon(rank) {
    return typeof rank === "string" ? PEAK_RANK_ICONS.get(rank.trim()) ?? null : null;
}

export function renderPeakRank(container, rank, text) {
    container.replaceChildren();
    container.classList.add("player-peak-rank");
    const icon = getPeakRankIcon(rank);
    if (icon) {
        const image = container.ownerDocument.createElement("img");
        image.className = "player-peak-rank-icon";
        image.src = icon;
        image.alt = "";
        image.width = 40;
        image.height = 40;
        image.addEventListener("error", () => { image.hidden = true; }, { once: true });
        container.append(image);
    }
    const label = container.ownerDocument.createElement("span");
    label.textContent = text;
    container.append(label);
}

function renderResult(payload, region) {
    const result = normalizePlayerResult(payload);
    for (const [key, value] of Object.entries(result)) {
        if (resultFields[key]) {
            if (key === "primaryPet" || key === "secondaryPet") {
                renderPetBag(resultFields[key], value);
                continue;
            }
            const shown = key === "online" ? (value === true ? "在線" : value === false ? "離線" : "未知")
                : Array.isArray(value) ? (value.join("、") || "空") : value;
            resultFields[key].textContent = display(shown);
        }
    }
    const player = payload?.player || payload?.data || payload?.result || payload || {};
    const expert = region === "cn" && player.expert && typeof player.expert === "object";
    document.getElementById("expert-mode").hidden = !expert;
    document.getElementById("player-result-region").textContent = region === "cn" ? "陸服" : "台服";
    const modes = [["sport", "win-rate"], ["wild", "wild-win-rate"]];
    if (expert) modes.push(["expert", "expert-win-rate"]);
    for (const [mode, rateId] of modes) {
        const lines = formatPeakLines(player[mode], { expert: mode === "expert" });
        const icon = value => mode === "expert" ? "專家模式" : getPeakRankName(value);
        renderPeakRank(document.getElementById(`${mode}-current-rank`), icon(player[mode]?.current), lines.current);
        renderPeakRank(document.getElementById(`${mode}-highest-rank`), icon(player[mode]?.highest), lines.highest);
        document.getElementById(rateId).textContent = lines.rate;
    }
    resultFields.userId.textContent = `米米號：${display(result.userId)}`;
    resultFields.online.dataset.online = String(result.online === true);
    resultFields.server.hidden = !result.online;
    resultFields.server.textContent = result.online ? `伺服器：${display(result.server)}` : '';
    resultFields.lastLoginTime.hidden = result.online !== false;
    resultFields.lastLoginTime.textContent = result.online === false ? `最後登入：${formatPlayerLoginTime(result.lastLoginTime)}` : "";
    elements.result.hidden = false;
}

async function submitLookup(captchaAnswer = "") {
    if (loading) return;
    const region = selectedRegion();
    if (region === "cn" && (regionDisabled || isCnPlayerQueryWindow())) {
        updateRegionNote();
        setStatus(isCnPlayerQueryWindow() ? CN_WINDOW_MESSAGE : "陸服玩家查詢目前暫停，請稍後再試。", "error");
        return;
    }
    const mimiId = elements.mimiId.value.trim();
    if (!/^[0-9]+$/.test(mimiId) || !Number.isSafeInteger(Number(mimiId)) || Number(mimiId) <= 0 || Number(mimiId) > 4294967295) {
        setStatus("請輸入有效的數字 米米號。", "error");
        elements.mimiId.focus();
        return;
    }
    const version = ++requestVersion;
    activeRequest = new AbortController();
    const signal = activeRequest.signal;
    elements.result.hidden = true;
    setLoading(true);
    setStatus(region === "cn" ? "正在查詢陸服資料，跨區連線可能需要較長時間，請稍候。" : "查詢中…");
    try {
        const payload = await requestPlayer(mimiId, captchaAnswer, region, signal);
        if (version !== requestVersion || region !== selectedRegion()) return;
        hideCaptcha();
        renderResult(payload, region);
        setStatus("查詢完成。", "success");
    } catch (error) {
        if (version !== requestVersion || region !== selectedRegion()) return;
        if (error.code === "captcha_required") {
            showCaptcha(error.payload);
            setStatus("此查詢需要完成驗證。", "error");
        } else if (error.code === "busy") {
            setStatus(error.message, "error");
        } else {
            setStatus(error.name === "TimeoutError" ? "等候或查詢逾時，請稍後再試。" : error.message || "查詢失敗，請稍後再試。", "error");
        }
    } finally {
        if (version === requestVersion) {
            activeRequest = null;
            setLoading(false);
        }
    }
}

if (elements.form) {
    elements.region.addEventListener("change", () => {
        requestVersion++;
        healthVersion++;
        activeRequest?.abort();
        activeRequest = null;
        regionDisabled = false;
        hideCaptcha();
        elements.result.hidden = true;
        document.getElementById("expert-mode").hidden = true;
        document.getElementById("player-game-label").textContent = selectedRegion() === "cn" ? "陸服連線" : "台服連線";
        setStatus("");
        setLoading(false);
    });
    elements.form.addEventListener("submit", (event) => {
        event.preventDefault();
        submitLookup();
    });
    elements.captchaSubmit.addEventListener("click", () => {
        if (!elements.captchaAnswer.value.trim()) {
            setStatus("請輸入驗證答案。", "error");
            elements.captchaAnswer.focus();
            return;
        }
        submitLookup(elements.captchaAnswer.value.trim());
    });
}

async function refreshServiceStatus() {
    const version = ++healthVersion;
    const region = selectedRegion();
    try {
        const response = await fetch(getPlayerLookupEndpoint(region, "status"), {signal: AbortSignal.timeout(8000)});
        if (!response.ok) throw new Error('status unavailable');
        const health = await response.json();
        if (version !== healthVersion || region !== selectedRegion()) return;
        regionDisabled = region === "cn" && (health.player_query_allowed === false || ["disabled", "maintenance", "unconfigured"].includes(health.api));
        document.getElementById('api-health').dataset.state = health.api === 'available' ? 'ok' : 'pending';
        document.getElementById('game-health').dataset.state = health.game_connected ? 'ok' : 'idle';
        document.getElementById('api-health').textContent = ({available:'正常',busy:'處理中',maintenance:'維護中',disabled:'暫停查詢',unconfigured:'尚未設定'})[health.api] || '未知';
        document.getElementById('player-service-help').textContent = region === "cn" && health.api === "busy" ? "送出後會排隊等候處理" : regionDisabled ? "陸服查詢目前暫停" : "查詢服務正常時可送出查詢";
        document.getElementById('game-health').textContent = health.game_connected ? '已連線' : '尚未連線';
    } catch {
        if (version !== healthVersion || region !== selectedRegion()) return;
        document.getElementById('api-health').dataset.state = 'error';
        document.getElementById('game-health').dataset.state = 'pending';
        document.getElementById('api-health').textContent = '無法連線';
        document.getElementById('game-health').textContent = '未知';
    }
    updateRegionNote();
}
if (elements.form) {
    refreshServiceStatus();
    document.getElementById("player-lookup-dialog").addEventListener("player-lookup-open", refreshServiceStatus);
    setInterval(() => {
        if (document.getElementById("player-lookup-dialog").open) refreshServiceStatus();
    }, 30000);
}
