import { supabaseClient } from "./supabase.js";

export async function getMyGameAccount() {
    const { data, error } = await supabaseClient.rpc("get_my_game_account");
    if (error) throw error;
    return data ?? null;
}

export async function bindGameAccount(gameAccount) {
    const { data, error } = await supabaseClient.rpc("bind_game_account", {
        p_game_account: gameAccount
    });
    if (error) throw error;
    return data;
}
