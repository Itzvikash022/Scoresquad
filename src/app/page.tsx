"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Trophy, Gamepad, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { getGameIcon as getIcon } from "@/lib/iconMap";
import dataService, { ClientPlayer, ClientMatch, ClientTournament, ClientGame } from "@/lib/dataService";

export default function Dashboard() {
  const router = useRouter();
  const [activeTournament, setActiveTournament] = useState<ClientTournament | undefined>(undefined);
  const [players, setPlayers] = useState<ClientPlayer[]>([]);
  const [matches, setMatches] = useState<ClientMatch[]>([]);
  const [games, setGames] = useState<ClientGame[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [stats, setStats] = useState({ matches: 0, games: 0, activeTourneys: 0 });

  useEffect(() => {
    const loadData = () => {
      const allM = dataService.getMatches();
      const allG = dataService.getGames();
      const allT = dataService.getTournaments();
      
      setActiveTournament(dataService.getActiveTournament());
      setPlayers(dataService.getPlayers().slice(0, 3)); // Top 3
      setMatches(allM.slice(0, 3)); // Recent 3
      setGames(allG);
      setTeams(dataService.getTeams());

      setStats({
        matches: allM.length,
        games: allG.length,
        activeTourneys: allT.filter((t) => t.isActive).length,
      });
    };

    loadData();
    const unsubscribe = dataService.subscribe(loadData);
    return unsubscribe;
  }, []);

  // Format matches to include resolved player profiles for PlayerAvatar
  const formattedMatches = matches.map((m) => {
    const game = games.find((g) => g._id === m.game) || { name: "Unknown Game", icon: "🎮" };

    const teamScores = m.teams.map((tId) => {
      const teamObj = teams.find((t) => t._id === tId) || { name: "Team", members: [] };
      const teamPlayers = teamObj.members.map((pId: string) => {
        const pObj = dataService.getPlayers().find((p) => p._id === pId);
        return { id: pId, name: pObj?.name || "Player" };
      });
      return {
        id: tId,
        name: teamObj.name,
        players: teamPlayers,
        score: m.scores[tId] || 0,
        isWinner: m.winners.includes(tId),
      };
    });

    const soloScores = m.players.map((pId) => {
      const pObj = dataService.getPlayers().find((p) => p._id === pId) || { name: "Player" };
      return {
        id: pId,
        name: pObj.name,
        players: [{ id: pId, name: pObj.name }],
        score: m.scores[pId] || 0,
        isWinner: m.winners.includes(pId),
      };
    });

    return {
      _id: m._id,
      gameName: game.name,
      gameIcon: game.icon,
      date: m.date,
      matchType: m.matchType,
      competitorScores: m.matchType === "Team Match" ? teamScores : soloScores,
    };
  });

  return (
    <div className="flex flex-col gap-6 max-w-[800px] mx-auto">
      {/* Hero Welcome banner */}
      <div className="flex flex-col">
        <span className="mono-label text-text-faint">GAME NIGHT</span>
        <h1 className="font-display font-bold text-[28px] mt-0.5 mb-1 text-text leading-tight">
          Ready when you are.
        </h1>
        <p className="text-text-dim text-[13.5px]">
          Companion tracker for local multiplayer scoring
        </p>
      </div>

      {/* Record Quick Match CTA */}
      <Button
        onClick={() => router.push("/matches/new")}
        className="w-full py-7 bg-gradient-to-r from-primary to-primary-hover hover:from-primary-hover hover:to-primary text-white font-bold text-[15.5px] rounded-md shadow-lg shadow-primary/20 flex items-center justify-center gap-2 cursor-pointer transition-all border-none"
      >
        <Play className="h-4.5 w-4.5 fill-white text-white stroke-[2]" />
        Record Quick Match
      </Button>

      {/* Statistics Tiles Grid */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="flex flex-col items-center justify-center p-3 text-center border-border bg-surface rounded-lg">
          <span className="font-display text-[20px] font-bold text-accent">
            {stats.matches}
          </span>
          <span className="mono-label text-text-faint text-[9px] mt-1">
            Matches
          </span>
        </Card>
        <Card className="flex flex-col items-center justify-center p-3 text-center border-border bg-surface rounded-lg">
          <span className="font-display text-[20px] font-bold text-text">
            {stats.games}
          </span>
          <span className="mono-label text-text-faint text-[9px] mt-1">
            Games
          </span>
        </Card>
        <Card className="flex flex-col items-center justify-center p-3 text-center border-border bg-surface rounded-lg">
          <span className="font-display text-[20px] font-bold text-success">
            {stats.activeTourneys}
          </span>
          <span className="mono-label text-text-faint text-[9px] mt-1">
            Live Tourney
          </span>
        </Card>
      </div>

      {/* Active Tournament Card tracker */}
      {activeTournament && (
        <Card
          onClick={() => router.push("/tournaments")}
          className="border-accent/40 bg-gradient-to-br from-accent/[0.04] to-surface rounded-xl p-4 flex flex-col gap-3 cursor-pointer hover:border-accent/60 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center text-accent">
              <Trophy className="h-5 w-5 stroke-[2]" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="mono-label text-accent text-[9.5px]">
                ONGOING TOURNAMENT
              </span>
              <h3 className="font-display font-bold text-[15.5px] text-text truncate">
                {activeTournament.name}
              </h3>
            </div>
            <Badge className="bg-[#45D999]/15 text-[#45D999] border-none font-semibold text-[11px] rounded-full">
              Active
            </Badge>
          </div>
          <div className="flex justify-between items-center text-[12.5px] text-text-dim border-t border-border/40 pt-3">
            <span className="font-semibold">
              {activeTournament.gamesCount} games · {activeTournament.isTeamMode ? "Team mode" : "Solo mode"}
            </span>
            <span className="flex items-center gap-1 font-bold text-primary text-[12px]">
              Standings &amp; record <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </Card>
      )}

      {/* Top Players Preview section */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-[14.5px] flex items-center gap-1.5 text-text">
            <Trophy className="h-4.5 w-4.5 text-accent stroke-[1.8]" />
            Top Players
          </h2>
          <button
            onClick={() => router.push("/stats")}
            className="text-[12px] font-bold text-primary hover:underline bg-none border-none cursor-pointer flex items-center gap-1 focus:outline-none"
          >
            View leaderboard <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {players.length > 0 ? (
          <div className="flex flex-col gap-2">
            {players.map((p, idx) => {
              const isFirst = idx === 0;
              return (
                <Card
                  key={p._id}
                  className={`p-3 flex flex-row items-center gap-3 rounded-xl transition-all ${
                    isFirst
                      ? "border-accent/35 bg-gradient-to-b from-accent/[0.08] to-surface"
                      : "border-border bg-surface"
                  }`}
                >
                  {/* Rank badge */}
                  <div
                    className={`w-6.5 h-6.5 font-display font-bold text-[12.5px] rounded-md flex items-center justify-center ${
                      isFirst ? "bg-accent text-[#231702]" : "bg-surface-3 text-text-dim"
                    }`}
                  >
                    {idx + 1}
                  </div>

                  {/* Player avatar */}
                  <PlayerAvatar id={p._id} name={p.name} size="sm" />

                  {/* Player stats */}
                  <div className="flex-grow min-w-0">
                    <div className="font-bold text-[14.5px] text-text truncate">
                      {p.name}
                    </div>
                    <div className="text-[12px] text-text-dim">
                      {p.wins} wins · {p.winRate.toFixed(0)}% win rate
                    </div>
                  </div>

                  {/* Points display */}
                  <div className="text-right flex flex-col justify-center">
                    <span
                      className={`font-display font-bold text-[18px] leading-tight ${
                        isFirst ? "text-accent" : "text-text"
                      }`}
                    >
                      {p.totalPoints}
                    </span>
                    <span className="mono-label text-text-faint text-[8.5px] tracking-widest mt-0.5">
                      PTS
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-text-dim border border-dashed border-border rounded-xl bg-surface/50 flex flex-col items-center gap-3">
            <p className="text-[13.5px]">No players cataloged yet.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/players")}
            >
              Add Players
            </Button>
          </div>
        )}
      </div>

      {/* Recent Matches Preview section */}
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-[14.5px] flex items-center gap-1.5 text-text">
            <Gamepad className="h-4.5 w-4.5 text-text-dim stroke-[1.8]" />
            Recent Matches
          </h2>
          <button
            onClick={() => router.push("/stats?tab=history")}
            className="text-[12px] font-bold text-primary hover:underline bg-none border-none cursor-pointer flex items-center gap-1 focus:outline-none"
          >
            Full history <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {formattedMatches.length > 0 ? (
          <div className="flex flex-col gap-3">
            {formattedMatches.map((m) => {
              const GameIconComponent = getIcon(m.gameIcon);
              return (
                <Card
                  key={m._id}
                  className="p-3.5 border border-border bg-surface rounded-xl flex flex-col gap-3"
                >
                  {/* Game tag header */}
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <span className="font-bold text-[13px] text-text flex items-center gap-2">
                      <span className="p-1 rounded-md bg-surface-3 flex items-center justify-center">
                        <GameIconComponent className="h-3.5 w-3.5 text-text-dim" />
                      </span>
                      {m.gameName}
                    </span>
                    <span className="mono-label text-text-faint text-[9.5px]">
                      {new Date(m.date).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>

                  {/* Competitor rows */}
                  <div className="flex flex-col gap-1.5">
                    {m.competitorScores.map((scoreObj) => (
                      <div
                        key={scoreObj.id}
                        className={`flex justify-between items-center px-2.5 py-1.8 rounded-lg transition-all ${
                          scoreObj.isWinner
                            ? "bg-accent/[0.08] border border-dashed border-accent/40"
                            : "border border-transparent"
                        }`}
                      >
                        <span
                          className={`font-semibold text-[13px] flex items-center gap-2 ${
                            scoreObj.isWinner ? "text-accent" : "text-text-dim"
                          }`}
                        >
                          <PlayerAvatar
                            players={scoreObj.players}
                            size="xs"
                          />
                          {scoreObj.name}
                        </span>
                        <span
                          className={`font-display font-bold text-[14.5px] tabular-nums ${
                            scoreObj.isWinner ? "text-accent" : "text-text-dim"
                          }`}
                        >
                          {scoreObj.score}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-text-dim border border-dashed border-border rounded-xl bg-surface/50 flex flex-col items-center gap-3">
            <p className="text-[13.5px]">No matches recorded yet.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/matches/new")}
            >
              Record A Match
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
