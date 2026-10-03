import { supabaseClient } from "./supabase.js";

export async function hasVoted(poolId) {
    const { data, error } = await supabaseClient.rpc(
        "has_voted",
        {
            p_pool_id: poolId
        }
    );

    if (error) {
        throw error;
    }

    return data;
}

export async function submitVote(poolId, poolCharacterIds) {
    const { data, error } = await supabaseClient.rpc(
        "submit_vote",
        {
            p_pool_id: poolId,
            p_pool_character_ids: poolCharacterIds
        }
    );

    if (error) {
        throw error;
    }

    return data;
}

export async function getMyVote(poolId) {
    const { data, error } = await supabaseClient.rpc(
        "get_my_vote",
        {
            p_pool_id: poolId
        }
    );

    if (error) {
        throw error;
    }

    return data ?? [];
}
