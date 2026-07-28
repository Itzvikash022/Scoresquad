"use client";

import React from "react";
import { Play, Trophy, Users, Shield, Calendar } from "lucide-react";
import { Badge } from "./Buttons";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = "", onClick }) => {
  return (
    <div className={`card ${onClick ? "card-interactive" : ""} ${className}`} onClick={onClick}>
      {children}
      <style jsx>{`
        .card {
          background-color: var(--surface-container-lowest, #ffffff);
          border: 1px solid var(--outline-variant, #c7c5ce);
          border-radius: var(--rounded-md, 12px);
          padding: var(--spacing-sm, 16px);
          transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        :global([data-theme="dark"]) .card {
          background-color: var(--surface, #1e1e1e);
        }
        .card-interactive {
          cursor: pointer;
        }
        .card-interactive:active {
          transform: scale(0.98);
          border-color: var(--outline);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }
      `}</style>
    </div>
  );
};

interface PlayerCardProps {
  name: string;
  nickname?: string;
  avatar: string; // Emoji
  wins: number;
  losses: number;
  winRate: number;
  points?: number;
  recentForm?: string[]; // e.g. ['W', 'W', 'L', 'W']
  onClick?: () => void;
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  name,
  nickname,
  avatar,
  wins,
  losses,
  winRate,
  points = 0,
  recentForm = [],
  onClick,
}) => {
  const matches = wins + losses;

  return (
    <Card onClick={onClick}>
      <div className="player-header">
        <div className="player-avatar-bg">{avatar || "👤"}</div>
        <div className="player-identity">
          <h3 className="player-name">{name}</h3>
          {nickname && <span className="player-nickname">"{nickname}"</span>}
        </div>
        {points > 0 && (
          <div className="player-points">
            <span className="points-val">{points}</span>
            <span className="points-label">PTS</span>
          </div>
        )}
      </div>

      <div className="player-stats-row">
        <div className="stat-item">
          <span className="stat-label">Matches</span>
          <span className="stat-value">{matches}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Wins</span>
          <span className="stat-value text-win">{wins}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Win Rate</span>
          <span className="stat-value">{winRate.toFixed(0)}%</span>
        </div>
      </div>

      {recentForm.length > 0 && (
        <div className="player-form-row">
          <span className="form-label">Form:</span>
          <div className="form-bubbles">
            {recentForm.slice(-5).map((result, idx) => (
              <span key={idx} className={`form-bubble ${result === "W" ? "win" : "loss"}`}>
                {result}
              </span>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .player-header {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: var(--spacing-sm);
        }
        .player-avatar-bg {
          width: 48px;
          height: 48px;
          border-radius: var(--rounded-full);
          background-color: var(--surface-container-high);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }
        .player-identity {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }
        .player-name {
          font-size: 18px;
          font-weight: 700;
          color: var(--on-surface);
        }
        .player-nickname {
          font-size: 13px;
          color: var(--on-surface-variant);
          font-style: italic;
        }
        .player-points {
          text-align: right;
          display: flex;
          flex-direction: column;
        }
        .points-val {
          font-size: 20px;
          font-weight: 800;
          color: var(--primary-container);
        }
        :global([data-theme="dark"]) .points-val {
          color: var(--primary);
        }
        .points-label {
          font-size: 10px;
          font-weight: 700;
          color: var(--medium-grey);
        }
        .player-stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          background-color: var(--surface-container-low);
          padding: 8px;
          border-radius: var(--rounded-default);
          text-align: center;
        }
        .stat-item {
          display: flex;
          flex-direction: column;
        }
        .stat-label {
          font-size: 11px;
          font-weight: 600;
          color: var(--medium-grey);
        }
        .stat-value {
          font-size: 14px;
          font-weight: 700;
          color: var(--on-surface);
        }
        .text-win {
          color: #2e7d32;
        }
        :global([data-theme="dark"]) .text-win {
          color: #81c784;
        }
        .player-form-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .form-label {
          font-size: 11px;
          font-weight: 700;
          color: var(--medium-grey);
          text-transform: uppercase;
        }
        .form-bubbles {
          display: flex;
          gap: 4px;
        }
        .form-bubble {
          width: 20px;
          height: 20px;
          border-radius: var(--rounded-full);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 800;
          color: #ffffff;
        }
        .form-bubble.win {
          background-color: var(--accent-green, #6bcb77);
          color: #121212;
        }
        .form-bubble.loss {
          background-color: var(--error, #ba1a1a);
        }
      `}</style>
    </Card>
  );
};

interface GameCardProps {
  name: string;
  icon: string; // Emoji
  modes: string[];
  totalMatches: number;
  onClick?: () => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  name,
  icon,
  modes,
  totalMatches,
  onClick,
}) => {
  return (
    <Card onClick={onClick}>
      <div className="game-card-content">
        <div className="game-icon-box">{icon || "🎮"}</div>
        <div className="game-info">
          <h3 className="game-name">{name}</h3>
          <div className="game-meta">
            <span className="game-matches-count">
              <Play size={12} style={{ display: "inline", marginRight: "3px" }} />
              {totalMatches} played
            </span>
          </div>
        </div>
        <div className="game-modes">
          {modes.map((mode) => (
            <span key={mode} className="mode-tag">
              {mode}
            </span>
          ))}
        </div>
      </div>
      <style jsx>{`
        .game-card-content {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }
        .game-icon-box {
          width: 44px;
          height: 44px;
          background-color: var(--surface-container-high);
          border-radius: var(--rounded-default);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
        }
        .game-info {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }
        .game-name {
          font-size: 16px;
          font-weight: 700;
          color: var(--on-surface);
        }
        .game-meta {
          font-size: 12px;
          color: var(--medium-grey);
        }
        .game-modes {
          display: flex;
          flex-direction: column;
          gap: 4px;
          align-items: flex-end;
        }
        .mode-tag {
          font-size: 10px;
          font-weight: 700;
          background-color: var(--surface-container-high);
          color: var(--on-surface-variant);
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }
      `}</style>
    </Card>
  );
};

interface MatchCardProps {
  gameName: string;
  gameIcon: string;
  date: string;
  matchType: string;
  teamScores: Array<{
    name: string;
    players: Array<{ name: string; avatar: string }>;
    score: number;
    isWinner: boolean;
  }>;
  sessionName?: string;
}

export const MatchCard: React.FC<MatchCardProps> = ({
  gameName,
  gameIcon,
  date,
  matchType,
  teamScores,
  sessionName,
}) => {
  return (
    <Card>
      <div className="match-header">
        <div className="match-game">
          <span className="match-game-icon">{gameIcon || "🎮"}</span>
          <div className="match-game-info">
            <span className="match-game-name">{gameName}</span>
            <span className="match-session-name">{sessionName || "Companion Match"}</span>
          </div>
        </div>
        <div className="match-meta">
          <span className="match-type-tag">{matchType}</span>
          <span className="match-date">{new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
        </div>
      </div>

      <div className="match-scores">
        {teamScores.map((ts, idx) => (
          <div key={idx} className={`score-row ${ts.isWinner ? "winner-bg" : ""}`}>
            <div className="team-ident">
              <span className="team-avatar-stack">
                {ts.players.map((p, pIdx) => (
                  <span key={pIdx} className="mini-avatar" title={p.name}>
                    {p.avatar || "👤"}
                  </span>
                ))}
              </span>
              <span className="team-name">{ts.name}</span>
              {ts.isWinner && <Trophy size={14} className="trophy-icon" />}
            </div>
            <div className={`team-score ${ts.isWinner ? "winner-score" : ""}`}>
              {ts.score}
            </div>
          </div>
        ))}
      </div>
      <style jsx>{`
        .match-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--outline-variant);
          padding-bottom: 8px;
        }
        .match-game {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .match-game-icon {
          font-size: 18px;
        }
        .match-game-name {
          font-size: 14px;
          font-weight: 700;
          color: var(--on-surface);
          display: block;
        }
        .match-session-name {
          font-size: 11px;
          color: var(--medium-grey);
          display: block;
        }
        .match-meta {
          text-align: right;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }
        .match-type-tag {
          font-size: 10px;
          font-weight: 700;
          background-color: var(--surface-container-high);
          color: var(--on-surface-variant);
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .match-date {
          font-size: 11px;
          color: var(--medium-grey);
        }
        .match-scores {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .score-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          border-radius: var(--rounded-default);
          background-color: var(--surface-container-low);
        }
        .score-row.winner-bg {
          background-color: rgba(107, 203, 119, 0.12);
          border: 1px dashed var(--accent-green);
        }
        .team-ident {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .team-avatar-stack {
          display: flex;
          align-items: center;
        }
        .mini-avatar {
          width: 24px;
          height: 24px;
          border-radius: var(--rounded-full);
          background-color: var(--surface-container-highest);
          border: 1.5px solid var(--surface);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          margin-left: -6px;
        }
        .mini-avatar:first-child {
          margin-left: 0;
        }
        .team-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--on-surface);
        }
        .trophy-icon {
          color: var(--accent-gold);
          fill: var(--accent-gold);
        }
        .team-score {
          font-size: 16px;
          font-weight: 700;
          color: var(--medium-grey);
        }
        .winner-score {
          font-size: 18px;
          color: var(--primary-container);
        }
        :global([data-theme="dark"]) .winner-score {
          color: var(--primary);
        }
      `}</style>
    </Card>
  );
};

interface LeaderboardItemProps {
  rank: number;
  name: string;
  avatar: string; // Emoji
  score: number;
  subtitle?: string;
  isTeam?: boolean;
}

export const LeaderboardItem: React.FC<LeaderboardItemProps> = ({
  rank,
  name,
  avatar,
  score,
  subtitle,
  isTeam = false,
}) => {
  const getRankBadgeColor = (r: number) => {
    if (r === 1) return "gold";
    if (r === 2) return "silver";
    if (r === 3) return "bronze";
    return "normal";
  };

  const rankColorClass = getRankBadgeColor(rank);

  return (
    <div className="leaderboard-item">
      <div className={`rank-badge ${rankColorClass}`}>{rank}</div>
      <div className="avatar-wrapper">
        {isTeam ? <Shield size={18} className="team-shield-icon" /> : avatar || "👤"}
      </div>
      <div className="identity-section">
        <span className="item-name">{name}</span>
        {subtitle && <span className="item-subtitle">{subtitle}</span>}
      </div>
      <div className="score-section">
        <span className="score-value">{score}</span>
        <span className="score-label">PTS</span>
      </div>
      <style jsx>{`
        .leaderboard-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background-color: var(--surface-container-lowest, #ffffff);
          border: 1px solid var(--outline-variant, #c7c5ce);
          border-radius: var(--rounded-md);
          margin-bottom: 8px;
        }
        :global([data-theme="dark"]) .leaderboard-item {
          background-color: var(--surface, #1e1e1e);
        }
        .rank-badge {
          width: 28px;
          height: 28px;
          border-radius: var(--rounded-full);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 800;
          color: var(--on-surface-variant);
          background-color: var(--surface-container-high);
        }
        .rank-badge.gold {
          background-color: var(--accent-gold);
          color: #121212;
        }
        .rank-badge.silver {
          background-color: #e0e0e0;
          color: #121212;
        }
        .rank-badge.bronze {
          background-color: #cd7f32;
          color: #ffffff;
        }
        .avatar-wrapper {
          width: 36px;
          height: 36px;
          border-radius: var(--rounded-full);
          background-color: var(--surface-container-low);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }
        .team-shield-icon {
          color: var(--medium-grey);
        }
        .identity-section {
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }
        .item-name {
          font-size: 15px;
          font-weight: 700;
          color: var(--on-surface);
        }
        .item-subtitle {
          font-size: 11px;
          color: var(--medium-grey);
        }
        .score-section {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: center;
        }
        .score-value {
          font-size: 18px;
          font-weight: 800;
          color: var(--primary-container);
        }
        :global([data-theme="dark"]) .score-value {
          color: var(--primary);
        }
        .score-label {
          font-size: 9px;
          font-weight: 700;
          color: var(--medium-grey);
        }
      `}</style>
    </div>
  );
};

interface StatCardProps {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
}

export const StatCard: React.FC<StatCardProps> = ({ value, label, icon }) => {
  return (
    <div className="stat-card">
      <div className="stat-card-left">
        <span className="stat-card-value">{value}</span>
        <span className="stat-card-label">{label}</span>
      </div>
      {icon && <div className="stat-card-icon">{icon}</div>}
      <style jsx>{`
        .stat-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background-color: var(--surface-container-lowest, #ffffff);
          border: 1px solid var(--outline-variant, #c7c5ce);
          border-radius: var(--rounded-md);
          flex: 1;
        }
        :global([data-theme="dark"]) .stat-card {
          background-color: var(--surface, #1e1e1e);
        }
        .stat-card-left {
          display: flex;
          flex-direction: column;
        }
        .stat-card-value {
          font-size: 24px;
          font-weight: 800;
          color: var(--on-surface);
        }
        .stat-card-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--medium-grey);
        }
        .stat-card-icon {
          color: var(--medium-grey);
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
};
