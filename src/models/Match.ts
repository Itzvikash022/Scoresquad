import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMatch {
  _id: string;
  date: Date;
  roundId?: string; // Reference to the Round ID
  game: string; // Reference to Game ID
  matchType: "Solo" | "Free For All" | "Team Match";
  players: string[]; // References to Player IDs
  teams: string[]; // References to Team IDs (if Team Match)
  scores: Map<string, number>; // Maps player or team string ID -> score
  winners: string[]; // List of winner IDs (player or team IDs)
  isTournamentMatch: boolean;
  tournament?: string; // Reference to Tournament ID
  isDraft?: boolean;
  targetGamesCount?: number;
  preSelectGames?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MatchSchema: Schema<IMatch> = new Schema(
  {
    _id: { type: String, required: true },
    date: { type: Date, default: Date.now },
    roundId: { type: String },
    game: { type: String, ref: "Game", required: true },
    matchType: {
      type: String,
      enum: ["Solo", "Free For All", "Team Match"],
      required: true,
    },
    players: [{ type: String, ref: "Player" }],
    teams: [{ type: String, ref: "Team" }],
    scores: {
      type: Map,
      of: Number,
      required: true,
    },
    winners: {
      type: [String],
      required: true,
    },
    isTournamentMatch: { type: Boolean, default: false },
    tournament: { type: String, ref: "Tournament" },
    isDraft: { type: Boolean, default: false },
    targetGamesCount: { type: Number },
    preSelectGames: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Match: Model<IMatch> = mongoose.models.Match || mongoose.model<IMatch>("Match", MatchSchema);

export default Match;
