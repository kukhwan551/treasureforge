// types/game.ts

export type GameDifficulty = "easy" | "medium" | "hard";
export type TargetAgeGroup = "child" | "teen" | "adult" | "senior" | "all";
export type GameStatus     = "draft" | "private" | "published" | "archived";
export type GameOrderMode  = "free" | "sequential";

export interface Game {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  difficulty: GameDifficulty;
  target_age: TargetAgeGroup;
  status: GameStatus;
  order_mode: GameOrderMode;
  share_code: string | null;
  entry_code: string | null;
  time_limit_sec: number | null;
  reward_message: string | null;
  reward_type: "message" | "coupon" | "certificate" | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateGameInput {
  title: string;
  description?: string | null;
  difficulty: GameDifficulty;
  target_age: TargetAgeGroup;
}

export interface UpdateGameInput {
  title?: string;
  description?: string | null;
  difficulty?: GameDifficulty;
  target_age?: TargetAgeGroup;
  status?: GameStatus;
  order_mode?: GameOrderMode;
  entry_code?: string | null;
  time_limit_sec?: number | null;
  reward_message?: string | null;
  reward_type?: "message" | "coupon" | "certificate";
}

export interface ListGamesQuery {
  page?: number;
  limit?: number;
  status?: GameStatus;
  search?: string;
}

export interface ApiSuccess<T> { data: T; error: null; }
export interface ApiError      { data: null; error: { message: string; code?: string; }; }
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginatedGames {
  games: Game[];
  total: number;
  page: number;
  limit: number;
}
