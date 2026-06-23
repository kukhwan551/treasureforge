// types/post.ts

export type PostOrderMode = "sequential" | "free";

export type QuizType =
  | "short_answer"
  | "single_choice"
  | "multi_choice"
  | "ox";

// ─────────────────────────────────────────────
// Post
// ─────────────────────────────────────────────

export interface Post {
  id: string;
  game_id: string;
  name: string;
  description: string | null;
  coord_x: number | null;
  coord_y: number | null;
  radius: number;
  order_index: number;
  order_mode: PostOrderMode;
  time_limit_sec: number | null;
  hint_1: string | null;   // 포스트 레벨 힌트 (위치 힌트 등 용도)
  hint_2: string | null;
  hint_3: string | null;
  score: number;
  is_active: boolean;
  mission_type?: "quiz" | "puzzle" | "photo";
  created_at: string;
  updated_at: string;
  quizzes?: Quiz[];
}

export interface CreatePostInput {
  game_id: string;
  name: string;
  description?: string | null;
  order_index?: number;
  order_mode?: PostOrderMode;
  time_limit_sec?: number | null;
  hint_1?: string | null;
  hint_2?: string | null;
  hint_3?: string | null;
  score?: number;
}

export interface UpdatePostInput {
  name?: string;
  description?: string | null;
  order_index?: number;
  order_mode?: PostOrderMode;
  time_limit_sec?: number | null;
  hint_1?: string | null;
  hint_2?: string | null;
  hint_3?: string | null;
  score?: number;
  is_active?: boolean;
  coord_x?: number | null;
  coord_y?: number | null;
}

// ─────────────────────────────────────────────
// Quiz — hint_text / hint_url 추가
// ─────────────────────────────────────────────

export interface Quiz {
  id: string;
  post_id: string;
  type: QuizType;
  question: string;
  answer: string;
  options: string[];
  pass_count: number;
  total_count: number;
  explanation: string | null;
  score: number;
  order_index: number;
  hint_text: string | null;   // 텍스트 힌트
  hint_url: string | null;    // URL 힌트 (클릭 시 새 탭)
  created_at: string;
  updated_at: string;
}

export interface CreateQuizInput {
  post_id: string;
  type: QuizType;
  question: string;
  answer: string;
  options?: string[];
  pass_count?: number;
  total_count?: number;
  explanation?: string | null;
  score?: number;
  hint_text?: string | null;
  hint_url?: string | null;
}

export interface UpdateQuizInput {
  type?: QuizType;
  question?: string;
  answer?: string;
  options?: string[];
  pass_count?: number;
  total_count?: number;
  explanation?: string | null;
  score?: number;
  hint_text?: string | null;
  hint_url?: string | null;
}

// ─────────────────────────────────────────────
// UI 레이블
// ─────────────────────────────────────────────

export const QUIZ_TYPE_LABEL: Record<QuizType, string> = {
  short_answer:  "단답형",
  single_choice: "선택형 (단수)",
  multi_choice:  "선택형 (복수)",
  ox:            "OX형",
};

export const ORDER_MODE_LABEL: Record<PostOrderMode, string> = {
  sequential: "순서대로",
  free:       "자유롭게",
};
