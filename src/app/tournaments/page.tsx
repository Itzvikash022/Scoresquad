"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trophy, ChevronLeft, ChevronRight, Play, Check, Shield, Shuffle, Award, Flame, Gamepad2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/components/ui/Toast";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { GameSelectGrid } from "@/components/ui/GameSelectGrid";
import { TeamPairSelector } from "@/components/ui/TeamPairSelector";
import { ScoreConsole } from "@/components/ui/ScoreConsole";
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
  const [winPoints, setWinPoints] = useState(10);
  const [isTeamMode, setIsTeamMode] = useState(false);
  const [selectedGameIds, setSelectedGameIds] = useState<string[]>([]);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);

  // Accordion active game index per fixture: fixtureId -> gameIdx (0 to gamesCount-1)
  const [activeFixtureGameIndices, setActiveFixtureGameIndices] = useState<Record<string, number>>({});
  
  // Scoring draft values per fixture game: "fixtureId-gameIdx" -> { competitorId -> score }
  const [fixtureDraftScores, setFixtureDraftScores] = useState<Record<string, Record<string, number>>>({});

  // Tournament Wrapped state
  const [wrappedSummary, setWrappedSummary] = useState<{ name: string; champion: string; runnerUp: string } | null>(null);

  useEffect(() => {
    loadData();
    const unsubscribe = dataService.subscribe(loadData);
    return unsubscribe;
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
    setWinPoints(10);
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

  const handleCreateTeamPair = async (p1Id: string, p2Id: string) => {
    try {
      const newTeam = await dataService.getOrCreateTeam([p1Id, p2Id]);
      setTeams(dataService.getTeams()); // Reload
      if (!selectedParticipantIds.includes(newTeam._id)) {
        setSelectedParticipantIds((prev) => [...prev, newTeam._id]);
      }
      showToast(`Team "${newTeam.name}" created and selected!`, "success");
    } catch {
      showToast("Failed to create team combination", "error");
    }
  };

  const handleStartTournament = async () => {
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
      const tourny = await dataService.createTournament(
        tournyName.trim(),
        gamesCount,
        format,
        winPoints,
        selectedGameIds,
        selectedParticipantIds,
        isTeamMode
      );
      
      setActiveTournament(tourny);
      setWizardStep(0);
      setActiveFixtureGameIndices({});
      setFixtureDraftScores({});
      showToast("Tournament started!", "success");
      loadData();
    } catch {
      showToast("Failed to start tournament", "error");
    }
  };

  const handleUpdateFixtureMatchup = async (fixtureId: string, newP1: string, newP2: string) => {
    if (!activeTournament) return;
    if (newP1 === newP2) {
      showToast("Lineup participants must be different!", "error");
      return;
    }

    const updated = { ...activeTournament };
    const fixturesList = updated.bracket?.fixtures || [];
    const fixIdx = fixturesList.findIndex((f: any) => f.id === fixtureId);
    if (fixIdx !== -1) {
      updated.bracket.fixtures[fixIdx].p1 = newP1;
      updated.bracket.fixtures[fixIdx].p2 = newP2;
      await dataService.saveTournament(updated);
      setActiveTournament(updated);
      showToast("Lineup updated!", "success");
    }
  };

  // Helper to fetch/initialize active game index inside a fixture
  const getActiveGameIdxForFixture = (fixtureId: string, fixtureGames: any[]) => {
    if (activeFixtureGameIndices[fixtureId] !== undefined) {
      return activeFixtureGameIndices[fixtureId];
    }
    const firstUnplayed = fixtureGames.findIndex((g) => !g.isPlayed);
    return firstUnplayed !== -1 ? firstUnplayed : 0;
  };

  // Helper to fetch/initialize draft score object inside a fixture active game
  const getFixtureDraftScores = (fixture: any, gameIdx: number) => {
    const key = `${fixture.id}-${gameIdx}`;
    if (fixtureDraftScores[key]) {
      return fixtureDraftScores[key];
    }
    const g = fixture.games[gameIdx];
    return {
      [fixture.p1]: g?.isPlayed ? g.score1 : 0,
      [fixture.p2]: g?.isPlayed ? g.score2 : 0,
    };
  };

  const handleFixtureScoreAdjust = (fixtureId: string, gameIdx: number, competitorId: string, amount: number) => {
    const key = `${fixtureId}-${gameIdx}`;
    setFixtureDraftScores((prev) => {
      const prevDraft = prev[key] || {
        [competitorId]: 0,
      };
      const current = prevDraft[competitorId] || 0;
      const next = Math.max(0, current + amount);
      return {
        ...prev,
        [key]: {
          ...prevDraft,
          [competitorId]: next,
        },
      };
    });
  };

  const handleSaveFixtureGameScore = async (fixtureId: string, gameIdx: number) => {
    if (!activeTournament) return;
    const fixturesList = activeTournament.bracket?.fixtures || [];
    const fixIdx = fixturesList.findIndex((f: any) => f.id === fixtureId);
    if (fixIdx === -1) return;

    const fix = fixturesList[fixIdx];
    const draft = getFixtureDraftScores(fix, gameIdx);
    const s1 = draft[fix.p1] || 0;
    const s2 = draft[fix.p2] || 0;

    // Apply Win Bonus Points
    const bonus = activeTournament.winPoints || 0;
    let finalS1 = s1;
    let finalS2 = s2;
    if (s1 > s2) {
      finalS1 = s1 + bonus;
    } else if (s2 > s1) {
      finalS2 = s2 + bonus;
    }

    const updated = { ...activeTournament };
    const targetFix = updated.bracket.fixtures[fixIdx];
    
    // Save to local tournament fixture bracket state
    targetFix.games[gameIdx] = {
      score1: finalS1,
      score2: finalS2,
      isPlayed: true,
      gameId: activeTournament.games[0] || "",
    };

    // Calculate player array for global match stats
    let playersArr: string[] = [];
    let teamsArr: string[] = [];
    if (updated.isTeamMode) {
      teamsArr = [targetFix.p1, targetFix.p2];
      const team1 = teams.find((t) => t._id === targetFix.p1);
      const team2 = teams.find((t) => t._id === targetFix.p2);
      playersArr = [...(team1?.members || []), ...(team2?.members || [])];
    } else {
      playersArr = [targetFix.p1, targetFix.p2];
    }

    // Save global Match log
    try {
      await dataService.saveMatch({
        game: activeTournament.games[0] || "",
        matchType: updated.isTeamMode ? "Team Match" : "Solo",
        players: playersArr,
        teams: teamsArr,
        scores: {
          [targetFix.p1]: finalS1,
          [targetFix.p2]: finalS2,
        },
        winners: finalS1 > finalS2 ? [targetFix.p1] : finalS2 > finalS1 ? [targetFix.p2] : [targetFix.p1, targetFix.p2],
        isTournamentMatch: true,
        tournament: updated._id,
        roundId: `${updated._id}-${targetFix.id}`,
      });
    } catch (err) {
      console.error("Failed to log match stats globally:", err);
    }

    // Recalculate Standings from all completed games in bracket.fixtures
    const standings: Record<string, { wins: number; losses: number; points: number; games: number }> = {};
    updated.participants.forEach((pId) => {
      standings[pId] = { wins: 0, losses: 0, points: 0, games: 0 };
    });

    updated.bracket.fixtures.forEach((f: any) => {
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
          }
        }
      });
    });

    updated.standings = standings;

    // Esports Action Mode stage advance checkers
    if (updated.format === "action") {
      const groupFixtures = updated.bracket.fixtures.filter((f: any) => f.stage === "group");
      const allGroupPlayed = groupFixtures.every((f: any) => f.games.every((g: any) => g.isPlayed));
      const hasSemi = updated.bracket.fixtures.some((f: any) => f.stage === "semifinal");

      if (allGroupPlayed && !hasSemi) {
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
          .map(([id, s]: any) => ({ id, ...s }))
          .sort((a, b) => b.wins - a.wins || b.points - a.points);

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

      const semiFix = updated.bracket.fixtures.find((f: any) => f.stage === "semifinal");
      const hasFinal = updated.bracket.fixtures.some((f: any) => f.stage === "final");
      if (semiFix && semiFix.games.every((g: any) => g.isPlayed) && !hasFinal) {
        let p1Wins = 0;
        let p2Wins = 0;
        semiFix.games.forEach((g: any) => {
          if (g.score1 > g.score2) p1Wins++;
          else if (g.score2 > g.score1) p2Wins++;
        });

        const semiWinner = p1Wins > p2Wins ? semiFix.p1 : semiFix.p2;

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
          .map(([id, s]: any) => ({ id, ...s }))
          .sort((a, b) => b.wins - a.wins || b.points - a.points);

        const firstPlace = sortedGroup[0]?.id;

        if (firstPlace && semiWinner) {
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

    await dataService.saveTournament(updated);
    setActiveTournament(updated);
    showToast("Game score logged inline!", "success");
    
    // Auto-advance active fixture game index to next unplayed game
    const nextUnplayedIdx = targetFix.games.findIndex((g: any) => !g.isPlayed);
    if (nextUnplayedIdx !== -1) {
      setActiveFixtureGameIndices((prev) => ({
        ...prev,
        [fixtureId]: nextUnplayedIdx,
      }));
    }
    loadData();
  };

  const handleEndTournament = async () => {
    if (!activeTournament) return;
    if (window.confirm("End this tournament and declare the winners based on the standings?")) {
      const sorted = Object.entries(activeTournament.standings)
        .map(([id, s]: any) => ({ id, ...s }))
        .sort((a, b) => b.wins - a.wins || b.points - a.points);

      let champId = sorted[0]?.id;
      let runnerId = sorted[1]?.id;

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

      await dataService.saveTournament(updated);
      showToast(`Tournament finished! Champion: ${champName}`, "success");
      
      setWrappedSummary({
        name: activeTournament.name,
        champion: champName || "Champion",
        runnerUp: runnerName || "Runner Up",
      });

      setActiveTournament(undefined);
      loadData();
    }
  };

  const getParticipantName = (id: string) => {
    if (activeTournament?.isTeamMode || isTeamMode) {
      return teams.find((t) => t._id === id)?.name || "Team";
    }
    return players.find((p) => p._id === id)?.name || "Player";
  };

  const getParticipantPlayers = (id: string) => {
    if (activeTournament?.isTeamMode || isTeamMode) {
      const teamObj = teams.find((t) => t._id === id) || { members: [] };
      return teamObj.members.map((pId) => ({
        id: pId,
        name: players.find((p) => p._id === pId)?.name || "Player",
      }));
    }
    const pObj = players.find((p) => p._id === id) || { name: "Player" };
    return [{ id, name: pObj.name }];
  };

  const sortedStandings = activeTournament
    ? Object.entries(activeTournament.standings)
        .map(([id, s]: any) => {
          const name = activeTournament.isTeamMode
            ? teams.find((t) => t._id === id)?.name || "Team"
            : players.find((p) => p._id === id)?.name || "Player";
          
          const pList = activeTournament.isTeamMode
            ? (teams.find((t) => t._id === id)?.members.map((pId) => ({
                id: pId,
                name: players.find((p) => p._id === pId)?.name || "Player",
              })) || [])
            : [{ id, name }];

          return { id, name, pList, ...s };
        })
        .sort((a, b) => b.wins - a.wins || b.points - a.points)
    : [];

  return (
    <div className="flex flex-col gap-6 max-w-[900px] mx-auto">
      {/* Wrapped summary medal */}
      {wrappedSummary && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="max-w-[420px] w-full p-6 border-border bg-surface rounded-2xl flex flex-col items-center text-center gap-4 shadow-2xl relative">
            <button
              onClick={() => setWrappedSummary(null)}
              className="absolute top-4 right-4 text-text-dim hover:text-text cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center text-accent">
              <Award className="h-10 w-10 stroke-[2] fill-accent/15" />
            </div>
            <div>
              <h2 className="font-display font-bold text-[22px] text-text">Tournament Wrapped!</h2>
              <p className="text-[12.5px] text-text-dim mt-1">
                "{wrappedSummary.name}" has officially concluded
              </p>
            </div>
            
            <div className="flex flex-col gap-2.5 w-full my-2">
              <div className="bg-[#F2B84B]/10 border border-[#F2B84B]/20 p-4 rounded-xl flex flex-col items-center gap-1">
                <span className="text-[20px] leading-none">🥇</span>
                <span className="mono-label text-accent text-[9px] tracking-wider mt-1">CHAMPION</span>
                <span className="font-display font-bold text-[16px] text-text">{wrappedSummary.champion}</span>
              </div>
              <div className="bg-surface-2 border border-border p-4 rounded-xl flex flex-col items-center gap-1">
                <span className="text-[20px] leading-none">🥈</span>
                <span className="mono-label text-text-faint text-[9px] tracking-wider mt-1">RUNNER UP</span>
                <span className="font-display font-bold text-[16px] text-text">{wrappedSummary.runnerUp}</span>
              </div>
            </div>
            
            <Button onClick={() => setWrappedSummary(null)} className="w-full py-6 font-bold bg-primary text-white hover:bg-primary-hover">
              Finish
            </Button>
          </Card>
        </div>
      )}

      {/* Hub / Main View */}
      {wizardStep === 0 && !activeTournament && (
        <div className="flex flex-col items-center text-center p-8 border border-dashed border-border rounded-xl bg-surface/50 max-w-[500px] mx-auto gap-4 my-10">
          <div className="w-14 h-14 bg-accent/15 rounded-full flex items-center justify-center text-accent">
            <Trophy className="h-8 w-8 stroke-[1.8] fill-accent/15" />
          </div>
          <div>
            <h2 className="font-display font-bold text-[18px] text-text">Tournament Manager</h2>
            <p className="text-[13px] text-text-dim leading-relaxed mt-1.5">
              Define match fixtures, track participant scores dynamically via games grid, and crown a champion.
            </p>
          </div>
          <Button
            onClick={handleStartWizard}
            className="w-full bg-primary hover:bg-primary-hover text-white py-6 font-bold text-[14px]"
          >
            Create Tournament
          </Button>
        </div>
      )}

      {/* Wizard Step 1: Details */}
      {wizardStep === 1 && (
        <div className="flex flex-col gap-5 fade-in">
          <div className="flex items-center gap-3 border-b border-border/40 pb-3">
            <button
              onClick={() => setWizardStep(0)}
              className="w-9 h-9 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-dim hover:text-text cursor-pointer focus:outline-none"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="font-display font-bold text-[16px] text-text">
              1. Setup Details
            </h1>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); setWizardStep(2); }} className="flex flex-col gap-4">
            <div>
              <span className="mono-label text-text-dim block mb-1">Tournament Name</span>
              <input
                type="text"
                value={tournyName}
                onChange={(e) => setTournyName(e.target.value)}
                className="w-full h-11 bg-surface-2 border border-border rounded-md px-3 text-[14.5px] text-text font-semibold outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>

            <div>
              <span className="mono-label text-text-dim block mb-1">Tournament Format</span>
              <div className="flex bg-surface-2 border border-border rounded-full p-[3px]">
                <button
                  type="button"
                  onClick={() => setFormat("custom")}
                  className={`flex-1 text-center py-2 rounded-full font-bold text-[12.5px] transition-all cursor-pointer ${
                    format === "custom" ? "bg-primary text-white" : "text-text-dim hover:text-text"
                  }`}
                >
                  Custom Mode
                </button>
                <button
                  type="button"
                  onClick={() => setFormat("action")}
                  className={`flex-1 text-center py-2 rounded-full font-bold text-[12.5px] transition-all cursor-pointer ${
                    format === "action" ? "bg-primary text-white" : "text-text-dim hover:text-text"
                  }`}
                >
                  Action Mode
                </button>
              </div>
              <span className="text-[11.5px] text-[#45D999] font-medium block mt-1.5 leading-relaxed">
                {format === "custom"
                  ? "Custom Mode: Generates matchups but allows changing participants on the fly."
                  : "Action Mode: Predefined matchups. Top team qualifies to final; next 2 play semifinal."}
              </span>
            </div>

            <div>
              <span className="mono-label text-text-dim block mb-1">Games Count (per Matchup series)</span>
              <input
                type="number"
                value={gamesCount}
                onChange={(e) => setGamesCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full h-11 bg-surface-2 border border-border rounded-md px-3 text-[14.5px] text-text font-semibold outline-none focus:ring-1 focus:ring-primary"
                min={1}
                max={50}
                required
              />
              <span className="text-[11.5px] text-text-faint block mt-1">
                How many games are played in each matchup series.
              </span>
            </div>

            <div>
              <span className="mono-label text-text-dim block mb-1">Win Bonus Points</span>
              <input
                type="number"
                value={winPoints}
                onChange={(e) => setWinPoints(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full h-11 bg-surface-2 border border-border rounded-md px-3 text-[14.5px] text-text font-semibold outline-none focus:ring-1 focus:ring-primary"
                min={0}
                max={1000}
                required
              />
              <span className="text-[11.5px] text-text-faint block mt-1">
                Extra points awarded to the winner of each game, added directly to their score.
              </span>
            </div>

            <div>
              <span className="mono-label text-text-dim block mb-1">Participant Type</span>
              <div className="flex bg-surface-2 border border-border rounded-full p-[3px]">
                <button
                  type="button"
                  onClick={() => { setIsTeamMode(false); setSelectedParticipantIds([]); }}
                  className={`flex-1 text-center py-2 rounded-full font-bold text-[12.5px] transition-all cursor-pointer ${
                    !isTeamMode ? "bg-primary text-white" : "text-text-dim hover:text-text"
                  }`}
                >
                  Individual Solo
                </button>
                <button
                  type="button"
                  onClick={() => { setIsTeamMode(true); setSelectedParticipantIds([]); }}
                  className={`flex-1 text-center py-2 rounded-full font-bold text-[12.5px] transition-all cursor-pointer ${
                    isTeamMode ? "bg-primary text-white" : "text-text-dim hover:text-text"
                  }`}
                >
                  Team Pairs
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full py-6 bg-primary text-white hover:bg-primary-hover font-bold mt-2">
              Next: Select Games <ChevronRight className="h-4.5 w-4.5 stroke-[2]" />
            </Button>
          </form>
        </div>
      )}

      {/* Wizard Step 2: Games Selector */}
      {wizardStep === 2 && (
        <div className="flex flex-col gap-5 fade-in">
          <div className="flex items-center gap-3 border-b border-border/40 pb-3">
            <button
              onClick={() => setWizardStep(1)}
              className="w-9 h-9 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-dim hover:text-text cursor-pointer focus:outline-none"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="font-display font-bold text-[16px] text-text">
              2. Select Games
            </h1>
          </div>

          <div className="flex flex-col gap-4">
            {(() => {
              const targetCount = Math.min(gamesCount, games.length);
              const selectedGames = games.filter((g) => selectedGameIds.includes(g._id));

              return (
                <>
                  <Button variant="outline" onClick={handleSelectRandomGames} className="w-full border-dashed py-5 hover:bg-surface-2">
                    <Shuffle className="h-4 w-4 text-text-dim" /> Select {targetCount} Random Games
                  </Button>

                  <p className="mono-label text-text-faint text-[11px] uppercase tracking-wider mt-2">
                    Select exactly {targetCount} games ({selectedGameIds.length} chosen):
                  </p>

                  <GameSelectGrid
                    games={games}
                    selectedGames={selectedGames}
                    onToggle={(g) => toggleGameSelection(g._id)}
                  />

                  <Button
                    onClick={() => setWizardStep(3)}
                    disabled={selectedGameIds.length !== targetCount}
                    className="w-full py-6 bg-primary text-white hover:bg-primary-hover font-bold mt-4"
                  >
                    Next: Choose Participants <ChevronRight className="h-4.5 w-4.5 stroke-[2]" />
                  </Button>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Wizard Step 3: Participants Selector */}
      {wizardStep === 3 && (
        <div className="flex flex-col gap-5 fade-in">
          <div className="flex items-center gap-3 border-b border-border/40 pb-3">
            <button
              onClick={() => setWizardStep(2)}
              className="w-9 h-9 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-dim hover:text-text cursor-pointer focus:outline-none"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="font-display font-bold text-[16px] text-text">
              3. Participants
            </h1>
          </div>

          <div className="flex flex-col gap-4">
            <TeamPairSelector
              players={players}
              teams={teams}
              selectedPlayerIds={!isTeamMode ? selectedParticipantIds : []}
              selectedTeamIds={isTeamMode ? selectedParticipantIds : []}
              matchMode={isTeamMode ? "Team Match" : "Solo"}
              onModeChange={() => {}}
              onPlayerToggle={toggleParticipantSelection}
              onTeamToggle={toggleParticipantSelection}
              onCreateTeamPair={handleCreateTeamPair}
              hideModeSwitcher={true}
            />

            <Button
              onClick={() => setWizardStep(4)}
              disabled={selectedParticipantIds.length < 2}
              className="w-full py-6 bg-primary text-white hover:bg-primary-hover font-bold mt-4"
            >
              Next: Review Overview <ChevronRight className="h-4.5 w-4.5 stroke-[2]" />
            </Button>
          </div>
        </div>
      )}

      {/* Wizard Step 4: Overview & Start */}
      {wizardStep === 4 && (
        <div className="flex flex-col gap-5 fade-in">
          <div className="flex items-center gap-3 border-b border-border/40 pb-3">
            <button
              onClick={() => setWizardStep(3)}
              className="w-9 h-9 rounded-lg bg-surface-2 border border-border flex items-center justify-center text-text-dim hover:text-text cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="font-display font-bold text-[16px] text-text">
              4. Review Overview
            </h1>
          </div>

          <div className="flex flex-col gap-4">
            <Card className="p-4 border-border bg-surface rounded-xl flex flex-col gap-3">
              <div className="flex justify-between items-center text-[13.5px]">
                <span className="font-semibold text-text-dim">Tournament Name</span>
                <span className="font-bold text-text">{tournyName}</span>
              </div>
              <div className="flex justify-between items-center text-[13.5px]">
                <span className="font-semibold text-text-dim">Games per Series</span>
                <span className="font-bold text-text">{gamesCount} Games</span>
              </div>
              <div className="flex justify-between items-center text-[13.5px]">
                <span className="font-semibold text-text-dim">Format</span>
                <span className="font-bold text-text">
                  {format === "action" ? "Action Mode" : "Custom Mode"}
                </span>
              </div>
              <div className="flex justify-between items-center text-[13.5px]">
                <span className="font-semibold text-text-dim">Mode</span>
                <span className="font-bold text-text">{isTeamMode ? "Team Pairs" : "Individual Solo"}</span>
              </div>
            </Card>

            <h3 className="mono-label text-text-faint text-[10.5px] uppercase mt-2">Games Selected ({selectedGameIds.length})</h3>
            <div className="flex flex-wrap gap-1.5">
              {selectedGameIds.map((id) => {
                const g = games.find((game) => game._id === id);
                return (
                  <Badge key={id} className="border-border bg-surface text-text-dim text-[12px] px-3 py-1 font-semibold">
                    {g?.icon} {g?.name}
                  </Badge>
                );
              })}
            </div>

            <h3 className="mono-label text-text-faint text-[10.5px] uppercase mt-2">Participants ({selectedParticipantIds.length})</h3>
            <Card className="p-3 border-border bg-surface rounded-xl flex flex-col gap-2">
              {selectedParticipantIds.map((id) => (
                <div key={id} className="flex items-center gap-2.5 px-1 py-0.5">
                  <PlayerAvatar size="xs" players={getParticipantPlayers(id)} />
                  <span className="font-bold text-[13.5px] text-text">{getParticipantName(id)}</span>
                </div>
              ))}
            </Card>

            <Button onClick={handleStartTournament} className="w-full py-6 bg-gradient-to-r from-accent to-[#D49826] text-[#231702] font-bold text-[14.5px] mt-4 flex items-center justify-center gap-1.5">
              <Play className="h-4 w-4 fill-[#231702] text-[#231702]" /> Start Tournament
            </Button>
          </div>
        </div>
      )}

      {/* Active Tournament Dashboard */}
      {activeTournament && (
        <div className="flex flex-col gap-6 fade-in">
          {/* Header Banner */}
          <Card className="p-4 border-l-4 border-l-accent border-border bg-surface rounded-xl flex justify-between items-center">
            <div>
              <span className="mono-label text-accent text-[9.5px] block">
                ONGOING TOURNAMENT · {activeTournament.format === "action" ? "ACTION MODE" : "CUSTOM MODE"}
              </span>
              <h1 className="font-display font-bold text-[19px] text-text mt-1">{activeTournament.name}</h1>
              <span className="text-[12px] text-text-dim">Series length: {activeTournament.gamesCount} Games</span>
            </div>
            <Button variant="destructive" onClick={handleEndTournament} className="font-bold text-[12.5px] px-4 py-4 cursor-pointer">
              End Tournament
            </Button>
          </Card>

          {/* Standings & Leaderboard Table */}
          <div className="flex flex-col gap-2.5">
            <h2 className="font-display font-bold text-[14.5px] flex items-center gap-1.5 text-text">
              <Trophy className="h-4.5 w-4.5 text-accent fill-accent/15" /> Tournament Leaderboard
            </h2>
            <Card className="p-0 border-border bg-surface rounded-xl overflow-hidden">
              {/* Table header */}
              <div className="flex p-3 text-[11px] font-bold text-text-faint uppercase font-mono border-b border-border/40 bg-surface-2/40">
                <div className="w-8 text-center">#</div>
                <div className="flex-1">Participant</div>
                <div className="w-12 text-center">PL</div>
                <div className="w-12 text-center text-success">W</div>
                <div className="w-12 text-center text-danger">L</div>
                <div className="w-14 text-center text-accent">PTS</div>
              </div>
              
              {/* Table body */}
              {sortedStandings.map((stand, idx) => (
                <div key={stand.id} className="flex p-3 items-center text-[13.5px] border-b border-border/25 last:border-b-0 hover:bg-surface-2/30 transition-colors">
                  <div className="w-8 text-center font-display font-bold text-text-dim">{idx + 1}</div>
                  <div className="flex-1 flex items-center gap-2">
                    <PlayerAvatar size="xs" players={stand.pList} />
                    <span className="font-bold text-text truncate max-w-[150px]">{stand.name}</span>
                  </div>
                  <div className="w-12 text-center font-semibold text-text-dim font-mono">{stand.games}</div>
                  <div className="w-12 text-center font-bold text-success font-mono">{stand.wins}</div>
                  <div className="w-12 text-center font-semibold text-danger/80 font-mono">{stand.losses}</div>
                  <div className="w-14 text-center font-display font-bold text-accent font-mono">{stand.points}</div>
                </div>
              ))}
            </Card>
          </div>

          {/* Fixtures Match Series List (Accordion stack) */}
          <div className="flex flex-col gap-2.5 mb-6">
            <h2 className="font-display font-bold text-[14.5px] flex items-center gap-1.5 text-text">
              <Gamepad2 className="h-4.5 w-4.5 text-text-dim" /> Matchup Series
            </h2>

            <Accordion type="single" collapsible className="w-full flex flex-col gap-3">
              {(activeTournament.bracket?.fixtures || []).map((fix: any, fIdx: number) => {
                const isPlayedCount = (fix.games || []).filter((g: any) => g.isPlayed).length;
                const totalGames = activeTournament.gamesCount;
                
                // Group label header checks
                let stageLabel = "";
                const fixturesList = activeTournament.bracket?.fixtures || [];
                if (fIdx === 0 || fixturesList[fIdx - 1]?.stage !== fix.stage) {
                  stageLabel = fix.stage === "group" 
                    ? "Group Stage Matches" 
                    : fix.stage === "semifinal" 
                      ? "Semifinals" 
                      : "Finals";
                }

                const team1 = teams.find((t) => t._id === fix.p1);
                const team2 = teams.find((t) => t._id === fix.p2);

                const comp1Players = getParticipantPlayers(fix.p1);
                const comp2Players = getParticipantPlayers(fix.p2);

                // Circular Progress calculations
                const pct = totalGames > 0 ? (isPlayedCount / totalGames) * 100 : 0;
                const radius = 13;
                const circumference = 2 * Math.PI * radius;
                const strokeDashoffset = circumference - (pct / 100) * circumference;

                // Inline Scoring Active Game setup
                const activeGameIdx = getActiveGameIdxForFixture(fix.id, fix.games);
                const draftScores = getFixtureDraftScores(fix, activeGameIdx);
                
                // Mock games array mapped for ScoreConsole
                const consoleGames = Array.from({ length: totalGames }, (_, idx) => {
                  const gameId = activeTournament.games[0] || "";
                  const gInfo = games.find((g) => g._id === gameId);
                  return {
                    _id: String(idx), // mapping gameIndex as _id
                    name: `${gInfo?.name || "Game"} #${idx + 1}`,
                    icon: gInfo?.icon || "🎮",
                  };
                }) as any[];

                const consoleCompetitors = [
                  { id: fix.p1, name: getParticipantName(fix.p1), members: comp1Players },
                  { id: fix.p2, name: getParticipantName(fix.p2), members: comp2Players },
                ];

                return (
                  <div key={fix.id} className="flex flex-col gap-2">
                    {stageLabel && (
                      <div className="mono-label text-text-faint text-[10px] tracking-wider border-b border-border/40 pb-1 mt-2 uppercase font-mono">
                        {stageLabel}
                      </div>
                    )}

                    <AccordionItem value={fix.id} className="border border-border bg-surface rounded-xl overflow-hidden px-4">
                      <AccordionTrigger className="hover:no-underline py-4 flex items-center justify-between gap-4 w-full cursor-pointer">
                        <div className="flex-1 flex items-center gap-2 max-w-[80%] min-w-0">
                          {/* Competitor 1 */}
                          <div className="flex items-center gap-1.5 min-w-0 max-w-[45%]">
                            <PlayerAvatar size="xs" players={comp1Players} />
                            <span className="font-bold text-[13.5px] text-text truncate">{getParticipantName(fix.p1)}</span>
                          </div>

                          <span className="mono-label text-text-faint text-[10px] font-mono shrink-0">VS</span>

                          {/* Competitor 2 */}
                          <div className="flex items-center gap-1.5 min-w-0 max-w-[45%]">
                            <PlayerAvatar size="xs" players={comp2Players} />
                            <span className="font-bold text-[13.5px] text-text truncate">{getParticipantName(fix.p2)}</span>
                          </div>
                        </div>

                        {/* Circular progress checking badge */}
                        <div className="relative w-8 h-8 flex items-center justify-center shrink-0 mr-1.5">
                          <svg className="w-full h-full -rotate-90">
                            <circle
                              cx="16"
                              cy="16"
                              r={radius}
                              className="stroke-border fill-none"
                              strokeWidth="2.5"
                            />
                            <circle
                              cx="16"
                              cy="16"
                              r={radius}
                              className="stroke-[#45D999] fill-none transition-all duration-300"
                              strokeWidth="2.5"
                              strokeDasharray={circumference}
                              strokeDashoffset={strokeDashoffset}
                            />
                          </svg>
                          <span className="absolute text-[9px] font-mono font-bold text-[#45D999]">
                            {isPlayedCount}/{totalGames}
                          </span>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="pb-4 pt-1 border-t border-border/40">
                        {/* Inline ScoreConsole wrapper */}
                        <div className="mt-3 p-3 bg-surface-2 border border-border/30 rounded-xl">
                          <ScoreConsole
                            games={consoleGames}
                            activeGameIndex={activeGameIdx}
                            onGameIndexChange={(idx) => {
                              setActiveFixtureGameIndices((prev) => ({
                                ...prev,
                                [fix.id]: idx,
                              }));
                            }}
                            competitors={consoleCompetitors}
                            scores={draftScores}
                            onScoreAdjust={(compId, amount) => handleFixtureScoreAdjust(fix.id, activeGameIdx, compId, amount)}
                            onSave={() => handleSaveFixtureGameScore(fix.id, activeGameIdx)}
                            saveButtonText={
                              fix.games[activeGameIdx]?.isPlayed ? "Update Game Score" : "Save Game Score"
                            }
                          />
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </div>
                );
              })}
            </Accordion>
          </div>
        </div>
      )}
    </div>
  );
}


