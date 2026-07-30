import React from "react";
import { Check } from "lucide-react";
import { ClientGame } from "@/lib/dataService";

// Helper to load the custom component:
import { getGameIcon as getIcon } from "@/lib/iconMap";

interface GameSelectGridProps {
  games: ClientGame[];
  selectedGames: ClientGame[];
  onToggle: (game: ClientGame) => void;
}

export const GameSelectGrid: React.FC<GameSelectGridProps> = ({
  games,
  selectedGames,
  onToggle,
}) => {
  return (
    <div className="grid grid-cols-2 gap-3" id="game-select-grid">
      {games.map((game) => {
        const isSelected = selectedGames.some((g) => g._id === game._id);
        const IconComponent = getIcon(game.icon);

        return (
          <button
            key={game._id}
            type="button"
            onClick={() => onToggle(game)}
            className={`relative flex flex-col items-center justify-center p-4 text-center border rounded-lg transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary min-h-[110px] ${
              isSelected
                ? "border-primary/50 bg-[#7C6FF2]/[0.08]"
                : "border-border bg-surface hover:border-primary/45"
            }`}
            aria-label={`Select ${game.name}`}
          >
            {/* Game Icon box */}
            <div className="w-11 h-11 bg-surface-3 rounded-[13px] flex items-center justify-center text-text mb-2">
              <IconComponent className="h-5 w-5" />
            </div>

            {/* Game Name */}
            <span className="font-semibold text-[13px] text-text line-clamp-1">
              {game.name}
            </span>

            {/* Checkbox circle indicator */}
            <div
              className={`absolute top-2 right-2 w-[18px] h-[18px] rounded-[6px] flex items-center justify-center transition-all ${
                isSelected
                  ? "bg-primary text-white"
                  : "border-1.5 border-border"
              }`}
            >
              {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
            </div>
          </button>
        );
      })}
    </div>
  );
};
