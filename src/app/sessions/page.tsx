"use client";

import React, { useEffect, useState } from "react";
import { Flame, Plus, Calendar, Clock, Trophy, Check, ArrowRight } from "lucide-react";
import { Button, Badge } from "@/components/ui/Buttons";
import { Card, MatchCard } from "@/components/ui/Cards";
import { useToast } from "@/components/ui/Toast";
import dataService, { ClientSession, ClientMatch, ClientPlayer, ClientGame } from "@/lib/dataService";

export default function SessionsPage() {
  const { showToast } = useToast();
  const [activeSession, setActiveSession] = useState<ClientSession | undefined>(undefined);
  const [sessions, setSessions] = useState<ClientSession[]>([]);
  const [matches, setMatches] = useState<ClientMatch[]>([]);
  const [players, setPlayers] = useState<ClientPlayer[]>([]);
  const [games, setGames] = useState<ClientGame[]>([]);

  // Create session form
  const [newSessionName, setNewSessionName] = useState("");

  // Session results modal state
  const [finishedSessionSummary, setFinishedSessionSummary] = useState<{
    mvp: ClientPlayer;
    champion: ClientPlayer;
    matchesCount: number;
    name: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setActiveSession(dataService.getActiveSession());
    setSessions(dataService.getSessions().filter((s) => !s.isActive)); // History
    setMatches(dataService.getMatches());
    setPlayers(dataService.getPlayers());
    setGames(dataService.getGames());
  };

  const handleStartSession = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newSessionName.trim() || `Game Night - ${new Date().toLocaleDateString()}`;
    
    try {
      dataService.saveSession({
        name,
        date: new Date().toISOString(),
        isActive: true,
      });
      showToast(`Session "${name}" started!`, "success");
      setNewSessionName("");
      loadData();
    } catch {
      showToast("Failed to start session", "error");
    }
  };

  const handleFinishSession = () => {
    if (!activeSession) return;
    if (window.confirm("Are you sure you want to end this game night?")) {
      const sessionMatches = matches.filter((m) => m.session === activeSession._id);
      
      // Calculate MVP & Champion
      // Standings for current session matches
      const sessionScores: Record<string, number> = {};
      const sessionWins: Record<string, number> = {};

      sessionMatches.forEach((m) => {
        // Points
        Object.entries(m.scores).forEach(([id, val]) => {
          sessionScores[id] = (sessionScores[id] || 0) + val;
        });
        // Wins
        m.winners.forEach((wId) => {
          sessionWins[wId] = (sessionWins[wId] || 0) + 1;
        });
      });

      // Find player with highest points (MVP)
      let mvpId = "";
      let maxPoints = -1;
      Object.entries(sessionScores).forEach(([id, points]) => {
        // Filter out team IDs if team mode was played
        const isPlayer = players.some((p) => p._id === id);
        if (isPlayer && points > maxPoints) {
          maxPoints = points;
          mvpId = id;
        }
      });

      // Find player with highest wins (Champion)
      let championId = "";
      let maxWins = -1;
      Object.entries(sessionWins).forEach(([id, wins]) => {
        const isPlayer = players.some((p) => p._id === id);
        if (isPlayer && wins > maxWins) {
          maxWins = wins;
          championId = id;
        }
      });

      // Fallbacks
      const finalMvpId = mvpId || (players[0]?._id);
      const finalChampId = championId || finalMvpId || (players[0]?._id);

      const mvpPlayer = players.find((p) => p._id === finalMvpId);
      const champPlayer = players.find((p) => p._id === finalChampId);

      const durationMinutes = Math.round(
        (new Date().getTime() - new Date(activeSession.date).getTime()) / 60000
      );

      // Save finished session
      const updatedSession = {
        ...activeSession,
        durationMinutes,
        mvp: finalMvpId,
        champion: finalChampId,
        isActive: false,
      };

      dataService.saveSession(updatedSession);
      showToast(`Game night ended! MVP is ${mvpPlayer?.name || "None"}`, "success");

      if (mvpPlayer && champPlayer) {
        setFinishedSessionSummary({
          mvp: mvpPlayer,
          champion: champPlayer,
          matchesCount: sessionMatches.length,
          name: activeSession.name,
        });
      }

      loadData();
    }
  };

  // Get active session matches and compute active session standings
  const activeSessionMatches = activeSession
    ? matches.filter((m) => m.session === activeSession._id)
    : [];

  const computedActiveStandings = () => {
    const scores: Record<string, number> = {};
    activeSessionMatches.forEach((m) => {
      if (m.matchType === "Team Match") {
        // For team matches, split the team score among its member players for this session's individual standing
        m.teams.forEach((tId) => {
          const teamObj = dataService.getTeams().find((t) => t._id === tId);
          if (!teamObj) return;
          const score = m.scores[tId] || 0;
          const split = Math.round(score / Math.max(teamObj.members.length, 1));
          teamObj.members.forEach((pId) => {
            scores[pId] = (scores[pId] || 0) + split;
          });
        });
      } else {
        Object.entries(m.scores).forEach(([pId, score]) => {
          scores[pId] = (scores[pId] || 0) + score;
        });
      }
    });

    return Object.entries(scores)
      .map(([pId, score]) => {
        const player = players.find((p) => p._id === pId);
        return {
          id: pId,
          name: player?.name || "Player",
          avatar: player?.avatar || "👤",
          score,
        };
      })
      .sort((a, b) => b.score - a.score);
  };

  const activeStandings = computedActiveStandings();

  // Format matches for MatchCard component
  const formatMatches = (matchList: ClientMatch[]) => {
    return matchList.map((m) => {
      const game = games.find((g) => g._id === m.game) || { name: "Unknown", icon: "🎮" };
      const teamScores = m.teams.map((tId) => {
        const teamObj = dataService.getTeams().find((t) => t._id === tId) || { name: "Team", members: [] };
        const teamPlayers = teamObj.members.map((pId: string) => {
          const pObj = players.find((p) => p._id === pId);
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
        const pObj = players.find((p) => p._id === pId) || { name: "Player", avatar: "👤" };
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
      };
    });
  };

  const formattedActiveMatches = formatMatches(activeSessionMatches);

  return (
    <div className="sessions-view">
      {/* Session Summary Modal after Ending Session */}
      {finishedSessionSummary && (
        <div className="modal-overlay" onClick={() => setFinishedSessionSummary(null)}>
          <div className="modal-card fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-tropy-icon">🏆</div>
            <h2 className="modal-title">Game Night Wrapped!</h2>
            <p className="modal-sub">"{finishedSessionSummary.name}" has officially concluded</p>
            
            <div className="summary-awards">
              <div className="award-item">
                <span className="award-icon">🥇</span>
                <span className="award-title">Session Champion</span>
                <div className="award-winner">
                  <span className="winner-avatar">{finishedSessionSummary.champion.avatar}</span>
                  <span className="winner-name">{finishedSessionSummary.champion.name}</span>
                </div>
                <span className="award-desc">Most wins scored tonight!</span>
              </div>

              <div className="award-item">
                <span className="award-icon">⭐</span>
                <span className="award-title">Session MVP</span>
                <div className="award-winner">
                  <span className="winner-avatar">{finishedSessionSummary.mvp.avatar}</span>
                  <span className="winner-name">{finishedSessionSummary.mvp.name}</span>
                </div>
                <span className="award-desc">Highest score accumulated!</span>
              </div>
            </div>

            <Button onClick={() => setFinishedSessionSummary(null)} fullWidth size="lg">
              Close & Save
            </Button>
          </div>
        </div>
      )}

      {/* Active Session Content */}
      {activeSession ? (
        <div className="active-session-layout">
          <div className="session-dashboard-card">
            <div className="session-card-header">
              <div className="active-flame-box">
                <Flame className="active-flame-icon" size={24} />
              </div>
              <div className="session-card-details">
                <span className="active-badge-tag">ACTIVE GAME NIGHT</span>
                <h1 className="active-session-title">{activeSession.name}</h1>
                <span className="active-session-date">
                  Started {new Date(activeSession.date).toLocaleDateString()} at{" "}
                  {new Date(activeSession.date).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </span>
              </div>
            </div>

            <div className="session-action-buttons">
              <Button variant="danger" fullWidth onClick={handleFinishSession}>
                <Check size={18} /> End Game Night
              </Button>
            </div>
          </div>

          {/* Session Leaderboard */}
          <div className="session-section">
            <h2 className="section-title">
              <Trophy size={18} /> Session Leaderboard
            </h2>
            {activeStandings.length > 0 ? (
              <Card className="standings-card">
                {activeStandings.map((p, idx) => (
                  <div key={p.id} className="standing-row">
                    <div className="standing-rank">{idx + 1}</div>
                    <span className="standing-avatar">{p.avatar}</span>
                    <span className="standing-name">{p.name}</span>
                    <div className="standing-score">
                      <span>{p.score}</span>
                      <span className="standing-pts">PTS</span>
                    </div>
                  </div>
                ))}
              </Card>
            ) : (
              <div className="session-empty-state">
                <p>No matches logged in this session yet. Standings will appear once you record scores!</p>
              </div>
            )}
          </div>

          {/* Session Matches */}
          <div className="session-section">
            <h2 className="section-title">Matches Played ({activeSessionMatches.length})</h2>
            {formattedActiveMatches.length > 0 ? (
              <div className="session-matches-list">
                {formattedActiveMatches.map((m) => (
                  <MatchCard
                    key={m._id}
                    gameName={m.gameName}
                    gameIcon={m.gameIcon}
                    date={m.date}
                    matchType={m.matchType}
                    teamScores={m.teamScores}
                  />
                ))}
              </div>
            ) : (
              <div className="session-empty-state">
                <p>Record a match using the bottom button or dashboard.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Start Session Form */
        <div className="no-active-session-layout">
          <div className="start-session-card">
            <div className="start-icon-banner">🏆</div>
            <h2>Start a New Game Night</h2>
            <p>Setup a session to log matches, track individual and team points, and award a session champion.</p>

            <form onSubmit={handleStartSession} className="start-form">
              <div className="form-group">
                <label className="form-label-el">Session Name</label>
                <input
                  type="text"
                  placeholder="e.g. Friday Boardgames, Office Cup"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  className="form-input-el"
                  maxLength={35}
                />
              </div>
              <Button type="submit" fullWidth size="lg">
                Start Session
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* Sessions History List */}
      {sessions.length > 0 && (
        <div className="sessions-history-section">
          <h2 className="section-title">Past Game Nights</h2>
          <div className="history-cards-list">
            {sessions.map((s) => {
              const mvpPlayer = players.find((p) => p._id === s.mvp);
              const champPlayer = players.find((p) => p._id === s.champion);
              
              return (
                <Card key={s._id} className="history-card">
                  <div className="history-header">
                    <div>
                      <h3 className="history-name">{s.name}</h3>
                      <span className="history-date">
                        {new Date(s.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    </div>
                    <Badge variant="neutral">Finished</Badge>
                  </div>
                  
                  <div className="history-grid-stats">
                    <div className="history-grid-stat">
                      <Clock size={14} className="stat-icon" />
                      <span>{s.durationMinutes} min</span>
                    </div>
                    <div className="history-grid-stat">
                      <Flame size={14} className="stat-icon" />
                      <span>{s.totalMatches} matches</span>
                    </div>
                  </div>

                  {(mvpPlayer || champPlayer) && (
                    <div className="history-winners-row">
                      {champPlayer && (
                        <div className="winner-summary-pill">
                          <Trophy size={12} className="trophy-gold" />
                          <span>Champ: <strong>{champPlayer.name}</strong></span>
                        </div>
                      )}
                      {mvpPlayer && (
                        <div className="winner-summary-pill">
                          <span>MVP: <strong>{mvpPlayer.name}</strong></span>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <style jsx>{`
        .sessions-view {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        .section-title {
          font-size: 16px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--on-background);
          margin-bottom: 4px;
        }
        
        /* Active session styling */
        .active-session-layout {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        .session-dashboard-card {
          background-color: var(--primary-container, #282b4a);
          border-radius: var(--rounded-md);
          padding: var(--spacing-md);
          color: #ffffff;
          display: flex;
          flex-direction: column;
          gap: 16px;
          border-left: 5px solid var(--accent-green);
        }
        .session-card-header {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .active-flame-box {
          background-color: rgba(107, 203, 119, 0.2);
          width: 48px;
          height: 48px;
          border-radius: var(--rounded-full);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .active-flame-icon {
          color: var(--accent-green);
          animation: flamePulse 2s infinite alternate ease-in-out;
        }
        @keyframes flamePulse {
          from { transform: scale(0.9); opacity: 0.8; }
          to { transform: scale(1.1); opacity: 1; }
        }
        .session-card-details {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }
        .active-badge-tag {
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.1em;
          color: var(--accent-green);
        }
        .active-session-title {
          font-size: 20px;
          font-weight: 800;
          line-height: 24px;
          color: #ffffff;
        }
        .active-session-date {
          font-size: 11px;
          color: var(--on-primary-container, #9092b7);
        }
        .standings-card {
          padding: 8px 0 !important;
          display: flex;
          flex-direction: column;
        }
        .standing-row {
          display: flex;
          align-items: center;
          padding: 10px 16px;
          border-bottom: 1px solid var(--outline-variant);
        }
        .standing-row:last-child {
          border-bottom: none;
        }
        .standing-rank {
          width: 24px;
          font-weight: 800;
          font-size: 13px;
          color: var(--medium-grey);
        }
        .standing-avatar {
          font-size: 18px;
          margin-right: 10px;
        }
        .standing-name {
          font-size: 15px;
          font-weight: 700;
          color: var(--on-surface);
          flex-grow: 1;
        }
        .standing-score {
          font-size: 16px;
          font-weight: 800;
          color: var(--primary-container);
        }
        :global([data-theme="dark"]) .standing-score {
          color: var(--primary);
        }
        .standing-pts {
          font-size: 10px;
          font-weight: 700;
          color: var(--medium-grey);
          margin-left: 2px;
        }
        .session-empty-state {
          padding: var(--spacing-md);
          background-color: var(--surface-container-low);
          border-radius: var(--rounded-md);
          text-align: center;
          color: var(--medium-grey);
          font-size: 13px;
        }
        .session-matches-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        /* Start Session layout */
        .no-active-session-layout {
          display: flex;
          justify-content: center;
        }
        .start-session-card {
          background-color: var(--surface-container-lowest);
          border: 1px solid var(--outline-variant);
          border-radius: var(--rounded-lg);
          padding: var(--spacing-md);
          width: 100%;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
        }
        :global([data-theme="dark"]) .start-session-card {
          background-color: var(--surface);
        }
        .start-icon-banner {
          font-size: 48px;
          margin-bottom: 4px;
        }
        .start-session-card h2 {
          font-size: 20px;
          font-weight: 800;
          color: var(--on-surface);
        }
        .start-session-card p {
          font-size: 13px;
          color: var(--medium-grey);
          max-width: 280px;
          line-height: 18px;
          margin-bottom: 12px;
        }
        .start-form {
          width: 100%;
          display: flex;
          flex-direction: column;
          gap: 16px;
          text-align: left;
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-label-el {
          font-size: 11px;
          font-weight: 700;
          color: var(--medium-grey);
          text-transform: uppercase;
        }
        .form-input-el {
          height: 48px;
          padding: 0 var(--spacing-sm);
          border: 1px solid var(--outline-variant);
          border-radius: var(--rounded-default);
          background-color: var(--surface-container-low);
          color: var(--on-surface);
          outline: none;
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          transition: border-color 0.15s;
        }
        .form-input-el:focus {
          border-color: var(--primary-container);
        }
        :global([data-theme="dark"]) .form-input-el:focus {
          border-color: var(--primary);
        }

        /* History styling */
        .sessions-history-section {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
          margin-top: 12px;
        }
        .history-cards-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }
        .history-card {
          padding: var(--spacing-sm);
        }
        .history-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .history-name {
          font-size: 15px;
          font-weight: 700;
          color: var(--on-surface);
        }
        .history-date {
          font-size: 11px;
          color: var(--medium-grey);
        }
        .history-grid-stats {
          display: flex;
          gap: 16px;
          margin-top: 8px;
          font-size: 12px;
          color: var(--on-surface-variant);
        }
        .history-grid-stat {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .stat-icon {
          color: var(--medium-grey);
        }
        .history-winners-row {
          display: flex;
          gap: 8px;
          margin-top: 12px;
          padding-top: 8px;
          border-top: 1px dashed var(--outline-variant);
        }
        .winner-summary-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background-color: var(--surface-container-low);
          padding: 3px 8px;
          border-radius: var(--rounded-sm);
          font-size: 11px;
          color: var(--on-surface-variant);
        }
        .trophy-gold {
          color: var(--accent-gold);
          fill: var(--accent-gold);
        }

        /* Wrapped Modal styling */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.5);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .modal-card {
          background-color: var(--background);
          border: 1px solid var(--outline-variant);
          border-radius: var(--rounded-lg, 16px);
          width: 100%;
          max-width: 440px;
          padding: var(--spacing-md);
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          gap: 8px;
        }
        .modal-tropy-icon {
          font-size: 64px;
          line-height: 64px;
          margin-bottom: 8px;
          animation: floatAward 3s infinite ease-in-out;
        }
        @keyframes floatAward {
          0% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
          100% { transform: translateY(0); }
        }
        .modal-title {
          font-size: 22px;
          font-weight: 800;
          color: var(--on-surface);
        }
        .modal-sub {
          font-size: 12px;
          color: var(--medium-grey);
          margin-bottom: 12px;
        }
        .summary-awards {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          margin-bottom: 20px;
        }
        .award-item {
          background-color: var(--surface-container-low);
          padding: 12px;
          border-radius: var(--rounded-md);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          border: 1px solid var(--outline-variant);
        }
        .award-icon {
          font-size: 24px;
        }
        .award-title {
          font-size: 11px;
          font-weight: 700;
          color: var(--medium-grey);
          text-transform: uppercase;
        }
        .award-winner {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .winner-avatar {
          font-size: 20px;
        }
        .winner-name {
          font-size: 16px;
          font-weight: 800;
          color: var(--on-surface);
        }
        .award-desc {
          font-size: 11px;
          color: var(--medium-grey);
        }
      `}</style>
    </div>
  );
}
