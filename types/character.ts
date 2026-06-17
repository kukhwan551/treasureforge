// types/character.ts
// 탐험 캐릭터 정의

export type CharacterId =
  | "explorer" | "pirate" | "archaeologist"
  | "adventurer_girl" | "captain" | "senior_explorer";

export interface CharacterDef {
  id: CharacterId;
  emoji: string;       // 선택 UI용 이모지
  name: string;
  shirtColor: string;  // 기본 셔츠 색 (신호 레벨 0~2일 때)
  shirtColorHigh: string; // 신호 레벨 3+ 일 때 강조색
  pantsColor: string;
  hairColor: string;
  hasHat: boolean;
  hatColor: string;
  hasHeadband: boolean;
  headbandColor: string;
  hasGlasses: boolean;
  longHair: boolean; // 양갈래 등 긴머리 여부
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: "explorer", emoji: "🧑‍🦱", name: "탐험가",
    shirtColor: "#3a3830", shirtColorHigh: "#b89a5a",
    pantsColor: "#3a3830", hairColor: "#3a2a1a",
    hasHat: false, hatColor: "", hasHeadband: false, headbandColor: "",
    hasGlasses: false, longHair: false,
  },
  {
    id: "pirate", emoji: "🏴‍☠️", name: "해적",
    shirtColor: "#1a1a1a", shirtColorHigh: "#c0504a",
    pantsColor: "#2a2420", hairColor: "#1a1410",
    hasHat: false, hatColor: "", hasHeadband: true, headbandColor: "#c0504a",
    hasGlasses: false, longHair: false,
  },
  {
    id: "archaeologist", emoji: "🤠", name: "고고학자",
    shirtColor: "#6a5a3a", shirtColorHigh: "#b89a5a",
    pantsColor: "#5a4a2a", hairColor: "#4a3a2a",
    hasHat: true, hatColor: "#8a7050", hasHeadband: false, headbandColor: "",
    hasGlasses: false, longHair: false,
  },
  {
    id: "adventurer_girl", emoji: "👧", name: "모험소녀",
    shirtColor: "#a05a7a", shirtColorHigh: "#d88aac",
    pantsColor: "#3a3830", hairColor: "#2a1a14",
    hasHat: false, hatColor: "", hasHeadband: false, headbandColor: "",
    hasGlasses: false, longHair: true,
  },
  {
    id: "captain", emoji: "⚓", name: "선장",
    shirtColor: "#1a3a4a", shirtColorHigh: "#4a8aaa",
    pantsColor: "#1a2430", hairColor: "#5a5650",
    hasHat: true, hatColor: "#0a2030", hasHeadband: false, headbandColor: "",
    hasGlasses: false, longHair: false,
  },
  {
    id: "senior_explorer", emoji: "👴", name: "시니어탐험가",
    shirtColor: "#5a5650", shirtColorHigh: "#9ab06a",
    pantsColor: "#4a4840", hairColor: "#c4bfb4",
    hasHat: false, hatColor: "", hasHeadband: false, headbandColor: "",
    hasGlasses: true, longHair: false,
  },
];

export function getCharacter(id: CharacterId | string | null | undefined): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}
