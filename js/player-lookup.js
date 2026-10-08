// Taiwan player API; game credentials remain on the server.
export const PLAYER_LOOKUP_API_ENDPOINT = "https://seer-info-tw-api.koreacentral.cloudapp.azure.com/api/tw/player/query";

const elements = typeof document === "undefined" ? {} : {
    form: document.getElementById("player-lookup-form"),
    mimiId: document.getElementById("mimi-id"),
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

function setStatus(message, type = "") {
    elements.status.textContent = message;
    elements.status.className = `player-lookup-message${type ? ` is-${type}` : ""}`;
}

function setLoading(isLoading) {
    elements.progress.hidden = !isLoading;
    elements.form.setAttribute("aria-busy", String(isLoading));
    if (!isLoading) refreshServiceStatus();
    elements.submit.disabled = isLoading;
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

async function requestPlayer(mimiId, captchaAnswer = "") {
    const body = pendingCaptcha
        ? { challenge_id: pendingCaptcha.id, code: captchaAnswer }
        : { user_id: Number(mimiId) };
    const endpoint = pendingCaptcha
        ? PLAYER_LOOKUP_API_ENDPOINT.replace(/\/query$/, "/captcha")
        : PLAYER_LOOKUP_API_ENDPOINT;
    const response = await fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    let payload = {};
    try {
        payload = await response.json();
    } catch (error) {
        if (!response.ok) throw new Error(`查詢失敗（${response.status}）`);
    }
    if (response.status === 428) {
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

function renderPetBag(container, pets) {
    container.replaceChildren();
    container.classList.add("player-pet-list");
    if (!Array.isArray(pets) || !pets.length) {
        container.textContent = pets ? String(pets) : "空";
        return;
    }
    for (const pet of pets) {
        const card = document.createElement("div");
        card.className = "player-pet-card";
        const id = Number(pet?.id);
        if (Number.isInteger(id) && id > 0) {
            const image = document.createElement("img");
            image.src = `https://newseer.61.com/web/monster/head/${id}.png`;
            image.alt = "";
            image.loading = "lazy";
            image.addEventListener("error", () => { image.hidden = true; }, { once: true });
            card.append(image);
        }
        const info = document.createElement("div");
        const name = document.createElement("strong");
        name.textContent = typeof pet === "string" ? pet : String(pet.name || "未知精靈");
        info.append(name);
        if (Number.isInteger(id) && id > 0) {
            const number = document.createElement("small");
            number.textContent = `#${id}`;
            info.append(number);
        }
        card.append(info);
        container.append(card);
    }
}

export function formatPeakLines(peak = {}) {
    const rank = (value) => value ? `${value.rank || '未知段位'}${value.score ?? '-'}${value.unit === 'star' ? '星' : '分'}` : '-';
    const stats = peak.win_rate || {};
    const percent = stats.percent == null ? '無對戰統計' : `${Number(stats.percent).toFixed(1)}%`;
    return {current: rank(peak.current), highest: rank(peak.highest), rate: `${percent}（${stats.wins ?? '-'}／${stats.total ?? '-'}）`};
}

function renderResult(payload) {
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
    for (const [mode, rateId] of [["sport", "win-rate"], ["wild", "wild-win-rate"]]) {
        const lines = formatPeakLines(player[mode]);
        document.getElementById(`${mode}-current-rank`).textContent = lines.current;
        document.getElementById(`${mode}-highest-rank`).textContent = lines.highest;
        document.getElementById(rateId).textContent = lines.rate;
    }
    resultFields.userId.textContent = `米米號：${display(result.userId)}`;
    resultFields.online.dataset.online = String(result.online === true);
    resultFields.server.hidden = !result.online;
    resultFields.server.textContent = result.online ? `伺服器：${display(result.server)}` : '';
    elements.result.hidden = false;
}

async function submitLookup(captchaAnswer = "") {
    const mimiId = elements.mimiId.value.trim();
    if (!/^[0-9]+$/.test(mimiId) || !Number.isSafeInteger(Number(mimiId)) || Number(mimiId) <= 0 || Number(mimiId) > 4294967295) {
        setStatus("請輸入有效的數字 米米號。", "error");
        elements.mimiId.focus();
        return;
    }
    setLoading(true);
    setStatus("查詢中…");
    try {
        const payload = await requestPlayer(mimiId, captchaAnswer);
        hideCaptcha();
        renderResult(payload);
        setStatus("查詢完成。", "success");
    } catch (error) {
        if (error.code === "captcha_required") {
            showCaptcha(error.payload);
            setStatus("此查詢需要完成驗證。", "error");
        } else if (error.code === "busy") {
            setStatus(error.message, "error");
        } else {
            setStatus(error.message || "查詢失敗，請稍後再試。", "error");
        }
    } finally {
        setLoading(false);
    }
}

if (elements.form) {
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

if (typeof document !== 'undefined' && new URLSearchParams(location.search).get('embedded') === '1') {
    document.body.classList.add('player-lookup-embedded');
}

async function refreshServiceStatus() {
    try {
        const response = await fetch(PLAYER_LOOKUP_API_ENDPOINT.replace('/player/query', '/status'), {signal: AbortSignal.timeout(8000)});
        if (!response.ok) throw new Error('status unavailable');
        const health = await response.json();
        document.getElementById('api-health').dataset.state = health.api === 'available' ? 'ok' : 'pending';
        document.getElementById('game-health').dataset.state = health.game_connected ? 'ok' : 'idle';
        document.getElementById('api-health').textContent = ({available:'正常',busy:'查詢中',maintenance:'維護中'})[health.api] || '未知';
        document.getElementById('game-health').textContent = health.game_connected ? '已連線' : '尚未連線';
    } catch {
        document.getElementById('api-health').dataset.state = 'error';
        document.getElementById('game-health').dataset.state = 'pending';
        document.getElementById('api-health').textContent = '無法連線';
        document.getElementById('game-health').textContent = '未知';
    }
}
if (typeof document !== 'undefined') refreshServiceStatus();
