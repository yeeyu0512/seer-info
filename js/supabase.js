const SUPABASE_URL = "https://fytveoihtxudmqxqjbqf.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_b3cy9cFuyaJW8_Cb2ku1Rw_0sceHGEg";

export const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

console.log("Supabase connected");