import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
if (!process.env.VITE_SUPABASE_URL) {
    dotenv.config({ path: '.env.local' });
}

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
    console.log("Fetching loans to see if error persists...");
    const { data, error } = await supabase.from('loan_applications').select('*').limit(1);
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Success! Data:", data);
    }
}
run();
