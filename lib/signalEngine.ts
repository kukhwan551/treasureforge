// lib/signalEngine.ts
// 수정:
// 1. 신호음 지연 해결 — AudioContext를 미리 생성 (탐험 시작 시 한 번만)
// 2. 정답/오답 사운드 강화
// 3. 거리 계산 함수

// ─────────────────────────────────────────────
// AudioContext 싱글톤
// ─────────────────────────────────────────────

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!_ctx || _ctx.state === "closed") {
    _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  // suspended 상태면 resume (브라우저 정책)
  if (_ctx.state === "suspended") {
    _ctx.resume();
  }
  return _ctx;
}

// 탐험 시작 시 미리 AudioContext 초기화 (첫 소리 지연 방지)
export function initAudio() {
  try {
    const ctx = getCtx();
    // 무음 재생으로 컨텍스트 활성화
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.01);
  } catch {}
}

export function disposeAudio() {
  if (_ctx) {
    _ctx.close().catch(() => {});
    _ctx = null;
  }
}

// ─────────────────────────────────────────────
// 거리 → 신호 레벨
// ─────────────────────────────────────────────

export type SignalLevel = 0 | 1 | 2 | 3 | 4;

// 거리 임계값 (지도 좌표 % 기준)
// 문제 3: NEARBY_THRESHOLD를 줄여 더 가까이 접근해야 핀 표시
export const SIGNAL_DISTANCES = {
  LEVEL4: 3,   // 핀 표시 + 발견 (이전 5)
  LEVEL3: 8,   // 강한 신호
  LEVEL2: 15,  // 중간 신호
  LEVEL1: 25,  // 약한 신호
};

export const NEARBY_THRESHOLD = SIGNAL_DISTANCES.LEVEL4; // 3%

export function distToSignal(dist: number): SignalLevel {
  if (dist <= SIGNAL_DISTANCES.LEVEL4) return 4;
  if (dist <= SIGNAL_DISTANCES.LEVEL3) return 3;
  if (dist <= SIGNAL_DISTANCES.LEVEL2) return 2;
  if (dist <= SIGNAL_DISTANCES.LEVEL1) return 1;
  return 0;
}

export function findNearestPost<T extends { coord_x: unknown; coord_y: unknown; id: string }>(
  x: number, y: number,
  posts: T[],
  excludeIds: Set<string> = new Set()
): { post: T | null; dist: number } {
  let nearest: T | null = null;
  let minDist = Infinity;

  for (const post of posts) {
    if (excludeIds.has(post.id)) continue;
    if (post.coord_x === null || post.coord_y === null) continue;
    const dx   = x - Number(post.coord_x);
    const dy   = y - Number(post.coord_y);
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) { minDist = dist; nearest = post; }
  }

  return { post: nearest, dist: minDist };
}

// ─────────────────────────────────────────────
// 신호음 — 레벨별 주파수/패턴
// ─────────────────────────────────────────────

const SIGNAL_FREQ: Record<SignalLevel, number> = {
  0: 0,
  1: 400,
  2: 600,
  3: 900,
  4: 1200,
};

const SIGNAL_DURATION: Record<SignalLevel, number> = {
  0: 0,
  1: 0.08,
  2: 0.07,
  3: 0.06,
  4: 0.05,
};

export function playSignalBeep(level: SignalLevel) {
  if (level === 0) return;
  try {
    const ctx  = getCtx();
    const now  = ctx.currentTime;
    const freq = SIGNAL_FREQ[level];
    const dur  = SIGNAL_DURATION[level];
    const vol  = 0.05 + level * 0.04; // 레벨 높을수록 크게

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type      = level >= 3 ? "sine" : "square";
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.01);

    // 레벨 4: 이중 비프
    if (level === 4) {
      const osc2  = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(freq * 1.5, now + dur + 0.02);
      gain2.gain.setValueAtTime(0, now + dur + 0.02);
      gain2.gain.linearRampToValueAtTime(vol * 1.2, now + dur + 0.025);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + dur * 2 + 0.02);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + dur + 0.02);
      osc2.stop(now + dur * 2 + 0.04);
    }
  } catch {}
}

// ─────────────────────────────────────────────
// 정답 사운드 🎉
// ─────────────────────────────────────────────

export function playCorrectSound() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // 팡파레 느낌 — 상승하는 3음
    const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      const t    = now + i * 0.08;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.35);
    });
  } catch {}
}

// ─────────────────────────────────────────────
// 오답 사운드 😢
// ─────────────────────────────────────────────

export function playWrongSound() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // 하강하는 2음 + 저음 베이스
    const notes = [
      { freq: 440, t: 0,    dur: 0.15 },
      { freq: 330, t: 0.15, dur: 0.20 },
      { freq: 220, t: 0.30, dur: 0.30 },
    ];

    notes.forEach(({ freq, t, dur }) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      const at   = now + t;
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, at);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.7, at + dur);
      gain.gain.setValueAtTime(0.15, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + dur);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(at); osc.stop(at + dur + 0.05);
    });
  } catch {}
}

// ─────────────────────────────────────────────
// 시간 초과 사운드 ⌛
// ─────────────────────────────────────────────

export function playTimeoutSound() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // 경고음 — 빠른 3회 비프
    [0, 0.15, 0.30].forEach((t) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      const at   = now + t;
      osc.type = "square";
      osc.frequency.setValueAtTime(800, at);
      gain.gain.setValueAtTime(0.12, at);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.10);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(at); osc.stop(at + 0.12);
    });
  } catch {}
}

// ─────────────────────────────────────────────
// 열쇠 획득 사운드 🗝
// ─────────────────────────────────────────────

export function playKeySound() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;

    // 반짝이는 고음
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(2000, now + 0.1);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now); osc.stop(now + 0.35);
  } catch {}
}

// 보물 완료 사운드
export function playTreasureSound() {
  try {
    const ctx = getCtx();
    const now = ctx.currentTime;
    const melody = [523, 659, 784, 659, 1047];
    melody.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      const t    = now + i * 0.12;
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(t); osc.stop(t + 0.3);
    });
  } catch {}
}
