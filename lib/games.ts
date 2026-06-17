// lib/games.ts

import { SupabaseClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import type {
  Game, CreateGameInput, UpdateGameInput,
  ListGamesQuery, PaginatedGames,
} from "@/types/game";

const GAME_FIELDS = `
  id, owner_id, title, description,
  difficulty, target_age, status,
  order_mode,
  share_code, entry_code,
  time_limit_sec,
  reward_message, reward_type,
  deleted_at, created_at, updated_at
`;

export async function listGames(
  supabase: SupabaseClient,
  query: ListGamesQuery = {}
): Promise<PaginatedGames> {
  const { page = 1, limit = 20, status, search } = query;
  const from = (page - 1) * limit;

  let q = supabase
    .from("games")
    .select(GAME_FIELDS, { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, from + limit - 1);

  if (status) q = q.eq("status", status);
  if (search) q = q.ilike("title", `%${search}%`);

  const { data, error, count } = await q;
  if (error) throw new Error(error.message);
  return { games: (data ?? []) as Game[], total: count ?? 0, page, limit };
}

export async function getGame(
  supabase: SupabaseClient,
  id: string
): Promise<Game | null> {
  const { data, error } = await supabase
    .from("games")
    .select(GAME_FIELDS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data as Game | null;
}

export async function createGame(
  supabase: SupabaseClient,
  input: CreateGameInput
): Promise<Game> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) throw new Error("로그인이 필요합니다.");

  const { data, error } = await supabase
    .from("games")
    .insert({
      owner_id:    user.id,
      title:       input.title.trim(),
      description: input.description?.trim() ?? null,
      difficulty:  input.difficulty,
      target_age:  input.target_age,
      status:      "draft",
      order_mode:  "free",
    })
    .select(GAME_FIELDS)
    .single();

  if (error) throw new Error(error.message);
  return data as Game;
}

export async function updateGame(
  supabase: SupabaseClient,
  id: string,
  input: UpdateGameInput
): Promise<Game> {
  console.log("[updateGame] input received:", JSON.stringify(input));

  const extra: Record<string, unknown> = {};
  if (input.status === "published" || input.status === "private") {
    const { data: cur } = await supabase
      .from("games").select("share_code").eq("id", id).single();
    if (!cur?.share_code) extra.share_code = nanoid(8);
  }

  const patch: Record<string, unknown> = { ...extra };

  if (input.title          !== undefined) patch.title           = input.title?.trim();
  if (input.description    !== undefined) patch.description     = input.description?.trim() || null;
  if (input.difficulty     !== undefined) patch.difficulty      = input.difficulty;
  if (input.target_age     !== undefined) patch.target_age      = input.target_age;
  if (input.status         !== undefined) patch.status          = input.status;
  if (input.order_mode     !== undefined) patch.order_mode      = input.order_mode;
  if (input.entry_code     !== undefined) patch.entry_code      = input.entry_code || null;
  if ("time_limit_sec" in input)          patch.time_limit_sec  = input.time_limit_sec ?? null;
  if (input.reward_message !== undefined) patch.reward_message  = input.reward_message || null;
  if (input.reward_type    !== undefined) patch.reward_type     = input.reward_type;

  console.log("[updateGame] patch to DB:", JSON.stringify(patch));

  const { data, error } = await supabase
    .from("games")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(GAME_FIELDS)
    .single();

  if (error) { console.error("[updateGame] error:", error.message); throw new Error(error.message); }
  if (!data) throw new Error("게임을 찾을 수 없습니다.");

  console.log("[updateGame] saved order_mode:", (data as Game).order_mode);
  return data as Game;
}

export async function deleteGame(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase
    .from("games")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
