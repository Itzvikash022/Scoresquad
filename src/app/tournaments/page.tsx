"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trophy, ChevronLeft, ChevronRight, Play, Check, Shield, Shuffle, Award, Flame, Gamepad2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Buttons";
import { Card, MatchCard } from "@/components/ui/Cards";
import { BottomSheet } from "@/components/ui/Dialogs";
import { useToast } from "@/components/ui/Toast";
import dataService, { ClientPlayer, ClientGame, ClientTournament, ClientTeam, ClientMatch } from "@/lib/dataService";

export default function TournamentsPage() {
  const { showToast } = useToast();

  // Master Data
  const [players, setPlayers] = useState<ClientPlayer[]>([]);
  const [games, setGames] = useState<ClientGame[]>([]);
  const [teams, setTeams] = useState<ClientTeam[]>([]);
  const [matches, setMatches] = useState<ClientMatch[]>([]);
  const [activeTournament, setActiveTournament] = useState<ClientTournament | undefined>(undefined);

  // Wizard state: 0 (Hub/Dashboard), 1 (Details), 2 (Games), 3 (Participants), 4 (Overview)
  const [wizardStep, setWizardStep] = useState(0);

  // Wizard form values
  const [tournyName, setTournyName] = useState("");
  const [gamesCount, setGamesCount] = useState(5);
  const [format, setFormat] = useState<"custom" | "action">("custom");
  const [isTeamMode, setIsTeamMode] = useState(false);
  const [selectedGameIds, setSelectedGameIds] = useState<string[]>([]);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]); // Player or Team IDs

  // Custom Pair Creator state (within wizard)
  const [isPairSheetOpen, setIsPairSheetOpen] = useState(false);
  const [pairPlayer1, setPairPlayer1] = useState("");
  const [pairPlayer2, setPairPlayer2] = useState("");

  // Record Game Score drawer states
  const [isLogGameSheetOpen, setIsLogGameSheetOpen] = useState(false);
  const [activeFixtureId, setActiveFixtureId] = useState<string>("");
  const [activeGameIdx, setActiveGameIdx] = useState<number>(0);
  const [logGameId, setLogGameId] = useState("");
  const [logScore1, setLogScore1] = useState("0");
  const [logScore2, setLogScore2] = useState("0");

  // Tournament Wrapped state
  const [wrappedSummary, setWrappedSummary] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setPlayers(dataService.getPlayers());
    setGames(dataService.getGames());
    setTeams(dataService.getTeams());
    setMatches(dataService.getMatches());
    setActiveTournament(dataService.getActiveTournament());
  };

  const handleStartWizard = () => {
    const dateStr = new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    setTournyName(`Championship - ${dateStr}`);
    setGamesCount(5);
    setFormat("custom");
    setIsTeamMode(false);
    setSelectedGameIds([]);
    setSelectedParticipantIds([]);
    setWizardStep(1);
  };

  const handleSelectRandomGames = () => {
    if (games.length === 0) {
      showToast("Create games in catalog first!", "error");
      return;
    }
    const targetCount = Math.min(gamesCount, games.length);
    const shuffled = [...games].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, targetCount).map((g) => g._id);
    setSelectedGameIds(selected);
    showToast(`Picked ${selected.length} random games!`, "success");
  };

  const toggleGameSelection = (id: string) => {
    const targetCount = Math.min(gamesCount, games.length);
    if (selectedGameIds.includes(id)) {
      setSelectedGameIds(selectedGameIds.filter((gId) => gId !== id));
    } else {
      if (selectedGameIds.length >= targetCount) {
        showToast(`You can only select exactly ${targetCount} games (matching the Games Count limit)!`, "error");
        return;
      }
      setSelectedGameIds([...selectedGameIds, id]);
    }
  };

  const toggleParticipantSelection = (id: string) => {
    if (selectedParticipantIds.includes(id)) {
      setSelectedParticipantIds(selectedParticipantIds.filter((pId) => pId !== id));
    } else {
      setSelectedParticipantIds([...selectedParticipantIds, id]);
    }
  };

  const handleCreatePair = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairPlayer1 || !pairPlayer2) {
      showToast("Select both players", "error");
      return;
    }
    if (pairPlayer1 === pairPlayer2) {
      showToast("Select two different players", "error");
      return;
    }

    try {
      const newTeam = dataService.getOrCreateTeam([pairPlayer1, pairPlayer2]);
      setTeams(dataService.getTeams()); // Reload teams
      
      if (!selectedParticipantIds.includes(newTeam._id)) {
        setSelectedParticipantIds([...selectedParticipantIds, newTeam._id]);
      }
      showToast(`Team "${newTeam.name}" created and selected!`, "success");
      
      setPairPlayer1("");
      setPairPlayer2("");
      setIsPairSheetOpen(false);
    } catch {
      showToast("Failed to create team combination", "error");
    }
  };

  const handleStartTournament = () => {
    if (!tournyName.trim()) {
      showToast("Tournament name is required", "error");
      return;
    }
    if (selectedGameIds.length === 0) {
      showToast("Select at least 1 game", "error");
      return;
    }
    if (selectedParticipantIds.length < 2) {
      showToast("Select at least 2 participants", "error");
      return;
    }
    if (format === "action" && selectedParticipantIds.length < 3) {
      showToast("Action Mode requires at least 3 participants for Group -> Semis -> Finals", "error");
      return;
    }

    try {
      const tourny = dataService.createTournament(
        tournyName.trim(),
        gamesCount,
        format,
        selectedGameIds,
        selectedParticipantIds,
        isTeamMode
      );
      
      setActiveTournament(tourny);
      setWizardStep(0);
      showToast("Tournament started!", "success");
      loadData();
    } catch {
      showToast("Failed to start tournament", "error");
    }
  };

  // Custom Matchup lineup swap
  const handleUpdateFixtureMatchup = (fixtureId: string, newP1: string, newP2: string) => {
    if (!activeTournament) return;
    if (newP1 === newP2) {
      showToast("Lineup participants must be different!", "error");
      return;
    }

    const updated = { ...activeTournament };
    const fixturesList = updated.bracket?.fixtures || [];
    const fixIdx = fixturesList.findIndex((f: any) => f.id === fixtureId);
    if (fixIdx !== -1) {
      if (!updated.bracket.fixtures) updated.bracket.fixtures = [];
      updated.bracket.fixtures[fixIdx].p1 = newP1;
      updated.bracket.fixtures[fixIdx].p2 = newP2;
      
      // Standings will recalculate, save it
      dataService.saveTournament(updated);
      setActiveTournament(updated);
      showToast("Lineup updated!", "success");
    }
  };

  // Open Game logging drawer
  const handleOpenGameLogDrawer = (fixtureId: string, gameIdx: number) => {
    if (!activeTournament) return;
    const fixturesList = activeTournament.bracket?.fixtures || [];
    const fix = fixturesList.find((f: any) => f.id === fixtureId);
    if (!fix) return;

    setActiveFixtureId(fixtureId);
    setActiveGameIdx(gameIdx);
    setLogGameId(activeTournament.games[0] || "");

    const existingGame = fix.games[gameIdx];
    if (existingGame && existingGame.isPlayed) {
      setLogScore1(String(existingGame.score1));
      setLogScore2(String(existingGame.score2));
      if (existingGame.gameId) setLogGameId(existingGame.gameId);
    } else {
      setLogScore1("0");
      setLogScore2("0");
    }

    setIsLogGameSheetOpen(true);
  };

  const adjustScore = (id: "p1" | "p2", amount: number) => {
    if (id === "p1") {
      setLogScore1((prev) => String(Math.max(0, (parseInt(prev, 10) || 0) + amount)));
    } else {
      setLogScore2((prev) => String(Math.max(0, (parseInt(prev, 10) || 0) + amount)));
    }
  };

  const handleSaveGameScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTournament || !activeFixtureId) return;

    const s1 = parseInt(logScore1, 10);
    const s2 = parseInt(logScore2, 10);

    if (isNaN(s1) || isNaN(s2)) {
      showToast("Enter valid score numbers", "error");
      return;
    }

    const updated = { ...activeTournament };
    const fixturesList = updated.bracket?.fixtures || [];
    const fixIdx = fixturesList.findIndex((f: any) => f.id === activeFixtureId);
    if (fixIdx === -1) return;

    if (!updated.bracket.fixtures) updated.bracket.fixtures = [];
    const fix = updated.bracket.fixtures[fixIdx];
    
    // Save to local tournament fixture bracket state
    fix.games[activeGameIdx] = {
      score1: s1,
      score2: s2,
      isPlayed: true,
      gameId: logGameId,
    };

    // Calculate player array for global match stats
    let playersArr: string[] = [];
    let teamsArr: string[] = [];
    if (updated.isTeamMode) {
      teamsArr = [fix.p1, fix.p2];
      const team1 = (teams || []).find((t) => t._id === fix.p1);
      const team2 = (teams || []).find((t) => t._id === fix.p2);
      playersArr = [...(team1?.members || []), ...(team2?.members || [])];
    } else {
      playersArr = [fix.p1, fix.p2];
    }

    // Save global Match log
    try {
      dataService.saveMatch({
        session: undefined,
        game: logGameId,
        matchType: updated.isTeamMode ? "Team Match" : "Solo",
        players: playersArr,
        teams: teamsArr,
        scores: {
          [fix.p1]: s1,
          [fix.p2]: s2,
        },
        winners: s1 > s2 ? [fix.p1] : s2 > s1 ? [fix.p2] : [fix.p1, fix.p2],
        isTournamentMatch: true,
        tournament: updated._id,
      });
    } catch (err) {
      console.error("Failed to log match stats globally:", err);
    }

    // Recalculate Standings from all completed games in bracket.fixtures
    const standings: Record<string, { wins: number; losses: number; points: number; games: number }> = {};
    updated.participants.forEach((pId) => {
      standings[pId] = { wins: 0, losses: 0, points: 0, games: 0 };
    });

    (updated.bracket?.fixtures || []).forEach((f: any) => {
      // Initialize if missing
      if (!standings[f.p1]) standings[f.p1] = { wins: 0, losses: 0, points: 0, games: 0 };
      if (!standings[f.p2]) standings[f.p2] = { wins: 0, losses: 0, points: 0, games: 0 };

      f.games.forEach((g: any) => {
        if (g && g.isPlayed) {
          standings[f.p1].games += 1;
          standings[f.p2].games += 1;
          standings[f.p1].points += g.score1;
          standings[f.p2].points += g.score2;

          if (g.score1 > g.score2) {
            standings[f.p1].wins += 1;
            standings[f.p2].losses += 1;
          } else if (g.score2 > g.score1) {
            standings[f.p2].wins += 1;
            standings[f.p1].losses += 1;
          } else {
            // Ties add points but no wins recorded
          }
        }
      });
    });

    updated.standings = standings;

    // Esports Action Mode stage advance checkers
    if (updated.format === "action") {
      // 1. Group stage complete? -> Generate Semifinals
      const groupFixtures = (updated.bracket?.fixtures || []).filter((f: any) => f.stage === "group");
      const allGroupPlayed = groupFixtures.every((f: any) => f.games.every((g: any) => g.isPlayed));
      const hasSemi = (updated.bracket?.fixtures || []).some((f: any) => f.stage === "semifinal");

      if (allGroupPlayed && !hasSemi) {
        // Calculate group stage standings
        const groupStandings: Record<string, { wins: number; points: number }> = {};
        updated.participants.forEach((id) => { groupStandings[id] = { wins: 0, points: 0 }; });

        groupFixtures.forEach((f: any) => {
          f.games.forEach((g: any) => {
            if (g.isPlayed) {
              groupStandings[f.p1].points += g.score1;
              groupStandings[f.p2].points += g.score2;
              if (g.score1 > g.score2) groupStandings[f.p1].wins++;
              else if (g.score2 > g.score1) groupStandings[f.p2].wins++;
            }
          });
        });

        const sortedGroup = Object.entries(groupStandings)
          .map(([id, stats]: any) => ({ id, ...stats }))
          .sort((a, b) => b.wins - a.wins || b.points - a.points);

        const firstPlace = sortedGroup[0]?.id;
        const secondPlace = sortedGroup[1]?.id;
        const thirdPlace = sortedGroup[2]?.id;

        if (secondPlace && thirdPlace) {
          updated.bracket.fixtures.push({
            id: "semifinal",
            p1: secondPlace,
            p2: thirdPlace,
            games: Array.from({ length: updated.gamesCount }, () => ({ score1: null, score2: null, isPlayed: false, gameId: null })),
            stage: "semifinal",
          });
          showToast("Group stage complete! Semifinal generated.", "info");
        }
      }

      // 2. Semifinal complete? -> Generate Finals
      const semiFix = (updated.bracket?.fixtures || []).find((f: any) => f.stage === "semifinal");
      const hasFinal = (updated.bracket?.fixtures || []).some((f: any) => f.stage === "final");
      if (semiFix && semiFix.games.every((g: any) => g.isPlayed) && !hasFinal) {
        let p1Wins = 0;
        let p2Wins = 0;
        semiFix.games.forEach((g: any) => {
          if (g.score1 > g.score2) p1Wins++;
          else if (g.score2 > g.score1) p2Wins++;
        });

        const semiWinner = p1Wins > p2Wins ? semiFix.p1 : semiFix.p2;

        // Group standings 1st place
        const groupStandings: Record<string, { wins: number; points: number }> = {};
        updated.participants.forEach((id) => { groupStandings[id] = { wins: 0, points: 0 }; });

        groupFixtures.forEach((f: any) => {
          f.games.forEach((g: any) => {
            if (g.isPlayed) {
              groupStandings[f.p1].points += g.score1;
              groupStandings[f.p2].points += g.score2;
              if (g.score1 > g.score2) groupStandings[f.p1].wins++;
              else if (g.score2 > g.score1) groupStandings[f.p2].wins++;
            }
          });
        });

        const sortedGroup = Object.entries(groupStandings)
          .map(([id, stats]: any) => ({ id, ...stats }))
          .sort((a, b) => b.wins - a.wins || b.points - a.points);

        const firstPlace = sortedGroup[0]?.id;

        if (firstPlace && semiWinner) {
          if (!updated.bracket.fixtures) updated.bracket.fixtures = [];
          updated.bracket.fixtures.push({
            id: "final",
            p1: firstPlace,
            p2: semiWinner,
            games: Array.from({ length: updated.gamesCount }, () => ({ score1: null, score2: null, isPlayed: false, gameId: null })),
            stage: "final",
          });
          showToast("Semifinal complete! Finals matchup generated.", "info");
        }
      }
    }

    // Save and close
    dataService.saveTournament(updated);
    setActiveTournament(updated);
    setIsLogGameSheetOpen(false);
    showToast("Game score saved!", "success");
    loadData();
  };

  const handleEndTournament = () => {
    if (!activeTournament) return;
    if (window.confirm("End this tournament and declare the winners based on the points table?")) {
      const sorted = Object.entries(activeTournament.standings)
        .map(([id, stats]: any) => ({ id, ...stats }))
        .sort((a, b) => b.wins - a.wins || b.points - a.points);

      let champId = sorted[0]?.id;
      let runnerId = sorted[1]?.id;

      // In Action mode, check the finals fixture results explicitly
      if (activeTournament.format === "action") {
        const finalFix = (activeTournament.bracket?.fixtures || []).find((f: any) => f.stage === "final");
        if (finalFix && finalFix.games.every((g: any) => g.isPlayed)) {
          let p1Wins = 0;
          let p2Wins = 0;
          finalFix.games.forEach((g: any) => {
            if (g.score1 > g.score2) p1Wins++;
            else if (g.score2 > g.score1) p2Wins++;
          });
          champId = p1Wins > p2Wins ? finalFix.p1 : finalFix.p2;
          runnerId = p1Wins > p2Wins ? finalFix.p2 : finalFix.p1;
        }
      }

      const champName = activeTournament.isTeamMode
        ? teams.find((t) => t._id === champId)?.name
        : players.find((p) => p._id === champId)?.name;

      const runnerName = activeTournament.isTeamMode
        ? teams.find((t) => t._id === runnerId)?.name
        : players.find((p) => p._id === runnerId)?.name;

      const updated = {
        ...activeTournament,
        isActive: false,
        champion: champId,
        runnerUp: runnerId,
      };

      dataService.saveTournament(updated);
      showToast(`Tournament finished! Champion: ${champName}`, "success");
      
      setWrappedSummary({
        name: activeTournament.name,
        champion: champName || "Champ",
        runnerUp: runnerName || "Runner Up",
      });

      setActiveTournament(undefined);
      loadData();
    }
  };

  // Helper selectors
  const getParticipantName = (id: string) => {
    if (activeTournament?.isTeamMode || isTeamMode) {
      return teams.find((t) => t._id === id)?.name || "Team";
    }
    return players.find((p) => p._id === id)?.name || "Player";
  };

  const getParticipantAvatar = (id: string) => {
    if (activeTournament?.isTeamMode || isTeamMode) {
      return "🛡️";
    }
    return players.find((p) => p._id === id)?.avatar || "👤";
  };

  // Standings computation
  const sortedStandings = activeTournament
    ? Object.entries(activeTournament.standings)
        .map(([id, stats]: any) => {
          const name = activeTournament.isTeamMode
            ? teams.find((t) => t._id === id)?.name || "Team"
            : players.find((p) => p._id === id)?.name || "Player";
          
          const avatar = activeTournament.isTeamMode
            ? "🛡️"
            : players.find((p) => p._id === id)?.avatar || "👤";

          return { id, name, avatar, ...stats };
        })
        .sort((a, b) => b.wins - a.wins || b.points - a.points)
    : [];

  return (
    <div className="tournaments-view">
      {/* Wrapped summary modal */}
      {wrappedSummary && (
        <div className="modal-overlay" onClick={() => setWrappedSummary(null)}>
          <div className="modal-card fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="modal-tropy-icon">🏆</div>
            <h2 className="modal-title">Tournament Wrapped!</h2>
            <p className="modal-sub">"{wrappedSummary.name}" has officially concluded</p>
            
            <div className="summary-awards">
              <div className="award-item">
                <span className="award-icon">🥇</span>
                <span className="award-title">Tournament Champion</span>
                <span className="winner-name-wrap">{wrappedSummary.champion}</span>
              </div>
              <div className="award-item">
                <span className="award-icon">🥈</span>
                <span className="award-title">Runner Up</span>
                <span className="winner-name-wrap">{wrappedSummary.runnerUp}</span>
              </div>
            </div>
            
            <Button onClick={() => setWrappedSummary(null)} fullWidth size="lg">
              Finish
            </Button>
          </div>
        </div>
      )}

      {/* Hub / Main View */}
      {wizardStep === 0 && !activeTournament && (
        <div className="tourny-hub-empty fade-in">
          <div className="hub-empty-card">
            <Trophy className="hub-trophy-main" size={56} />
            <h2>Tournament Manager</h2>
            <p>Define match fixtures, track participant scores dynamically via games grid, and crown a champion.</p>
            <Button variant="accent" size="lg" fullWidth onClick={handleStartWizard}>
              Create Tournament
            </Button>
          </div>
        </div>
      )}

      {/* Wizard Step 1: Details */}
      {wizardStep === 1 && (
        <div className="wizard-panel fade-in">
          <div className="wizard-step-header">
            <button className="wizard-back-btn" onClick={() => setWizardStep(0)}>
              <ChevronLeft size={20} />
            </button>
            <span className="wizard-title-el">1. Setup Details</span>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); setWizardStep(2); }} className="wizard-form">
            <div className="form-group">
              <label className="form-label-el">Tournament Name</label>
              <input
                type="text"
                value={tournyName}
                onChange={(e) => setTournyName(e.target.value)}
                className="form-input-el"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label-el">Tournament Format</label>
              <div className="type-toggle-row">
                <button
                  type="button"
                  className={`type-toggle-btn ${format === "custom" ? "selected" : ""}`}
                  onClick={() => setFormat("custom")}
                >
                  Custom Mode
                </button>
                <button
                  type="button"
                  className={`type-toggle-btn ${format === "action" ? "selected" : ""}`}
                  onClick={() => setFormat("action")}
                >
                  Action Mode
                </button>
              </div>
              <span className="form-help-lbl text-accent">
                {format === "custom"
                  ? "Custom Mode: Generates matchups but allows changing participants on the fly."
                  : "Action Mode: Predefined matchups. Top team qualifies to final; next 2 play semifinal."}
              </span>
            </div>

            <div className="form-group">
              <label className="form-label-el">Games Count (per Matchup series)</label>
              <input
                type="number"
                value={gamesCount}
                onChange={(e) => setGamesCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="form-input-el"
                min={1}
                max={50}
                required
              />
              <span className="form-help-lbl">How many games are played in each matchup series.</span>
            </div>

            <div className="form-group">
              <label className="form-label-el">Participant Type</label>
              <div className="type-toggle-row">
                <button
                  type="button"
                  className={`type-toggle-btn ${!isTeamMode ? "selected" : ""}`}
                  onClick={() => { setIsTeamMode(false); setSelectedParticipantIds([]); }}
                >
                  Individual Solo
                </button>
                <button
                  type="button"
                  className={`type-toggle-btn ${isTeamMode ? "selected" : ""}`}
                  onClick={() => { setIsTeamMode(true); setSelectedParticipantIds([]); }}
                >
                  Team Pairs
                </button>
              </div>
            </div>

            <Button type="submit" fullWidth size="lg">
              Next: Select Games <ChevronRight size={16} />
            </Button>
          </form>
        </div>
      )}

      {/* Wizard Step 2: Games Selector */}
      {wizardStep === 2 && (
        <div className="wizard-panel fade-in">
          <div className="wizard-step-header">
            <button className="wizard-back-btn" onClick={() => setWizardStep(1)}>
              <ChevronLeft size={20} />
            </button>
            <span className="wizard-title-el">2. Select Games</span>
          </div>

          <div className="wizard-layout-v">
            {(() => {
              const targetCount = Math.min(gamesCount, games.length);
              return (
                <>
                  <Button variant="outline" fullWidth onClick={handleSelectRandomGames}>
                    <Shuffle size={16} /> Select {targetCount} Random Games
                  </Button>

                  <p className="wizard-select-label">
                    Choose exactly {targetCount} from catalog ({selectedGameIds.length} selected):
                  </p>
                  <div className="games-catalog-selection-list">
                    {games.map((g) => {
                      const isSelected = selectedGameIds.includes(g._id);
                      return (
                        <Card
                          key={g._id}
                          className={`game-selection-card ${isSelected ? "selected-border" : ""}`}
                          onClick={() => toggleGameSelection(g._id)}
                        >
                          <div className="game-select-body">
                            <span className="game-select-icon">{g.icon || "🎮"}</span>
                            <span className="game-select-name">{g.name}</span>
                          </div>
                          {isSelected && <div className="checked-indicator"><Check size={14} /></div>}
                        </Card>
                      );
                    })}
                  </div>

                  <Button
                    size="lg"
                    fullWidth
                    onClick={() => setWizardStep(3)}
                    disabled={selectedGameIds.length !== targetCount}
                  >
                    Next: Choose Participants <ChevronRight size={16} />
                  </Button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Wizard Step 3: Participants Selector */}
      {wizardStep === 3 && (
        <div className="wizard-panel fade-in">
          <div className="wizard-step-header">
            <button className="wizard-back-btn" onClick={() => setWizardStep(2)}>
              <ChevronLeft size={20} />
            </button>
            <span className="wizard-title-el">3. Participants</span>
          </div>

          <div className="wizard-layout-v">
            {isTeamMode ? (
              <div className="participants-flex-block">
                <Button variant="outline" fullWidth onClick={() => setIsPairSheetOpen(true)}>
                  <Plus size={16} /> Create Team Pair combination
                </Button>
                
                <div className="participants-toggle-list">
                  {teams.map((t) => {
                    const isSelected = selectedParticipantIds.includes(t._id);
                    return (
                      <Card
                        key={t._id}
                        className={`participant-select-card ${isSelected ? "selected-border" : ""}`}
                        onClick={() => toggleParticipantSelection(t._id)}
                      >
                        <div className="part-ident">
                          <Shield size={18} className="part-shield" />
                          <span className="part-name">{t.name}</span>
                        </div>
                        {isSelected && <div className="checked-indicator"><Check size={14} /></div>}
                      </Card>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="participants-toggle-list">
                {players.map((p) => {
                  const isSelected = selectedParticipantIds.includes(p._id);
                  return (
                    <Card
                      key={p._id}
                      className={`participant-select-card ${isSelected ? "selected-border" : ""}`}
                      onClick={() => toggleParticipantSelection(p._id)}
                    >
                      <div className="part-ident">
                        <span className="part-avatar-emoji">{p.avatar}</span>
                        <span className="part-name">{p.name}</span>
                      </div>
                      {isSelected && <div className="checked-indicator"><Check size={14} /></div>}
                    </Card>
                  );
                })}
              </div>
            )}

            <Button
              size="lg"
              fullWidth
              onClick={() => setWizardStep(4)}
              disabled={selectedParticipantIds.length < 2}
            >
              Next: Review Overview <ChevronRight size={16} />
            </Button>
          </div>

          {/* Create Team Pair Drawer */}
          <BottomSheet isOpen={isPairSheetOpen} onClose={() => setIsPairSheetOpen(false)} title="Create Team combination">
            <form onSubmit={handleCreatePair} className="drawer-form-pair">
              <div className="form-group">
                <label className="form-label-el">Player 1</label>
                <select
                  value={pairPlayer1}
                  onChange={(e) => setPairPlayer1(e.target.value)}
                  className="form-select-el"
                  required
                >
                  <option value="">Select player...</option>
                  {players.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label-el">Player 2</label>
                <select
                  value={pairPlayer2}
                  onChange={(e) => setPairPlayer2(e.target.value)}
                  className="form-select-el"
                  required
                >
                  <option value="">Select player...</option>
                  {players.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <Button type="submit" fullWidth size="lg">
                Save & Select Pair
              </Button>
            </form>
          </BottomSheet>
        </div>
      )}

      {/* Wizard Step 4: Overview & Start */}
      {wizardStep === 4 && (
        <div className="wizard-panel fade-in">
          <div className="wizard-step-header">
            <button className="wizard-back-btn" onClick={() => setWizardStep(3)}>
              <ChevronLeft size={20} />
            </button>
            <span className="wizard-title-el">4. Review Overview</span>
          </div>

          <div className="overview-container">
            <Card className="overview-summary-card">
              <div className="summary-field">
                <span className="summary-lbl">Tournament Name</span>
                <span className="summary-val">{tournyName}</span>
              </div>
              <div className="summary-field">
                <span className="summary-lbl">Games per Series</span>
                <span className="summary-val">{gamesCount} Games</span>
              </div>
              <div className="summary-field">
                <span className="summary-lbl">Format</span>
                <span className="summary-val">
                  {format === "action" ? "Action Mode (Group -> Semis -> Finals)" : "Custom Mode (Editable Matchups)"}
                </span>
              </div>
              <div className="summary-field">
                <span className="summary-lbl">Mode</span>
                <span className="summary-val">{isTeamMode ? "Team Pairs" : "Individual Solo"}</span>
              </div>
            </Card>

            <h3 className="overview-list-title">Games Selected ({selectedGameIds.length})</h3>
            <div className="overview-games-pills">
              {selectedGameIds.map((id) => {
                const g = games.find((game) => game._id === id);
                return (
                  <span key={id} className="game-overview-pill">
                    {g?.icon} {g?.name}
                  </span>
                );
              })}
            </div>

            <h3 className="overview-list-title">Participants ({selectedParticipantIds.length})</h3>
            <div className="overview-participants-list">
              {selectedParticipantIds.map((id) => (
                <div key={id} className="overview-part-row">
                  <span>{getParticipantAvatar(id)}</span>
                  <span>{getParticipantName(id)}</span>
                </div>
              ))}
            </div>

            <Button size="lg" fullWidth variant="accent" onClick={handleStartTournament}>
              <Play size={18} fill="#121212" /> Start Tournament
            </Button>
          </div>
        </div>
      )}

      {/* Active Tournament Dashboard */}
      {activeTournament && (
        <div className="active-tournament-dashboard fade-in">
          <div className="tourny-header-banner">
            <div className="banner-details">
              <div className="banner-badge">
                ONGOING TOURNAMENT • {activeTournament.format === "action" ? "ACTION MODE" : "CUSTOM MODE"}
              </div>
              <h1 className="banner-title">{activeTournament.name}</h1>
              <span className="banner-meta-info">Series length: {activeTournament.gamesCount} Games</span>
            </div>
            <Button size="sm" variant="danger" onClick={handleEndTournament}>
              End Tournament
            </Button>
          </div>

          {/* Standings Table */}
          <div className="dashboard-section">
            <h2 className="section-title-el"><Trophy size={16} /> Tournament Leaderboard</h2>
            <Card className="standings-card-table">
              <div className="table-header-row">
                <div className="col-rank">#</div>
                <div className="col-name">Name</div>
                <div className="col-stat wide-stat">Played</div>
                <div className="col-stat">W</div>
                <div className="col-stat">L</div>
                <div className="col-stat">PTS</div>
              </div>
              
              {sortedStandings.map((stand, idx) => (
                <div key={stand.id} className="table-body-row">
                  <div className="col-rank">{idx + 1}</div>
                  <div className="col-name flex-row gap-xs">
                    <span>{stand.avatar}</span>
                    <span className="clip-text-name">{stand.name}</span>
                  </div>
                  <div className="col-stat wide-stat font-semibold">
                    {stand.games}
                  </div>
                  <div className="col-stat font-bold text-win-color">{stand.wins}</div>
                  <div className="col-stat">{stand.losses}</div>
                  <div className="col-stat text-primary-c font-bold">{stand.points}</div>
                </div>
              ))}
            </Card>
          </div>

          {/* Fixtures Match Series List */}
          <div className="dashboard-section">
            <h2 className="section-title-el"><Gamepad2 size={16} /> Matchup Series</h2>
            
            <div className="fixtures-matchups-stack">
              {(activeTournament.bracket?.fixtures || []).map((fix: any, fIdx: number) => {
                const isPlayedCount = (fix.games || []).filter((g: any) => g.isPlayed).length;
                
                // Group labeling by stages
                let stageLabel = "";
                const fixturesList = activeTournament.bracket?.fixtures || [];
                if (fIdx === 0 || fixturesList[fIdx - 1]?.stage !== fix.stage) {
                  stageLabel = fix.stage === "group" 
                    ? "Group Stage Matches" 
                    : fix.stage === "semifinal" 
                      ? "Semifinals" 
                      : "Finals";
                }

                return (
                  <div key={fix.id} className="stage-fixtures-group">
                    {stageLabel && <div className="stage-group-divider">{stageLabel}</div>}
                    
                    <Card className="matchup-series-card">
                      {/* Matchup Header */}
                      <div className="matchup-opponents-row">
                        {/* Participant 1 */}
                        <div className="opp-participant flex-1 justify-end text-right">
                          {activeTournament.format === "custom" && fix.stage === "group" ? (
                            <select
                              value={fix.p1}
                              onChange={(e) => handleUpdateFixtureMatchup(fix.id, e.target.value, fix.p2)}
                              className="matchup-select-inline align-right"
                            >
                              {activeTournament.participants.map((id) => (
                                <option key={id} value={id}>{getParticipantName(id)}</option>
                              ))}
                            </select>
                          ) : (
                            <div className="opp-name-text">
                              <span className="opp-avatar-span">{getParticipantAvatar(fix.p1)}</span>
                              <span className="opp-label-span">{getParticipantName(fix.p1)}</span>
                            </div>
                          )}
                        </div>

                        <div className="opp-vs-text">VS</div>

                        {/* Participant 2 */}
                        <div className="opp-participant flex-1 justify-start">
                          {activeTournament.format === "custom" && fix.stage === "group" ? (
                            <select
                              value={fix.p2}
                              onChange={(e) => handleUpdateFixtureMatchup(fix.id, fix.p1, e.target.value)}
                              className="matchup-select-inline"
                            >
                              {activeTournament.participants.filter((id) => id !== fix.p1).map((id) => (
                                <option key={id} value={id}>{getParticipantName(id)}</option>
                              ))}
                            </select>
                          ) : (
                            <div className="opp-name-text">
                              <span className="opp-label-span">{getParticipantName(fix.p2)}</span>
                              <span className="opp-avatar-span">{getParticipantAvatar(fix.p2)}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Game Slots row */}
                      <div className="fixture-game-slots-container">
                        <span className="slots-label-header">Games ({isPlayedCount}/{activeTournament.gamesCount} logged)</span>
                        
                        <div className="slots-grid-row">
                          {fix.games.map((g: any, gameIdx: number) => {
                            const isPlayed = g && g.isPlayed;
                            
                            return (
                              <button
                                key={gameIdx}
                                type="button"
                                className={`game-slot-button ${isPlayed ? "played" : "unplayed"}`}
                                onClick={() => handleOpenGameLogDrawer(fix.id, gameIdx)}
                              >
                                {isPlayed ? (
                                  <div className="slot-scores-badge">
                                    <span className="badge-s">{g.score1}</span>
                                    <span className="badge-d">:</span>
                                    <span className="badge-s">{g.score2}</span>
                                  </div>
                                ) : (
                                  <span className="slot-index-number">{gameIdx + 1}</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Record Game Score Drawer */}
          <BottomSheet
            isOpen={isLogGameSheetOpen}
            onClose={() => setIsLogGameSheetOpen(false)}
            title={`Record Game ${activeGameIdx + 1} Score`}
          >
            {activeFixtureId && (
              (() => {
                const fix = activeTournament.bracket.fixtures.find((f: any) => f.id === activeFixtureId);
                if (!fix) return null;
                return (
                  <form onSubmit={handleSaveGameScore} className="drawer-score-form-tourny">
                    {/* Select Game Catalog */}
                    <div className="form-group">
                      <label className="form-label-el">Select Game</label>
                      <select
                        value={logGameId}
                        onChange={(e) => setLogGameId(e.target.value)}
                        className="form-select-el"
                        required
                      >
                        {activeTournament.games.map((gId) => {
                          const g = games.find((game) => game._id === gId);
                          return (
                            <option key={gId} value={gId}>
                              {g?.icon} {g?.name}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="scores-entries-stack">
                      {/* Participant 1 Dial */}
                      <div className="score-dial-widget-row">
                        <div className="dial-header-text">
                          <span className="avatar-preview">{getParticipantAvatar(fix.p1)}</span>
                          <span className="name-preview">{getParticipantName(fix.p1)}</span>
                        </div>

                        <div className="score-entry-widget">
                          <button type="button" className="dial-btn dial-minus" onClick={() => adjustScore("p1", -1)}>
                            <MinusIcon />
                          </button>
                          <input
                            type="number"
                            value={logScore1}
                            onChange={(e) => setLogScore1(e.target.value)}
                            className="score-text-input"
                          />
                          <button type="button" className="dial-btn dial-plus" onClick={() => adjustScore("p1", 1)}>
                            <PlusIcon />
                          </button>
                        </div>

                        <div className="quick-modifiers-row">
                          <button type="button" className="modifier-pill" onClick={() => adjustScore("p1", 5)}>
                            +5
                          </button>
                          <button type="button" className="modifier-pill" onClick={() => adjustScore("p1", 10)}>
                            +10
                          </button>
                        </div>
                      </div>

                      {/* Participant 2 Dial */}
                      <div className="score-dial-widget-row">
                        <div className="dial-header-text">
                          <span className="avatar-preview">{getParticipantAvatar(fix.p2)}</span>
                          <span className="name-preview">{getParticipantName(fix.p2)}</span>
                        </div>

                        <div className="score-entry-widget">
                          <button type="button" className="dial-btn dial-minus" onClick={() => adjustScore("p2", -1)}>
                            <MinusIcon />
                          </button>
                          <input
                            type="number"
                            value={logScore2}
                            onChange={(e) => setLogScore2(e.target.value)}
                            className="score-text-input"
                          />
                          <button type="button" className="dial-btn dial-plus" onClick={() => adjustScore("p2", 1)}>
                            <PlusIcon />
                          </button>
                        </div>

                        <div className="quick-modifiers-row">
                          <button type="button" className="modifier-pill" onClick={() => adjustScore("p2", 5)}>
                            +5
                          </button>
                          <button type="button" className="modifier-pill" onClick={() => adjustScore("p2", 10)}>
                            +10
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="form-submit-block">
                      <Button type="submit" fullWidth size="lg">
                        Save Game Score
                      </Button>
                    </div>
                  </form>
                );
              })()
            )}
          </BottomSheet>
        </div>
      )}
      
      <style jsx>{`
        .tournaments-view {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        
        /* Hub Styling */
        .tourny-hub-empty {
          display: flex;
          justify-content: center;
          padding-top: 24px;
        }
        .hub-empty-card {
          background-color: var(--surface-container-lowest);
          border: 1px solid var(--outline-variant);
          border-radius: var(--rounded-lg);
          padding: 32px var(--spacing-md);
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);
          width: 100%;
        }
        :global([data-theme="dark"]) .hub-empty-card {
          background-color: var(--surface);
        }
        .hub-trophy-main {
          color: var(--accent-gold);
          fill: var(--accent-gold);
          margin-bottom: 8px;
        }
        .hub-empty-card h2 {
          font-size: 20px;
          font-weight: 800;
        }
        .hub-empty-card p {
          font-size: 13px;
          color: var(--medium-grey);
          max-width: 280px;
          line-height: 18px;
          margin-bottom: 12px;
        }

        /* Wizard pages */
        .wizard-panel {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }
        .wizard-step-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .wizard-back-btn {
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
        .wizard-title-el {
          font-size: 16px;
          font-weight: 800;
          color: var(--on-surface);
        }
        .wizard-form {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
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
        .form-help-lbl {
          font-size: 11px;
          color: var(--medium-grey);
          margin-top: -2px;
        }
        .form-help-lbl.text-accent {
          color: var(--accent-green);
          font-weight: 600;
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
        }
        .form-select-el {
          height: 48px;
          padding: 0 var(--spacing-sm);
          border: 1px solid var(--outline-variant);
          border-radius: var(--rounded-default);
          background-color: var(--surface-container-low);
          color: var(--on-surface);
          outline: none;
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          width: 100%;
        }
        .type-toggle-row {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          background-color: var(--surface-container-high);
          padding: 4px;
          border-radius: var(--rounded-default);
          gap: 4px;
        }
        .type-toggle-btn {
          border: none;
          background: none;
          padding: 10px 0;
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 700;
          color: var(--on-surface-variant);
          border-radius: var(--rounded-sm);
          cursor: pointer;
        }
        .type-toggle-btn.selected {
          background-color: var(--background);
          color: var(--primary-container);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
        }
        :global([data-theme="dark"]) .type-toggle-btn.selected {
          color: var(--primary);
        }

        /* Game list step 2 */
        .wizard-layout-v {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }
        .wizard-select-label {
          font-size: 13px;
          font-weight: 700;
          color: var(--medium-grey);
          text-transform: uppercase;
          margin-top: 8px;
        }
        .games-catalog-selection-list,
        .participants-toggle-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
          max-height: 50vh;
          overflow-y: auto;
          padding-right: 2px;
        }
        .game-selection-card,
        .participant-select-card {
          flex-direction: row !important;
          justify-content: space-between;
          align-items: center;
          padding: 12px var(--spacing-sm) !important;
          cursor: pointer;
        }
        .game-selection-card.selected-border,
        .participant-select-card.selected-border {
          border-color: var(--accent-green);
          background-color: rgba(107, 203, 119, 0.05);
        }
        .game-select-body {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .game-select-icon {
          font-size: 20px;
        }
        .game-select-name {
          font-size: 15px;
          font-weight: 700;
          color: var(--on-surface);
        }
        .checked-indicator {
          width: 20px;
          height: 20px;
          border-radius: var(--rounded-full);
          background-color: var(--accent-green);
          color: #121212;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .part-ident {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .part-shield {
          color: var(--medium-grey);
        }
        .part-avatar-emoji {
          font-size: 20px;
        }
        .part-name {
          font-size: 15px;
          font-weight: 700;
          color: var(--on-surface);
        }
        
        .drawer-form-pair {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        
        /* Step 4 Overview */
        .overview-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }
        .overview-summary-card {
          gap: 8px !important;
        }
        .summary-field {
          display: flex;
          justify-content: space-between;
          font-size: 14px;
        }
        .summary-lbl {
          color: var(--medium-grey);
          font-weight: 600;
        }
        .summary-val {
          color: var(--on-surface);
          font-weight: 700;
        }
        .overview-list-title {
          font-size: 12px;
          font-weight: 700;
          color: var(--medium-grey);
          text-transform: uppercase;
          margin-top: 8px;
        }
        .overview-games-pills {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .game-overview-pill {
          background-color: var(--surface-container-low);
          color: var(--on-surface-variant);
          padding: 6px 12px;
          border-radius: var(--rounded-full);
          font-size: 12px;
          font-weight: 700;
        }
        .overview-participants-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
          background-color: var(--surface-container-low);
          padding: 12px;
          border-radius: var(--rounded-md);
        }
        .overview-part-row {
          display: flex;
          gap: 10px;
          font-size: 14px;
          font-weight: 700;
          color: var(--on-surface);
        }

        /* Ongoing dashboard view */
        .active-tournament-dashboard {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        .tourny-header-banner {
          background-color: var(--primary-container);
          padding: var(--spacing-md);
          border-radius: var(--rounded-md);
          color: #ffffff;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-left: 5px solid var(--accent-gold);
        }
        .banner-details {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .banner-badge {
          font-size: 9px;
          font-weight: 800;
          color: var(--accent-gold);
          letter-spacing: 0.1em;
        }
        .banner-title {
          font-size: 18px;
          font-weight: 800;
          line-height: 22px;
        }
        .banner-meta-info {
          font-size: 11px;
          color: var(--on-primary-container, #9092b7);
        }
        .dashboard-section {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }
        .section-title-el {
          font-size: 15px;
          font-weight: 700;
          color: var(--on-background);
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 2px;
        }
        .standings-card-table {
          padding: 10px 0 !important;
          display: flex;
          flex-direction: column;
        }
        .table-header-row {
          display: flex;
          padding: 8px 16px;
          font-size: 11px;
          font-weight: 700;
          color: var(--medium-grey);
          text-transform: uppercase;
          border-bottom: 1px solid var(--outline-variant);
        }
        .table-body-row {
          display: flex;
          padding: 12px 16px;
          font-size: 14px;
          border-bottom: 1px solid var(--outline-variant);
          align-items: center;
        }
        .table-body-row:last-child {
          border-bottom: none;
        }
        .col-rank {
          width: 28px;
          font-weight: 800;
        }
        .col-name {
          flex-grow: 1;
          font-weight: 700;
          color: var(--on-surface);
        }
        .clip-text-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 130px;
        }
        .col-stat {
          width: 32px;
          text-align: center;
        }
        .col-stat.wide-stat {
          width: 60px;
          font-size: 12px;
          color: var(--medium-grey);
        }
        .text-win-color {
          color: #2e7d32;
        }
        :global([data-theme="dark"]) .text-win-color {
          color: #81c784;
        }
        .text-primary-c {
          color: var(--primary-container);
        }
        :global([data-theme="dark"]) .text-primary-c {
          color: var(--primary);
        }
        .font-bold {
          font-weight: 800;
        }
        .font-semibold {
          font-weight: 600;
        }

        /* Matchup series stack cards */
        .fixtures-matchups-stack {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .stage-fixtures-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .stage-group-divider {
          font-size: 11px;
          font-weight: 800;
          color: var(--medium-grey);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          border-bottom: 1px dashed var(--outline-variant);
          padding-bottom: 4px;
          margin-top: 4px;
        }
        .matchup-series-card {
          padding: var(--spacing-sm) !important;
          flex-direction: column !important;
          gap: 12px !important;
        }
        .matchup-opponents-row {
          display: flex;
          align-items: center;
          width: 100%;
          gap: 8px;
        }
        .opp-participant {
          display: flex;
          align-items: center;
        }
        .opp-name-text {
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
          color: var(--on-surface);
          font-size: 14px;
        }
        .opp-vs-text {
          font-size: 11px;
          font-weight: 800;
          color: var(--medium-grey);
          background-color: var(--surface-container-high);
          padding: 3px 8px;
          border-radius: var(--rounded-sm);
        }
        .matchup-select-inline {
          background-color: var(--surface-container-low);
          border: 1px solid var(--outline-variant);
          border-radius: var(--rounded-sm);
          color: var(--on-surface);
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 700;
          padding: 4px 6px;
          outline: none;
          max-width: 130px;
        }
        .matchup-select-inline.align-right {
          direction: rtl;
        }
        .opp-avatar-span {
          font-size: 14px;
        }
        
        .fixture-game-slots-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
          border-top: 1px solid var(--outline-variant);
          padding-top: 8px;
          width: 100%;
        }
        .slots-label-header {
          font-size: 10px;
          font-weight: 700;
          color: var(--medium-grey);
          text-transform: uppercase;
        }
        .slots-grid-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .game-slot-button {
          height: 38px;
          min-width: 38px;
          border-radius: var(--rounded-default);
          border: 1px solid var(--outline-variant);
          background-color: var(--surface-container-low);
          color: var(--on-surface);
          cursor: pointer;
          font-family: 'Outfit', sans-serif;
          font-weight: 800;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 6px;
        }
        .game-slot-button.played {
          background-color: var(--primary-container);
          color: #ffffff;
          border-color: var(--primary-container);
        }
        .slot-scores-badge {
          display: flex;
          align-items: center;
          gap: 2px;
          font-size: 12px;
        }
        .badge-s {
          font-weight: 800;
        }
        .badge-d {
          opacity: 0.7;
        }

        /* Drawer score entry */
        .drawer-score-form-tourny {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        .scores-entries-stack {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }
        .score-dial-widget-row {
          display: flex;
          flex-direction: column;
          gap: 8px;
          background-color: var(--surface-container-low);
          padding: 12px;
          border-radius: var(--rounded-default);
          border: 1px solid var(--outline-variant);
        }
        .dial-header-text {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .avatar-preview {
          font-size: 16px;
        }
        .name-preview {
          font-size: 14px;
          font-weight: 700;
          color: var(--on-surface);
        }
        
        .score-entry-widget {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
          justify-content: center;
        }
        .dial-btn {
          width: 40px;
          height: 40px;
          border-radius: var(--rounded-full);
          border: 1px solid var(--outline-variant);
          background-color: var(--surface-container-lowest);
          color: var(--on-surface);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .score-text-input {
          width: 64px;
          height: 40px;
          border: 1px solid var(--outline-variant);
          border-radius: var(--rounded-default);
          background-color: var(--surface-container-lowest);
          color: var(--on-surface);
          text-align: center;
          font-family: 'Outfit', sans-serif;
          font-size: 16px;
          font-weight: 800;
          outline: none;
        }
        .quick-modifiers-row {
          display: flex;
          gap: 6px;
          justify-content: center;
        }
        .modifier-pill {
          padding: 4px 12px;
          border-radius: var(--rounded-full);
          border: 1px solid var(--outline-variant);
          background-color: var(--surface-container-lowest);
          color: var(--on-surface-variant);
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }
        .form-submit-block {
          margin-top: 8px;
        }

        .winner-name-wrap {
          font-size: 18px;
          font-weight: 800;
          color: var(--on-surface);
        }

        /* Modal wrapped styling */
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
      `}</style>
    </div>
  );
}

// Inline Icon Components for self containment
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);

const MinusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);
