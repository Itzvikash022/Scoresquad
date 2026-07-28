import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITeam {
  _id: string;
  key: string; // Unique sorted comma-separated string of player IDs
  name: string; // Custom team name or auto-generated "Alice & Bob"
  members: string[]; // References to Players (IDs)
  games: number;
  wins: number;
  points: number;
  winRate: number;
  recentForm: string[];
  createdAt: Date;
  updatedAt: Date;
}

const TeamSchema: Schema<ITeam> = new Schema(
  {
    _id: { type: String, required: true },
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    members: [{ type: String, ref: "Player" }],
    games: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    points: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    recentForm: { type: [String], default: [] },
  },
  { timestamps: true }
);

const Team: Model<ITeam> = mongoose.models.Team || mongoose.model<ITeam>("Team", TeamSchema);

export default Team;
