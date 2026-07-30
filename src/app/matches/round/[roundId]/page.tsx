"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Plus, Minus, Trash2, Save, X, Trophy, Gamepad } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/Toast";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { getGameIcon as getIcon } from "@/lib/iconMap";
import dataService, { ClientPlayer, ClientGame, ClientTeam, ClientMatch } from "@/lib/dataService";

interface GameEntry {
  matchId: string;
  gameId: string;
  scores: Record<string, number>;
}

interface Competitor {
  id: string;
  name: string;
  players: Array<{ id: string; name: string }>;
}

export default function RoundDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const roundId = params.roundId as string;

  // Master lists
  const [allGames, setAllGames] = useState<ClientGame[]>([]);
  const [allPlayers, setAllPlayers] = useState<ClientPlayer[]>([]);
  const [allTeams, setAllTeams] = useState<ClientTeam[]>([]);

  // Round metadata
  const [originalMatches, setOriginalMatches] = useState<ClientMatch[]>([]);
  const [isTeamMode, setIsTeamMode] = useState(false);
  const [isTournamentMatch, setIsTournamentMatch] = useState(false);
  const [tournamentId, setTournamentId] = useState<string | undefined>(undefined);
  const [originalPlayers, setOriginalPlayers] = useState<string[]>([]);
  const [originalTeams, setOriginalTeams] = useState<string[]>([]);
  const [matchType, setMatchType] = useState<"Solo" | "Free For All" | "Team Match">("Solo");
  const [roundDate, setRoundDate] = useState<string>("");

  // Competitor UI list
  const [competitors, setCompetitors] = useState<Competitor[]>([]);

  // Form list
  const [gamesList, setGamesList] = useState<GameEntry[]>([]);

  useEffect(() => {
    // 1. Fetch Master Data
    const games = dataService.getGames();
    const players = dataService.getPlayers();
    const teams = dataService.getTeams();
    setAllGames(games);
    setAllPlayers(players);
    setAllTeams(teams);

    // 2. Fetch matches in the round
    const matchesInRound = dataService.getMatches()
      .filter((m) => (m.roundId || m._id) === roundId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (matchesInRound.length === 0) {
      showToast("Round not found or already deleted.", "error");
      router.push("/stats?tab=history");
      return;
    }

    setOriginalMatches(matchesInRound);
    
    // Set metadata from the first match
    const refMatch = matchesInRound[0];
    const teamMode = refMatch.matchType === "Team Match";
    setIsTeamMode(teamMode);
    setIsTournamentMatch(refMatch.isTournamentMatch);
    setTournamentId(refMatch.tournament);
    setOriginalPlayers(refMatch.players);
    setOriginalTeams(refMatch.teams);
    setMatchType(refMatch.matchType);
    setRoundDate(refMatch.date);

    // 3. Resolve competitors
    if (teamMode) {
      const resolvedCompetitors = refMatch.teams.map((tId) => {
        const teamObj = teams.find((t) => t._id === tId) || { name: "Team", members: [] };
        const teamPlayers = teamObj.members.map((pId) => {
          const pObj = players.find((p) => p._id === pId);
          return { id: pId, name: pObj?.name || "Player" };
        });
        return {
          id: tId,
          name: teamObj.name,
          players: teamPlayers,
        };
      });
      setCompetitors(resolvedCompetitors);
    } else {
      const resolvedCompetitors = refMatch.players.map((pId) => {
        const pObj = players.find((p) => p._id === pId) || { name: "Player" };
        return {
          id: pId,
          name: pObj.name,
          players: [{ id: pId, name: pObj.name }],
        };
      });
      setCompetitors(resolvedCompetitors);
    }

    // 4. Map matches to games list form
    const list: GameEntry[] = matchesInRound.map((m) => ({
      matchId: m._id,
      gameId: m.game,
      scores: { ...m.scores },
    }));
    setGamesList(list);
  }, [roundId]);

  // Adjust scores dynamically
  const handleScoreChange = (entryIdx: number, competitorId: string, val: string) => {
    const parsed = parseInt(val, 10);
    setGamesList((prev) => {
      const copy = [...prev];
      const entry = { ...copy[entryIdx] };
      entry.scores = {
        ...entry.scores,
        [competitorId]: isNaN(parsed) ? 0 : Math.max(0, parsed),
      };
      copy[entryIdx] = entry;
      return copy;
    });
  };

  const adjustScoreByAmount = (entryIdx: number, competitorId: string, amount: number) => {
    setGamesList((prev) => {
      const copy = [...prev];
      const entry = { ...copy[entryIdx] };
      const current = entry.scores[competitorId] || 0;
      entry.scores = {
        ...entry.scores,
        [competitorId]: Math.max(0, current + amount),
      };
      copy[entryIdx] = entry;
      return copy;
    });
  };

  // Change game select
  const handleGameSelect = (entryIdx: number, gameId: string) => {
    setGamesList((prev) => {
      const copy = [...prev];
      copy[entryIdx] = { ...copy[entryIdx], gameId };
      return copy;
    });
  };

  // Add game to round
  const handleAddGame = () => {
    if (allGames.length === 0) {
      showToast("Create a game in settings first!", "error");
      return;
    }

    const initialScores: Record<string, number> = {};
    competitors.forEach((c) => {
      initialScores[c.id] = 0;
    });

    const newEntry: GameEntry = {
      matchId: "new-" + Math.random().toString(36).substring(2, 9),
      gameId: allGames[0]._id,
      scores: initialScores,
    };

    setGamesList((prev) => [...prev, newEntry]);
    showToast("Game entry added to round!", "info");
  };

  // Remove game from list
  const handleRemoveGame = (entryIdx: number) => {
    setGamesList((prev) => prev.filter((_, idx) => idx !== entryIdx));
  };

  // Helper: determine winners
  const calculateWinners = (scores: Record<string, number>) => {
    let maxScore = -1;
    let winners: string[] = [];
    Object.entries(scores).forEach(([id, val]) => {
      if (val > maxScore) {
        maxScore = val;
        winners = [id];
      } else if (val === maxScore) {
        winners.push(id);
      }
    });
    return winners;
  };

  // Action: Save Changes
  const handleSaveChanges = () => {
    if (gamesList.length === 0) {
      if (window.confirm("Deleting all games will delete this round entirely. Proceed?")) {
        handleDeleteRound();
      }
      return;
    }

    try {
      // 1. Identify matches to delete
      const currentMatchIds = new Set(gamesList.map((e) => e.matchId).filter((id) => !id.startsWith("new-")));
      originalMatches.forEach((m) => {
        if (!currentMatchIds.has(m._id)) {
          dataService.deleteMatch(m._id);
        }
      });

      // 2. Create or Update current matches
      gamesList.forEach((entry) => {
        const scoreWinners = calculateWinners(entry.scores);

        if (entry.matchId.startsWith("new-")) {
          dataService.saveMatch({
            roundId,
            game: entry.gameId,
            matchType,
            players: originalPlayers,
            teams: originalTeams,
            scores: entry.scores,
            winners: scoreWinners,
            isTournamentMatch,
            tournament: tournamentId,
          });
        } else {
          dataService.saveMatch({
            _id: entry.matchId,
            roundId,
            game: entry.gameId,
            matchType,
            players: originalPlayers,
            teams: originalTeams,
            scores: entry.scores,
            winners: scoreWinners,
            isTournamentMatch,
            tournament: tournamentId,
            date: roundDate,
          });
        }
      });

      showToast("Round updated successfully!", "success");
      router.push("/stats?tab=history");
    } catch (err) {
      console.error(err);
      showToast("Failed to save changes.", "error");
    }
  };

  // Action: Delete Round
  const handleDeleteRound = () => {
    if (window.confirm("Are you sure you want to delete this entire round and all its games? This action cannot be undone.")) {
      try {
        dataService.deleteRound(roundId);
        showToast("Round deleted successfully!", "success");
        router.push("/stats?tab=history");
      } catch (err) {
        showToast("Failed to delete round.", "error");
      }
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-[600px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/stats?tab=history")}
          className="w-9 h-9 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-dim hover:text-text cursor-pointer focus:outline-none"
          aria-label="Go Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display font-bold text-[18px] text-text">
          Round Details
        </h1>
      </div>

      {/* Overview Card */}
      <Card className="p-4 border-border bg-surface rounded-xl flex flex-col gap-4">
        <div className="flex justify-between items-start">
          <div>
            <Badge
              className={`border-none font-semibold text-[10.5px] rounded-full px-2.5 py-0.5 flex items-center gap-1 w-fit mb-2 ${
                isTournamentMatch
                  ? "bg-accent/10 text-accent"
                  : "bg-primary/15 text-text-dim"
              }`}
            >
              {isTournamentMatch ? <Trophy className="h-3 w-3" /> : <Gamepad className="h-3 w-3" />}
              {isTournamentMatch ? "Tournament Fixture" : "Quick Match Round"}
            </Badge>
            <div className="text-[12px] text-text-dim">
              Played on {new Date(roundDate || new Date()).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </div>
          </div>
        </div>

        {/* Competitor Overview Row */}
        <div className="flex items-center justify-around py-3 border-t border-border/40 mt-1">
          {competitors.map((comp, idx) => (
            <React.Fragment key={comp.id}>
              {idx > 0 && <span className="text-[12px] font-bold text-text-faint font-mono uppercase">VS</span>}
              <div className="flex flex-col items-center gap-1.5">
                <PlayerAvatar size="md" players={comp.players} />
                <span className="font-bold text-[13px] text-text text-center max-w-[120px] truncate">
                  {comp.name}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </Card>

      {/* Games List Title */}
      <h2 className="font-display font-bold text-[15px] text-text mb-0.5">
        Games Played ({gamesList.length})
      </h2>

      {/* Games list form fields */}
      <div className="flex flex-col gap-4">
        {gamesList.map((entry, entryIdx) => {
          const gameObj = allGames.find((g) => g._id === entry.gameId);
          const GameIconComponent = gameObj ? getIcon(gameObj.icon) : Gamepad;

          return (
            <Card
              key={entry.matchId}
              className="p-4 border border-border bg-surface rounded-xl border-l-4 border-l-primary flex flex-col gap-4"
            >
              {/* Card Header row */}
              <div className="flex justify-between items-center border-b border-border/40 pb-2">
                {/* Game Select field */}
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded bg-surface-3 flex items-center justify-center text-text-dim">
                    <GameIconComponent className="h-4 w-4" />
                  </span>
                  <select
                    value={entry.gameId}
                    onChange={(e) => handleGameSelect(entryIdx, e.target.value)}
                    className="border-none bg-transparent font-bold text-[14.5px] text-text cursor-pointer outline-none font-display focus:ring-1 focus:ring-primary rounded px-1"
                  >
                    {allGames.map((g) => (
                      <option key={g._id} value={g._id} className="bg-surface text-text">
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Remove game button */}
                <button
                  type="button"
                  onClick={() => handleRemoveGame(entryIdx)}
                  className="bg-none border-none text-danger hover:text-red transition-all cursor-pointer p-1.5 focus:outline-none"
                  title="Remove this game"
                  aria-label="Remove game"
                >
                  <Trash2 className="h-4.5 w-4.5" />
                </button>
              </div>

              {/* Competitors scores inputs */}
              <div className="flex flex-col gap-3">
                {competitors.map((comp) => {
                  const score = entry.scores[comp.id] || 0;
                  return (
                    <div
                      key={comp.id}
                      className="flex justify-between items-center bg-surface-2/45 p-2 rounded-lg border border-border/20"
                    >
                      <div className="flex items-center gap-2">
                        <PlayerAvatar size="xs" players={comp.players} />
                        <span className="text-[13px] font-semibold text-text-dim max-w-[150px] truncate">
                          {comp.name}
                        </span>
                      </div>

                      {/* Dialer control */}
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => adjustScoreByAmount(entryIdx, comp.id, -1)}
                          className="w-7 h-7 rounded-full border border-border bg-surface-2 text-text font-bold flex items-center justify-center cursor-pointer active:scale-95 focus:outline-none"
                          aria-label="Decrease score"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <input
                          type="number"
                          value={score}
                          onChange={(e) => handleScoreChange(entryIdx, comp.id, e.target.value)}
                          className="w-14 h-8 rounded-md border border-border bg-surface text-center font-display font-bold text-[14px] text-text outline-none focus:ring-1 focus:ring-primary"
                        />
                        <button
                          type="button"
                          onClick={() => adjustScoreByAmount(entryIdx, comp.id, 1)}
                          className="w-7 h-7 rounded-full border border-border bg-surface-2 text-text font-bold flex items-center justify-center cursor-pointer active:scale-95 focus:outline-none"
                          aria-label="Increase score"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Save / edit control buttons */}
      <div className="flex flex-col gap-3 mt-2 mb-6">
        <Button
          type="button"
          variant="outline"
          onClick={handleAddGame}
          className="w-full py-5 border-dashed border-border rounded-md text-text-dim text-[13.5px] font-semibold flex items-center justify-center gap-2 hover:bg-surface-2 transition-all hover:border-primary/50"
        >
          <Plus className="h-4.5 w-4.5" /> Add Game to Round
        </Button>

        <div className="grid grid-cols-2 gap-3 mt-1">
          <Button
            onClick={handleSaveChanges}
            className="w-full bg-primary text-white hover:bg-primary-hover font-bold flex items-center justify-center gap-1.5 py-5"
          >
            <Save className="h-4 w-4" /> Save Changes
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push("/stats?tab=history")}
            className="w-full border-border bg-surface-2 hover:bg-surface-3 text-text font-semibold flex items-center justify-center gap-1.5 py-5"
          >
            <X className="h-4 w-4" /> Cancel
          </Button>
        </div>

        <button
          type="button"
          onClick={handleDeleteRound}
          className="mt-4 border-none bg-none text-danger hover:text-red text-[13px] font-bold cursor-pointer text-center flex items-center justify-center gap-1.5 focus:outline-none"
        >
          <Trash2 className="h-4 w-4" /> Delete Round
        </button>
      </div>
    </div>
  );
}
