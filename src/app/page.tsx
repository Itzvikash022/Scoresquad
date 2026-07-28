"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Play, Trophy, Gamepad2, Users, Plus, ArrowRight, Activity, Flame } from "lucide-react";
import { Button, Badge } from "@/components/ui/Buttons";
import { Card, MatchCard, LeaderboardItem } from "@/components/ui/Cards";
import dataService, { ClientPlayer, ClientMatch, ClientSession, ClientTournament, ClientGame } from "@/lib/dataService";

export default function Dashboard() {
  const router = useRouter();
  const [activeSession, setActiveSession] = useState<ClientSession | undefined>(undefined);
  const [activeTournament, setActiveTournament] = useState<ClientTournament | undefined>(undefined);
  const [players, setPlayers] = useState<ClientPlayer[]>([]);
  const [matches, setMatches] = useState<ClientMatch[]>([]);
  const [games, setGames] = useState<ClientGame[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  useEffect(() => {
    // Load local-first states
    setActiveSession(dataService.getActiveSession());
    setActiveTournament(dataService.getActiveTournament());
    setPlayers(dataService.getPlayers().slice(0, 3)); // Top 3
    setMatches(dataService.getMatches().slice(0, 3)); // Recent 3
    setGames(dataService.getGames());
    setTeams(dataService.getTeams());
  }, []);

  // Format matches to include full player profiles
  const formattedMatches = matches.map((m) => {
    const game = games.find((g) => g._id === m.game) || { name: "Unknown Game", icon: "🎮" };
    const session = m.session ? dataService.getSessions().find((s) => s._id === m.session) : null;

    const teamScores = m.teams.map((tId) => {
      const teamObj = teams.find((t) => t._id === tId) || { name: "Team", members: [] };
      const teamPlayers = teamObj.members.map((pId: string) => {
        const pObj = dataService.getPlayers().find((p) => p._id === pId);
        return { name: pObj?.name || "Player", avatar: pObj?.avatar || "👤" };
      });
      return {
        name: teamObj.name,
        players: teamPlayers,
        score: m.scores[tId] || 0,
        isWinner: m.winners.includes(tId),
      };
    });

    const soloScores = m.players.map((pId) => {
      const pObj = dataService.getPlayers().find((p) => p._id === pId) || { name: "Player", avatar: "👤" };
      return {
        name: pObj.name,
        players: [{ name: pObj.name, avatar: pObj.avatar }],
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
      teamScores: m.matchType === "Team Match" ? teamScores : soloScores,
      sessionName: session?.name || undefined,
    };
  });

  return (
    <div className="dashboard-view">
      <div className="welcome-banner">
        <h1 className="welcome-title">Ready for Game Night?</h1>
        <p className="welcome-subtitle">Companion tracker for local multiplayer scoring</p>
      </div>

      {/* Quick Match start */}
      <div className="quick-actions-row">
        <Button variant="accent" fullWidth size="lg" onClick={() => router.push("/matches/new")}>
          <Play size={20} fill="#121212" /> Record Quick Match
        </Button>
      </div>

      {/* Active Session Tracker */}
      <div className="section-block">
        <h2 className="section-title">
          <Activity size={18} className="title-icon" /> Active Session
        </h2>
        {activeSession ? (
          <Card className="active-card session-active">
            <div className="active-header">
              <Flame className="active-icon animated-pulse" size={24} />
              <div className="active-title-group">
                <h3 className="active-name">{activeSession.name}</h3>
                <span className="active-sub">Started {new Date(activeSession.date).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}</span>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
            <div className="active-stats">
              <div className="active-stat">
                <span className="stat-num">{activeSession.totalMatches}</span>
                <span className="stat-lbl">Matches</span>
              </div>
              <div className="active-stat">
                <span className="stat-num">
                  {Math.round((new Date().getTime() - new Date(activeSession.date).getTime()) / 60000)}m
                </span>
                <span className="stat-lbl">Duration</span>
              </div>
            </div>
            <div className="active-actions">
              <Button size="sm" onClick={() => router.push("/sessions")}>
                Manage Session <ArrowRight size={14} />
              </Button>
            </div>
          </Card>
        ) : (
          <Card className="empty-action-card" onClick={() => router.push("/sessions")}>
            <div className="empty-action-content">
              <div className="empty-icon-circle">🎮</div>
              <div className="empty-text-group">
                <h3>Start a Game Night</h3>
                <p>Track stats, declare a champion, and log multiple matches in a session.</p>
              </div>
              <Plus size={20} className="plus-icon" />
            </div>
          </Card>
        )}
      </div>

      {/* Active Tournament Tracker */}
      {activeTournament && (
        <div className="section-block">
          <h2 className="section-title">
            <Trophy size={18} className="title-icon" /> Active Tournament
          </h2>
          <Card className="active-card tournament-active" onClick={() => router.push("/tournaments")}>
            <div className="active-header">
              <Trophy className="active-icon text-gold" size={24} />
              <div className="active-title-group">
                <h3 className="active-name">{activeTournament.name}</h3>
                <span className="active-sub">Games: {activeTournament.gamesCount}</span>
              </div>
              <Badge variant="warning">Ongoing</Badge>
            </div>
            <div className="active-actions-text">
              <span>Tap to record matches and view standings</span>
              <ArrowRight size={14} />
            </div>
          </Card>
        </div>
      )}

      {/* Top Players Leaderboard preview */}
      <div className="section-block">
        <div className="section-header-row">
          <h2 className="section-title">
            <Trophy size={18} className="title-icon" /> Top Players
          </h2>
          <button className="view-all-btn" onClick={() => router.push("/stats")}>
            View Leaderboard <ArrowRight size={12} />
          </button>
        </div>
        {players.length > 0 ? (
          <div className="top-players-list">
            {players.map((p, idx) => (
              <LeaderboardItem
                key={p._id}
                rank={idx + 1}
                name={p.name}
                avatar={p.avatar}
                score={p.totalPoints}
                subtitle={`${p.wins} Wins • ${p.winRate.toFixed(0)}% Win Rate`}
              />
            ))}
          </div>
        ) : (
          <div className="dashboard-empty-state">
            <p>No players created yet.</p>
            <Button size="sm" variant="outline" onClick={() => router.push("/players")}>
              Create Players
            </Button>
          </div>
        )}
      </div>

      {/* Recent Matches */}
      <div className="section-block">
        <div className="section-header-row">
          <h2 className="section-title">
            <Gamepad2 size={18} className="title-icon" /> Recent Matches
          </h2>
          <button className="view-all-btn" onClick={() => router.push("/stats?tab=history")}>
            Full History <ArrowRight size={12} />
          </button>
        </div>
        {formattedMatches.length > 0 ? (
          <div className="recent-matches-list">
            {formattedMatches.map((m) => (
              <MatchCard
                key={m._id}
                gameName={m.gameName}
                gameIcon={m.gameIcon}
                date={m.date}
                matchType={m.matchType}
                teamScores={m.teamScores}
                sessionName={m.sessionName}
              />
            ))}
          </div>
        ) : (
          <div className="dashboard-empty-state">
            <p>No matches recorded yet.</p>
            <Button size="sm" variant="outline" onClick={() => router.push("/matches/new")}>
              Log First Match
            </Button>
          </div>
        )}
      </div>

      <style jsx>{`
        .dashboard-view {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        .welcome-banner {
          margin-bottom: var(--spacing-xs);
        }
        .welcome-title {
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.03em;
          color: var(--primary-container);
        }
        :global([data-theme="dark"]) .welcome-title {
          color: var(--primary);
        }
        .welcome-subtitle {
          font-size: 14px;
          color: var(--medium-grey);
        }
        .quick-actions-row {
          margin-bottom: 4px;
        }
        .section-block {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }
        .section-header-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .section-title {
          font-size: 16px;
          font-weight: 700;
          letter-spacing: -0.01em;
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--on-background);
        }
        .title-icon {
          color: var(--medium-grey);
        }
        .view-all-btn {
          background: none;
          border: none;
          color: var(--primary-container);
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        :global([data-theme="dark"]) .view-all-btn {
          color: var(--primary);
        }
        .active-card {
          border-left: 4px solid var(--accent-green);
        }
        .active-card.tournament-active {
          border-left-color: var(--accent-gold);
          cursor: pointer;
        }
        .active-header {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }
        .active-icon {
          color: var(--accent-green);
        }
        .active-icon.text-gold {
          color: var(--accent-gold);
        }
        .active-title-group {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }
        .active-name {
          font-size: 16px;
          font-weight: 700;
          color: var(--on-surface);
        }
        .active-sub {
          font-size: 11px;
          color: var(--medium-grey);
        }
        .active-stats {
          display: flex;
          gap: 24px;
          margin: 8px 0;
          padding: 8px var(--spacing-sm);
          background-color: var(--surface-container-low);
          border-radius: var(--rounded-default);
        }
        .active-stat {
          display: flex;
          flex-direction: column;
        }
        .stat-num {
          font-size: 20px;
          font-weight: 800;
          color: var(--on-surface);
        }
        .stat-lbl {
          font-size: 10px;
          font-weight: 700;
          color: var(--medium-grey);
          text-transform: uppercase;
        }
        .active-actions {
          display: flex;
          justify-content: flex-end;
        }
        .active-actions-text {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-top: 8px;
          border-top: 1px solid var(--outline-variant);
          font-size: 13px;
          font-weight: 600;
          color: var(--on-surface-variant);
        }
        .empty-action-card {
          cursor: pointer;
        }
        .empty-action-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .empty-icon-circle {
          width: 44px;
          height: 44px;
          border-radius: var(--rounded-full);
          background-color: var(--surface-container-high);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
        }
        .empty-text-group {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
          gap: 2px;
        }
        .empty-text-group h3 {
          font-size: 15px;
          font-weight: 700;
          color: var(--on-surface);
        }
        .empty-text-group p {
          font-size: 12px;
          color: var(--medium-grey);
          line-height: 16px;
        }
        .plus-icon {
          color: var(--medium-grey);
        }
        .top-players-list,
        .recent-matches-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }
        .dashboard-empty-state {
          padding: var(--spacing-md);
          background-color: var(--surface-container-low);
          border-radius: var(--rounded-md);
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .dashboard-empty-state p {
          font-size: 14px;
          color: var(--medium-grey);
        }
        
        .animated-pulse {
          animation: pulse 1.8s infinite ease-in-out;
        }
        @keyframes pulse {
          0% { opacity: 0.7; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
          100% { opacity: 0.7; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
