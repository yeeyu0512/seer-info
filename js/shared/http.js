// Keep the public and admin error contracts distinct. Both support non-SeerAPI URLs.
export async function fetchSeerJson(url, options = {}) {
    const response = await fetch(url, { headers: { Accept: "application/json" }, ...options });
    if (!response.ok) throw new Error(`SeerAPI 請求失敗（${response.status}）`);
    return response.json();
}

export async function fetchAdminJson(url) {
    const response = await fetch(url, {
        headers: {
            Accept: "application/json"
        }
    });

    if (!response.ok) {
        let message = `SeerAPI 請求失敗（${response.status}）`;
        try {
            const payload = await response.json();
            if (payload && payload.message) {
                message = payload.message;
            }
        } catch (error) {
            // ignore JSON parse errors and fall back to the status text
        }
        const error = new Error(message);
        error.status = response.status;
        error.resource = new URL(url).pathname;
        throw error;
    }

    return response.json();
}
