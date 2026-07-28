import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPlayer {
  _id: string;
  name: string;
  nickname?: string;
  avatar: string; // Emoji representing the player
  totalPoints: number;
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
  recentForm: string[]; // List of 'W' or 'L'
  createdAt: Date;
  updatedAt: Date;
}

const PlayerSchema: Schema<IPlayer> = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, unique: true, trim: true },
    nickname: { type: String, trim: true },
    avatar: { type: String, default: "👤" },
    totalPoints: { type: Number, default: 0 },
    matches: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 },
    recentForm: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Prevent compiling model multiple times
const Player: Model<IPlayer> = mongoose.models.Player || mongoose.model<IPlayer>("Player", PlayerSchema);

export default Player;
