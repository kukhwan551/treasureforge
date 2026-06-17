"use client";

// components/maps/MapUploader.tsx
// 수정: initial이 비동기로 로드될 때 useEffect로 동기화

import { useState, useEffect, useRef } from "react";
import type { MapRecord } from "@/lib/maps";

interface MapUploaderProps {
  gameId:     string;
  initial?:   MapRecord | null;
  onUploaded: (map: MapRecord) => void;
  onDeleted:  () => void;
}

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 10 * 1024 * 1024;

export default function MapUploader({ gameId, initial, onUploaded, onDeleted }: MapUploaderProps) {
  const [map,       setMap]       = useState<MapRecord | null>(initial ?? null);
  const [uploading, setUploading] = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [dragOver,  setDragOver]  = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ★ initial이 비동기로 로드될 때 동기화
  useEffect(() => {
    if (initial !== undefined) setMap(initial ?? null);
  }, [initial?.id]);

  async function handleFile(file: File) {
    if (!ALLOWED.includes(file.type)) {
      setError("JPG, PNG, WEBP 파일만 업로드할 수 있습니다."); return;
    }
    if (file.size > MAX_SIZE) {
      setError("파일 크기는 10MB를 초과할 수 없습니다."); return;
    }

    setUploading(true); setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res  = await fetch(`/api/games/${gameId}/map`, {
        method: "POST",
        body:   formData,
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);

      setMap(json.data);
      onUploaded(json.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete() {
    if (!map) return;
    setDeleting(true); setError(null);
    try {
      const res  = await fetch(`/api/games/${gameId}/map`, { method: "DELETE" });
      const json = await res.json();
      if (json.error) throw new Error(json.error.message);
      setMap(null);
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : "삭제 실패");
    } finally {
      setDeleting(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  return (
    <div className="space-y-4">
      {map ? (
        <div className="space-y-3">
          <div className="relative rounded-2xl overflow-hidden border border-[#2a2924]
            aspect-video bg-[#0a0a0a]">
            <img src={map.public_url} alt="보물지도"
              className="w-full h-full object-contain"/>
            <div className="absolute top-3 right-3 flex gap-2">
              <button type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-xl border border-[#2a2924] bg-[#0f0f10]/80
                  px-3 py-1.5 text-xs text-[#7a756c] backdrop-blur-sm
                  hover:border-[#3a3830] hover:text-[#9a9590] transition-colors">
                🔄 교체
              </button>
              <button type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-xl border border-[#3a2424] bg-[#0f0f10]/80
                  px-3 py-1.5 text-xs text-[#c0504a] backdrop-blur-sm
                  hover:border-[#c0504a]/40 hover:bg-[#c0504a]/10 transition-colors
                  disabled:opacity-50">
                {deleting ? "삭제 중…" : "🗑 삭제"}
              </button>
            </div>
          </div>
          {map.file_size && (
            <p className="text-xs text-[#4a4840]">
              {(map.file_size / 1024).toFixed(0)}KB
            </p>
          )}
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center
            rounded-2xl border-2 border-dashed aspect-video cursor-pointer
            transition-colors
            ${dragOver
              ? "border-[#b89a5a] bg-[#b89a5a]/5"
              : "border-[#2a2924] hover:border-[#3a3830]"
            }`}>
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2
                border-[#b89a5a] border-t-transparent"/>
              <p className="text-sm text-[#5a5650]">업로드 중…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center px-6">
              <div className="text-4xl">🗺️</div>
              <div>
                <p className="text-sm font-medium text-[#c4bfb4]">
                  클릭하거나 이미지를 드래그하세요
                </p>
                <p className="mt-1 text-xs text-[#4a4840]">
                  JPG, PNG, WEBP · 최대 10MB
                </p>
                <p className="mt-1 text-xs text-[#b89a5a]">
                  권장: 1920×1080 (16:9)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-[#c0504a]/30 bg-[#c0504a]/10
          px-4 py-3 text-sm text-[#e07070]">{error}</div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}/>
    </div>
  );
}
