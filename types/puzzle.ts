// types/puzzle.ts

export interface PostPuzzle {
  id: string;
  post_id: string;
  image_url: string;
  cols: number;
  rows: number;
  time_limit_sec: number | null;
  hint_enabled: boolean;
  created_at: string;
}

export interface PuzzlePiece {
  id: number;          // 0 ~ cols*rows-1
  correctCol: number;  // 정답 열
  correctRow: number;  // 정답 행
  currentCol: number;  // 현재 열 (-1 = 트레이)
  currentRow: number;  // 현재 행 (-1 = 트레이)
  trayIndex: number;   // 트레이 내 순서
  isPlaced: boolean;   // 정위치 여부
}

export type PuzzleStatus = "idle" | "playing" | "success" | "timeout";

export interface CreatePuzzleInput {
  image_url: string;
  cols: number;
  rows: number;
  time_limit_sec: number | null;
  hint_enabled: boolean;
}

export interface UpdatePuzzleInput extends Partial<CreatePuzzleInput> {}
