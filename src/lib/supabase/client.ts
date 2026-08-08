import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:0";
const SUPABASE_ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-anon-key";

export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON);
}