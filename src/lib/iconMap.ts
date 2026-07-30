import {
  Gamepad2,
  Dice5,
  Target,
  Trophy,
  Shield,
  Puzzle,
  Flame,
  Layers,
  Dumbbell,
  Skull,
  User,
  Users,
  Trophy as TrophyIcon
} from "lucide-react";
import React from "react";

// Mapping from stored emoji strings to Lucide React icons
export const ICON_MAP: Record<string, React.ComponentType<any>> = {
  "🎮": Gamepad2,
  "🎲": Dice5,
  "🏓": Target,
  "🏎️": Trophy,
  "♟️": Shield,
  "🧩": Puzzle,
  "⚽": TrophyIcon,
  "🏀": Flame,
  "🃏": Layers,
  "🎯": Target,
  "🎳": Dumbbell,
  "👾": Skull,
};

// Returns a Lucide icon component for a given emoji string
export function getGameIcon(emoji: string): React.ComponentType<any> {
  const IconComponent = ICON_MAP[emoji];
  return IconComponent || Gamepad2;
}

// Icon choices available to choose when creating/editing games
export const GAME_ICON_CHOICES = [
  { emoji: "🎮", label: "Controller", icon: Gamepad2 },
  { emoji: "🎲", label: "Dice", icon: Dice5 },
  { emoji: "🏓", label: "Ping Pong", icon: Target },
  { emoji: "🏎️", label: "Racing", icon: Trophy },
  { emoji: "♟️", label: "Chess", icon: Shield },
  { emoji: "🧩", label: "Puzzle", icon: Puzzle },
  { emoji: "⚽", label: "Soccer", icon: TrophyIcon },
  { emoji: "🏀", label: "Basketball", icon: Flame },
  { emoji: "🃏", label: "Cards", icon: Layers },
  { emoji: "🎯", label: "Target", icon: Target },
  { emoji: "🎳", label: "Bowling", icon: Dumbbell },
  { emoji: "👾", label: "Retro Game", icon: Skull },
];
