import { supabaseClient } from "./supabase.js";

export async function login(email, password) {
    return await supabaseClient.auth.signInWithPassword({
        email,
        password
    });
}

export async function logout() {
    return await supabaseClient.auth.signOut();
}

export async function getSession() {
    const {
        data: { session },
        error
    } = await supabaseClient.auth.getSession();

    if (error) {
        throw error;
    }

    return session;
}

export async function register(email, password, mimiId) {
    return await supabaseClient.auth.signUp({
        email,
        password,
        options: {
            data: {
                mimi_id: mimiId
            }
        }
    });
}
