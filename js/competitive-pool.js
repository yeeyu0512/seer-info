import { supabaseClient } from "./supabase.js";

const COMPETITIVE_POOL_CHARACTER_FIELDS = "id, competitive_pool_id, seer_pet_id, pet_name, pool_type";

export async function getCurrentCompetitivePool() {
    const now = new Date().toISOString();
    const { data, error } = await supabaseClient
        .from("competitive_pools")
        .select(`id, name, start_at, end_at, competitive_pool_characters(${COMPETITIVE_POOL_CHARACTER_FIELDS})`)
        .lte("start_at", now)
        .gt("end_at", now)
        .order("start_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data;
}

export async function getAdminCompetitivePools() {
    const { data, error } = await supabaseClient
        .from("competitive_pools")
        .select("id, name, start_at, end_at, created_at")
        .order("start_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
}

export async function createCompetitivePool(name, startAt, endAt) {
    const { data, error } = await supabaseClient
        .from("competitive_pools")
        .insert({ name, start_at: startAt, end_at: endAt })
        .select("id")
        .single();

    if (error) throw error;
    return data.id;
}

export async function updateCompetitivePool(poolId, name, startAt, endAt) {
    const { error } = await supabaseClient
        .from("competitive_pools")
        .update({ name, start_at: startAt, end_at: endAt, updated_at: new Date().toISOString() })
        .eq("id", poolId);

    if (error) throw error;
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
