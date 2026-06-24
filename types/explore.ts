// types/explore.ts

import type { Post, Quiz } from "./post";
import type { PostPuzzle } from "./puzzle";

export type GamePhase =
  | "loading" | "entry_code" | "intro"
  | "exploring" | "mission" | "puzzle" | "photo" | "complete";

export type SignalLevel = 0 | 1 | 2 | 3 | 4;

export const SIGNAL_LABEL: Record<SignalLevel, string> = {
  0: "신호 없음", 1: "약한 신호", 2: "신호 감지",
  3: "강한 신호", 4: "발견!",
};

export interface PostWithQuiz extends Post {
  quizzes:      Quiz[];
  post_photo_missions?: { keywords: string; guide_text: string; hint_image_url?: string }[];
  post_puzzles: PostPuzzle[];   // ← 추가
}

export type QuizStatus = "answering" | "correct" | "wrong" | "timeout";

export interface ActiveQuizState {
  quiz:       Quiz;
  postId:     string;
  attempts:   number;
  hintsUsed:  number;
  timeLeft:   number | null;
  status:     QuizStatus;
  userAnswer: string;
}

export interface PlayerSession {
  id:                  string;
  game_id:             string;
  nickname:            string;
  keys:                number;
  completed_post_ids:  string[];
  score:               number;
  started_at:          string;
  finished_at:         string | null;
}

export interface PublicGame {
  id:             string;
  title:          string;
  description:    string | null;
  status:         "published" | "private";
  share_code:     string;
  order_mode:     "free" | "sequential";
  reward_message: string | null;
  reward_type:    "message" | "coupon" | "certificate";
  compass_assist: boolean;
  obstacle_type:  string;
  obstacle_level: string;
  map_url:        string | null;
  time_limit_sec: number | null;
  posts:          PostWithQuiz[];
}
