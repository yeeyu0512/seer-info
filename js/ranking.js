import { supabaseClient } from "./supabase.js";

export async function getPoolRanking(poolId) {
    const { data, error } = await supabaseClient.rpc(
        "get_pool_ranking",
        {
            p_pool_id: poolId
        }
    );

    if (error) {
        throw error;
    }

    return data;
}