"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, ChevronLeft, Check, Users, Shield, Plus, Minus, Shuffle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Buttons";
import { Card } from "@/components/ui/Cards";
import { useToast } from "@/components/ui/Toast";
import dataService, { ClientPlayer, ClientGame, ClientSession, ClientTeam } from "@/lib/dataService";

export default function RecordMatchPage() {
  const router = useRouter();
  const { showToast } = useToast();

  // Master Data
  const [players, setPlayers] = useState<ClientPlayer[]>([]);
  const [games, setGames] = useState<ClientGame[]>([]);
  const [activeSession, setActiveSession] = useState<ClientSession | undefined>(undefined);

  // Wizard Steps: 1 (Game), 2 (Mode), 3 (Teams/Players), 4 (Scores)
  const [step, setStep] = useState(1);

  // Selected parameters
  const [selectedGame, setSelectedGame] = useState<ClientGame | null>(null);
  const [matchMode, setMatchMode] = useState<"Solo" | "Free For All" | "Team Match">("Solo");
  
  // Players selection
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  
  // Team builders
  const [teamAPlayers, setTeamAPlayers] = useState<string[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<string[]>([]);

  // Scores state: Key is Player ID or Team key/name
  const [scores, setScores] = useState<Record<string, number>>({});

  useEffect(() => {
    setPlayers(dataService.getPlayers());
    setGames(dataService.getGames());
    setActiveSession(dataService.getActiveSession());
  }, []);

  const handleSelectGame = (game: ClientGame) => {
    setSelectedGame(game);
    // Set default mode
    if (game.supportedModes.length > 0) {
      setMatchMode(game.supportedModes[0]);
    }
    setStep(2);
  };

  const handleSelectMode = (mode: "Solo" | "Free For All" | "Team Match") => {
    setMatchMode(mode);
    setStep(3);
  };

  const togglePlayerSelection = (id: string) => {
    if (selectedPlayerIds.includes(id)) {
      setSelectedPlayerIds(selectedPlayerIds.filter((pId) => pId !== id));
      // Remove from teams if present
      setTeamAPlayers(teamAPlayers.filter((pId) => pId !== id));
      setTeamBPlayers(teamBPlayers.filter((pId) => pId !== id));
    } else {
      setSelectedPlayerIds([...selectedPlayerIds, id]);
      
      // Auto-assign to teams in team match
      if (matchMode === "Team Match") {
        if (teamAPlayers.length <= teamBPlayers.length) {
          setTeamAPlayers([...teamAPlayers, id]);
        } else {
          setTeamBPlayers([...teamBPlayers, id]);
        }
      }
    }
  };

  // Team building controls
  const handleRandomizeTeams = () => {
    if (selectedPlayerIds.length < 2) {
      showToast("Select at least 2 players to randomize", "info");
      return;
    }
    const shuffled = [...selectedPlayerIds].sort(() => Math.random() - 0.5);
    const half = Math.ceil(shuffled.length / 2);
    setTeamAPlayers(shuffled.slice(0, half));
    setTeamBPlayers(shuffled.slice(half));
    showToast("Teams randomized!", "success");
  };

  const handleMoveToTeamA = (id: string) => {
    setTeamBPlayers(teamBPlayers.filter((pId) => pId !== id));
    if (!teamAPlayers.includes(id)) {
      setTeamAPlayers([...teamAPlayers, id]);
    }
  };

  const handleMoveToTeamB = (id: string) => {
    setTeamAPlayers(teamAPlayers.filter((pId) => pId !== id));
    if (!teamBPlayers.includes(id)) {
      setTeamBPlayers([...teamBPlayers, id]);
    }
  };

  const handleSwapTeams = () => {
    const temp = [...teamAPlayers];
    setTeamAPlayers([...teamBPlayers]);
    setTeamBPlayers(temp);
    showToast("Teams swapped!", "success");
  };

  const handleProceedToScores = () => {
    if (matchMode === "Team Match") {
      if (teamAPlayers.length === 0 || teamBPlayers.length === 0) {
        showToast("Both teams must have at least 1 player", "error");
        return;
      }
      // Initialize scores for Team A and Team B
      const initialScores: Record<string, number> = {};
      
      // Get/create team combinations to obtain unique IDs
      const teamA = dataService.getOrCreateTeam(teamAPlayers);
      const teamB = dataService.getOrCreateTeam(teamBPlayers);
      
      initialScores[teamA._id] = 0;
      initialScores[teamB._id] = 0;
      setScores(initialScores);
    } else {
      if (selectedPlayerIds.length < 2) {
        showToast("Select at least 2 players", "error");
        return;
      }
      const initialScores: Record<string, number> = {};
      selectedPlayerIds.forEach((pId) => {
        initialScores[pId] = 0;
      });
      setScores(initialScores);
    }
    setStep(4);
  };

  // Dial score controls (+1, +5, -1)
  const adjustScore = (id: string, amount: number) => {
    setScores((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + amount); // No negative scores
      return { ...prev, [id]: next };
    });
  };

  const handleScoreInput = (id: string, val: string) => {
    const parsed = parseInt(val, 10);
    setScores((prev) => ({
      ...prev,
      [id]: isNaN(parsed) ? 0 : parsed,
    }));
  };

  const handleSaveMatch = () => {
    if (!selectedGame) return;

    // Check winners
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

    if (maxScore === 0 && winners.length > 0) {
      if (!window.confirm("All scores are 0. Save match anyway?")) {
        return;
      }
    }

    try {
      if (matchMode === "Team Match") {
        const teamA = dataService.getOrCreateTeam(teamAPlayers);
        const teamB = dataService.getOrCreateTeam(teamBPlayers);

        dataService.saveMatch({
          session: activeSession?._id,
          game: selectedGame._id,
          matchType: "Team Match",
          players: selectedPlayerIds,
          teams: [teamA._id, teamB._id],
          scores,
          winners,
          isTournamentMatch: false,
        });
      } else {
        dataService.saveMatch({
          session: activeSession?._id,
          game: selectedGame._id,
          matchType: matchMode,
          players: selectedPlayerIds,
          teams: [],
          scores,
          winners,
          isTournamentMatch: false,
        });
      }

      showToast("Match recorded successfully!", "success");
      router.push(activeSession ? "/sessions" : "/");
    } catch (err) {
      showToast("Failed to save match data", "error");
    }
  };

  return (
    <div className="record-match-view">
      {/* Header Wizard Breadcrumb */}
      <div className="wizard-header">
        <button
          className="back-btn-step"
          onClick={() => {
            if (step > 1) setStep(step - 1);
            else router.push("/");
          }}
        >
          <ChevronLeft size={20} />
        </button>
        <span className="wizard-title">
          {step === 1 && "Select Game"}
          {step === 2 && "Choose Match Mode"}
          {step === 3 && "Build Teams"}
          {step === 4 && "Enter Scores"}
        </span>
        <div className="step-dots">
          {[1, 2, 3, 4].map((s) => (
            <span key={s} className={`step-dot ${step === s ? "active" : ""} ${step > s ? "filled" : ""}`} />
          ))}
        </div>
      </div>

      {/* Step 1: Game catalog selector */}
      {step === 1 && (
        <div className="step-panel fade-in">
          <p className="step-instructions">Which game are you playing?</p>
          <div className="game-grid-select">
            {games.map((g) => (
              <Card key={g._id} className="game-select-card" onClick={() => handleSelectGame(g)}>
                <div className="select-card-emoji">{g.icon || "🎮"}</div>
                <h3 className="select-card-name">{g.name}</h3>
              </Card>
            ))}
          </div>
          {games.length === 0 && (
            <div className="step-empty-state">
              <p>No games in your catalog yet.</p>
              <Button onClick={() => router.push("/players")}>Manage Game Catalog</Button>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Match mode selector */}
      {step === 2 && selectedGame && (
        <div className="step-panel fade-in">
          <p className="step-instructions">Select match format for {selectedGame.name}:</p>
          <div className="mode-options-list">
            {selectedGame.supportedModes.map((mode) => (
              <Card key={mode} className="mode-select-card" onClick={() => handleSelectMode(mode)}>
                <div className="mode-select-text">
                  <h3>{mode}</h3>
                  <p>
                    {mode === "Solo" && "2 Players head-to-head score comparison."}
                    {mode === "Free For All" && "Multiplayer individual points battle."}
                    {mode === "Team Match" && "Split players into Team A and Team B."}
                  </p>
                </div>
                <ChevronRight size={20} className="chevron-icon" />
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Player Selection / Team Builder */}
      {step === 3 && selectedGame && (
        <div className="step-panel fade-in">
          <p className="step-instructions">
            {matchMode === "Team Match"
              ? "Select players and split them into teams:"
              : "Select players participating in this match:"}
          </p>

          {/* Quick player toggles */}
          <div className="players-toggle-pool">
            {players.map((p) => {
              const isSelected = selectedPlayerIds.includes(p._id);
              return (
                <button
                  key={p._id}
                  type="button"
                  className={`player-toggle-bubble ${isSelected ? "selected" : ""}`}
                  onClick={() => togglePlayerSelection(p._id)}
                >
                  <span className="p-bubble-avatar">{p.avatar}</span>
                  <span className="p-bubble-name">{p.name}</span>
                </button>
              );
            })}
          </div>

          {/* Team match split view builder */}
          {matchMode === "Team Match" && selectedPlayerIds.length > 0 && (
            <div className="team-builder-workspace">
              <div className="builder-header-row">
                <Button size="sm" variant="outline" onClick={handleRandomizeTeams}>
                  <Shuffle size={14} /> Randomize
                </Button>
                <Button size="sm" variant="outline" onClick={handleSwapTeams}>
                  <RefreshCw size={14} /> Swap
                </Button>
              </div>

              <div className="team-columns">
                {/* Team A */}
                <div className="team-col border-team-a">
                  <h3 className="team-col-title team-a-text">
                    <Shield size={16} /> Team A ({teamAPlayers.length})
                  </h3>
                  <div className="team-col-members">
                    {teamAPlayers.map((pId) => {
                      const p = players.find((pl) => pl._id === pId);
                      if (!p) return null;
                      return (
                        <div key={pId} className="builder-member-row">
                          <span>{p.avatar} {p.name}</span>
                          <button type="button" className="move-btn" onClick={() => handleMoveToTeamB(pId)}>
                            👉
                          </button>
                        </div>
                      );
                    })}
                    {teamAPlayers.length === 0 && <span className="empty-col-lbl">Empty</span>}
                  </div>
                </div>

                {/* Team B */}
                <div className="team-col border-team-b">
                  <h3 className="team-col-title team-b-text">
                    <Shield size={16} /> Team B ({teamBPlayers.length})
                  </h3>
                  <div className="team-col-members">
                    {teamBPlayers.map((pId) => {
                      const p = players.find((pl) => pl._id === pId);
                      if (!p) return null;
                      return (
                        <div key={pId} className="builder-member-row">
                          <button type="button" className="move-btn" onClick={() => handleMoveToTeamA(pId)}>
                            👈
                          </button>
                          <span>{p.avatar} {p.name}</span>
                        </div>
                      );
                    })}
                    {teamBPlayers.length === 0 && <span className="empty-col-lbl">Empty</span>}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="wizard-footer-nav">
            <Button size="lg" fullWidth onClick={handleProceedToScores} disabled={selectedPlayerIds.length < 2}>
              Proceed to Enter Scores
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Enter Scores dialers */}
      {step === 4 && selectedGame && (
        <div className="step-panel fade-in">
          <p className="step-instructions">Record scores to determine winner:</p>
          
          <div className="scores-input-list">
            {matchMode === "Team Match" ? (
              // Team scores inputs
              [teamAPlayers, teamBPlayers].map((tPlayers, idx) => {
                const teamObj = dataService.getOrCreateTeam(tPlayers);
                const tId = teamObj._id;
                const score = scores[tId] || 0;

                return (
                  <Card key={tId} className="score-input-card">
                    <div className="score-card-header-info">
                      <div className="score-card-avatars">
                        {tPlayers.map((pId) => {
                          const p = players.find((pl) => pl._id === pId);
                          return <span key={pId}>{p?.avatar || "👤"}</span>;
                        })}
                      </div>
                      <h3 className="score-card-name">{teamObj.name}</h3>
                    </div>

                    <div className="score-entry-widget">
                      <button type="button" className="dial-btn dial-minus" onClick={() => adjustScore(tId, -1)}>
                        <Minus size={18} />
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={score}
                        onChange={(e) => handleScoreInput(tId, e.target.value)}
                        className="score-text-input"
                      />
                      <button type="button" className="dial-btn dial-plus" onClick={() => adjustScore(tId, 1)}>
                        <Plus size={18} />
                      </button>
                    </div>

                    <div className="quick-dials-row">
                      <button type="button" className="quick-dial-pill" onClick={() => adjustScore(tId, 5)}>
                        +5
                      </button>
                      <button type="button" className="quick-dial-pill" onClick={() => adjustScore(tId, 10)}>
                        +10
                      </button>
                    </div>
                  </Card>
                );
              })
            ) : (
              // Solo / FFA scores inputs
              selectedPlayerIds.map((pId) => {
                const p = players.find((pl) => pl._id === pId);
                const score = scores[pId] || 0;
                if (!p) return null;

                return (
                  <Card key={pId} className="score-input-card">
                    <div className="score-card-header-info">
                      <span className="score-card-single-avatar">{p.avatar}</span>
                      <h3 className="score-card-name">{p.name}</h3>
                    </div>

                    <div className="score-entry-widget">
                      <button type="button" className="dial-btn dial-minus" onClick={() => adjustScore(pId, -1)}>
                        <Minus size={18} />
                      </button>
                      <input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={score}
                        onChange={(e) => handleScoreInput(pId, e.target.value)}
                        className="score-text-input"
                      />
                      <button type="button" className="dial-btn dial-plus" onClick={() => adjustScore(pId, 1)}>
                        <Plus size={18} />
                      </button>
                    </div>

                    <div className="quick-dials-row">
                      <button type="button" className="quick-dial-pill" onClick={() => adjustScore(pId, 5)}>
                        +5
                      </button>
                      <button type="button" className="quick-dial-pill" onClick={() => adjustScore(pId, 10)}>
                        +10
                      </button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>

          <div className="wizard-footer-nav">
            <Button size="lg" fullWidth onClick={handleSaveMatch}>
              <Check size={18} /> Save Match Scores
            </Button>
          </div>
        </div>
      )}

      <style jsx>{`
        .record-match-view {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        .wizard-header {
          display: flex;
          align-items: center;
          gap: 12px;
          position: sticky;
          top: 0;
          z-index: 10;
          background-color: var(--background);
          padding: var(--spacing-xs) 0;
        }
        .back-btn-step {
          border: 1px solid var(--outline-variant);
          background-color: var(--surface-container-low);
          color: var(--on-surface);
          border-radius: var(--rounded-default);
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .wizard-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--on-surface);
          flex-grow: 1;
        }
        .step-dots {
          display: flex;
          gap: 6px;
        }
        .step-dot {
          width: 8px;
          height: 8px;
          border-radius: var(--rounded-full);
          background-color: var(--outline-variant);
        }
        .step-dot.active {
          background-color: var(--primary-container);
          width: 16px;
        }
        :global([data-theme="dark"]) .step-dot.active {
          background-color: var(--primary);
        }
        .step-dot.filled {
          background-color: var(--accent-green);
        }

        .step-panel {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }
        .step-instructions {
          font-size: 15px;
          color: var(--medium-grey);
          font-weight: 500;
        }
        
        /* Game Grid list (Step 1) */
        .game-grid-select {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--spacing-xs);
        }
        .game-select-card {
          padding: var(--spacing-md) !important;
          align-items: center;
          text-align: center;
          cursor: pointer;
        }
        .select-card-emoji {
          font-size: 36px;
          margin-bottom: var(--spacing-xs);
        }
        .select-card-name {
          font-size: 15px;
          font-weight: 700;
          color: var(--on-surface);
        }
        .step-empty-state {
          text-align: center;
          padding: 40px;
          background-color: var(--surface-container-low);
          border-radius: var(--rounded-md);
          color: var(--medium-grey);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        /* Mode Selection list (Step 2) */
        .mode-options-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }
        .mode-select-card {
          flex-direction: row !important;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
        }
        .mode-select-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          text-align: left;
        }
        .mode-select-text h3 {
          font-size: 16px;
          font-weight: 700;
          color: var(--on-surface);
        }
        .mode-select-text p {
          font-size: 12px;
          color: var(--medium-grey);
        }
        .chevron-icon {
          color: var(--medium-grey);
        }

        /* Player selection bubbles pool (Step 3) */
        .players-toggle-pool {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          background-color: var(--surface-container-low);
          padding: var(--spacing-sm);
          border-radius: var(--rounded-md);
        }
        .player-toggle-bubble {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border-radius: var(--rounded-full);
          border: 1px solid var(--outline-variant);
          background-color: var(--surface-container-lowest);
          color: var(--on-surface-variant);
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .player-toggle-bubble.selected {
          background-color: var(--primary-container);
          color: #ffffff;
          border-color: var(--primary-container);
        }
        :global([data-theme="dark"]) .player-toggle-bubble.selected {
          background-color: var(--primary);
          color: #131634;
          border-color: var(--primary);
        }
        .p-bubble-avatar {
          font-size: 16px;
        }

        /* Team builder panels split */
        .team-builder-workspace {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
          margin-top: 8px;
        }
        .builder-header-row {
          display: flex;
          gap: var(--spacing-xs);
          justify-content: flex-end;
        }
        .team-columns {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        .team-col {
          border: 1px solid var(--outline-variant);
          border-radius: var(--rounded-md);
          background-color: var(--surface-container-lowest);
          padding: 12px;
          min-height: 150px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        :global([data-theme="dark"]) .team-col {
          background-color: var(--surface);
        }
        .team-col.border-team-a {
          border-left: 3px solid var(--primary-container);
        }
        .team-col.border-team-b {
          border-left: 3px solid var(--accent-gold);
        }
        .team-col-title {
          font-size: 13px;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .team-a-text {
          color: var(--primary-container);
        }
        :global([data-theme="dark"]) .team-a-text {
          color: var(--primary);
        }
        .team-b-text {
          color: #d49514;
        }
        .team-col-members {
          display: flex;
          flex-direction: column;
          gap: 6px;
          flex-grow: 1;
        }
        .builder-member-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: var(--surface-container-low);
          padding: 6px 10px;
          border-radius: var(--rounded-sm);
          font-size: 13px;
          font-weight: 600;
          color: var(--on-surface);
        }
        .move-btn {
          border: none;
          background: none;
          cursor: pointer;
          font-size: 13px;
        }
        .empty-col-lbl {
          font-size: 12px;
          color: var(--medium-grey);
          text-align: center;
          margin-top: 24px;
          font-style: italic;
        }
        .wizard-footer-nav {
          margin-top: 16px;
          position: sticky;
          bottom: 0;
          padding-bottom: 20px;
          background-color: var(--background);
        }

        /* Score input cards (Step 4) */
        .scores-input-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }
        .score-input-card {
          align-items: center;
          padding: var(--spacing-md) !important;
          gap: var(--spacing-sm) !important;
        }
        .score-card-header-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .score-card-avatars {
          display: flex;
          gap: 4px;
          font-size: 24px;
        }
        .score-card-single-avatar {
          font-size: 32px;
          width: 56px;
          height: 56px;
          background-color: var(--surface-container-high);
          border-radius: var(--rounded-full);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .score-card-name {
          font-size: 16px;
          font-weight: 800;
          color: var(--on-surface);
        }
        
        /* Dial widget */
        .score-entry-widget {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }
        .dial-btn {
          width: 48px;
          height: 48px;
          border-radius: var(--rounded-full);
          border: 1px solid var(--outline-variant);
          background-color: var(--surface-container-low);
          color: var(--on-surface);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color 0.15s;
        }
        .dial-btn:active {
          background-color: var(--outline-variant);
        }
        .score-text-input {
          width: 72px;
          height: 48px;
          border: 1px solid var(--outline-variant);
          border-radius: var(--rounded-default);
          background-color: var(--surface-container-low);
          color: var(--on-surface);
          text-align: center;
          font-family: 'Outfit', sans-serif;
          font-size: 20px;
          font-weight: 800;
          outline: none;
        }
        .quick-dials-row {
          display: flex;
          gap: 8px;
        }
        .quick-dial-pill {
          padding: 6px 16px;
          border-radius: var(--rounded-full);
          border: 1px solid var(--outline-variant);
          background-color: var(--surface-container-low);
          color: var(--on-surface-variant);
          font-family: 'Outfit', sans-serif;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          transition: background-color 0.15s;
        }
        .quick-dial-pill:active {
          background-color: var(--outline-variant);
        }
      `}</style>
    </div>
  );
}
