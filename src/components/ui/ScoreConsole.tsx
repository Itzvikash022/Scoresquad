import React, { useState, useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Minus, Plus, Search, ChevronDown } from "lucide-react";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { Button } from "@/components/ui/button";
import { getGameIcon as getIcon } from "@/lib/iconMap";
import { ClientGame } from "@/lib/dataService";

interface Competitor {
  id: string;
  name: string;
  members?: Array<{ id: string; name: string }>; // If team mode
}

interface ScoreConsoleProps {
  games: ClientGame[];
  activeGameIndex: number;
  onGameIndexChange: (idx: number) => void;
  competitors: Competitor[];
  scores: Record<string, number>; // competitorId -> score for active game
  onScoreAdjust: (competitorId: string, amount: number) => void;
  onScoreInput?: (competitorId: string, val: string) => void;
  onSave: () => void;
  saveButtonText?: string;
  onAddGame?: () => void;
  hideGameDropdown?: boolean;
}

export const ScoreConsole: React.FC<ScoreConsoleProps> = ({
  games,
  activeGameIndex,
  onGameIndexChange,
  competitors,
  scores,
  onScoreAdjust,
  onScoreInput,
  onSave,
  saveButtonText = "Save game & next",
  onAddGame,
  hideGameDropdown = false,
}) => {
  const shouldReduceMotion = useReducedMotion();
  const activeGame = games[activeGameIndex];

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const filteredGames = games.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectGame = (gameId: string) => {
    const idx = games.findIndex((g) => g._id === gameId);
    if (idx !== -1) {
      onGameIndexChange(idx);
    }
    setIsOpen(false);
    setSearchQuery("");
  };

  const IconComponent = activeGame ? getIcon(activeGame.icon) : null;

  // Head-to-head layout: exactly 2 competitors
  const isHeadToHead = competitors.length === 2;

  let scoreA = 0;
  let scoreB = 0;
  let compA: Competitor | null = null;
  let compB: Competitor | null = null;

  if (isHeadToHead) {
    compA = competitors[0];
    compB = competitors[1];
    scoreA = scores[compA.id] || 0;
    scoreB = scores[compB.id] || 0;
  }

  const totalScore = scoreA + scoreB;
  const pctA = totalScore > 0 ? (scoreA / totalScore) * 100 : 50;

  const getMomentumLabel = () => {
    if (!compA || !compB) return "EVEN";
    if (scoreA === scoreB) return "EVEN";
    return scoreA > scoreB
      ? `${compA.name.toUpperCase()} LEAD`
      : `${compB.name.toUpperCase()} LEAD`;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 1. Game Switcher Header */}
      {games.length > 0 && (
        <div className="flex items-center gap-2">
          {hideGameDropdown ? (
            /* Static Display (Pre-selected mode) */
            <div className="w-full h-11 bg-surface-2 border border-border rounded-xl px-3.5 font-bold text-[14px] text-text flex items-center gap-2.5">
              {IconComponent && <IconComponent className="h-4.5 w-4.5 text-primary shrink-0" />}
              <span className="truncate">{activeGame?.name || "Game"}</span>
            </div>
          ) : (
            /* Custom Search Dropdown */
            <div ref={dropdownRef} className="relative flex-grow min-w-0">
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full h-11 bg-surface-2 border border-border rounded-xl px-3.5 font-bold text-[14px] text-text flex items-center justify-between gap-2.5 hover:bg-surface-3 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <div className="flex items-center gap-2 truncate">
                  {IconComponent && <IconComponent className="h-4.5 w-4.5 text-primary shrink-0" />}
                  <span className="truncate">{activeGame?.name || "Select game"}</span>
                </div>
                <ChevronDown className={`h-4.5 w-4.5 text-text-dim transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`} />
              </button>

              {isOpen && (
                <div className="absolute top-full left-0 right-0 z-50 mt-1.5 bg-surface border border-border rounded-xl shadow-2xl p-2 flex flex-col gap-2 max-h-[300px]">
                  {/* Search Input */}
                  <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-lg px-2.5 h-9 shrink-0">
                    <Search className="h-4 w-4 text-text-dim shrink-0" />
                    <input
                      type="text"
                      placeholder="Search games..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      autoFocus
                      className="w-full bg-transparent text-[13px] text-text outline-none"
                    />
                  </div>

                  {/* Games List */}
                  <div className="flex-grow overflow-y-auto flex flex-col gap-0.5 pr-0.5 custom-scrollbar">
                    {filteredGames.length > 0 ? (
                      filteredGames.map((g) => {
                        const GameIcon = getIcon(g.icon);
                        const isSelected = g._id === activeGame?._id;
                        return (
                          <button
                            key={g._id}
                            type="button"
                            onClick={() => handleSelectGame(g._id)}
                            className={`flex items-center gap-2 w-full text-left px-3 py-2 rounded-lg text-[13px] font-semibold transition-all cursor-pointer ${
                              isSelected
                                ? "bg-primary text-white"
                                : "text-text hover:bg-surface-2"
                            }`}
                          >
                            {GameIcon && <GameIcon className={`h-4 w-4 shrink-0 ${isSelected ? "text-white" : "text-primary"}`} />}
                            <span className="truncate flex-grow">{g.name}</span>
                            {isSelected && <Check className="h-4 w-4 text-white shrink-0" />}
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-3 text-center text-text-dim text-[12.5px] italic">
                        No games found.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {!hideGameDropdown && onAddGame && (
            <button
              type="button"
              onClick={onAddGame}
              className="w-11 h-11 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-text-dim hover:text-text cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-primary"
              title="Add Custom Game"
            >
              <Plus className="h-5 w-5" />
            </button>
          )}
        </div>
      )}

      {/* 2. Scoreboard Panel */}
      {isHeadToHead && compA && compB ? (
        /* Dual Column Layout (Head-to-head) */
        <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-4 relative overflow-hidden">
          <div className="flex items-center justify-between gap-2">
            {/* Left Competitor (Side A) */}
            <div className="flex-1 flex flex-col items-center text-center">
              <div className="mb-2">
                <PlayerAvatar
                  id={compA.id}
                  name={compA.name}
                  players={compA.members}
                  size="sm"
                />
              </div>
              <span className="font-semibold text-[13px] text-text-dim line-clamp-1 mb-1">
                {compA.name}
              </span>
              <motion.div
                key={`${activeGameIndex}-${compA.id}-${scoreA}`}
                animate={shouldReduceMotion ? {} : { scale: [1, 1.15, 1] }}
                transition={{ duration: 0.12 }}
                className="font-display text-[44px] font-bold tracking-tight select-none text-text tabular-nums"
              >
                {scoreA}
              </motion.div>
            </div>

            {/* Middle Divider */}
            <div className="w-[1px] self-stretch bg-border my-2" />

            {/* Right Competitor (Side B) */}
            <div className="flex-1 flex flex-col items-center text-center">
              <div className="mb-2">
                <PlayerAvatar
                  id={compB.id}
                  name={compB.name}
                  players={compB.members}
                  size="sm"
                />
              </div>
              <span className="font-semibold text-[13px] text-text-dim line-clamp-1 mb-1">
                {compB.name}
              </span>
              <motion.div
                key={`${activeGameIndex}-${compB.id}-${scoreB}`}
                animate={shouldReduceMotion ? {} : { scale: [1, 1.15, 1] }}
                transition={{ duration: 0.12 }}
                className="font-display text-[44px] font-bold tracking-tight select-none text-text tabular-nums"
              >
                {scoreB}
              </motion.div>
            </div>
          </div>

          {/* Momentum Bar */}
          <div className="flex flex-col gap-1.5 mt-1 border-t border-border/40 pt-3">
            <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden flex">
              <motion.div
                animate={{ width: `${pctA}%` }}
                transition={
                  shouldReduceMotion
                    ? { duration: 0 }
                    : { duration: 0.25, ease: "easeInOut" }
                }
                className="bg-accent h-full"
              />
              <motion.div
                className="bg-primary h-full flex-1"
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-text-faint font-semibold tracking-wider font-mono">
              <span>MOMENTUM</span>
              <span>{getMomentumLabel()}</span>
            </div>
          </div>
        </div>
      ) : (
        /* Multi-Competitor Grid Layout (Free For All) */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {competitors.map((comp) => {
            const score = scores[comp.id] || 0;
            return (
              <div
                key={comp.id}
                className="bg-surface border border-border rounded-xl p-4 flex flex-col items-center gap-3"
              >
                <div className="flex items-center gap-3 w-full">
                  <PlayerAvatar
                    id={comp.id}
                    name={comp.name}
                    players={comp.members}
                    size="sm"
                  />
                  <div className="flex-grow min-w-0">
                    <div className="font-bold text-[14px] text-text truncate">
                      {comp.name}
                    </div>
                  </div>
                  <motion.div
                    key={`${activeGameIndex}-${comp.id}-${score}`}
                    animate={shouldReduceMotion ? {} : { scale: [1, 1.15, 1] }}
                    transition={{ duration: 0.12 }}
                    className="font-display text-[32px] font-bold text-text tabular-nums"
                  >
                    {score}
                  </motion.div>
                </div>

                {/* Score adjusting buttons for FFA */}
                <div className="flex gap-1.5 w-full mt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => onScoreAdjust(comp.id, -1)}
                    className="flex-1 border-border bg-surface-2 hover:bg-surface-3 py-4 text-[12px]"
                  >
                    -1
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => onScoreAdjust(comp.id, 1)}
                    className="flex-1 bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 py-4 font-bold text-[12px]"
                  >
                    +1
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => onScoreAdjust(comp.id, 2)}
                    className="flex-1 border-border bg-surface-2 hover:bg-surface-3 py-4 text-[12px]"
                  >
                    +2
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={() => onScoreAdjust(comp.id, 3)}
                    className="flex-1 border-border bg-surface-2 hover:bg-surface-3 py-4 text-[12px]"
                  >
                    +3
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Live Scoring Adjustment Controls (Head-to-head circular + chip panel) */}
      {isHeadToHead && compA && compB && (
        <div className="flex gap-4 my-2">
          {/* Controls Side A (Left) */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => onScoreAdjust(compA!.id, 1)}
              className="w-14 h-14 rounded-full bg-gradient-to-br from-[#F2B84B] to-[#C98F27] border-none text-[#231702] font-display text-[20px] font-bold flex items-center justify-center cursor-pointer shadow-lg shadow-accent/20 transition-transform active:scale-95"
              aria-label={`Add 1 point for ${compA.name}`}
            >
              +1
            </button>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onScoreAdjust(compA!.id, 2)}
                className="bg-surface-2 border border-border text-text-dim rounded-full text-[11px] font-semibold font-mono w-9 h-7 flex items-center justify-center hover:bg-surface-3 cursor-pointer"
              >
                +2
              </button>
              <button
                type="button"
                onClick={() => onScoreAdjust(compA!.id, 3)}
                className="bg-surface-2 border border-border text-text-dim rounded-full text-[11px] font-semibold font-mono w-9 h-7 flex items-center justify-center hover:bg-surface-3 cursor-pointer"
              >
                +3
              </button>
              <button
                type="button"
                onClick={() => onScoreAdjust(compA!.id, -1)}
                className="bg-surface-2 border border-border text-text-dim rounded-full w-9 h-7 flex items-center justify-center hover:bg-surface-3 cursor-pointer"
                aria-label={`Subtract 1 point for ${compA.name}`}
              >
                <Minus className="h-3 w-3 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Controls Side B (Right) */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => onScoreAdjust(compB!.id, 1)}
              className="w-14 h-14 rounded-full bg-gradient-to-br from-[#7C6FF2] to-[#6257D6] border-none text-white font-display text-[20px] font-bold flex items-center justify-center cursor-pointer shadow-lg shadow-primary/20 transition-transform active:scale-95"
              aria-label={`Add 1 point for ${compB.name}`}
            >
              +1
            </button>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onScoreAdjust(compB!.id, 2)}
                className="bg-surface-2 border border-border text-text-dim rounded-full text-[11px] font-semibold font-mono w-9 h-7 flex items-center justify-center hover:bg-surface-3 cursor-pointer"
              >
                +2
              </button>
              <button
                type="button"
                onClick={() => onScoreAdjust(compB!.id, 3)}
                className="bg-surface-2 border border-border text-text-dim rounded-full text-[11px] font-semibold font-mono w-9 h-7 flex items-center justify-center hover:bg-surface-3 cursor-pointer"
              >
                +3
              </button>
              <button
                type="button"
                onClick={() => onScoreAdjust(compB!.id, -1)}
                className="bg-surface-2 border border-border text-text-dim rounded-full w-9 h-7 flex items-center justify-center hover:bg-surface-3 cursor-pointer"
                aria-label={`Subtract 1 point for ${compB.name}`}
              >
                <Minus className="h-3 w-3 stroke-[2.5]" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Action CTA Button */}
      <Button
        onClick={onSave}
        className="w-full mt-2 bg-surface-2 border border-border hover:bg-surface-3 text-text py-6 font-bold flex items-center justify-center gap-2"
      >
        <Check className="h-4 w-4 text-green" /> {saveButtonText}
      </Button>
    </div>
  );
};
