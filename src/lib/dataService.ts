"use client";

// Client-side Local-First Data Service with Offline Sync Queue

export interface ClientPlayer {
  _id: string;
  name: string;
  nickname?: string;
  avatar: string;
  totalPoints: number;
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
  recentForm: string[];
  createdAt?: string;
}

export interface ClientGame {
  _id: string;
  name: string;
  icon: string;
  totalMatchesPlayed: number;
}

export interface ClientTeam {
  _id: string;
  key: string;
  name: string;
  members: string[]; // Player IDs
  games: number;
  wins: number;
  points: number;
  winRate: number;
  recentForm: string[];
}

export interface ClientMatch {
  _id: string;
  date: string;
  roundId?: string; // Round ID for grouping
  game: string; // Game ID
  matchType: "Solo" | "Free For All" | "Team Match";
  players: string[]; // Player IDs
  teams: string[]; // Team IDs
  scores: Record<string, number>; // ID -> Score
  winners: string[]; // Winner IDs (players or teams)
  isTournamentMatch: boolean;
  tournament?: string; // Tournament ID
}

export interface ClientTournament {
  _id: string;
  name: string;
  date: string;
  gamesCount: number;
  format: "custom" | "action";
  winPoints: number;
  games: string[]; // Game IDs
  isTeamMode: boolean;
  participants: string[]; // Player or Team IDs
  bracket: any;
  standings: Record<string, { wins: number; losses: number; points: number; games: number }>;
  isActive: boolean;
  champion?: string;
  runnerUp?: string;
  contributesToStats: boolean;
}

// Helper to generate Unique IDs on client
const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

// Initial Mock Seed Data (set to empty arrays to start blank)
const DEFAULT_PLAYERS: ClientPlayer[] = [];
const DEFAULT_GAMES: ClientGame[] = [];
const DEFAULT_TEAMS: ClientTeam[] = [];
const DEFAULT_MATCHES: ClientMatch[] = [];

class DataService {
  private listeners: (() => void)[] = [];

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private emitChange(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (e) {
        console.error("Error in dataService subscriber:", e);
      }
    });
  }

  private getStorage<T>(key: string, defaultValue: T): T {
    if (typeof window === "undefined") return defaultValue;
    const value = localStorage.getItem(key);
    if (!value) {
      this.setStorage(key, defaultValue);
      return defaultValue;
    }
    try {
      const parsed = JSON.parse(value);
      return parsed !== null && parsed !== undefined ? parsed : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private setStorage<T>(key: string, value: T): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, JSON.stringify(value));
      this.emitChange();
    }
  }

  // Sync Queue management
  private getQueue(): any[] {
    return this.getStorage("sync_queue", []);
  }

  private addToQueue(action: string, entityType: string, payload: any) {
    const queue = this.getQueue();
    queue.push({ id: generateId(), action, entityType, payload, timestamp: new Date().toISOString() });
    this.setStorage("sync_queue", queue);
    this.triggerSync();
  }

  constructor() {
    // Initialize LocalStorage with seed data if empty
    if (typeof window !== "undefined") {
      if (!localStorage.getItem("players")) this.setStorage("players", DEFAULT_PLAYERS);
      if (!localStorage.getItem("games")) this.setStorage("games", DEFAULT_GAMES);
      if (!localStorage.getItem("teams")) this.setStorage("teams", DEFAULT_TEAMS);
      if (!localStorage.getItem("matches")) this.setStorage("matches", DEFAULT_MATCHES);
      if (!localStorage.getItem("tournaments")) this.setStorage("tournaments", []);

      // Pull updates from MongoDB server in background on startup if online
      if (navigator.onLine) {
        this.fetchFromServer();
      }

      // Hook network online listener to auto-sync
      window.addEventListener("online", () => this.triggerSync());
    }
  }

  // Pull all data from server and overwrite local storage, removing items not in DB
  public async fetchFromServer() {
    try {
      const response = await fetch("/api/sync");
      if (response.ok) {
        const data = await response.json();
        // Always set data from server, even if empty (to sync deletions)
        this.setStorage("players", Array.isArray(data.players) ? data.players : []);
        this.setStorage("games", Array.isArray(data.games) ? data.games : []);
        this.setStorage("teams", Array.isArray(data.teams) ? data.teams : []);
        this.setStorage("matches", Array.isArray(data.matches) ? data.matches : []);
        this.setStorage("tournaments", Array.isArray(data.tournaments) ? data.tournaments : []);
        console.log("Local cache synced with database.");
      }
    } catch (e) {
      console.warn("Could not fetch sync updates from server, running fully offline.", e);
    }
  }

  // Push local queue changes to server
  public async triggerSync() {
    if (typeof window === "undefined" || !navigator.onLine) return;
    const queue = this.getQueue();
    if (queue.length === 0) return;

    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queue }),
      });

      if (response.ok) {
        // Sync completed successfully, clear queue
        this.setStorage("sync_queue", []);
        console.log("Background sync completed successfully!");
        // Refresh local cache with clean server state
        await this.fetchFromServer();
      }
    } catch (e) {
      console.error("Auto sync failed, will retry on next connection change", e);
      throw e;
    }
  }

  // BACKUP & RESTORE
  public exportData(): string {
    const data = {
      players: this.getStorage<ClientPlayer[]>("players", []),
      games: this.getStorage<ClientGame[]>("games", []),
      teams: this.getStorage<ClientTeam[]>("teams", []),
      matches: this.getStorage<ClientMatch[]>("matches", []),
      tournaments: this.getStorage<ClientTournament[]>("tournaments", []),
    };
    return JSON.stringify(data, null, 2);
  }

  public importData(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (
        Array.isArray(data.players) &&
        Array.isArray(data.games) &&
        Array.isArray(data.teams) &&
        Array.isArray(data.matches) &&
        Array.isArray(data.tournaments)
      ) {
        this.setStorage("players", data.players);
        this.setStorage("games", data.games);
        this.setStorage("teams", data.teams);
        this.setStorage("matches", data.matches);
        this.setStorage("tournaments", data.tournaments);
        
        // Push batch sync event
        this.addToQueue("IMPORT", "ALL", data);
        this.recalculateAllStats();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public resetAllData() {
    this.setStorage("players", DEFAULT_PLAYERS);
    this.setStorage("games", DEFAULT_GAMES);
    this.setStorage("teams", DEFAULT_TEAMS);
    this.setStorage("matches", DEFAULT_MATCHES);
    this.setStorage("tournaments", []);
    this.setStorage("sync_queue", []);
    if (navigator.onLine) {
      fetch("/api/sync?reset=true", { method: "DELETE" }).catch(() => {});
    }
  }

  // PLAYERS CRUD
  public getPlayers(): ClientPlayer[] {
    return this.getStorage<ClientPlayer[]>("players", []).sort((a, b) => b.totalPoints - a.totalPoints);
  }

  public savePlayer(player: Omit<ClientPlayer, "_id" | "totalPoints" | "matches" | "wins" | "losses" | "winRate" | "recentForm"> & { _id?: string }): ClientPlayer {
    const players = this.getStorage<ClientPlayer[]>("players", []);
    let savedPlayer: ClientPlayer;

    if (player._id) {
      // Update existing
      players.forEach((p, idx) => {
        if (p._id === player._id) {
          players[idx] = { ...p, ...player };
          savedPlayer = players[idx];
        }
      });
      savedPlayer! = savedPlayer! || { ...player, _id: player._id, totalPoints: 0, matches: 0, wins: 0, losses: 0, winRate: 0, recentForm: [] };
    } else {
      // Create new
      savedPlayer = {
        ...player,
        _id: generateId(),
        totalPoints: 0,
        matches: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        recentForm: [],
        createdAt: new Date().toISOString(),
      };
      players.push(savedPlayer);
    }

    this.setStorage("players", players);
    this.addToQueue(player._id ? "UPDATE" : "CREATE", "PLAYER", savedPlayer);
    return savedPlayer;
  }

  public deletePlayer(id: string): void {
    const players = this.getStorage<ClientPlayer[]>("players", []).filter((p) => p._id !== id);
    this.setStorage("players", players);
    this.addToQueue("DELETE", "PLAYER", { _id: id });
    this.recalculateAllStats();
  }

  // GAMES CRUD
  public getGames(): ClientGame[] {
    return this.getStorage<ClientGame[]>("games", []).sort((a, b) => b.totalMatchesPlayed - a.totalMatchesPlayed);
  }

  public saveGame(game: Omit<ClientGame, "_id" | "totalMatchesPlayed"> & { _id?: string }): ClientGame {
    const games = this.getStorage<ClientGame[]>("games", []);
    let savedGame: ClientGame;

    if (game._id) {
      games.forEach((g, idx) => {
        if (g._id === game._id) {
          games[idx] = { ...g, ...game };
          savedGame = games[idx];
        }
      });
      savedGame! = savedGame! || { ...game, _id: game._id, totalMatchesPlayed: 0 };
    } else {
      savedGame = { ...game, _id: generateId(), totalMatchesPlayed: 0 };
      games.push(savedGame);
    }

    this.setStorage("games", games);
    this.addToQueue(game._id ? "UPDATE" : "CREATE", "GAME", savedGame);
    return savedGame;
  }

  public deleteGame(id: string): void {
    const games = this.getStorage<ClientGame[]>("games", []).filter((g) => g._id !== id);
    this.setStorage("games", games);
    this.addToQueue("DELETE", "GAME", { _id: id });
    this.recalculateAllStats();
  }

  // TEAMS CRUD
  public getTeams(): ClientTeam[] {
    return this.getStorage<ClientTeam[]>("teams", []).sort((a, b) => b.points - a.points);
  }

  public getOrCreateTeam(memberIds: string[]): ClientTeam {
    const sortedIds = [...memberIds].sort();
    const key = sortedIds.join(",");
    const teams = this.getTeams();
    const existingTeam = teams.find((t) => t.key === key);

    if (existingTeam) return existingTeam;

    // Create a new combination team record
    const players = this.getPlayers();
    const memberNames = sortedIds.map((id) => players.find((p) => p._id === id)?.name || "Player").join(" & ");

    const newTeam: ClientTeam = {
      _id: generateId(),
      key,
      name: memberNames,
      members: sortedIds,
      games: 0,
      wins: 0,
      points: 0,
      winRate: 0,
      recentForm: [],
    };

    teams.push(newTeam);
    this.setStorage("teams", teams);
    this.addToQueue("CREATE", "TEAM", newTeam);
    return newTeam;
  }

  // MATCHES CRUD & STATS UPDATING
  public getMatches(): ClientMatch[] {
    return this.getStorage<ClientMatch[]>("matches", []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public saveMatch(match: Omit<ClientMatch, "_id" | "date"> & { _id?: string; date?: string }): ClientMatch {
    const matches = this.getStorage<ClientMatch[]>("matches", []);
    let savedMatch: ClientMatch;

    const id = match._id || generateId();
    const rId = match.roundId || id;

    if (match._id) {
      const idx = matches.findIndex((m) => m._id === match._id);
      if (idx !== -1) {
        savedMatch = {
          ...matches[idx],
          ...match,
          roundId: rId,
          _id: match._id,
          date: match.date || matches[idx].date || new Date().toISOString(),
        };
        matches[idx] = savedMatch;
      } else {
        savedMatch = {
          ...match,
          roundId: rId,
          _id: match._id,
          date: match.date || new Date().toISOString(),
        } as ClientMatch;
        matches.push(savedMatch);
      }
      this.setStorage("matches", matches);
      this.addToQueue("UPDATE", "MATCH", savedMatch);
    } else {
      savedMatch = {
        ...match,
        roundId: rId,
        _id: id,
        date: new Date().toISOString(),
      } as ClientMatch;
      matches.push(savedMatch);
      this.setStorage("matches", matches);
      this.addToQueue("CREATE", "MATCH", savedMatch);
    }

    // Rebuild all statistics
    this.recalculateAllStats();

    // Sync with tournament if needed
    if (savedMatch.isTournamentMatch && savedMatch.tournament) {
      this.syncTournamentFromMatches(savedMatch.tournament);
    }

    return savedMatch;
  }

  public deleteMatch(matchId: string) {
    const matches = this.getStorage<ClientMatch[]>("matches", []);
    const matchToDelete = matches.find((m) => m._id === matchId);
    if (!matchToDelete) return;

    const filtered = matches.filter((m) => m._id !== matchId);
    this.setStorage("matches", filtered);
    this.addToQueue("DELETE", "MATCH", { _id: matchId });

    this.recalculateAllStats();

    if (matchToDelete.isTournamentMatch && matchToDelete.tournament) {
      this.syncTournamentFromMatches(matchToDelete.tournament);
    }
  }

  public deleteRound(roundId: string) {
    const matches = this.getStorage<ClientMatch[]>("matches", []);
    const matchesToDelete = matches.filter((m) => (m.roundId || m._id) === roundId);
    if (matchesToDelete.length === 0) return;

    const filtered = matches.filter((m) => (m.roundId || m._id) !== roundId);
    this.setStorage("matches", filtered);

    const tournamentIdsToSync = new Set<string>();

    matchesToDelete.forEach((m) => {
      this.addToQueue("DELETE", "MATCH", { _id: m._id });
      if (m.isTournamentMatch && m.tournament) {
        tournamentIdsToSync.add(m.tournament);
      }
    });

    this.recalculateAllStats();

    tournamentIdsToSync.forEach((tId) => {
      this.syncTournamentFromMatches(tId);
    });
  }

  // Dynamic Full Stats Recalculator from Scratch
  public recalculateAllStats() {
    const players = this.getStorage<ClientPlayer[]>("players", []);
    const games = this.getStorage<ClientGame[]>("games", []);
    const teams = this.getStorage<ClientTeam[]>("teams", []);
    const matches = this.getStorage<ClientMatch[]>("matches", []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 1. Reset Players
    players.forEach((p) => {
      p.totalPoints = 0;
      p.matches = 0;
      p.wins = 0;
      p.losses = 0;
      p.winRate = 0;
      p.recentForm = [];
    });

    // 2. Reset Teams
    teams.forEach((t) => {
      t.games = 0;
      t.wins = 0;
      t.points = 0;
      t.winRate = 0;
      t.recentForm = [];
    });

    // 3. Reset Games
    games.forEach((g) => {
      g.totalMatchesPlayed = 0;
    });

    // 4. Process matches in chronological order to build stats
    matches.forEach((match) => {
      const gameObj = games.find((g) => g._id === match.game);
      if (gameObj) gameObj.totalMatchesPlayed += 1;

      if (match.matchType === "Team Match") {
        match.teams.forEach((tId) => {
          const teamObj = teams.find((t) => t._id === tId);
          if (!teamObj) return;

          const score = match.scores[tId] || 0;
          const isWinner = match.winners.includes(tId);

          teamObj.games += 1;
          teamObj.points += score;
          if (isWinner) {
            teamObj.wins += 1;
            teamObj.recentForm.push("W");
          } else {
            teamObj.recentForm.push("L");
          }
          teamObj.winRate = (teamObj.wins / teamObj.games) * 100;

          // Split score equally among team members
          const splitScore = Math.round(score / Math.max(teamObj.members.length, 1));
          teamObj.members.forEach((pId) => {
            const playerObj = players.find((p) => p._id === pId);
            if (!playerObj) return;

            playerObj.matches += 1;
            playerObj.totalPoints += splitScore;
            if (isWinner) {
              playerObj.wins += 1;
              playerObj.recentForm.push("W");
            } else {
              playerObj.losses += 1;
              playerObj.recentForm.push("L");
            }
            playerObj.winRate = (playerObj.wins / playerObj.matches) * 100;
          });
        });
      } else {
        // Solo / Free For All
        match.players.forEach((pId) => {
          const playerObj = players.find((p) => p._id === pId);
          if (!playerObj) return;

          const score = match.scores[pId] || 0;
          const isWinner = match.winners.includes(pId);

          playerObj.matches += 1;
          playerObj.totalPoints += score;
          if (isWinner) {
            playerObj.wins += 1;
            playerObj.recentForm.push("W");
          } else {
            playerObj.losses += 1;
            playerObj.recentForm.push("L");
          }
          playerObj.winRate = (playerObj.wins / playerObj.matches) * 100;
        });
      }
    });

    // 5. Cap recent forms to last 5 entries
    players.forEach((p) => {
      if (p.recentForm.length > 5) p.recentForm = p.recentForm.slice(-5);
      else if (p.matches > 0) p.losses = p.matches - p.wins;
    });
    teams.forEach((t) => {
      if (t.recentForm.length > 5) t.recentForm = t.recentForm.slice(-5);
    });

    // 6. Save recalculated states back
    this.setStorage("players", players);
    this.setStorage("games", games);
    this.setStorage("teams", teams);

    // 7. Sync queue updates for modified stats
    players.forEach((p) => this.addToQueue("UPDATE", "PLAYER", p));
    games.forEach((g) => this.addToQueue("UPDATE", "GAME", g));
    teams.forEach((t) => this.addToQueue("UPDATE", "TEAM", t));
  }

  // TOURNAMENTS CRUD
  public getTournaments(): ClientTournament[] {
    return this.getStorage<ClientTournament[]>("tournaments", []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public getActiveTournament(): ClientTournament | undefined {
    return this.getTournaments().find((t) => t.isActive);
  }

  public saveTournament(tournament: ClientTournament): ClientTournament {
    const tournaments = this.getTournaments();
    const idx = tournaments.findIndex((t) => t._id === tournament._id);

    if (idx !== -1) {
      tournaments[idx] = tournament;
    } else {
      tournaments.push(tournament);
    }

    this.setStorage("tournaments", tournaments);
    this.addToQueue(idx !== -1 ? "UPDATE" : "CREATE", "TOURNAMENT", tournament);
    return tournament;
  }

  public createTournament(name: string, gamesCount: number, format: "custom" | "action", winPoints: number, gameIds: string[], participantIds: string[], isTeamMode: boolean): ClientTournament {
    const id = generateId();
    
    // Auto-deactivate others
    const tournaments = this.getTournaments();
    tournaments.forEach((t) => {
      if (t.isActive) t.isActive = false;
    });
    this.setStorage("tournaments", tournaments);

    const standings: Record<string, any> = {};
    participantIds.forEach((pId) => {
      standings[pId] = { wins: 0, losses: 0, points: 0, games: 0 };
    });

    const fixtures: any[] = [];
    let idCounter = 1;
    for (let i = 0; i < participantIds.length; i++) {
      for (let j = i + 1; j < participantIds.length; j++) {
        fixtures.push({
          id: `matchup-${idCounter++}`,
          p1: participantIds[i],
          p2: participantIds[j],
          games: Array.from({ length: gamesCount }, () => ({ score1: null, score2: null, isPlayed: false, gameId: null })),
          stage: "group",
        });
      }
    }

    const newTournament: ClientTournament = {
      _id: id,
      name,
      date: new Date().toISOString(),
      gamesCount,
      format,
      winPoints,
      games: gameIds,
      isTeamMode,
      participants: participantIds,
      bracket: { fixtures },
      standings,
      isActive: true,
      contributesToStats: true,
    };

    return this.saveTournament(newTournament);
  }

  // Hierarchy Management: Sync brackets and standings of tournament from matches
  public syncTournamentFromMatches(tournamentId: string) {
    const tournaments = this.getTournaments();
    const tournament = tournaments.find((t) => t._id === tournamentId);
    if (!tournament) return;

    const matches = this.getStorage<ClientMatch[]>("matches", []);
    // Find all matches for this tournament
    const tourneyMatches = matches.filter((m) => m.tournament === tournamentId && m.isTournamentMatch);

    // Group matches by fixtureId
    const fixtureMatches: Record<string, ClientMatch[]> = {};
    tourneyMatches.forEach((m) => {
      if (m.roundId) {
        const parts = m.roundId.split("-");
        const fixtureId = parts.slice(1).join("-");
        if (fixtureId) {
          if (!fixtureMatches[fixtureId]) fixtureMatches[fixtureId] = [];
          fixtureMatches[fixtureId].push(m);
        }
      }
    });

    let changed = false;
    if (tournament.bracket && Array.isArray(tournament.bracket.fixtures)) {
      tournament.bracket.fixtures.forEach((fix: any) => {
        const fixMatches = fixtureMatches[fix.id];
        if (fixMatches) {
          const sortedMatches = [...fixMatches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          fix.games = Array.from({ length: tournament.gamesCount }, (_, idx) => {
            const m = sortedMatches[idx];
            if (m) {
              return {
                score1: m.scores[fix.p1] !== undefined ? m.scores[fix.p1] : null,
                score2: m.scores[fix.p2] !== undefined ? m.scores[fix.p2] : null,
                isPlayed: true,
                gameId: m.game,
              };
            } else {
              return {
                score1: null,
                score2: null,
                isPlayed: false,
                gameId: null,
              };
            }
          });
          changed = true;
        } else {
          // Reset to default empty games if no matches
          fix.games = Array.from({ length: tournament.gamesCount }, () => ({
            score1: null,
            score2: null,
            isPlayed: false,
            gameId: null,
          }));
          changed = true;
        }
      });
    }

    if (changed) {
      // Recalculate Standings
      const standings: Record<string, { wins: number; losses: number; points: number; games: number }> = {};
      tournament.participants.forEach((pId) => {
        standings[pId] = { wins: 0, losses: 0, points: 0, games: 0 };
      });

      (tournament.bracket?.fixtures || []).forEach((f: any) => {
        if (!standings[f.p1]) standings[f.p1] = { wins: 0, losses: 0, points: 0, games: 0 };
        if (!standings[f.p2]) standings[f.p2] = { wins: 0, losses: 0, points: 0, games: 0 };

        f.games.forEach((g: any) => {
          if (g && g.isPlayed) {
            standings[f.p1].games += 1;
            standings[f.p2].games += 1;
            standings[f.p1].points += g.score1 || 0;
            standings[f.p2].points += g.score2 || 0;

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

      tournament.standings = standings;

      // Handle Esports stage advancements if action mode
      this.checkActionTournamentAdvancement(tournament);

      // Check if tournament is completed (e.g. final played) and assign champion
      const finalFix = (tournament.bracket?.fixtures || []).find((f: any) => f.stage === "final");
      if (finalFix && finalFix.games.every((g: any) => g.isPlayed)) {
        let p1Wins = 0;
        let p2Wins = 0;
        finalFix.games.forEach((g: any) => {
          if (g.score1 > g.score2) p1Wins++;
          else if (g.score2 > g.score1) p2Wins++;
        });
        if (p1Wins !== p2Wins) {
          tournament.champion = p1Wins > p2Wins ? finalFix.p1 : finalFix.p2;
          tournament.runnerUp = p1Wins > p2Wins ? finalFix.p2 : finalFix.p1;
          tournament.isActive = false;
        }
      }

      this.saveTournament(tournament);
    }
  }

  private checkActionTournamentAdvancement(tournament: ClientTournament) {
    if (tournament.format !== "action") return;

    const groupFixtures = (tournament.bracket?.fixtures || []).filter((f: any) => f.stage === "group");
    const allGroupPlayed = groupFixtures.every((f: any) => f.games.every((g: any) => g.isPlayed));
    const hasSemi = (tournament.bracket?.fixtures || []).some((f: any) => f.stage === "semifinal");

    if (allGroupPlayed && !hasSemi) {
      const groupStandings: Record<string, { wins: number; points: number }> = {};
      tournament.participants.forEach((id) => { groupStandings[id] = { wins: 0, points: 0 }; });

      groupFixtures.forEach((f: any) => {
        f.games.forEach((g: any) => {
          if (g.isPlayed) {
            groupStandings[f.p1].points += g.score1 || 0;
            groupStandings[f.p2].points += g.score2 || 0;
            if (g.score1 > g.score2) groupStandings[f.p1].wins++;
            else if (g.score2 > g.score1) groupStandings[f.p2].wins++;
          }
        });
      });

      const sortedGroup = Object.entries(groupStandings)
        .map(([id, stats]: any) => ({ id, ...stats }))
        .sort((a, b) => b.wins - a.wins || b.points - a.points);

      const secondPlace = sortedGroup[1]?.id;
      const thirdPlace = sortedGroup[2]?.id;

      if (secondPlace && thirdPlace) {
        tournament.bracket.fixtures.push({
          id: "semifinal",
          p1: secondPlace,
          p2: thirdPlace,
          games: Array.from({ length: tournament.gamesCount }, () => ({ score1: null, score2: null, isPlayed: false, gameId: null })),
          stage: "semifinal",
        });
      }
    }

    const semiFix = (tournament.bracket?.fixtures || []).find((f: any) => f.stage === "semifinal");
    const hasFinal = (tournament.bracket?.fixtures || []).some((f: any) => f.stage === "final");
    if (semiFix && semiFix.games.every((g: any) => g.isPlayed) && !hasFinal) {
      let p1Wins = 0;
      let p2Wins = 0;
      semiFix.games.forEach((g: any) => {
        if (g.score1 > g.score2) p1Wins++;
        else if (g.score2 > g.score1) p2Wins++;
      });

      const semiWinner = p1Wins > p2Wins ? semiFix.p1 : semiFix.p2;

      const groupStandings: Record<string, { wins: number; points: number }> = {};
      tournament.participants.forEach((id) => { groupStandings[id] = { wins: 0, points: 0 }; });

      groupFixtures.forEach((f: any) => {
        f.games.forEach((g: any) => {
          if (g.isPlayed) {
            groupStandings[f.p1].points += g.score1 || 0;
            groupStandings[f.p2].points += g.score2 || 0;
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
        if (!tournament.bracket.fixtures) tournament.bracket.fixtures = [];
        tournament.bracket.fixtures.push({
          id: "final",
          p1: firstPlace,
          p2: semiWinner,
          games: Array.from({ length: tournament.gamesCount }, () => ({ score1: null, score2: null, isPlayed: false, gameId: null })),
          stage: "final",
        });
      }
    }
  }
}

export const dataService = new DataService();
export default dataService;
