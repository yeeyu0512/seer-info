import { supabaseClient } from "./supabase.js";

export async function isAdmin() {
    const { data, error } = await supabaseClient.rpc("is_admin");

    if (error) {
        throw error;
    }

    return data;
}

export async function getAdminPools() {
    const { data, error } = await supabaseClient
        .from("pools")
        .select(`
            id,
            name,
            start_at,
            end_at,
            max_votes,
            status,
            created_at
        `)
        .order("created_at", {
            ascending: false
        });

    if (error) {
        throw error;
    }

    return data;
}

export async function createPool(name, startAt, endAt, maxVotes) {
    const { data, error } = await supabaseClient.rpc("create_pool", {
        p_name: name,
        p_start_at: startAt,
        p_end_at: endAt,
        p_max_votes: maxVotes
    });
    if (error) throw error;
    return data;
}

export async function updatePoolDraft(poolId, name, startAt, endAt, maxVotes) {
    const { data, error } = await supabaseClient.rpc("update_pool_draft", {
        p_pool_id: poolId,
        p_name: name,
        p_start_at: startAt,
        p_end_at: endAt,
        p_max_votes: maxVotes
    });
    if (error) throw error;
    return data;
}

export async function addPoolCharacter(poolId, characterId, characterName) {
    const { data, error } = await supabaseClient.rpc("add_pool_character", {
        p_pool_id: poolId,
        p_character_id: characterId,
        p_character_name: characterName
    });
    if (error) throw error;
    return data;
}

export async function deletePoolCharacter(poolCharacterId) {
    const { data, error } = await supabaseClient.rpc("delete_pool_character", {
        p_pool_character_id: poolCharacterId
    });
    if (error) throw error;
    return data;
}

export async function startPool(poolId) {
    const { data, error } = await supabaseClient.rpc("start_pool", {
        p_pool_id: poolId
    });
    if (error) throw error;
    return data;
}

export async function closePool(poolId) {
    const { data, error } = await supabaseClient.rpc("close_pool", {
        p_pool_id: poolId
    });
    if (error) throw error;
    return data;
}

export async function deletePool(poolId) {
    const { data, error } = await supabaseClient.rpc("delete_pool", {
        p_pool_id: poolId
    });
    if (error) throw error;
    return data;
}

export async function getPoolVoteDetails(poolId) {
    const { data, error } = await supabaseClient.rpc("get_pool_vote_details", {
        p_pool_id: poolId
    });
    if (error) throw error;
    return data ?? [];
}
