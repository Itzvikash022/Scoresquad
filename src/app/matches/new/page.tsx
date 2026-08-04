"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/Toast";
import { GameSelectGrid } from "@/components/ui/GameSelectGrid";
import { TeamPairSelector } from "@/components/ui/TeamPairSelector";
import { ScoreConsole } from "@/components/ui/ScoreConsole";
import dataService, { ClientPlayer, ClientGame, ClientTeam } from "@/lib/dataService";

export default function RecordMatchPage() {
  const router = useRouter();
  const { showToast } = useToast();

  // Master Data
  const [players, setPlayers] = useState<ClientPlayer[]>([]);
  const [games, setGames] = useState<ClientGame[]>([]);
  const [teams, setTeams] = useState<ClientTeam[]>([]);

  // Wizard Steps: 1 (Pick Game), 2 (Pick Participants), 3 (Scoring Console)
  const [step, setStep] = useState(1);

  // Selected parameters
  const [selectedGames, setSelectedGames] = useState<ClientGame[]>([]);
  const [matchMode, setMatchMode] = useState<"Solo" | "Free For All" | "Team Match">("Solo");
  
  // Selections
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [teamAPlayers, setTeamAPlayers] = useState<string[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<string[]>([]);

  // Scoring Console active state
  const [activeGameIndex, setActiveGameIndex] = useState(0);
  const [gameScores, setGameScores] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    setPlayers(dataService.getPlayers());
    setGames(dataService.getGames());
    setTeams(dataService.getTeams());
  }, []);

  const toggleGameSelection = (game: ClientGame) => {
    setSelectedGames((prev) => {
      const isAlreadySelected = prev.some((g) => g._id === game._id);
      if (isAlreadySelected) {
        return prev.filter((g) => g._id !== game._id);
      }
      return [...prev, game];
    });
  };

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

    // Initialize scores map for each selected game
    const initialGameScores: Record<string, Record<string, number>> = {};
    selectedGames.forEach((game) => {
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
    });

    setGameScores(initialGameScores);
    setActiveGameIndex(0);
    setStep(3);
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
    if (selectedGames.length === 0) return;

    const matchesToSave = selectedGames.map((game) => {
      const scoreMap = gameScores[game._id] || {};
      const winners = getWinnerIds(scoreMap);
      const hasZeroScores = Object.values(scoreMap).every((value) => value === 0) && Object.keys(scoreMap).length > 0;

      return {
        game,
        scoreMap,
        winners,
        hasZeroScores,
      };
    });

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

      showToast(`Recorded ${matchesToSave.length} match${matchesToSave.length === 1 ? "" : "es"} successfully!`, "success");
      router.push("/stats?tab=history");
    } catch (err) {
      showToast("Failed to save match data", "error");
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
            STEP {step} OF 3
          </span>
          <h1 className="font-display font-bold text-[16px] text-text truncate mt-0.5">
            {step === 1 && "Pick your games"}
            {step === 2 && "Choose participants"}
            {step === 3 && "Scoring console"}
          </h1>
        </div>
        {/* Progress dots */}
        <div className="flex gap-1.5">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all ${
                step === s ? "w-6 bg-primary" : step > s ? "w-2 bg-success" : "w-2 bg-border"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step 1: Game Catalog Selector */}
      {step === 1 && (
        <div className="flex flex-col gap-4 fade-in">
          <p className="text-text-dim text-[13px] leading-relaxed">
            Tap to select one or more games for this match. Selected games play back-to-back in one round.
          </p>
          
          <GameSelectGrid
            games={games}
            selectedGames={selectedGames}
            onToggle={toggleGameSelection}
          />

          {games.length === 0 && (
            <div className="p-8 text-center text-text-dim border border-dashed border-border rounded-xl bg-surface/50">
              <p className="mb-3 text-[13.5px]">No games in your catalog yet.</p>
              <Button onClick={() => router.push("/players")}>Manage Game Catalog</Button>
            </div>
          )}

          {selectedGames.length > 0 && (
            <Button
              onClick={() => setStep(2)}
              className="w-full py-6 bg-primary text-white hover:bg-primary-hover font-bold text-[14px] mt-4 flex items-center justify-center gap-1.5"
            >
              Continue <ChevronRight className="h-4.5 w-4.5 stroke-[2]" />
            </Button>
          )}
        </div>
      )}

      {/* Step 2: Choose Participants */}
      {step === 2 && (
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

      {/* Step 3: Scoring Console */}
      {step === 3 && selectedGames.length > 0 && (
        <div className="fade-in">
          <ScoreConsole
            games={selectedGames}
            activeGameIndex={activeGameIndex}
            onGameIndexChange={setActiveGameIndex}
            competitors={getConsoleCompetitors()}
            scores={gameScores[selectedGames[activeGameIndex]._id] || {}}
            onScoreAdjust={(compId, amount) => adjustScore(selectedGames[activeGameIndex]._id, compId, amount)}
            onSave={
              activeGameIndex < selectedGames.length - 1
                ? () => setActiveGameIndex(activeGameIndex + 1)
                : handleSaveMatch
            }
            saveButtonText={
              activeGameIndex < selectedGames.length - 1
                ? "Save game & next"
                : "Save & finish round"
            }
          />
        </div>
      )}
    </div>
  );
}
