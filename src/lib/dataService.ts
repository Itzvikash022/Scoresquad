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

export interface ClientSession {
  _id: string;
  name: string;
  date: string;
  durationMinutes: number;
  totalMatches: number;
  mvp?: string; // Player ID
  champion?: string; // Player ID
  isActive: boolean;
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
  session?: string; // Session ID
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
const DEFAULT_SESSIONS: ClientSession[] = [];
const DEFAULT_TEAMS: ClientTeam[] = [];
const DEFAULT_MATCHES: ClientMatch[] = [];

class DataService {
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
      if (!localStorage.getItem("sessions")) this.setStorage("sessions", DEFAULT_SESSIONS);
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
        this.setStorage("sessions", Array.isArray(data.sessions) ? data.sessions : []);
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
        this.fetchFromServer();
      }
    } catch (e) {
      console.error("Auto sync failed, will retry on next connection change", e);
    }
  }

  // BACKUP & RESTORE
  public exportData(): string {
    const data = {
      players: this.getStorage<ClientPlayer[]>("players", []),
      games: this.getStorage<ClientGame[]>("games", []),
      sessions: this.getStorage<ClientSession[]>("sessions", []),
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
        Array.isArray(data.sessions) &&
        Array.isArray(data.teams) &&
        Array.isArray(data.matches) &&
        Array.isArray(data.tournaments)
      ) {
        this.setStorage("players", data.players);
        this.setStorage("games", data.games);
        this.setStorage("sessions", data.sessions);
        this.setStorage("teams", data.teams);
        this.setStorage("matches", data.matches);
        this.setStorage("tournaments", data.tournaments);
        
        // Push batch sync event
        this.addToQueue("IMPORT", "ALL", data);
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
    this.setStorage("sessions", DEFAULT_SESSIONS);
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
  }

  // SESSIONS CRUD
  public getSessions(): ClientSession[] {
    return this.getStorage<ClientSession[]>("sessions", []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public getActiveSession(): ClientSession | undefined {
    return this.getSessions().find((s) => s.isActive);
  }

  public saveSession(session: Omit<ClientSession, "_id" | "totalMatches" | "durationMinutes"> & { _id?: string }): ClientSession {
    const sessions = this.getStorage<ClientSession[]>("sessions", []);
    let savedSession: ClientSession;

    // Auto-deactivate others if starting a new active session
    if (session.isActive) {
      sessions.forEach((s) => {
        if (s.isActive) s.isActive = false;
      });
    }

    if (session._id) {
      sessions.forEach((s, idx) => {
        if (s._id === session._id) {
          sessions[idx] = { ...s, ...session };
          savedSession = sessions[idx];
        }
      });
      savedSession! = savedSession! || { ...session, _id: session._id, totalMatches: 0, durationMinutes: 0 };
    } else {
      savedSession = { ...session, _id: generateId(), totalMatches: 0, durationMinutes: 0 };
      sessions.push(savedSession);
    }

    this.setStorage("sessions", sessions);
    this.addToQueue(session._id ? "UPDATE" : "CREATE", "SESSION", savedSession);
    return savedSession;
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

  public saveMatch(match: Omit<ClientMatch, "_id" | "date">): ClientMatch {
    const matches = this.getStorage<ClientMatch[]>("matches", []);
    const savedMatch: ClientMatch = {
      ...match,
      _id: generateId(),
      date: new Date().toISOString(),
    };

    matches.push(savedMatch);
    this.setStorage("matches", matches);

    // Update Player & Team Statistics based on Match results
    this.updateStatsFromMatch(savedMatch);

    // Queue sync
    this.addToQueue("CREATE", "MATCH", savedMatch);
    return savedMatch;
  }

  // Scoring Logic Implementation
  private updateStatsFromMatch(match: ClientMatch) {
    const players = this.getStorage<ClientPlayer[]>("players", []);
    const games = this.getStorage<ClientGame[]>("games", []);
    const sessions = this.getStorage<ClientSession[]>("sessions", []);
    const teams = this.getStorage<ClientTeam[]>("teams", []);

    // 1. Update Game total matches
    const game = games.find((g) => g._id === match.game);
    if (game) game.totalMatchesPlayed += 1;

    // 2. Update Session total matches
    if (match.session) {
      const session = sessions.find((s) => s._id === match.session);
      if (session) session.totalMatches += 1;
    }

    // 3. Process Wins/Losses and Points
    if (match.matchType === "Team Match") {
      // In Team Matches, each team receives their score, and each player gets half score
      match.teams.forEach((tId) => {
        const teamObj = teams.find((t) => t._id === tId);
        if (!teamObj) return;

        const score = match.scores[tId] || 0;
        const isWinner = match.winners.includes(tId);

        // Update team stats
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

    // Save recalculated states back
    this.setStorage("players", players);
    this.setStorage("games", games);
    this.setStorage("sessions", sessions);
    this.setStorage("teams", teams);

    // Update tournament standings if this is a tournament match
    if (match.isTournamentMatch && match.tournament) {
      const tournaments = this.getStorage<ClientTournament[]>("tournaments", []);
      const tournyIdx = tournaments.findIndex((t) => t._id === match.tournament);
      if (tournyIdx !== -1) {
        const tourny = tournaments[tournyIdx];
        if (!tourny.standings) tourny.standings = {};

        if (tourny.isTeamMode) {
          match.teams.forEach((tId) => {
            if (!tourny.standings[tId]) {
              tourny.standings[tId] = { wins: 0, losses: 0, points: 0, games: 0 };
            }
            const score = match.scores[tId] || 0;
            const isWinner = match.winners.includes(tId);

            tourny.standings[tId].games += 1;
            tourny.standings[tId].points += score;
            if (isWinner) {
              tourny.standings[tId].wins += 1;
            } else {
              tourny.standings[tId].losses += 1;
            }
          });
        } else {
          match.players.forEach((pId) => {
            if (!tourny.standings[pId]) {
              tourny.standings[pId] = { wins: 0, losses: 0, points: 0, games: 0 };
            }
            const score = match.scores[pId] || 0;
            const isWinner = match.winners.includes(pId);

            tourny.standings[pId].games += 1;
            tourny.standings[pId].points += score;
            if (isWinner) {
              tourny.standings[pId].wins += 1;
            } else {
              tourny.standings[pId].losses += 1;
            }
          });
        }

        tournaments[tournyIdx] = tourny;
        this.setStorage("tournaments", tournaments);
        this.addToQueue("UPDATE", "TOURNAMENT", tourny);
      }
    }

    // Save updates in background sync queue for the related players
    players.forEach((p) => {
      if (match.players.includes(p._id)) {
        this.addToQueue("UPDATE", "PLAYER", p);
      }
    });
    if (game) this.addToQueue("UPDATE", "GAME", game);
    teams.forEach((t) => {
      if (match.teams.includes(t._id)) {
        this.addToQueue("UPDATE", "TEAM", t);
      }
    });
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

    // Pre-generate all unique group pairings (everyone plays everyone once)
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
}

export const dataService = new DataService();
export default dataService;
