import { supabaseClient } from "./supabase.js";
import { TAIWAN_CONTENT_KINDS, normalizeTaiwanExclusions, parseTaiwanExclusions } from "./shared/taiwan-availability.js";

export async function getSeerServerSettings() {
    const { data, error } = await supabaseClient
        .from("seer_server_settings")
        .select("*")
        .eq("id", 1)
        .single();

    if (error) throw error;
    const exclusions = normalizeTaiwanExclusions(data.taiwan_exclusions ?? {});
    return {
        exclusions,
        excludedRanges: Object.fromEntries(TAIWAN_CONTENT_KINDS.map(kind => [kind, parseTaiwanExclusions(exclusions[kind])])),
        latestSuitId: exclusions.latestSuitId ?? null,
        hasExclusionsField: Object.hasOwn(data, "taiwan_exclusions"),
        latestPetId: data.latest_pet_id === null ? null : Number(data.latest_pet_id),
        latestSkinId: data.latest_skin_id == null ? null : Number(data.latest_skin_id),
        latestMintmarkId: data.latest_mintmark_id == null ? null : Number(data.latest_mintmark_id),
        hasMintmarkProgressField: Object.hasOwn(data, "latest_mintmark_id")
    };
}

export async function updateSeerServerSettings(latestPetId, latestSkinId, latestMintmarkId, exclusions) {
    const { error } = await supabaseClient
        .from("seer_server_settings")
        .update({
            latest_pet_id: latestPetId,
            latest_skin_id: latestSkinId,
            ...(latestMintmarkId !== undefined ? { latest_mintmark_id: latestMintmarkId } : {}),
            ...(exclusions !== undefined ? { taiwan_exclusions: normalizeTaiwanExclusions(exclusions) } : {}),
            updated_at: new Date().toISOString()
        })
        .eq("id", 1)
        .select("id")
        .single();

    if (error) throw error;
}
