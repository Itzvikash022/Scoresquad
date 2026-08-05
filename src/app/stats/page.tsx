"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Trophy, Shield, Calendar, Search, BarChart3, Users, Flame, Star, Sparkles, Gamepad, ArrowRight, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { getGameIcon as getIcon } from "@/lib/iconMap";
import dataService, { ClientPlayer, ClientMatch, ClientGame, ClientTeam } from "@/lib/dataService";

export default function StatisticsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-text-dim">Loading stats &amp; leaderboard...</div>}>
      <StatisticsContent />
    </Suspense>
  );
}

function StatisticsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "leaderboard";
  
  const [activeTab, setActiveTab] = useState<"leaderboard" | "history" | "gameAnalytics" | "analytics">("leaderboard");
  const [leaderboardType, setLeaderboardType] = useState<"solo" | "team">("team");
  
  const [historyModalEntity, setHistoryModalEntity] = useState<{ id: string, name: string, isTeam: boolean } | null>(null);

  // Master Data
  const [players, setPlayers] = useState<ClientPlayer[]>([]);
  const [games, setGames] = useState<ClientGame[]>([]);
  const [teams, setTeams] = useState<ClientTeam[]>([]);
  const [matches, setMatches] = useState<ClientMatch[]>([]);

  // History filters
  const [selectedGameFilter, setSelectedGameFilter] = useState("");
  const [selectedPlayerFilter, setSelectedPlayerFilter] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  
  const router = useRouter();

  useEffect(() => {
    if (initialTab === "history" || initialTab === "analytics" || initialTab === "leaderboard") {
      setActiveTab(initialTab);
    }
    loadData();
    const unsubscribe = dataService.subscribe(loadData);
    return unsubscribe;
  }, [initialTab]);

  const loadData = () => {
    setPlayers(dataService.getPlayers());
    setGames(dataService.getGames());
    setTeams(dataService.getTeams());
    setMatches(dataService.getMatches());
  };

  // Sortings
  const sortedPlayers = [...players].sort((a, b) => b.totalPoints - a.totalPoints || b.winRate - a.winRate);
  const sortedTeams = [...teams].sort((a, b) => b.points - a.points || b.winRate - a.winRate);

  // Filter History
  const filteredMatches = matches.filter((m) => {
    const matchesGame = selectedGameFilter ? m.game === selectedGameFilter : true;
    
    // Check if player filter is in player list or team members
    let matchesPlayer = true;
    if (selectedPlayerFilter) {
      if (m.matchType === "Team Match") {
        // Resolve teams and check members
        const matchesAnyTeamMember = m.teams.some((tId) => {
          const teamObj = teams.find((t) => t._id === tId);
          return teamObj?.members.includes(selectedPlayerFilter);
        });
        matchesPlayer = matchesAnyTeamMember;
      } else {
        matchesPlayer = m.players.includes(selectedPlayerFilter);
      }
    }
    
    const gameObj = games.find((g) => g._id === m.game);
    const matchesSearch = historySearch
      ? gameObj?.name.toLowerCase().includes(historySearch.toLowerCase()) ||
        m.matchType.toLowerCase().includes(historySearch.toLowerCase())
      : true;

    return matchesGame && matchesPlayer && matchesSearch;
  });

  const getRoundGroups = () => {
    const roundGroups: Record<string, ClientMatch[]> = {};
    filteredMatches.forEach((m) => {
      const rId = m.roundId || m._id;
      if (!roundGroups[rId]) {
        roundGroups[rId] = [];
      }
      roundGroups[rId].push(m);
    });
    return roundGroups;
  };

  const roundGroups = getRoundGroups();

  const formattedRounds = Object.entries(roundGroups).map(([roundId, matchesInRound]) => {
    if (matchesInRound.length === 0) return null;

    const sortedMatches = [...matchesInRound].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstMatch = sortedMatches[0];
    const isTeam = firstMatch.matchType === "Team Match";
    
    const winCounts: Record<string, number> = {};
    const scoreSums: Record<string, number> = {};

    matchesInRound.forEach((m) => {
      Object.entries(m.scores).forEach(([id, score]) => {
        scoreSums[id] = (scoreSums[id] || 0) + score;
      });
      m.winners.forEach((wId) => {
        winCounts[wId] = (winCounts[wId] || 0) + 1;
      });
    });

    // Resolve profiles
    let competitors: Array<{
      id: string;
      name: string;
      playersList: Array<{ id: string; name: string }>;
      score: number;
      gamesWon: number;
      isWinner: boolean;
    }> = [];

    if (isTeam && firstMatch.teams.length > 0) {
      competitors = firstMatch.teams.map((tId) => {
        const teamObj = teams.find((t) => t._id === tId) || { name: "Team", members: [] };
        const teamPlayers = teamObj.members.map((pId: string) => {
          const pObj = players.find((p) => p._id === pId);
          return { id: pId, name: pObj?.name || "Player" };
        });
        return {
          id: tId,
          name: teamObj.name,
          playersList: teamPlayers,
          score: scoreSums[tId] || 0,
          gamesWon: winCounts[tId] || 0,
          isWinner: false,
        };
      });
    } else {
      competitors = firstMatch.players.map((pId) => {
        const pObj = players.find((p) => p._id === pId) || { name: "Player" };
        return {
          id: pId,
          name: pObj.name,
          playersList: [{ id: pId, name: pObj.name }],
          score: scoreSums[pId] || 0,
          gamesWon: winCounts[pId] || 0,
          isWinner: false,
        };
      });
    }

    // Determine overall round winner
    let maxWins = -1;
    let maxScore = -1;
    let winnerIds: string[] = [];

    competitors.forEach((c) => {
      if (c.gamesWon > maxWins) {
        maxWins = c.gamesWon;
        maxScore = c.score;
        winnerIds = [c.id];
      } else if (c.gamesWon === maxWins) {
        if (c.score > maxScore) {
          maxScore = c.score;
          winnerIds = [c.id];
        } else if (c.score === maxScore) {
          winnerIds.push(c.id);
        }
      }
    });

    competitors.forEach((c) => {
      c.isWinner = winnerIds.includes(c.id);
    });

    const uniqueGames = Array.from(new Set(matchesInRound.map((m) => m.game)));
    const gameNames = uniqueGames
      .map((gId) => games.find((g) => g._id === gId)?.name || "Game")
      .join(", ");
    
    const summaryText = `${gameNames} (${matchesInRound.length} game${matchesInRound.length === 1 ? "" : "s"})`;

    return {
      roundId,
      date: firstMatch.date,
      isTournament: firstMatch.isTournamentMatch,
      tournamentId: firstMatch.tournament,
      matchType: firstMatch.matchType,
      competitors,
      summaryText,
      matches: sortedMatches,
    };
  }).filter((r): r is NonNullable<typeof r> => r !== null).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Analytics
  const getAnalytics = () => {
    const totalMatches = matches.length;
    const totalPlayers = players.length;

    let mostPlayedGame = "None";
    let maxGameMatches = -1;
    games.forEach((g) => {
      if (g.totalMatchesPlayed > maxGameMatches) {
        maxGameMatches = g.totalMatchesPlayed;
        mostPlayedGame = g.name;
      }
    });

    let mostActivePlayer = "None";
    let maxPlayerMatches = -1;
    players.forEach((p) => {
      if (p.matches > maxPlayerMatches) {
        maxPlayerMatches = p.matches;
        mostActivePlayer = p.name;
      }
    });

    let highestScoringTeam = "None";
    let maxTeamPoints = -1;
    teams.forEach((t) => {
      if (t.points > maxTeamPoints) {
        maxTeamPoints = t.points;
        highestScoringTeam = t.name;
      }
    });

    const winStreaks = players.map((p) => {
      let maxStreak = 0;
      let currentStreak = 0;
      p.recentForm.forEach((result) => {
        if (result === "W") {
          currentStreak += 1;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      });
      return { name: p.name, id: p._id, streak: maxStreak };
    }).sort((a, b) => b.streak - a.streak).slice(0, 3);

    return {
      totalMatches,
      totalPlayers,
      mostPlayedGame,
      mostActivePlayer,
      highestScoringTeam,
      winStreaks,
    };
  };

  const analytics = getAnalytics();

  const gameAnalytics = games.map(g => {
    const gameMatches = matches.filter(m => m.game === g._id);
    const pStats: Record<string, { wins: number, points: number, name: string, isTeam: boolean, id: string }> = {};
    
    gameMatches.forEach(m => {
      if (m.matchType === "Team Match") {
        m.teams.forEach(tId => {
          if (!pStats[tId]) pStats[tId] = { id: tId, wins:0, points:0, name: teams.find(t=>t._id===tId)?.name||"Team", isTeam: true };
          if (m.winners.includes(tId)) pStats[tId].wins += 1;
          pStats[tId].points += m.scores[tId] || 0;
        });
      } else {
        m.players.forEach(pId => {
          if (!pStats[pId]) pStats[pId] = { id: pId, wins:0, points:0, name: players.find(p=>p._id===pId)?.name||"Player", isTeam: false };
          if (m.winners.includes(pId)) pStats[pId].wins += 1;
          pStats[pId].points += m.scores[pId] || 0;
        });
      }
    });
    
    const top = Object.values(pStats).sort((a,b) => b.wins - a.wins || b.points - a.points).slice(0, 3);
    return { game: g, top };
  });

  const getMedal = (idx: number) => {
    if (idx === 0) return <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-300 to-blue-500 border border-cyan-100 flex items-center justify-center shadow-[0_0_8px_rgba(34,211,238,0.6)] font-bold text-white text-[12px]" title="Diamond">1</div>;
    if (idx === 1) return <div className="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-600 border border-yellow-100 flex items-center justify-center shadow-[0_0_8px_rgba(253,224,71,0.6)] font-bold text-white text-[12px]" title="Gold">2</div>;
    if (idx === 2) return <div className="w-7 h-7 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 border border-gray-100 flex items-center justify-center shadow-inner font-bold text-white text-[12px]" title="Plastic">3</div>;
    return <div className="w-7 h-7 font-display font-bold text-[12px] rounded-full flex items-center justify-center bg-surface-3 text-text-dim">{idx + 1}</div>;
  };

  const Podium = ({ top3, isTeam }: { top3: any[], isTeam: boolean }) => {
    if (top3.length < 3) return null;
    const [first, second, third] = top3;
    
    const renderAvatar = (entity: any) => {
      if (isTeam) {
         const teamPlayers = entity.members.map((pId: string) => ({ id: pId, name: players.find(p=>p._id===pId)?.name||"Player" }));
         return <PlayerAvatar size="md" players={teamPlayers} />;
      }
      return <PlayerAvatar id={entity._id} name={entity.name} size="md" />;
    }

    return (
      <div className="flex items-end justify-center gap-2 mt-4 mb-8 h-[160px]">
         {/* 2nd Place */}
         <div className="flex flex-col items-center w-[100px]">
            {renderAvatar(second)}
            <div className="font-bold text-[13px] text-text mt-2 truncate w-full text-center">{second.name}</div>
            <div className="text-[11px] text-text-dim mb-2">{second.wins} W</div>
            <div className="w-full bg-gradient-to-t from-yellow-600/40 to-yellow-500/10 border border-yellow-500/30 rounded-t-lg h-[60px] flex items-start justify-center pt-2">
               {getMedal(1)}
            </div>
         </div>
         {/* 1st Place */}
         <div className="flex flex-col items-center w-[110px] z-10 relative">
            <div className="absolute -top-4"><Sparkles className="text-cyan-400 w-5 h-5 animate-pulse" /></div>
            {renderAvatar(first)}
            <div className="font-bold text-[14px] text-text mt-2 truncate w-full text-center text-cyan-200">{first.name}</div>
            <div className="text-[11px] text-text-dim mb-2">{first.wins} W</div>
            <div className="w-full bg-gradient-to-t from-cyan-600/50 to-cyan-400/20 border border-cyan-400/50 rounded-t-lg h-[90px] flex items-start justify-center pt-2 shadow-[0_-5px_15px_rgba(34,211,238,0.15)]">
               {getMedal(0)}
            </div>
         </div>
         {/* 3rd Place */}
         <div className="flex flex-col items-center w-[100px]">
            {renderAvatar(third)}
            <div className="font-bold text-[13px] text-text mt-2 truncate w-full text-center">{third.name}</div>
            <div className="text-[11px] text-text-dim mb-2">{third.wins} W</div>
            <div className="w-full bg-gradient-to-t from-gray-600/40 to-gray-500/10 border border-gray-500/30 rounded-t-lg h-[45px] flex items-start justify-center pt-2">
               {getMedal(2)}
            </div>
         </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-5 max-w-[800px] mx-auto">
      {/* 3-Way Tabs navigation */}
      <div className="flex bg-surface border border-border rounded-full p-[3px] w-full overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={`flex-1 min-w-[100px] text-center py-2.5 rounded-full font-bold text-[12px] transition-all cursor-pointer ${
            activeTab === "leaderboard" ? "bg-primary text-white" : "text-text-dim hover:text-text"
          }`}
        >
          Leaderboard
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 min-w-[100px] text-center py-2.5 rounded-full font-bold text-[12px] transition-all cursor-pointer ${
            activeTab === "history" ? "bg-primary text-white" : "text-text-dim hover:text-text"
          }`}
        >
          Match History
        </button>
        <button
          onClick={() => setActiveTab("gameAnalytics")}
          className={`flex-1 min-w-[110px] text-center py-2.5 rounded-full font-bold text-[12px] transition-all cursor-pointer ${
            activeTab === "gameAnalytics" ? "bg-primary text-white" : "text-text-dim hover:text-text"
          }`}
        >
          Game Analytics
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex-1 min-w-[100px] text-center py-2.5 rounded-full font-bold text-[12px] transition-all cursor-pointer ${
            activeTab === "analytics" ? "bg-primary text-white" : "text-text-dim hover:text-text"
          }`}
        >
          Overall
        </button>
      </div>

      {/* 1. LEADERBOARD PANEL */}
      {activeTab === "leaderboard" && (
        <div className="flex flex-col gap-4 fade-in">
          {/* Sub toggles: Solo vs Team */}
          <div className="flex bg-surface-2 border border-border rounded-full p-[3px] max-w-[340px]">
            <button
              onClick={() => setLeaderboardType("solo")}
              className={`flex-1 text-center py-2 rounded-full font-bold text-[12px] transition-all cursor-pointer ${
                leaderboardType === "solo" ? "bg-primary text-white" : "text-text-dim hover:text-text"
              }`}
            >
              Individual Solo
            </button>
            <button
              onClick={() => setLeaderboardType("team")}
              className={`flex-1 text-center py-2 rounded-full font-bold text-[12px] transition-all cursor-pointer ${
                leaderboardType === "team" ? "bg-primary text-white" : "text-text-dim hover:text-text"
              }`}
            >
              Team Pairs
            </button>
          </div>

          {/* Ranks list */}
          <div className="flex flex-col gap-2">
            {leaderboardType === "solo" ? (
              sortedPlayers.length > 0 ? (
                <>
                  <Podium top3={sortedPlayers.slice(0, 3)} isTeam={false} />
                  {sortedPlayers.map((p, idx) => {
                    const isFirst = idx === 0;
                    return (
                      <Card
                        key={p._id}
                        onClick={() => setHistoryModalEntity({ id: p._id, name: p.name, isTeam: false })}
                        className={`p-3 flex flex-row items-center gap-3 rounded-xl transition-all cursor-pointer hover:border-primary/50 hover:bg-surface-2/20 ${
                          isFirst
                            ? "border-accent/35 bg-gradient-to-b from-accent/[0.08] to-surface"
                            : "border-border bg-surface"
                        }`}
                      >
                        <div className="shrink-0 flex items-center justify-center w-7">
                          {getMedal(idx)}
                        </div>
                      <PlayerAvatar id={p._id} name={p.name} size="sm" />
                      <div className="flex-grow min-w-0">
                        <div className="font-bold text-[14px] text-text truncate">{p.name}</div>
                        <div className="text-[12px] text-text-dim">
                          {p.wins} wins · {p.matches} matches · WR {p.winRate.toFixed(0)}%
                        </div>
                      </div>
                      <div className="text-right flex flex-col justify-center">
                        <span className={`font-display font-bold text-[18px] leading-tight ${isFirst ? "text-accent" : "text-text"}`}>
                          {p.totalPoints}
                        </span>
                        <span className="mono-label text-text-faint text-[8.5px] tracking-widest mt-0.5">PTS</span>
                      </div>
                    </Card>
                  );
                })}
                </>
              ) : (
                <div className="p-8 text-center text-text-dim border border-dashed border-border rounded-xl bg-surface/50 text-[13.5px]">
                  No player rankings recorded yet.
                </div>
              )
            ) : (
              sortedTeams.length > 0 ? (
                <>
                  <Podium top3={sortedTeams.slice(0, 3)} isTeam={true} />
                  {sortedTeams.map((t, idx) => {
                    const isFirst = idx === 0;
                    const teamPlayers = t.members.map((pId) => ({
                      id: pId,
                      name: players.find((p) => p._id === pId)?.name || "Player",
                    }));

                    return (
                      <Card
                        key={t._id}
                        onClick={() => setHistoryModalEntity({ id: t._id, name: t.name, isTeam: true })}
                        className={`p-3 flex flex-row items-center gap-3 rounded-xl transition-all cursor-pointer hover:border-primary/50 hover:bg-surface-2/20 ${
                          isFirst
                            ? "border-accent/35 bg-gradient-to-b from-accent/[0.08] to-surface"
                            : "border-border bg-surface"
                        }`}
                      >
                        <div className="shrink-0 flex items-center justify-center w-7">
                          {getMedal(idx)}
                        </div>
                      <PlayerAvatar size="sm" players={teamPlayers} />
                      <div className="flex-grow min-w-0">
                        <div className="font-bold text-[14px] text-text truncate">{t.name}</div>
                        <div className="text-[12px] text-text-dim">
                          {t.wins} wins · {t.games} matches · WR {t.winRate.toFixed(0)}%
                        </div>
                      </div>
                      <div className="text-right flex flex-col justify-center">
                        <span className={`font-display font-bold text-[18px] leading-tight ${isFirst ? "text-accent" : "text-text"}`}>
                          {t.points}
                        </span>
                        <span className="mono-label text-text-faint text-[8.5px] tracking-widest mt-0.5">PTS</span>
                      </div>
                    </Card>
                  );
                })}
                </>
              ) : (
                <div className="p-8 text-center text-text-dim border border-dashed border-border rounded-xl bg-surface/50 text-[13.5px]">
                  No team combination rankings recorded yet.
                </div>
              )
            )}
          </div>
        </div>
      )}

      {/* 2. MATCH HISTORY PANEL */}
      {activeTab === "history" && (
        <div className="flex flex-col gap-4 fade-in">
          {/* Filters Bar */}
          <div className="flex flex-col gap-2 bg-surface p-3.5 border border-border rounded-xl">
            <div className="flex items-center gap-2 bg-surface-2 border border-border rounded-md px-3 h-10.5">
              <Search className="h-4 w-4 text-text-dim shrink-0" />
              <input
                type="text"
                placeholder="Search game modes..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full bg-transparent text-[13.5px] text-text outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1">
              <select
                value={selectedGameFilter}
                onChange={(e) => setSelectedGameFilter(e.target.value)}
                className="h-10 border border-border bg-surface-2 text-text text-[13px] font-semibold rounded-md px-2 outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Games</option>
                {games.map((g) => (
                  <option key={g._id} value={g._id} className="bg-surface">
                    {g.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedPlayerFilter}
                onChange={(e) => setSelectedPlayerFilter(e.target.value)}
                className="h-10 border border-border bg-surface-2 text-text text-[13px] font-semibold rounded-md px-2 outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Players</option>
                {players.map((p) => (
                  <option key={p._id} value={p._id} className="bg-surface">
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Scroller list */}
          <div className="flex flex-col gap-3">
            {formattedRounds.length > 0 ? (
              formattedRounds.map((round: any) => {
                const isTourney = round.isTournament;
                const tourneyObj = isTourney && round.tournamentId ? dataService.getTournaments().find((t: any) => t._id === round.tournamentId) : null;
                const dateStr = new Date(round.date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
                
                const c1 = round.competitors[0] || { name: "Player A", playersList: [], gamesWon: 0, score: 0, isWinner: false };
                const c2 = round.competitors[1] || { name: "Player B", playersList: [], gamesWon: 0, score: 0, isWinner: false };

                return (
                  <Card
                    key={round.roundId}
                    onClick={() => router.push(`/matches/round/${round.roundId}`)}
                    className="p-3.5 border border-border bg-surface rounded-xl flex flex-col gap-3 cursor-pointer hover:border-primary/50 hover:bg-surface-2/20 transition-all"
                  >
                    {/* Header */}
                    <div className="flex justify-between items-center border-b border-border/40 pb-2">
                      <Badge
                        className={`border-none font-semibold text-[10px] rounded-full px-2.5 py-0.5 flex items-center gap-1 ${
                          isTourney
                            ? "bg-accent/10 text-accent"
                            : "bg-primary/10 text-text-dim"
                        }`}
                      >
                        {isTourney ? <Trophy className="h-3 w-3" /> : <Gamepad className="h-3 w-3" />}
                        {isTourney ? `${tourneyObj?.name || "Tournament"}` : "Quick Match"}
                      </Badge>
                      <span className="mono-label text-text-faint text-[9.5px] uppercase font-mono">{dateStr}</span>
                    </div>

                    {/* Competitors rows */}
                    <div className="flex flex-col gap-1.5">
                      <div
                        className={`flex justify-between items-center px-2.5 py-1.8 rounded-lg transition-all ${
                          c1.isWinner
                            ? "bg-accent/[0.08] border border-dashed border-accent/40"
                            : "border border-transparent"
                        }`}
                      >
                        <span className={`font-semibold text-[13px] flex items-center gap-2 ${c1.isWinner ? "text-accent" : "text-text-dim"}`}>
                          <PlayerAvatar players={c1.playersList} size="xs" />
                          {c1.name}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className={`font-mono text-[11px] ${c1.isWinner ? "text-accent/80" : "text-text-faint"}`}>
                            {c1.score} pts
                          </span>
                          <span className={`font-display font-bold text-[14.5px] tabular-nums ${c1.isWinner ? "text-accent" : "text-text-dim"}`}>
                            {c1.gamesWon}
                          </span>
                        </div>
                      </div>

                      <div
                        className={`flex justify-between items-center px-2.5 py-1.8 rounded-lg transition-all ${
                          c2.isWinner
                            ? "bg-accent/[0.08] border border-dashed border-accent/40"
                            : "border border-transparent"
                        }`}
                      >
                        <span className={`font-semibold text-[13px] flex items-center gap-2 ${c2.isWinner ? "text-accent" : "text-text-dim"}`}>
                          <PlayerAvatar players={c2.playersList} size="xs" />
                          {c2.name}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className={`font-mono text-[11px] ${c2.isWinner ? "text-accent/80" : "text-text-faint"}`}>
                            {c2.score} pts
                          </span>
                          <span className={`font-display font-bold text-[14.5px] tabular-nums ${c2.isWinner ? "text-accent" : "text-text-dim"}`}>
                            {c2.gamesWon}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-[12px] text-text-faint font-semibold tracking-wider font-mono uppercase mt-1 px-1 flex justify-between items-center">
                      <span>{round.summaryText}</span>
                      <span className="text-primary font-bold flex items-center gap-0.5 hover:underline">
                        Edit details <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </Card>
                );
              })
            ) : (
              <div className="p-8 text-center text-text-dim border border-dashed border-border rounded-xl bg-surface/50 text-[13.5px]">
                No matches match your filter criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. ANALYTICS PANEL */}
      {activeTab === "analytics" && (
        <div className="flex flex-col gap-4 fade-in">
          {/* Quick Metrics grid */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-4 border-border bg-surface rounded-xl flex flex-row justify-between items-center">
              <div>
                <span className="mono-label text-text-faint text-[9.5px] uppercase">TOTAL MATCHES</span>
                <div className="font-display font-bold text-[24px] text-text mt-1">{analytics.totalMatches}</div>
              </div>
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <Flame className="h-5 w-5" />
              </div>
            </Card>

            <Card className="p-4 border-border bg-surface rounded-xl flex flex-row justify-between items-center">
              <div>
                <span className="mono-label text-text-faint text-[9.5px] uppercase">TOTAL PLAYERS</span>
                <div className="font-display font-bold text-[24px] text-text mt-1">{analytics.totalPlayers}</div>
              </div>
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <Users className="h-5 w-5" />
              </div>
            </Card>
          </div>

          {/* Record table details */}
          <h3 className="mono-label text-text-faint text-[10.5px] uppercase mt-2">Performance Records</h3>
          <Card className="p-4 border-border bg-surface rounded-xl flex flex-col gap-3.5 divide-y divide-border/30">
            <div className="flex justify-between items-center text-[13.5px]">
              <span className="font-semibold text-text-dim">Most Played Game</span>
              <span className="font-bold text-text">{analytics.mostPlayedGame}</span>
            </div>
            <div className="flex justify-between items-center text-[13.5px]">
              <span className="font-semibold text-text-dim">Most Active Player</span>
              <span className="font-bold text-text">{analytics.mostActivePlayer}</span>
            </div>
            <div className="flex justify-between items-center text-[13.5px]">
              <span className="font-semibold text-text-dim">Top Scoring Team combination</span>
              <span className="font-bold text-primary">{analytics.highestScoringTeam}</span>
            </div>
          </Card>

          {/* Longest Win Streaks */}
          <h3 className="mono-label text-text-faint text-[10.5px] uppercase mt-2">Longest Win Streaks</h3>
          <Card className="p-0 border-border bg-surface rounded-xl overflow-hidden flex flex-col divide-y divide-border/30">
            {analytics.winStreaks.length > 0 ? (
              analytics.winStreaks.map((p, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 border-b border-border/25 last:border-0">
                  <span className="text-[17px] w-6 text-center">{idx === 0 ? "🔥" : idx === 1 ? "⭐" : "✨"}</span>
                  <PlayerAvatar id={p.id} name={p.name} size="xs" />
                  <span className="font-bold text-[13.5px] text-text flex-1 truncate">{p.name}</span>
                  <div className="text-right flex items-center gap-1">
                    <span className="font-display font-bold text-[17px] text-[#45D999]">{p.streak}</span>
                    <span className="mono-label text-text-faint text-[8.5px] font-bold">WINS</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-text-dim italic text-[12.5px]">
                No win streaks active. Play matches to build streaks!
              </div>
            )}
          </Card>
        </div>
      )}

      {/* 4. GAME ANALYTICS PANEL */}
      {activeTab === "gameAnalytics" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 fade-in">
           {gameAnalytics.map(ga => {
              const GameIcon = getIcon(ga.game.icon);
              return (
                 <Card key={ga.game._id} className="p-4 border-border bg-surface rounded-xl">
                    <div className="flex items-center gap-2 mb-4 border-b border-border/40 pb-2">
                       <GameIcon className="h-5 w-5 text-text-dim" />
                       <h3 className="font-bold text-[15px]">{ga.game.name}</h3>
                    </div>
                    {ga.top.length > 0 ? (
                       <div className="flex flex-col gap-2">
                          {ga.top.map((t, idx) => (
                             <div key={idx} className="flex justify-between items-center text-[13px]">
                                <span className="flex items-center gap-2">
                                   {getMedal(idx)}
                                   <span className="font-semibold text-text truncate max-w-[120px]">{t.name}</span>
                                </span>
                                <div className="text-right shrink-0">
                                   <span className="font-bold text-accent">{t.wins} W</span>
                                   <span className="text-text-dim text-[11px] ml-2">{t.points} pts</span>
                                </div>
                             </div>
                          ))}
                       </div>
                    ) : (
                       <div className="text-text-dim text-[12px] italic text-center py-4">No matches played yet.</div>
                    )}
                 </Card>
              )
           })}
        </div>
      )}

      {/* DETAILED MATCH HISTORY MODAL */}
      {historyModalEntity && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
           <div className="bg-surface border border-border rounded-2xl w-full max-w-[500px] max-h-[85vh] flex flex-col shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-border/40">
                 <h2 className="font-display font-bold text-[16px] flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-primary" />
                    Match History: {historyModalEntity.name}
                 </h2>
                 <button onClick={() => setHistoryModalEntity(null)} className="p-1 rounded-full hover:bg-surface-2 transition-all cursor-pointer">
                    <X className="h-5 w-5 text-text-dim" />
                 </button>
              </div>
              <div className="overflow-y-auto p-4 flex flex-col gap-3 flex-1">
                 {formattedRounds.filter(r => r.competitors.some(c => c.id === historyModalEntity.id)).length > 0 ? (
                    formattedRounds.filter(r => r.competitors.some(c => c.id === historyModalEntity.id)).map(round => {
                       const c1 = round.competitors[0] || { name: "Player A", playersList: [], gamesWon: 0, score: 0, isWinner: false };
                       const c2 = round.competitors[1] || { name: "Player B", playersList: [], gamesWon: 0, score: 0, isWinner: false };
                       return (
                          <Card key={round.roundId} className="p-3.5 border border-border bg-surface-2 rounded-xl flex flex-col gap-3">
                             <div className="flex justify-between items-center border-b border-border/40 pb-2">
                                <Badge className="bg-primary/10 text-text-dim border-none font-semibold text-[10px] rounded-full flex items-center gap-1">
                                   <Gamepad className="h-3 w-3" /> Quick Match
                                </Badge>
                                <span className="mono-label text-text-faint text-[9.5px] uppercase font-mono">
                                   {new Date(round.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                                </span>
                             </div>
                             <div className="flex flex-col gap-1.5">
                                <div className={`flex justify-between items-center px-2.5 py-1.8 rounded-lg ${c1.isWinner ? "bg-accent/[0.08] border border-dashed border-accent/40" : ""}`}>
                                   <span className={`font-semibold text-[13px] ${c1.isWinner ? "text-accent" : "text-text-dim"}`}>{c1.name}</span>
                                   <div className="flex items-center gap-3">
                                      <span className={`font-mono text-[11px] ${c1.isWinner ? "text-accent/80" : "text-text-faint"}`}>{c1.score} pts</span>
                                      <span className={`font-display font-bold text-[14.5px] ${c1.isWinner ? "text-accent" : "text-text-dim"}`}>{c1.gamesWon} W</span>
                                   </div>
                                </div>
                                <div className={`flex justify-between items-center px-2.5 py-1.8 rounded-lg ${c2.isWinner ? "bg-accent/[0.08] border border-dashed border-accent/40" : ""}`}>
                                   <span className={`font-semibold text-[13px] ${c2.isWinner ? "text-accent" : "text-text-dim"}`}>{c2.name}</span>
                                   <div className="flex items-center gap-3">
                                      <span className={`font-mono text-[11px] ${c2.isWinner ? "text-accent/80" : "text-text-faint"}`}>{c2.score} pts</span>
                                      <span className={`font-display font-bold text-[14.5px] ${c2.isWinner ? "text-accent" : "text-text-dim"}`}>{c2.gamesWon} W</span>
                                   </div>
                                </div>
                             </div>
                             <div className="text-[11px] text-text-dim italic text-center border-t border-border/40 pt-2">{round.summaryText}</div>
                          </Card>
                       )
                    })
                 ) : (
                    <div className="text-center p-6 text-text-dim italic text-[13px]">No matches played.</div>
                 )}
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
