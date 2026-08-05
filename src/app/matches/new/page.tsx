"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/Toast";
import { TeamPairSelector } from "@/components/ui/TeamPairSelector";
import { ScoreConsole } from "@/components/ui/ScoreConsole";
import dataService, { ClientPlayer, ClientGame, ClientTeam } from "@/lib/dataService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getGameIcon as getIcon } from "@/lib/iconMap";

const GAME_EMOJIS = ["🎮", "🎲", "🏓", "🏎️", "♟️", "🧩", "⚽", "🏀", "🃏", "🎯", "🎳", "👾"];

export default function RecordMatchPage() {
  const router = useRouter();
  const { showToast } = useToast();

  // Master Data
  const [players, setPlayers] = useState<ClientPlayer[]>([]);
  const [games, setGames] = useState<ClientGame[]>([]);
  const [teams, setTeams] = useState<ClientTeam[]>([]);

  // Wizard Steps: 1 (Choose Participants), 2 (Scoring Console)
  const [step, setStep] = useState(1);

  // Selected parameters
  const [matchMode, setMatchMode] = useState<"Solo" | "Free For All" | "Team Match">("Team Match");
  
  // Selections
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [teamAPlayers, setTeamAPlayers] = useState<string[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<string[]>([]);

  // Scoring Console active state
  const [activeGameIndex, setActiveGameIndex] = useState(0);
  const [gameScores, setGameScores] = useState<Record<string, Record<string, number>>>({});

  // Inline Add Game Modal
  const [isGameDialogOpen, setIsGameDialogOpen] = useState(false);
  const [newGameName, setNewGameName] = useState("");
  const [newGameIcon, setNewGameIcon] = useState("🎮");

  // Track if initial draft restoration has finished
  const [isDraftRestored, setIsDraftRestored] = useState(false);

  // Subscribe to dataService updates
  useEffect(() => {
    const loadMatchData = () => {
      setPlayers(dataService.getPlayers());
      setGames(dataService.getGames());
      setTeams(dataService.getTeams());
    };
    loadMatchData();
    const unsubscribe = dataService.subscribe(loadMatchData);
    return unsubscribe;
  }, []);

  // Restore Draft Match Session on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem("scoresquad_quickmatch_draft");
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        if (draft.matchMode) setMatchMode(draft.matchMode);
        if (draft.selectedPlayerIds) setSelectedPlayerIds(draft.selectedPlayerIds);
        if (draft.selectedTeamIds) setSelectedTeamIds(draft.selectedTeamIds);
        if (draft.gameScores) setGameScores(draft.gameScores);
        if (draft.activeGameIndex !== undefined) setActiveGameIndex(draft.activeGameIndex);
        if (draft.step) setStep(draft.step);
        showToast("Resumed draft match session!", "info");
      } catch (e) {
        console.error("Failed to parse quick match draft", e);
      }
    }
    setIsDraftRestored(true);
  }, []);

  // Save draft match state to localStorage whenever it changes (after initial restore)
  useEffect(() => {
    if (!isDraftRestored) return;

    if (step > 1 || selectedPlayerIds.length > 0 || selectedTeamIds.length > 0) {
      const draftData = {
        matchMode,
        selectedPlayerIds,
        selectedTeamIds,
        gameScores,
        activeGameIndex,
        step,
      };
      localStorage.setItem("scoresquad_quickmatch_draft", JSON.stringify(draftData));
    } else {
      localStorage.removeItem("scoresquad_quickmatch_draft");
    }
  }, [matchMode, selectedPlayerIds, selectedTeamIds, gameScores, activeGameIndex, step, isDraftRestored]);

  const handleModeChange = (mode: "Solo" | "Free For All" | "Team Match") => {
    setMatchMode(mode);
    setSelectedPlayerIds([]);
    setSelectedTeamIds([]);
    setTeamAPlayers([]);
    setTeamBPlayers([]);
  };

  const handlePlayerToggle = (pId: string) => {
    setSelectedPlayerIds((prev) => {
      if (prev.includes(pId)) {
        return prev.filter((id) => id !== pId);
      }
      return [...prev, pId];
    });
  };

  const handleTeamToggle = (tId: string) => {
    if (selectedTeamIds.includes(tId)) {
      setSelectedTeamIds(selectedTeamIds.filter((id) => id !== tId));
    } else {
      if (selectedTeamIds.length >= 2) {
        showToast("Maximum of 2 teams can be selected.", "info");
        return;
      }
      setSelectedTeamIds([...selectedTeamIds, tId]);
    }
  };

  const handleCreateTeamPair = async (p1Id: string, p2Id: string) => {
    try {
      const newTeam = await dataService.getOrCreateTeam([p1Id, p2Id]);
      setTeams(dataService.getTeams());
      setSelectedTeamIds((prev) => {
        if (prev.includes(newTeam._id)) return prev;
        if (prev.length >= 2) {
          return [prev[1], newTeam._id];
        }
        return [...prev, newTeam._id];
      });
      showToast("Team pair created and selected!", "success");
    } catch (err) {
      showToast("Failed to create team combination", "error");
    }
  };

  const handleProceedToScores = () => {
    if (matchMode === "Team Match") {
      if (selectedTeamIds.length !== 2) {
        showToast("Please select exactly 2 team pairs.", "error");
        return;
      }
      const teamA = teams.find((t) => t._id === selectedTeamIds[0]);
      const teamB = teams.find((t) => t._id === selectedTeamIds[1]);
      if (!teamA || !teamB) return;
      setTeamAPlayers(teamA.members);
      setTeamBPlayers(teamB.members);
      setSelectedPlayerIds([...teamA.members, ...teamB.members]);
    } else {
      if (matchMode === "Solo" && selectedPlayerIds.length !== 2) {
        showToast("Please select exactly 2 players for head-to-head.", "error");
        return;
      }
      if (matchMode === "Free For All" && selectedPlayerIds.length < 2) {
        showToast("Please select at least 2 players.", "error");
        return;
      }
    }

    // Initialize scores map for each catalog game if not already present
    setGameScores((prev) => {
      const initialGameScores = { ...prev };
      games.forEach((game) => {
        if (!initialGameScores[game._id]) {
          const scoresMap: Record<string, number> = {};
          if (matchMode === "Team Match") {
            scoresMap[selectedTeamIds[0]] = 0;
            scoresMap[selectedTeamIds[1]] = 0;
          } else {
            selectedPlayerIds.forEach((pId) => {
              scoresMap[pId] = 0;
            });
          }
          initialGameScores[game._id] = scoresMap;
        }
      });
      return initialGameScores;
    });

    setActiveGameIndex(0);
    setStep(2);
  };

  const adjustScore = (gameId: string, competitorId: string, amount: number) => {
    setGameScores((prev) => {
      const currentGameScores = prev[gameId] || {};
      const current = currentGameScores[competitorId] || 0;
      const next = Math.max(0, current + amount);
      return {
        ...prev,
        [gameId]: {
          ...currentGameScores,
          [competitorId]: next,
        },
      };
    });
  };

  const getWinnerIds = (scoreMap: Record<string, number>) => {
    let maxScore = -1;
    let winners: string[] = [];

    Object.entries(scoreMap).forEach(([id, val]) => {
      if (val > maxScore) {
        maxScore = val;
        winners = [id];
      } else if (val === maxScore) {
        winners.push(id);
      }
    });

    return winners;
  };

  const handleSaveMatch = async () => {
    if (games.length === 0) return;

    // Filter games to save matches only for:
    // 1. The currently selected active game
    // 2. Any other games that have non-zero scores (entered by the user)
    const matchesToSave = games
      .map((game, index) => {
        const scoreMap = gameScores[game._id] || {};
        const winners = getWinnerIds(scoreMap);
        const hasZeroScores = Object.values(scoreMap).every((value) => value === 0) && Object.keys(scoreMap).length > 0;
        const hasSomePoints = Object.values(scoreMap).some((value) => value > 0);

        return {
          game,
          scoreMap,
          winners,
          hasZeroScores,
          hasSomePoints,
          isCurrentActive: index === activeGameIndex,
        };
      })
      .filter((match) => match.isCurrentActive || match.hasSomePoints);

    if (matchesToSave.length === 0) return;

    const shouldConfirmZeroScores = matchesToSave.some((match) => match.hasZeroScores);

    if (shouldConfirmZeroScores && !window.confirm("Some scores are 0. Save matches anyway?")) {
      return;
    }

    try {
      const teamA = matchMode === "Team Match" ? await dataService.getOrCreateTeam(teamAPlayers) : null;
      const teamB = matchMode === "Team Match" ? await dataService.getOrCreateTeam(teamBPlayers) : null;

      const roundId = "round-" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

      const savePromises = matchesToSave.map(({ game, scoreMap, winners }) => {
        if (matchMode === "Team Match" && teamA && teamB) {
          return dataService.saveMatch({
            roundId,
            game: game._id,
            matchType: "Team Match",
            players: selectedPlayerIds,
            teams: [teamA._id, teamB._id],
            scores: scoreMap,
            winners,
            isTournamentMatch: false,
          });
        } else {
          return dataService.saveMatch({
            roundId,
            game: game._id,
            matchType: matchMode,
            players: selectedPlayerIds,
            teams: [],
            scores: scoreMap,
            winners,
            isTournamentMatch: false,
          });
        }
      });
      
      await Promise.all(savePromises);

      // Clean up localStorage draft
      localStorage.removeItem("scoresquad_quickmatch_draft");

      showToast(`Recorded ${matchesToSave.length} match${matchesToSave.length === 1 ? "" : "es"} successfully!`, "success");
      router.push("/stats?tab=history");
    } catch (err) {
      showToast("Failed to save match data", "error");
    }
  };

  const handleAddCustomGameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGameName.trim()) {
      showToast("Game name is required", "error");
      return;
    }

    const isDuplicate = games.some(
      (g) => g.name.toLowerCase() === newGameName.trim().toLowerCase()
    );

    if (isDuplicate) {
      showToast("Game with this name already exists", "error");
      return;
    }

    try {
      const addedGame = await dataService.saveGame({
        name: newGameName.trim(),
        icon: newGameIcon,
      });
      showToast(`Game ${addedGame.name} added and selected!`, "success");
      
      setNewGameName("");
      setNewGameIcon("🎮");
      setIsGameDialogOpen(false);

      // Refresh games
      const updatedGames = dataService.getGames();
      setGames(updatedGames);

      // Initialize scores map for the new game
      setGameScores((prev) => {
        const scoresMap: Record<string, number> = {};
        if (matchMode === "Team Match") {
          if (selectedTeamIds[0]) scoresMap[selectedTeamIds[0]] = 0;
          if (selectedTeamIds[1]) scoresMap[selectedTeamIds[1]] = 0;
        } else {
          selectedPlayerIds.forEach((pId) => {
            scoresMap[pId] = 0;
          });
        }
        return {
          ...prev,
          [addedGame._id]: scoresMap,
        };
      });

      // Select newly added game
      const newIdx = updatedGames.findIndex((g) => g._id === addedGame._id);
      if (newIdx !== -1) {
        setActiveGameIndex(newIdx);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to add game", "error");
    }
  };

  // Build competitors schema for ScoreConsole
  const getConsoleCompetitors = () => {
    if (matchMode === "Team Match") {
      return selectedTeamIds.map((tId) => {
        const teamObj = teams.find((t) => t._id === tId) || { name: "Team", members: [] };
        return {
          id: tId,
          name: teamObj.name,
          members: teamObj.members.map((pId) => ({
            id: pId,
            name: players.find((p) => p._id === pId)?.name || "Player",
          })),
        };
      });
    } else {
      return selectedPlayerIds.map((pId) => {
        const pObj = players.find((p) => p._id === pId) || { name: "Player" };
        return {
          id: pId,
          name: pObj.name,
        };
      });
    }
  };

  // If there are absolutely no games in the catalog, prompt the user to add one first.
  if (dataService.isLoaded && games.length === 0) {
    return (
      <div className="flex flex-col gap-6 max-w-[600px] mx-auto py-8">
        <div className="p-8 text-center text-text-dim border border-dashed border-border rounded-xl bg-surface/50">
          <p className="mb-4 text-[14px]">No games in your catalog yet. You need at least one game to record scores.</p>
          <Button onClick={() => router.push("/players")}>Manage Game Catalog</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-[600px] mx-auto">
      {/* Wizard Header breadcrumbs */}
      <div className="flex items-center gap-3 sticky top-0 bg-background/90 backdrop-blur-xs py-2 z-10">
        <button
          onClick={() => {
            if (step > 1) setStep(step - 1);
            else router.push("/");
          }}
          className="w-9 h-9 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-dim hover:text-text cursor-pointer focus:outline-none"
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <div className="flex-grow min-w-0">
          <span className="mono-label text-text-faint block text-[10px]">
            STEP {step} OF 2
          </span>
          <h1 className="font-display font-bold text-[16px] text-text truncate mt-0.5">
            {step === 1 && "Choose participants"}
            {step === 2 && "Scoring console"}
          </h1>
        </div>
        {/* Progress dots */}
        <div className="flex gap-1.5">
          {[1, 2].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                step === s ? "w-6 bg-primary" : step > s ? "w-2 bg-success" : "w-2 bg-border"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step 1: Choose Participants */}
      {step === 1 && (
        <div className="flex flex-col gap-4 fade-in">
          <TeamPairSelector
            players={players}
            teams={teams}
            selectedPlayerIds={selectedPlayerIds}
            selectedTeamIds={selectedTeamIds}
            matchMode={matchMode}
            onModeChange={handleModeChange}
            onPlayerToggle={handlePlayerToggle}
            onTeamToggle={handleTeamToggle}
            onCreateTeamPair={handleCreateTeamPair}
          />

          <Button
            onClick={handleProceedToScores}
            disabled={
              matchMode === "Team Match"
                ? selectedTeamIds.length !== 2
                : selectedPlayerIds.length < 2
            }
            className="w-full py-6 bg-primary text-white hover:bg-primary-hover font-bold text-[14px] mt-4 flex items-center justify-center gap-1.5"
          >
            Start scoring <ChevronRight className="h-4.5 w-4.5 stroke-[2]" />
          </Button>
        </div>
      )}

      {/* Step 2: Scoring Console */}
      {step === 2 && games.length > 0 && (
        <div className="fade-in">
          <ScoreConsole
            games={games}
            activeGameIndex={activeGameIndex}
            onGameIndexChange={setActiveGameIndex}
            competitors={getConsoleCompetitors()}
            scores={gameScores[games[activeGameIndex]._id] || {}}
            onScoreAdjust={(compId, amount) => adjustScore(games[activeGameIndex]._id, compId, amount)}
            onSave={handleSaveMatch}
            saveButtonText="Save & finish round"
            onAddGame={() => setIsGameDialogOpen(true)}
          />
        </div>
      )}

      {/* Inline Custom Game Modal */}
      <Dialog open={isGameDialogOpen} onOpenChange={setIsGameDialogOpen}>
        <DialogContent className="bg-surface border-border sm:max-w-[420px] rounded-xl p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="font-display font-bold text-[18px] text-text">
              Add Custom Game
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddCustomGameSubmit} className="flex flex-col gap-4">
            <div>
              <span className="mono-label text-text-dim block mb-1">Game Name</span>
              <input
                type="text"
                placeholder="e.g. Table Tennis"
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                className="w-full h-11 bg-surface-2 border border-border rounded-md px-3 text-[14px] text-text font-semibold outline-none focus:ring-1 focus:ring-primary"
                maxLength={30}
                required
              />
            </div>
            <div>
              <span className="mono-label text-text-dim block mb-1.5">Select Game Icon</span>
              <div className="grid grid-cols-6 gap-2">
                {GAME_EMOJIS.map((emoji) => {
                  const IconComponent = getIcon(emoji);
                  return (
                    <button
                      key={emoji}
                      type="button"
                      className={`h-11 bg-surface-2 border border-border rounded-md flex items-center justify-center cursor-pointer transition-all hover:bg-surface-3 ${
                        newGameIcon === emoji ? "border-primary/60 bg-[#7C6FF2]/10 text-primary" : "text-text-dim"
                      }`}
                      onClick={() => setNewGameIcon(emoji)}
                    >
                      <IconComponent className="h-[18px] w-[18px]" />
                    </button>
                  );
                })}
              </div>
            </div>
            <Button type="submit" className="w-full mt-2 py-6 bg-primary text-white hover:bg-primary-hover font-bold">
              Add Game to Console
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
