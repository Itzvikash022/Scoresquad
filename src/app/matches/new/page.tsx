"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Gamepad, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/Toast";
import { TeamPairSelector } from "@/components/ui/TeamPairSelector";
import { ScoreConsole } from "@/components/ui/ScoreConsole";
import { GameSelectGrid } from "@/components/ui/GameSelectGrid";
import dataService, { ClientPlayer, ClientGame, ClientTeam, ClientMatch } from "@/lib/dataService";
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
  const [dbMatches, setDbMatches] = useState<ClientMatch[]>([]);

  // Wizard Steps: 1 (Pick Participants / Settings), 2 (Scoring Console)
  const [step, setStep] = useState(1);

  // Settings
  const [targetGamesCount, setTargetGamesCount] = useState(5);
  const [preSelectGames, setPreSelectGames] = useState(false);
  const [selectedGames, setSelectedGames] = useState<ClientGame[]>([]);

  // Selected parameters
  const [matchMode, setMatchMode] = useState<"Solo" | "Free For All" | "Team Match">("Team Match");
  
  // Selections
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [teamAPlayers, setTeamAPlayers] = useState<string[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<string[]>([]);

  // Scoring Console active state
  const [roundId, setRoundId] = useState("");
  const [activeGameIndex, setActiveGameIndex] = useState(0);
  const [gameScores, setGameScores] = useState<Record<string, Record<string, number>>>({});

  // Inline Add Game Modal
  const [isGameDialogOpen, setIsGameDialogOpen] = useState(false);
  const [newGameName, setNewGameName] = useState("");
  const [newGameIcon, setNewGameIcon] = useState("🎮");

  // Subscribe to dataService updates
  useEffect(() => {
    const loadMatchData = () => {
      setPlayers(dataService.getPlayers());
      setGames(dataService.getGames());
      setTeams(dataService.getTeams());
      setDbMatches(dataService.getMatches());
    };
    loadMatchData();
    const unsubscribe = dataService.subscribe(loadMatchData);
    return unsubscribe;
  }, []);

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

  const toggleGameSelection = (game: ClientGame) => {
    setSelectedGames((prev) => {
      const isAlreadySelected = prev.some((g) => g._id === game._id);
      if (isAlreadySelected) {
        return prev.filter((g) => g._id !== game._id);
      }
      return [...prev, game];
    });
  };

  const handleRandomizeGames = () => {
    if (games.length === 0) return;
    const shuffled = [...games].sort(() => 0.5 - Math.random());
    const count = Math.min(targetGamesCount, games.length);
    setSelectedGames(shuffled.slice(0, count));
    showToast(`Randomly selected ${count} games!`, "success");
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

  const handleProceedToScores = async () => {
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

    if (preSelectGames && selectedGames.length === 0) {
      showToast("Please pre-select at least 1 game.", "error");
      return;
    }

    // Generate round ID for this new match
    const initialRoundId = "round-" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    setRoundId(initialRoundId);

    // Initialize scores map
    const initialGameScores: Record<string, Record<string, number>> = {};
    
    if (preSelectGames) {
      // Save placeholder draft matches for all pre-selected games
      const savePromises = selectedGames.map((game) => {
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

        return dataService.saveMatch({
          roundId: initialRoundId,
          game: game._id,
          matchType: matchMode,
          players: selectedPlayerIds,
          teams: matchMode === "Team Match" ? selectedTeamIds : [],
          scores: scoresMap,
          winners: [],
          isTournamentMatch: false,
          isDraft: true,
          targetGamesCount: selectedGames.length,
          preSelectGames: true,
        });
      });
      await Promise.all(savePromises);
    } else {
      // Save a single placeholder match for the first catalog game
      const firstGame = games[0];
      const scoresMap: Record<string, number> = {};
      if (matchMode === "Team Match") {
        scoresMap[selectedTeamIds[0]] = 0;
        scoresMap[selectedTeamIds[1]] = 0;
      } else {
        selectedPlayerIds.forEach((pId) => {
          scoresMap[pId] = 0;
        });
      }
      initialGameScores[firstGame._id] = scoresMap;

      await dataService.saveMatch({
        roundId: initialRoundId,
        game: firstGame._id,
        matchType: matchMode,
        players: selectedPlayerIds,
        teams: matchMode === "Team Match" ? selectedTeamIds : [],
        scores: {}, // placeholder match has empty scores
        winners: [],
        isTournamentMatch: false,
        isDraft: true,
        targetGamesCount: Number(targetGamesCount),
        preSelectGames: false,
      });
    }

    setGameScores(initialGameScores);
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

  const getFullyPopulatedScores = (gameId: string) => {
    const scoreMap = { ...(gameScores[gameId] || {}) };
    if (matchMode === "Team Match") {
      selectedTeamIds.forEach((tId) => {
        if (scoreMap[tId] === undefined) {
          scoreMap[tId] = 0;
        }
      });
    } else {
      selectedPlayerIds.forEach((pId) => {
        if (scoreMap[pId] === undefined) {
          scoreMap[pId] = 0;
        }
      });
    }
    return scoreMap;
  };

  const handleRecordActiveGame = async (): Promise<boolean> => {
    const activeGame = preSelectGames ? selectedGames[activeGameIndex] : games[activeGameIndex];
    if (!activeGame) return false;

    const scoreMap = getFullyPopulatedScores(activeGame._id);
    const winners = getWinnerIds(scoreMap);

    const isZeroZero = Object.values(scoreMap).every((val) => val === 0);
    if (isZeroZero) {
      if (!window.confirm(`The score for ${activeGame.name} is 0 - 0. Do you want to save it anyway?`)) {
        return false;
      }
    }

    try {
      const teamA = matchMode === "Team Match" ? await dataService.getOrCreateTeam(teamAPlayers) : null;
      const teamB = matchMode === "Team Match" ? await dataService.getOrCreateTeam(teamBPlayers) : null;

      // Find if we already have a match recorded for this game in the round
      const existingMatch = dbMatches.find((m) => m.roundId === roundId && m.game === activeGame._id);

      await dataService.saveMatch({
        _id: existingMatch?._id,
        roundId,
        game: activeGame._id,
        matchType: matchMode,
        players: selectedPlayerIds,
        teams: matchMode === "Team Match" && teamA && teamB ? [teamA._id, teamB._id] : [],
        scores: scoreMap,
        winners,
        isTournamentMatch: false,
        isDraft: true,
        targetGamesCount: preSelectGames ? selectedGames.length : Number(targetGamesCount),
        preSelectGames,
      });

      showToast(`Game score recorded to draft!`, "success");
      return true;
    } catch (err) {
      showToast("Failed to record game score", "error");
      return false;
    }
  };

  const handleFinalizeMatch = async () => {
    // 1. Record current active game scores first
    const savedActive = await handleRecordActiveGame();
    if (!savedActive) return;

    const roundMatches = dbMatches.filter((m) => m.roundId === roundId);
    
    // Filter out placeholders that have empty scores map (we don't want them saved)
    const validMatches = roundMatches.filter((m) => m.scores && Object.keys(m.scores).length > 0);
    const placeholderMatches = roundMatches.filter((m) => !m.scores || Object.keys(m.scores).length === 0);

    if (validMatches.length === 0) {
      showToast("Cannot finalize a match with 0 games played.", "error");
      return;
    }

    try {
      // 2. Finalize all valid matches by removing `isDraft`
      const finalizePromises = validMatches.map((m) => {
        return dataService.saveMatch({
          ...m,
          isDraft: false,
        });
      });

      // 3. Delete any empty placeholder matches
      const deletePromises = placeholderMatches.map((m) => {
        return dataService.deleteMatch(m._id);
      });

      await Promise.all([...finalizePromises, ...deletePromises]);

      showToast(`Match finalized and statistics updated!`, "success");
      router.push("/stats?tab=history");
    } catch (err) {
      showToast("Failed to finalize match", "error");
    }
  };

  const handleDiscardDraft = async () => {
    if (window.confirm("Are you sure you want to discard this draft match and lose all current scores?")) {
      try {
        await dataService.deleteRound(roundId);
        showToast("Draft match discarded.", "info");
        
        // Reset state
        setRoundId("");
        setGameScores({});
        setActiveGameIndex(0);
        setStep(1);
      } catch (err) {
        showToast("Failed to discard draft", "error");
      }
    }
  };

  const handleResumeDraft = (draft: any) => {
    setRoundId(draft.roundId);
    setMatchMode(draft.matchType);
    setTargetGamesCount(draft.targetGamesCount);
    
    const firstMatch = draft.matches[0];
    const isPreSelected = firstMatch.preSelectGames || false;
    setPreSelectGames(isPreSelected);
    
    if (isPreSelected) {
      const gameIds = draft.matches.map((m: any) => m.game);
      const uniqueGameIds = Array.from(new Set(gameIds)) as string[];
      const preselected = games.filter((g) => uniqueGameIds.includes(g._id));
      setSelectedGames(preselected);
    }
    
    setSelectedPlayerIds(draft.players);
    setSelectedTeamIds(draft.teams);
    
    if (draft.matchType === "Team Match" && draft.teams.length === 2) {
      const teamA = teams.find((t) => t._id === draft.teams[0]);
      const teamB = teams.find((t) => t._id === draft.teams[1]);
      if (teamA && teamB) {
        setTeamAPlayers(teamA.members);
        setTeamBPlayers(teamB.members);
      }
    }

    const scoresMap: Record<string, Record<string, number>> = {};
    draft.matches.forEach((m: any) => {
      if (m.scores) {
        // Mongoose maps can return values differently, copy values properly
        const scoresObj: Record<string, number> = {};
        Object.entries(m.scores).forEach(([k, v]) => {
          scoresObj[k] = Number(v);
        });
        scoresMap[m.game] = scoresObj;
      }
    });
    setGameScores(scoresMap);
    
    setStep(2);
    showToast("Resumed draft match session!", "success");
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
      showToast(`Game ${addedGame.name} added!`, "success");
      
      setNewGameName("");
      setNewGameIcon("🎮");
      setIsGameDialogOpen(false);

      // Refresh games list
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

  // Helper to compile draft rounds
  const getDraftRounds = () => {
    const drafts = dbMatches.filter((m) => m.isDraft);
    const groups: Record<string, ClientMatch[]> = {};
    drafts.forEach((d) => {
      const rId = d.roundId || d._id;
      if (!groups[rId]) groups[rId] = [];
      groups[rId].push(d);
    });
    return Object.entries(groups).map(([rId, roundMatches]) => {
      const first = roundMatches[0];
      const playedMatches = roundMatches.filter((m) => m.scores && Object.keys(m.scores).length > 0);
      return {
        roundId: rId,
        matchType: first.matchType,
        players: first.players,
        teams: first.teams,
        targetGamesCount: first.targetGamesCount || 5,
        playedGamesCount: playedMatches.length,
        date: first.date,
        matches: roundMatches,
      };
    });
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

  const draftRounds = getDraftRounds();
  const currentRoundMatches = dbMatches.filter((m) => m.roundId === roundId);
  const playedMatches = currentRoundMatches.filter((m) => m.scores && Object.keys(m.scores).length > 0);
  const playedGamesCount = playedMatches.length;

  return (
    <div className="flex flex-col gap-6 max-w-[600px] mx-auto">
      {/* Wizard Header breadcrumbs */}
      <div className="flex items-center gap-3 sticky top-0 bg-background/90 backdrop-blur-xs py-2 z-10">
        <button
          onClick={async () => {
            if (step > 1) {
              if (window.confirm("Exit scoring console? Your current score adjustments will be saved as draft.")) {
                const saved = await handleRecordActiveGame();
                if (saved) {
                  setStep(1);
                }
              }
            } else {
              router.push("/");
            }
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

      {/* Step 1: Settings and Choose Participants */}
      {step === 1 && (
        <div className="flex flex-col gap-5 fade-in">
          {/* Active Draft Rounds Dashboard */}
          {draftRounds.length > 0 && (
            <div className="flex flex-col gap-3.5 mb-2 border-b border-border/40 pb-5">
              <h2 className="font-display font-bold text-[15px] text-text flex items-center gap-2">
                <Gamepad className="h-4.5 w-4.5 text-primary" /> Active Draft Matches
              </h2>
              <div className="grid grid-cols-1 gap-2.5">
                {draftRounds.map((draft) => {
                  let matchNames = "";
                  if (draft.matchType === "Team Match" && draft.teams.length === 2) {
                    const teamA = teams.find(t => t._id === draft.teams[0])?.name || "Team A";
                    const teamB = teams.find(t => t._id === draft.teams[1])?.name || "Team B";
                    matchNames = `${teamA} vs ${teamB}`;
                  } else {
                    const names = draft.players.map(pId => players.find(p => p._id === pId)?.name || "Player");
                    matchNames = names.join(" vs ");
                  }
                  return (
                    <div key={draft.roundId} className="bg-surface border border-border rounded-xl p-3.5 flex items-center justify-between gap-4 shadow-sm">
                      <div className="min-w-0">
                        <span className="mono-label text-[9px] text-accent px-1.5 py-0.5 rounded-md bg-accent/10 font-bold block w-fit mb-1.5">
                          {draft.matchType.toUpperCase()}
                        </span>
                        <div className="font-bold text-[14px] text-text truncate mb-1">
                          {matchNames}
                        </div>
                        <div className="text-[12px] text-text-dim">
                          Scored: <span className="font-bold text-text">{draft.playedGamesCount}</span> of {draft.targetGamesCount} games · {new Date(draft.date).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResumeDraft(draft)}
                          className="bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 font-bold py-2 px-3.5 text-[12.5px] rounded-lg h-9"
                        >
                          Resume
                        </Button>
                        <button
                          onClick={() => {
                            if (window.confirm("Delete this draft match and all its recorded scores?")) {
                              dataService.deleteRound(draft.roundId);
                              showToast("Draft match deleted.", "info");
                            }
                          }}
                          className="w-9 h-9 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-danger hover:text-red hover:bg-surface-3 transition-all cursor-pointer h-9 w-9 shrink-0"
                          title="Delete Draft"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Configuration Card */}
          <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-4 shadow-sm">
            <h2 className="font-display font-bold text-[15px] text-text">Match Settings</h2>
            
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold text-[13px] text-text-dim">Number of games to be played:</span>
              <input
                type="number"
                min={1}
                max={20}
                value={targetGamesCount}
                onChange={(e) => setTargetGamesCount(Math.max(1, Number(e.target.value)))}
                className="w-20 h-10 bg-surface-2 border border-border rounded-md px-3 text-center text-[13.5px] text-text font-bold outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-border/40 pt-3.5">
              <span className="font-semibold text-[13px] text-text-dim">Pre-select games list?</span>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={preSelectGames}
                  onChange={(e) => setPreSelectGames(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-3 rounded-full peer peer-checked:bg-primary transition-all after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
              </label>
            </div>

            {preSelectGames && (
              <div className="flex flex-col gap-2 border-t border-border/40 pt-4">
                <div className="flex justify-between items-center mb-1">
                  <span className="mono-label text-text-faint block">Select games for the round</span>
                  <button
                    type="button"
                    onClick={handleRandomizeGames}
                    className="text-[12px] font-bold text-primary hover:text-primary-hover flex items-center gap-1 cursor-pointer bg-transparent border-none outline-none select-none"
                  >
                    🎲 Randomize
                  </button>
                </div>
                <GameSelectGrid
                  games={games}
                  selectedGames={selectedGames}
                  onToggle={toggleGameSelection}
                />
              </div>
            )}
          </div>

          {/* Choose Participants component */}
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
            onSelectRandomTeamPairs={setSelectedTeamIds}
          />

          <Button
            onClick={handleProceedToScores}
            disabled={
              matchMode === "Team Match"
                ? selectedTeamIds.length !== 2
                : selectedPlayerIds.length < 2
            }
            className="w-full py-6 bg-primary text-white hover:bg-primary-hover font-bold text-[14px] mt-4 flex items-center justify-center gap-1.5 shadow-md"
          >
            Start scoring <ChevronRight className="h-4.5 w-4.5 stroke-[2]" />
          </Button>
        </div>
      )}

      {/* Step 2: Scoring Console */}
      {step === 2 && games.length > 0 && (
        <div className="fade-in flex flex-col gap-4">
          <ScoreConsole
            games={preSelectGames ? selectedGames : games}
            activeGameIndex={activeGameIndex}
            onGameIndexChange={setActiveGameIndex}
            competitors={getConsoleCompetitors()}
            scores={gameScores[(preSelectGames ? selectedGames[activeGameIndex] : games[activeGameIndex])._id] || {}}
            onScoreAdjust={(compId, amount) => adjustScore((preSelectGames ? selectedGames[activeGameIndex] : games[activeGameIndex])._id, compId, amount)}
            onSave={handleRecordActiveGame}
            saveButtonText="Save & Record Game"
            onAddGame={() => setIsGameDialogOpen(true)}
            hideGameDropdown={preSelectGames}
          />

          {/* Save/Finalize / Discard buttons */}
          <div className="flex flex-col gap-2 border-t border-border/40 pt-4">
            {preSelectGames ? (
              // Preselected mode controls: Save & Next or Finalize
              activeGameIndex < selectedGames.length - 1 ? (
                <Button
                  onClick={async () => {
                    const saved = await handleRecordActiveGame();
                    if (saved) {
                      setActiveGameIndex(activeGameIndex + 1);
                    }
                  }}
                  className="w-full py-5 bg-primary text-white hover:bg-primary-hover font-bold text-[13.5px] flex items-center justify-center gap-1.5"
                >
                  Save & Next Game <ChevronRight className="h-4.5 w-4.5 stroke-[2]" />
                </Button>
              ) : (
                <Button
                  onClick={handleFinalizeMatch}
                  className="w-full py-5 bg-success text-white hover:bg-success/90 font-bold text-[13.5px] flex items-center justify-center gap-1.5"
                >
                  <Check className="h-4 w-4" /> Finish & Finalize Match
                </Button>
              )
            ) : (
              // Dropdown mode controls: Record game and finalize
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleFinalizeMatch}
                  variant={playedGamesCount >= targetGamesCount ? "default" : "outline"}
                  className={`w-full py-5 font-bold text-[13.5px] flex items-center justify-center gap-1.5 transition-all ${
                    playedGamesCount >= targetGamesCount 
                      ? "bg-success text-white hover:bg-success/90" 
                      : "border-border text-text hover:bg-surface-2"
                  }`}
                >
                  <Check className="h-4 w-4" /> Finish & Finalize Match ({playedGamesCount}/{targetGamesCount} played)
                </Button>
              </div>
            )}
            
            <Button
              variant="outline"
              onClick={handleDiscardDraft}
              className="w-full py-4 border-danger/30 text-danger hover:bg-danger/10 text-[12.5px] font-semibold"
            >
              Discard Draft Match
            </Button>
          </div>
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
