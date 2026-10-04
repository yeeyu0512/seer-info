import { supabaseClient } from "./supabase.js";

export async function getSeerServerSettings() {
    const { data, error } = await supabaseClient
        .from("seer_server_settings")
        .select("latest_pet_id, latest_skin_id")
        .eq("id", 1)
        .single();

    if (error) throw error;
    return {
        latestPetId: data.latest_pet_id === null ? null : Number(data.latest_pet_id),
        latestSkinId: data.latest_skin_id === null ? null : Number(data.latest_skin_id)
    };
}

export async function updateSeerServerSettings(latestPetId, latestSkinId) {
    const { error } = await supabaseClient
        .from("seer_server_settings")
        .update({
            latest_pet_id: latestPetId,
            latest_skin_id: latestSkinId,
            updated_at: new Date().toISOString()
        })
        .eq("id", 1)
        .select("id")
        .single();

    if (error) throw error;
}
