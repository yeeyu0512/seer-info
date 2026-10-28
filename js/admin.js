import { supabaseClient } from "./supabase.js";

export async function isAdmin() {
    const { data, error } = await supabaseClient.rpc("is_admin");

    if (error) {
        throw error;
    }

    return data;
}
