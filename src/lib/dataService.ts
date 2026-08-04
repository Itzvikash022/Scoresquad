"use client";

// Client-side API-First Data Service with In-Memory Caching

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
  hasRenamedOnce?: boolean;
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

// Helper to generate Unique IDs on client for initial creation before DB sync
const generateId = () => Math.random().toString(36).substring(2, 15) + Date.now().toString(36);

class DataService {
  private listeners: (() => void)[] = [];
  
  private memoryCache: {
    players: ClientPlayer[];
    games: ClientGame[];
    teams: ClientTeam[];
    matches: ClientMatch[];
    tournaments: ClientTournament[];
  } = {
    players: [],
    games: [],
    teams: [],
    matches: [],
    tournaments: []
  };

  public isLoaded = false;

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

  private async pushToApi(action: string, entityType: string, payload: any) {
    if (typeof window === "undefined") return;
    try {
      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queue: [{ action, entityType, payload }] }),
      });
      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }
    } catch (e) {
      console.error("API push failed:", e);
      throw e;
    }
  }

  constructor() {
    if (typeof window !== "undefined") {
      this.fetchFromServer();
    }
  }

  public async fetchFromServer() {
    try {
      const response = await fetch("/api/sync");
      if (response.ok) {
        const data = await response.json();
        this.memoryCache.players = Array.isArray(data.players) ? data.players : [];
        this.memoryCache.games = Array.isArray(data.games) ? data.games : [];
        this.memoryCache.teams = Array.isArray(data.teams) ? data.teams : [];
        this.memoryCache.matches = Array.isArray(data.matches) ? data.matches : [];
        this.memoryCache.tournaments = Array.isArray(data.tournaments) ? data.tournaments : [];
        
        this.recalculateAllStats();
        this.isLoaded = true;
        this.emitChange();
        console.log("Local cache synced with database.");
      }
    } catch (e) {
      console.error("Could not fetch updates from server.", e);
    }
  }

  // PLAYERS CRUD
  public getPlayers(): ClientPlayer[] {
    return [...this.memoryCache.players].sort((a, b) => b.totalPoints - a.totalPoints);
  }

  public async savePlayer(player: Omit<ClientPlayer, "_id" | "totalPoints" | "matches" | "wins" | "losses" | "winRate" | "recentForm"> & { _id?: string }): Promise<ClientPlayer> {
    const isNew = !player._id;
    const _id = player._id || generateId();
    let savedPlayer: ClientPlayer;

    if (isNew) {
      savedPlayer = {
        ...player,
        _id,
        totalPoints: 0,
        matches: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        recentForm: [],
        createdAt: new Date().toISOString(),
      };
      this.memoryCache.players.push(savedPlayer);
    } else {
      const idx = this.memoryCache.players.findIndex((p) => p._id === _id);
      if (idx !== -1) {
        this.memoryCache.players[idx] = { ...this.memoryCache.players[idx], ...player };
        savedPlayer = this.memoryCache.players[idx];
      } else {
        savedPlayer = { ...player, _id, totalPoints: 0, matches: 0, wins: 0, losses: 0, winRate: 0, recentForm: [] };
        this.memoryCache.players.push(savedPlayer);
      }
    }

    await this.pushToApi(isNew ? "CREATE" : "UPDATE", "PLAYER", savedPlayer);
    this.emitChange();
    return savedPlayer;
  }

  public async deletePlayer(id: string): Promise<void> {
    this.memoryCache.players = this.memoryCache.players.filter((p) => p._id !== id);
    this.recalculateAllStats();
    await this.pushToApi("DELETE", "PLAYER", { _id: id });
    this.emitChange();
  }

  // GAMES CRUD
  public getGames(): ClientGame[] {
    return [...this.memoryCache.games].sort((a, b) => b.totalMatchesPlayed - a.totalMatchesPlayed);
  }

  public async saveGame(game: Omit<ClientGame, "_id" | "totalMatchesPlayed"> & { _id?: string }): Promise<ClientGame> {
    const isNew = !game._id;
    const _id = game._id || generateId();
    let savedGame: ClientGame;

    if (isNew) {
      savedGame = { ...game, _id, totalMatchesPlayed: 0 };
      this.memoryCache.games.push(savedGame);
    } else {
      const idx = this.memoryCache.games.findIndex((g) => g._id === _id);
      if (idx !== -1) {
        this.memoryCache.games[idx] = { ...this.memoryCache.games[idx], ...game };
        savedGame = this.memoryCache.games[idx];
      } else {
        savedGame = { ...game, _id, totalMatchesPlayed: 0 };
        this.memoryCache.games.push(savedGame);
      }
    }

    await this.pushToApi(isNew ? "CREATE" : "UPDATE", "GAME", savedGame);
    this.emitChange();
    return savedGame;
  }

  public async deleteGame(id: string): Promise<void> {
    this.memoryCache.games = this.memoryCache.games.filter((g) => g._id !== id);
    this.recalculateAllStats();
    await this.pushToApi("DELETE", "GAME", { _id: id });
    this.emitChange();
  }

  // TEAMS CRUD
  public getTeams(): ClientTeam[] {
    return [...this.memoryCache.teams].sort((a, b) => b.points - a.points);
  }

  public async getOrCreateTeam(memberIds: string[]): Promise<ClientTeam> {
    const sortedIds = [...memberIds].sort();
    const key = sortedIds.join(",");
    const existingTeam = this.memoryCache.teams.find((t) => t.key === key);

    if (existingTeam) return existingTeam;

    const memberNames = sortedIds.map((id) => this.memoryCache.players.find((p) => p._id === id)?.name || "Player").join(" & ");
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

    this.memoryCache.teams.push(newTeam);
    await this.pushToApi("CREATE", "TEAM", newTeam);
    this.emitChange();
    return newTeam;
  }

  // MATCHES CRUD
  public getMatches(): ClientMatch[] {
    return [...this.memoryCache.matches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public async saveMatch(match: Omit<ClientMatch, "_id" | "date"> & { _id?: string; date?: string }): Promise<ClientMatch> {
    const isNew = !match._id;
    const _id = match._id || generateId();
    const rId = match.roundId || _id;
    let savedMatch: ClientMatch;

    if (isNew) {
      savedMatch = { ...match, roundId: rId, _id, date: match.date || new Date().toISOString() } as ClientMatch;
      this.memoryCache.matches.push(savedMatch);
    } else {
      const idx = this.memoryCache.matches.findIndex((m) => m._id === _id);
      if (idx !== -1) {
        savedMatch = { ...this.memoryCache.matches[idx], ...match, roundId: rId, _id, date: match.date || this.memoryCache.matches[idx].date || new Date().toISOString() };
        this.memoryCache.matches[idx] = savedMatch;
      } else {
        savedMatch = { ...match, roundId: rId, _id, date: match.date || new Date().toISOString() } as ClientMatch;
        this.memoryCache.matches.push(savedMatch);
      }
    }

    this.recalculateAllStats();

    if (savedMatch.isTournamentMatch && savedMatch.tournament) {
      await this.syncTournamentFromMatches(savedMatch.tournament);
    }

    await this.pushToApi(isNew ? "CREATE" : "UPDATE", "MATCH", savedMatch);
    this.emitChange();
    return savedMatch;
  }

  public async deleteMatch(matchId: string): Promise<void> {
    const matchToDelete = this.memoryCache.matches.find((m) => m._id === matchId);
    if (!matchToDelete) return;

    this.memoryCache.matches = this.memoryCache.matches.filter((m) => m._id !== matchId);
    this.recalculateAllStats();

    if (matchToDelete.isTournamentMatch && matchToDelete.tournament) {
      await this.syncTournamentFromMatches(matchToDelete.tournament);
    }

    await this.pushToApi("DELETE", "MATCH", { _id: matchId });
    this.emitChange();
  }

  public async deleteRound(roundId: string): Promise<void> {
    const matchesToDelete = this.memoryCache.matches.filter((m) => (m.roundId || m._id) === roundId);
    if (matchesToDelete.length === 0) return;

    this.memoryCache.matches = this.memoryCache.matches.filter((m) => (m.roundId || m._id) !== roundId);
    this.recalculateAllStats();

    const tournamentIdsToSync = new Set<string>();
    for (const m of matchesToDelete) {
      if (m.isTournamentMatch && m.tournament) {
        tournamentIdsToSync.add(m.tournament);
      }
      await this.pushToApi("DELETE", "MATCH", { _id: m._id });
    }

    for (const tId of tournamentIdsToSync) {
      await this.syncTournamentFromMatches(tId);
    }

    this.emitChange();
  }

  // Dynamic Full Stats Recalculator
  public recalculateAllStats() {
    const players = this.memoryCache.players;
    const games = this.memoryCache.games;
    const teams = this.memoryCache.teams;
    const matches = [...this.memoryCache.matches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    players.forEach((p) => { p.totalPoints = 0; p.matches = 0; p.wins = 0; p.losses = 0; p.winRate = 0; p.recentForm = []; });
    teams.forEach((t) => { t.games = 0; t.wins = 0; t.points = 0; t.winRate = 0; t.recentForm = []; });
    games.forEach((g) => { g.totalMatchesPlayed = 0; });

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
          if (isWinner) { teamObj.wins += 1; teamObj.recentForm.push("W"); }
          else { teamObj.recentForm.push("L"); }
          teamObj.winRate = (teamObj.wins / teamObj.games) * 100;

          const splitScore = Math.round(score / Math.max(teamObj.members.length, 1));
          teamObj.members.forEach((pId) => {
            const playerObj = players.find((p) => p._id === pId);
            if (!playerObj) return;

            playerObj.matches += 1;
            playerObj.totalPoints += splitScore;
            if (isWinner) { playerObj.wins += 1; playerObj.recentForm.push("W"); }
            else { playerObj.losses += 1; playerObj.recentForm.push("L"); }
            playerObj.winRate = (playerObj.wins / playerObj.matches) * 100;
          });
        });
      } else {
        match.players.forEach((pId) => {
          const playerObj = players.find((p) => p._id === pId);
          if (!playerObj) return;

          const score = match.scores[pId] || 0;
          const isWinner = match.winners.includes(pId);

          playerObj.matches += 1;
          playerObj.totalPoints += score;
          if (isWinner) { playerObj.wins += 1; playerObj.recentForm.push("W"); }
          else { playerObj.losses += 1; playerObj.recentForm.push("L"); }
          playerObj.winRate = (playerObj.wins / playerObj.matches) * 100;
        });
      }
    });

    players.forEach((p) => {
      if (p.recentForm.length > 5) p.recentForm = p.recentForm.slice(-5);
      else if (p.matches > 0) p.losses = p.matches - p.wins;
    });
    teams.forEach((t) => {
      if (t.recentForm.length > 5) t.recentForm = t.recentForm.slice(-5);
    });
    
    // Fire-and-forget sync to API to update stats on server
    // Since we want this to be seamless, we can trigger an async block without awaiting it
    const queue: any[] = [];
    players.forEach((p) => queue.push({ action: "UPDATE", entityType: "PLAYER", payload: p }));
    games.forEach((g) => queue.push({ action: "UPDATE", entityType: "GAME", payload: g }));
    teams.forEach((t) => queue.push({ action: "UPDATE", entityType: "TEAM", payload: t }));
    
    if (typeof window !== "undefined" && queue.length > 0) {
       fetch("/api/sync", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ queue }),
       }).catch(console.error);
    }
  }

  // TOURNAMENTS CRUD
  public getTournaments(): ClientTournament[] {
    return [...this.memoryCache.tournaments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public getActiveTournament(): ClientTournament | undefined {
    return this.memoryCache.tournaments.find((t) => t.isActive);
  }

  public async saveTournament(tournament: ClientTournament): Promise<ClientTournament> {
    const idx = this.memoryCache.tournaments.findIndex((t) => t._id === tournament._id);
    const isNew = idx === -1;

    if (!isNew) {
      this.memoryCache.tournaments[idx] = tournament;
    } else {
      this.memoryCache.tournaments.push(tournament);
    }

    await this.pushToApi(isNew ? "CREATE" : "UPDATE", "TOURNAMENT", tournament);
    this.emitChange();
    return tournament;
  }

  public async createTournament(name: string, gamesCount: number, format: "custom" | "action", winPoints: number, gameIds: string[], participantIds: string[], isTeamMode: boolean): Promise<ClientTournament> {
    const id = generateId();
    
    this.memoryCache.tournaments.forEach((t) => {
      if (t.isActive) t.isActive = false;
    });

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

  public async syncTournamentFromMatches(tournamentId: string) {
    const tournament = this.memoryCache.tournaments.find((t) => t._id === tournamentId);
    if (!tournament) return;

    const tourneyMatches = this.memoryCache.matches.filter((m) => m.tournament === tournamentId && m.isTournamentMatch);

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
              return { score1: null, score2: null, isPlayed: false, gameId: null };
            }
          });
          changed = true;
        } else {
          fix.games = Array.from({ length: tournament.gamesCount }, () => ({ score1: null, score2: null, isPlayed: false, gameId: null }));
          changed = true;
        }
      });
    }

    if (changed) {
      const standings: Record<string, { wins: number; losses: number; points: number; games: number }> = {};
      tournament.participants.forEach((pId) => { standings[pId] = { wins: 0, losses: 0, points: 0, games: 0 }; });

      (tournament.bracket?.fixtures || []).forEach((f: any) => {
        if (!standings[f.p1]) standings[f.p1] = { wins: 0, losses: 0, points: 0, games: 0 };
        if (!standings[f.p2]) standings[f.p2] = { wins: 0, losses: 0, points: 0, games: 0 };

        f.games.forEach((g: any) => {
          if (g && g.isPlayed) {
            standings[f.p1].games += 1;
            standings[f.p2].games += 1;
            standings[f.p1].points += g.score1 || 0;
            standings[f.p2].points += g.score2 || 0;

            if (g.score1 > g.score2) { standings[f.p1].wins += 1; standings[f.p2].losses += 1; }
            else if (g.score2 > g.score1) { standings[f.p2].wins += 1; standings[f.p1].losses += 1; }
          }
        });
      });

      tournament.standings = standings;
      this.checkActionTournamentAdvancement(tournament);

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
      await this.saveTournament(tournament);
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
