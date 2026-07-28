"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Trophy, Shield, Calendar, Search, BarChart3, Users, Flame, Star, Sparkles } from "lucide-react";
import { Card, LeaderboardItem, MatchCard } from "@/components/ui/Cards";
import dataService, { ClientPlayer, ClientMatch, ClientGame, ClientTeam } from "@/lib/dataService";

export default function StatisticsPage() {
  return (
    <Suspense fallback={<div className="empty-state-box">Loading stats & leaderboard...</div>}>
      <StatisticsContent />
    </Suspense>
  );
}

function StatisticsContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "leaderboard";
  
  const [activeTab, setActiveTab] = useState<"leaderboard" | "history" | "analytics">("leaderboard");
  
  // Sub-tab for leaderboard: solo vs team
  const [leaderboardType, setLeaderboardType] = useState<"solo" | "team">("solo");

  // Master Data
  const [players, setPlayers] = useState<ClientPlayer[]>([]);
  const [games, setGames] = useState<ClientGame[]>([]);
  const [teams, setTeams] = useState<ClientTeam[]>([]);
  const [matches, setMatches] = useState<ClientMatch[]>([]);

  // History filters
  const [selectedGameFilter, setSelectedGameFilter] = useState("");
  const [selectedPlayerFilter, setSelectedPlayerFilter] = useState("");
  const [historySearch, setHistorySearch] = useState("");

  useEffect(() => {
    // Set initial tab if URL query parameter matches
    if (initialTab === "history" || initialTab === "analytics" || initialTab === "leaderboard") {
      setActiveTab(initialTab);
    }
    loadData();
  }, [initialTab]);

  const loadData = () => {
    setPlayers(dataService.getPlayers());
    setGames(dataService.getGames());
    setTeams(dataService.getTeams());
    setMatches(dataService.getMatches());
  };

  // 1. Leaderboards formatting
  const sortedPlayers = [...players].sort((a, b) => b.totalPoints - a.totalPoints || b.winRate - a.winRate);
  const sortedTeams = [...teams].sort((a, b) => b.points - a.points || b.winRate - a.winRate);

  // 2. Matches History filtering
  const filteredMatches = matches.filter((m) => {
    const matchesGame = selectedGameFilter ? m.game === selectedGameFilter : true;
    const matchesPlayer = selectedPlayerFilter ? m.players.includes(selectedPlayerFilter) : true;
    
    // Text search filter
    const gameObj = games.find((g) => g._id === m.game);
    const matchesSearch = historySearch
      ? gameObj?.name.toLowerCase().includes(historySearch.toLowerCase()) ||
        m.matchType.toLowerCase().includes(historySearch.toLowerCase())
      : true;

    return matchesGame && matchesPlayer && matchesSearch;
  });

  // Format matches for rendering in MatchCard
  const formattedMatches = filteredMatches.map((m) => {
    const gameObj = games.find((g) => g._id === m.game) || { name: "Unknown", icon: "🎮" };
    const sessionObj = m.session ? dataService.getSessions().find((s) => s._id === m.session) : null;

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
      gameName: gameObj.name,
      gameIcon: gameObj.icon,
      date: m.date,
      matchType: m.matchType,
      teamScores: m.matchType === "Team Match" ? teamScores : soloScores,
      sessionName: sessionObj?.name || undefined,
    };
  });

  // 3. Analytics Computations
  const getAnalytics = () => {
    const totalMatches = matches.length;
    const totalPlayers = players.length;

    // Most played game
    let mostPlayedGame = "None";
    let maxGameMatches = -1;
    games.forEach((g) => {
      if (g.totalMatchesPlayed > maxGameMatches) {
        maxGameMatches = g.totalMatchesPlayed;
        mostPlayedGame = g.name;
      }
    });

    // Most active player
    let mostActivePlayer = "None";
    let maxPlayerMatches = -1;
    players.forEach((p) => {
      if (p.matches > maxPlayerMatches) {
        maxPlayerMatches = p.matches;
        mostActivePlayer = p.name;
      }
    });

    // Highest scoring team
    let highestScoringTeam = "None";
    let maxTeamPoints = -1;
    teams.forEach((t) => {
      if (t.points > maxTeamPoints) {
        maxTeamPoints = t.points;
        highestScoringTeam = t.name;
      }
    });

    // Compute win streaks
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
      return { name: p.name, avatar: p.avatar, streak: maxStreak };
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

  return (
    <div className="stats-view">
      {/* Top Main Tab Navigation */}
      <div className="stats-tabs">
        <button className={`tab-btn ${activeTab === "leaderboard" ? "active" : ""}`} onClick={() => setActiveTab("leaderboard")}>
          Leaderboard
        </button>
        <button className={`tab-btn ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
          Match History
        </button>
        <button className={`tab-btn ${activeTab === "analytics" ? "active" : ""}`} onClick={() => setActiveTab("analytics")}>
          Analytics
        </button>
      </div>

      {/* Leaderboard Panel */}
      {activeTab === "leaderboard" && (
        <div className="tab-panel fade-in">
          {/* Sub toggles: Solo vs Team */}
          <div className="leaderboard-toggles">
            <button
              className={`toggle-sub-btn ${leaderboardType === "solo" ? "active" : ""}`}
              onClick={() => setLeaderboardType("solo")}
            >
              <Users size={16} /> Individual Solo
            </button>
            <button
              className={`toggle-sub-btn ${leaderboardType === "team" ? "active" : ""}`}
              onClick={() => setLeaderboardType("team")}
            >
              <Shield size={16} /> Team Pairs
            </button>
          </div>

          <div className="leaderboard-ranks-list">
            {leaderboardType === "solo" ? (
              sortedPlayers.length > 0 ? (
                sortedPlayers.map((p, idx) => (
                  <LeaderboardItem
                    key={p._id}
                    rank={idx + 1}
                    name={p.name}
                    avatar={p.avatar}
                    score={p.totalPoints}
                    subtitle={`${p.wins} Wins • ${p.matches} Matches • WR ${p.winRate.toFixed(0)}%`}
                  />
                ))
              ) : (
                <div className="empty-state-box">No player rankings recorded.</div>
              )
            ) : (
              sortedTeams.length > 0 ? (
                sortedTeams.map((t, idx) => (
                  <LeaderboardItem
                    key={t._id}
                    rank={idx + 1}
                    name={t.name}
                    avatar="🛡️"
                    score={t.points}
                    subtitle={`${t.wins} Wins • ${t.games} Matches • WR ${t.winRate.toFixed(0)}%`}
                    isTeam
                  />
                ))
              ) : (
                <div className="empty-state-box">No team combination rankings recorded.</div>
              )
            )}
          </div>
        </div>
      )}

      {/* History Panel */}
      {activeTab === "history" && (
        <div className="tab-panel fade-in">
          {/* Dynamic Filters Row */}
          <div className="filters-container">
            <div className="search-bar">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search game modes..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-selects-row">
              <select
                value={selectedGameFilter}
                onChange={(e) => setSelectedGameFilter(e.target.value)}
                className="filter-dropdown"
              >
                <option value="">All Games</option>
                {games.map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedPlayerFilter}
                onChange={(e) => setSelectedPlayerFilter(e.target.value)}
                className="filter-dropdown"
              >
                <option value="">All Players</option>
                {players.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* History Matches List */}
          <div className="history-matches-scroller">
            {formattedMatches.length > 0 ? (
              formattedMatches.map((m) => (
                <MatchCard
                  key={m._id}
                  gameName={m.gameName}
                  gameIcon={m.gameIcon}
                  date={m.date}
                  matchType={m.matchType}
                  teamScores={m.teamScores}
                  sessionName={m.sessionName}
                />
              ))
            ) : (
              <div className="empty-state-box">No matches match your filter criteria.</div>
            )}
          </div>
        </div>
      )}

      {/* Analytics Panel */}
      {activeTab === "analytics" && (
        <div className="tab-panel fade-in">
          <div className="analytics-grid">
            <Card className="analytics-stat-card">
              <div className="stat-flex">
                <div className="stat-info">
                  <span className="stat-label">Total Matches</span>
                  <span className="stat-number">{analytics.totalMatches}</span>
                </div>
                <Flame size={32} className="stat-icon-color text-red" />
              </div>
            </Card>

            <Card className="analytics-stat-card">
              <div className="stat-flex">
                <div className="stat-info">
                  <span className="stat-label">Total Players</span>
                  <span className="stat-number">{analytics.totalPlayers}</span>
                </div>
                <Users size={32} className="stat-icon-color text-blue" />
              </div>
            </Card>
          </div>

          <h3 className="analytics-section-title">Performance Records</h3>
          
          <Card className="analytics-details-card">
            <div className="detail-row">
              <span className="detail-label">Most Played Game</span>
              <span className="detail-value">{analytics.mostPlayedGame}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Most Active Player</span>
              <span className="detail-value">{analytics.mostActivePlayer}</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">Top Scoring Team combination</span>
              <span className="detail-value text-bold-val">{analytics.highestScoringTeam}</span>
            </div>
          </Card>

          {/* Streaks Card */}
          <h3 className="analytics-section-title">Longest Win Streaks</h3>
          <Card className="streaks-display-card">
            {analytics.winStreaks.length > 0 ? (
              analytics.winStreaks.map((p, idx) => (
                <div key={idx} className="streak-row">
                  <span className="streak-medal">{idx === 0 ? "🔥" : idx === 1 ? "⭐" : "✨"}</span>
                  <span className="streak-avatar">{p.avatar}</span>
                  <span className="streak-name">{p.name}</span>
                  <div className="streak-count">
                    <span>{p.streak}</span>
                    <span className="streak-lbl">WINS</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-streak-lbl">No win streaks active. Play matches to build streaks!</div>
            )}
          </Card>
        </div>
      )}

      <style jsx>{`
        .stats-view {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        .stats-tabs {
          display: flex;
          background-color: var(--surface-container-high);
          padding: 4px;
          border-radius: var(--rounded-md);
          width: 100%;
        }
        .tab-btn {
          flex: 1;
          border: none;
          background: none;
          padding: 10px 0;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: var(--on-surface-variant);
          border-radius: var(--rounded-default);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .tab-btn.active {
          background-color: var(--background);
          color: var(--primary-container);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
        }
        :global([data-theme="dark"]) .tab-btn.active {
          color: var(--primary);
        }
        .tab-panel {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        /* Leaderboard styling */
        .leaderboard-toggles {
          display: flex;
          gap: 8px;
        }
        .toggle-sub-btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          height: 40px;
          border: 1px solid var(--outline-variant);
          background-color: var(--surface-container-low);
          color: var(--on-surface-variant);
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 700;
          border-radius: var(--rounded-full);
          cursor: pointer;
          transition: all 0.15s;
        }
        .toggle-sub-btn.active {
          background-color: var(--primary-container);
          color: #ffffff;
          border-color: var(--primary-container);
        }
        :global([data-theme="dark"]) .toggle-sub-btn.active {
          background-color: var(--primary);
          color: #131634;
          border-color: var(--primary);
        }
        .leaderboard-ranks-list {
          display: flex;
          flex-direction: column;
        }
        .empty-state-box {
          text-align: center;
          padding: var(--spacing-lg);
          background-color: var(--surface-container-low);
          border-radius: var(--rounded-md);
          color: var(--medium-grey);
          font-size: 13px;
        }

        /* History styling */
        .filters-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .search-bar {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: var(--surface-container-lowest);
          border: 1px solid var(--outline-variant);
          border-radius: var(--rounded-default);
          padding: 0 12px;
          height: 48px;
        }
        :global([data-theme="dark"]) .search-bar {
          background-color: var(--surface);
        }
        .search-icon {
          color: var(--medium-grey);
        }
        .search-input {
          width: 100%;
          border: none;
          background: none;
          outline: none;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          color: var(--on-surface);
        }
        .filter-selects-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }
        .filter-dropdown {
          height: 44px;
          border: 1px solid var(--outline-variant);
          border-radius: var(--rounded-default);
          background-color: var(--surface-container-low);
          color: var(--on-surface);
          outline: none;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          padding: 0 var(--spacing-xs);
        }
        .history-matches-scroller {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }

        /* Analytics styling */
        .analytics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--spacing-xs);
        }
        .analytics-stat-card {
          padding: 16px !important;
        }
        .stat-flex {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }
        .stat-info {
          display: flex;
          flex-direction: column;
        }
        .stat-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--medium-grey);
          text-transform: uppercase;
        }
        .stat-number {
          font-size: 24px;
          font-weight: 800;
          color: var(--on-surface);
        }
        .stat-icon-color.text-red {
          color: var(--error);
        }
        .stat-icon-color.text-blue {
          color: var(--primary-container);
        }
        :global([data-theme="dark"]) .stat-icon-color.text-blue {
          color: var(--primary);
        }
        .analytics-section-title {
          font-size: 12px;
          font-weight: 700;
          color: var(--medium-grey);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 12px 0 4px 0;
        }
        .analytics-details-card {
          gap: 12px !important;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }
        .detail-label {
          color: var(--medium-grey);
          font-weight: 600;
        }
        .detail-value {
          color: var(--on-surface);
          font-weight: 700;
        }
        .detail-value.text-bold-val {
          color: var(--primary-container);
        }
        :global([data-theme="dark"]) .detail-value.text-bold-val {
          color: var(--primary);
        }
        
        .streaks-display-card {
          gap: 10px !important;
          padding: 8px 0 !important;
        }
        .streak-row {
          display: flex;
          align-items: center;
          padding: 8px 16px;
          border-bottom: 1px solid var(--outline-variant);
        }
        .streak-row:last-child {
          border-bottom: none;
        }
        .streak-medal {
          font-size: 16px;
          margin-right: 6px;
        }
        .streak-avatar {
          font-size: 18px;
          margin-right: 8px;
        }
        .streak-name {
          font-size: 14px;
          font-weight: 700;
          color: var(--on-surface);
          flex-grow: 1;
        }
        .streak-count {
          font-size: 16px;
          font-weight: 800;
          color: var(--accent-green);
        }
        .streak-lbl {
          font-size: 9px;
          font-weight: 700;
          color: var(--medium-grey);
          margin-left: 2px;
        }
        .empty-streak-lbl {
          font-size: 12px;
          color: var(--medium-grey);
          text-align: center;
          padding: 16px;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
