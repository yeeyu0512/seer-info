import { supabaseClient } from "./supabase.js";

export const TEST_POOL_ID =
    "ea377056-7f19-485a-a46e-818642290086";

export async function getPool(poolId) {
    const { data, error } = await supabaseClient
        .from("pools")
        .select("id, name, max_votes, start_at, end_at, status")
        .eq("id", poolId)
        .single();

    if (error) {
        throw error;
    }

    return data;
}

export async function getPoolCharacters(poolId) {
    const { data, error } = await supabaseClient
        .from("pool_characters")
        .select("id, character_id, character_name")
        .eq("pool_id", poolId)
        .order("character_id");

    if (error) {
        throw error;
    }

    return data;
}

export async function getActivePool() {
    const { data, error } = await supabaseClient
        .from("pools")
        .select("id, name, max_votes, start_at, end_at, status")
        .eq("status", "active")
        .order("start_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        throw error;
    }

    return data;
}
