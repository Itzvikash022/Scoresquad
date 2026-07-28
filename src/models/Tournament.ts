import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITournament {
  _id: string;
  name: string;
  date: Date;
  gamesCount: number;
  format: "custom" | "action";
  games: string[]; // References to Games played (IDs)
  isTeamMode: boolean;
  participants: string[]; // Player IDs or Team IDs
  bracket: any; // Hierarchical brackets (for Knockout) or fixtures (for Round Robin)
  standings: any; // Current scores/stats of participants
  isActive: boolean;
  champion?: string; // Winner player/team ID
  runnerUp?: string; // Runner up player/team ID
  contributesToStats: boolean; // Does this affect the global leaderboards?
  createdAt: Date;
  updatedAt: Date;
}

const TournamentSchema: Schema<ITournament> = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
    gamesCount: { type: Number, default: 3 },
    format: {
      type: String,
      enum: ["custom", "action"],
      default: "custom",
    },
    games: [{ type: String, ref: "Game" }],
    isTeamMode: { type: Boolean, default: false },
    participants: { type: [String], default: [] },
    bracket: { type: Schema.Types.Mixed, default: {} },
    standings: { type: Schema.Types.Mixed, default: {} },
    isActive: { type: Boolean, default: true },
    champion: { type: String },
    runnerUp: { type: String },
    contributesToStats: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Tournament: Model<ITournament> = mongoose.models.Tournament || mongoose.model<ITournament>("Tournament", TournamentSchema);

export default Tournament;
