import { supabaseClient } from "./supabase.js";
import { requireCompetitiveServer } from "./competitive/servers.js";
import { normalizeSeasonName, requirePoolNumber, withCompetitivePoolTitle } from "./competitive/seasons.js";

const COMPETITIVE_POOL_CHARACTER_FIELDS = "id, competitive_pool_id, seer_pet_id, pet_name, pool_type";
const COMPETITIVE_POOL_FIELDS = "id, server, season_id, pool_number, start_at, end_at, season:competitive_seasons!competitive_pools_season_server_fkey(id, name)";

export async function getCurrentCompetitivePool(server) {
    requireCompetitiveServer(server);
    const now = new Date().toISOString();
    const { data, error } = await supabaseClient
        .from("competitive_pools")
        .select(`${COMPETITIVE_POOL_FIELDS}, competitive_pool_characters(${COMPETITIVE_POOL_CHARACTER_FIELDS})`)
        .eq("server", server)
        .lte("start_at", now)
        .gt("end_at", now)
        .order("start_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return withCompetitivePoolTitle(data);
}

export async function getAdminCompetitivePools(server) {
    requireCompetitiveServer(server);
    const { data, error } = await supabaseClient
        .from("competitive_pools")
        .select(`${COMPETITIVE_POOL_FIELDS}, created_at`)
        .eq("server", server)
        .order("start_at", { ascending: false });

    if (error) throw error;
    return (data ?? []).map(withCompetitivePoolTitle);
}

async function saveCompetitivePoolPeriod(poolId, seasonName, poolNumber, startAt, endAt, server) {
    requireCompetitiveServer(server);
    seasonName = normalizeSeasonName(seasonName);
    if (!seasonName || seasonName === "賽季" || seasonName.length > 100) throw new Error("請填寫 100 字以內的賽季名稱。");
    const { data, error } = await supabaseClient.rpc("save_competitive_pool_period", {
        p_pool_id: poolId,
        p_server: server,
        p_season_name: seasonName,
        p_pool_number: requirePoolNumber(poolNumber),
        p_start_at: startAt,
        p_end_at: endAt
    });
    if (error) throw error;
    return data;
}

export async function createCompetitivePool(seasonName, poolNumber, startAt, endAt, server) {
    return saveCompetitivePoolPeriod(null, seasonName, poolNumber, startAt, endAt, server);
}

export async function updateCompetitivePool(poolId, seasonName, poolNumber, startAt, endAt, server) {
    return saveCompetitivePoolPeriod(poolId, seasonName, poolNumber, startAt, endAt, server);
}

export async function deleteCompetitivePool(poolId) {
    const { error } = await supabaseClient
        .from("competitive_pools")
        .delete()
        .eq("id", poolId);

    if (error) throw error;
}

export async function getCompetitivePoolCharacters(poolId) {
    const { data, error } = await supabaseClient
        .from("competitive_pool_characters")
        .select(COMPETITIVE_POOL_CHARACTER_FIELDS)
        .eq("competitive_pool_id", poolId)
        .order("pool_type")
        .order("seer_pet_id");

    if (error) throw error;
    return data ?? [];
}

export async function addCompetitivePoolCharacter(poolId, petId, petName, poolType) {
    const { error } = await supabaseClient
        .from("competitive_pool_characters")
        .insert({
            competitive_pool_id: poolId,
            seer_pet_id: petId,
            pet_name: petName,
            pool_type: poolType
        });

    if (error) throw error;
}

export async function addCompetitivePoolCharacters(poolId, characters, poolType) {
    const { error } = await supabaseClient
        .from("competitive_pool_characters")
        .upsert(
            characters.map((character) => ({
                competitive_pool_id: poolId,
                seer_pet_id: character.id,
                pet_name: character.name,
                pool_type: poolType
            })),
            { onConflict: "competitive_pool_id,seer_pet_id", ignoreDuplicates: true }
        );

    if (error) throw error;
}

export async function deleteCompetitivePoolCharacter(characterId) {
    const { error } = await supabaseClient
        .from("competitive_pool_characters")
        .delete()
        .eq("id", characterId);

    if (error) throw error;
}
