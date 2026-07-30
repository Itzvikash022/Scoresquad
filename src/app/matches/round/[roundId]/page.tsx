"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronLeft, Trophy, Gamepad } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { getGameIcon as getIcon } from "@/lib/iconMap";
import dataService, { ClientPlayer, ClientGame, ClientTeam, ClientMatch } from "@/lib/dataService";
import { useToast } from "@/components/ui/Toast";

interface GameEntry {
  matchId: string;
  gameId: string;
  scores: Record<string, number>;
  winners: string[];
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

  const [allGames, setAllGames] = useState<ClientGame[]>([]);
  const [allPlayers, setAllPlayers] = useState<ClientPlayer[]>([]);
  const [allTeams, setAllTeams] = useState<ClientTeam[]>([]);

  const [isTeamMode, setIsTeamMode] = useState(false);
  const [isTournamentMatch, setIsTournamentMatch] = useState(false);
  const [matchType, setMatchType] = useState<string>("Solo");
  const [roundDate, setRoundDate] = useState<string>("");
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [gamesList, setGamesList] = useState<GameEntry[]>([]);

  useEffect(() => {
    const games = dataService.getGames();
    const players = dataService.getPlayers();
    const teams = dataService.getTeams();
    setAllGames(games);
    setAllPlayers(players);
    setAllTeams(teams);

    const matchesInRound = dataService
      .getMatches()
      .filter((m) => (m.roundId || m._id) === roundId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (matchesInRound.length === 0) {
      showToast("Round not found or already deleted.", "error");
      router.push("/stats?tab=history");
      return;
    }

    const refMatch = matchesInRound[0];
    const teamMode = refMatch.matchType === "Team Match";
    setIsTeamMode(teamMode);
    setIsTournamentMatch(refMatch.isTournamentMatch);
    setMatchType(refMatch.matchType);
    setRoundDate(refMatch.date);

    if (teamMode) {
      setCompetitors(
        refMatch.teams.map((tId) => {
          const teamObj = teams.find((t) => t._id === tId) || { name: "Team", members: [] };
          const teamPlayers = teamObj.members.map((pId) => {
            const pObj = players.find((p) => p._id === pId);
            return { id: pId, name: pObj?.name || "Player" };
          });
          return { id: tId, name: teamObj.name, players: teamPlayers };
        })
      );
    } else {
      setCompetitors(
        refMatch.players.map((pId) => {
          const pObj = players.find((p) => p._id === pId) || { name: "Player" };
          return { id: pId, name: pObj.name, players: [{ id: pId, name: pObj.name }] };
        })
      );
    }

    setGamesList(
      matchesInRound.map((m) => ({
        matchId: m._id,
        gameId: m.game,
        scores: { ...m.scores },
        winners: m.winners || [],
      }))
    );
  }, [roundId]);

  // Tally total wins per competitor across all games in this round
  const totalWins: Record<string, number> = {};
  competitors.forEach((c) => { totalWins[c.id] = 0; });
  gamesList.forEach((entry) => {
    entry.winners.forEach((wId) => {
      if (wId in totalWins) totalWins[wId]++;
    });
  });
  const maxWins = Math.max(0, ...Object.values(totalWins));
  const roundWinner = maxWins > 0
    ? competitors.filter((c) => totalWins[c.id] === maxWins)
    : [];

  return (
    <div className="flex flex-col gap-5 max-w-[600px] mx-auto pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/stats?tab=history")}
          className="w-9 h-9 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-dim hover:text-text cursor-pointer focus:outline-none"
          aria-label="Go Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="font-display font-bold text-[18px] text-text">Round Details</h1>
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
              Played on{" "}
              {new Date(roundDate || new Date()).toLocaleString(undefined, {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </div>
          </div>

          {/* Round winner badge */}
          {roundWinner.length === 1 && (
            <div className="flex flex-col items-end gap-1">
              <span className="mono-label text-[9px] text-text-faint uppercase">Round Winner</span>
              <Badge className="bg-accent/15 text-accent border-none font-bold text-[11px] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Trophy className="h-3 w-3" />
                {roundWinner[0].name}
              </Badge>
            </div>
          )}
        </div>

        {/* Competitor Overview Row */}
        <div className="flex items-center justify-around py-3 border-t border-border/40 mt-1">
          {competitors.map((comp, idx) => (
            <React.Fragment key={comp.id}>
              {idx > 0 && (
                <span className="text-[12px] font-bold text-text-faint font-mono uppercase">VS</span>
              )}
              <div className="flex flex-col items-center gap-1.5">
                <div className="relative">
                  <PlayerAvatar size="md" players={comp.players} />
                  {totalWins[comp.id] > 0 && totalWins[comp.id] === maxWins && (
                    <span className="absolute -top-1.5 -right-1.5 text-[13px]">🏆</span>
                  )}
                </div>
                <span className="font-bold text-[13px] text-text text-center max-w-[120px] truncate">
                  {comp.name}
                </span>
                <span className="mono-label text-[9.5px] text-text-faint uppercase">
                  {totalWins[comp.id]} win{totalWins[comp.id] !== 1 ? "s" : ""}
                </span>
              </div>
            </React.Fragment>
          ))}
        </div>
      </Card>

      {/* Games List */}
      <h2 className="font-display font-bold text-[15px] text-text mb-0.5">
        Games Played ({gamesList.length})
      </h2>

      <div className="flex flex-col gap-3">
        {gamesList.map((entry, entryIdx) => {
          const gameObj = allGames.find((g) => g._id === entry.gameId);
          const GameIconComponent = gameObj ? getIcon(gameObj.icon) : Gamepad;
          const maxScore = Math.max(0, ...Object.values(entry.scores));

          return (
            <Card
              key={entry.matchId}
              className="p-4 border border-border bg-surface rounded-xl border-l-4 border-l-primary flex flex-col gap-3"
            >
              {/* Game header */}
              <div className="flex items-center gap-2 pb-2 border-b border-border/40">
                <span className="p-1 rounded bg-surface-3 flex items-center justify-center text-text-dim">
                  <GameIconComponent className="h-4 w-4" />
                </span>
                <span className="font-bold text-[14.5px] text-text font-display">
                  {gameObj?.name || "Unknown Game"}
                </span>
                <span className="ml-auto mono-label text-[9.5px] text-text-faint uppercase">
                  Game {entryIdx + 1}
                </span>
              </div>

              {/* Scores — read-only */}
              <div className="flex flex-col gap-2">
                {competitors.map((comp) => {
                  const score = entry.scores[comp.id] ?? 0;
                  const isWinner = entry.winners.includes(comp.id);
                  const isHighest = score === maxScore && maxScore > 0;

                  return (
                    <div
                      key={comp.id}
                      className={`flex justify-between items-center px-3 py-2 rounded-lg transition-all ${
                        isWinner
                          ? "bg-accent/[0.07] border border-dashed border-accent/40"
                          : "bg-surface-2/40 border border-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <PlayerAvatar size="xs" players={comp.players} />
                        <span className={`text-[13px] font-semibold truncate max-w-[140px] ${isWinner ? "text-accent" : "text-text-dim"}`}>
                          {comp.name}
                        </span>
                        {isWinner && (
                          <span className="text-[11px]">🏆</span>
                        )}
                      </div>

                      <span className={`font-display font-bold tabular-nums text-[20px] ${isWinner ? "text-accent" : "text-text"}`}>
                        {score}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
