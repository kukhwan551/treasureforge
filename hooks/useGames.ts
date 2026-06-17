// hooks/useGames.ts
// Client Component에서 게임 CRUD를 간편하게 호출하는 훅 모음.

"use client";

import { useState, useCallback } from "react";
import {
  Game,
  CreateGameInput,
  UpdateGameInput,
  ListGamesQuery,
  PaginatedGames,
  ApiResponse,
} from "@/types/game";

// ─────────────────────────────────────────────
// 내부 fetch 헬퍼
// ─────────────────────────────────────────────

async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  return res.json() as Promise<ApiResponse<T>>;
}

// ─────────────────────────────────────────────
// 목록 조회 훅
// ─────────────────────────────────────────────

export function useListGames() {
  const [state, setState] = useState<{
    data: PaginatedGames | null;
    loading: boolean;
    error: string | null;
  }>({ data: null, loading: false, error: null });

  const fetch = useCallback(async (query: ListGamesQuery = {}) => {
    setState((s) => ({ ...s, loading: true, error: null }));

    const params = new URLSearchParams();
    if (query.page)   params.set("page", String(query.page));
    if (query.limit)  params.set("limit", String(query.limit));
    if (query.status) params.set("status", query.status);
    if (query.search) params.set("search", query.search);

    const result = await apiFetch<PaginatedGames>(
      `/api/games?${params.toString()}`
    );

    if (result.error) {
      setState({ data: null, loading: false, error: result.error.message });
    } else {
      setState({ data: result.data, loading: false, error: null });
    }

    return result;
  }, []);

  return { ...state, fetch };
}

// ─────────────────────────────────────────────
// 게임 생성 훅
// ─────────────────────────────────────────────

export function useCreateGame() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useCallback(async (input: CreateGameInput) => {
    setLoading(true);
    setError(null);

    const result = await apiFetch<Game>("/api/games", {
      method: "POST",
      body: JSON.stringify(input),
    });

    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return null;
    }

    return result.data;
  }, []);

  return { loading, error, create };
}

// ─────────────────────────────────────────────
// 게임 수정 훅
// ─────────────────────────────────────────────

export function useUpdateGame() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = useCallback(async (id: string, input: UpdateGameInput) => {
    setLoading(true);
    setError(null);

    const result = await apiFetch<Game>(`/api/games/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });

    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return null;
    }

    return result.data;
  }, []);

  return { loading, error, update };
}

// ─────────────────────────────────────────────
// 게임 삭제 훅
// ─────────────────────────────────────────────

export function useDeleteGame() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    const result = await apiFetch<{ id: string }>(`/api/games/${id}`, {
      method: "DELETE",
    });

    setLoading(false);

    if (result.error) {
      setError(result.error.message);
      return false;
    }

    return true;
  }, []);

  return { loading, error, remove };
}
