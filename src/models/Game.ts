import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGame {
  _id: string;
  name: string;
  icon: string; // Emoji representing the game
  supportedModes: ("Solo" | "Free For All" | "Team Match")[];
  totalMatchesPlayed: number;
  createdAt: Date;
  updatedAt: Date;
}

const GameSchema: Schema<IGame> = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, unique: true, trim: true },
    icon: { type: String, default: "🎮" },
    supportedModes: {
      type: [String],
      enum: ["Solo", "Free For All", "Team Match"],
      default: ["Solo"],
    },
    totalMatchesPlayed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Game: Model<IGame> = mongoose.models.Game || mongoose.model<IGame>("Game", GameSchema);

export default Game;
