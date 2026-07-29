import mongoose, { Schema, Document, Model } from "mongoose";

export interface IGame {
  _id: string;
  name: string;
  icon: string; // Emoji representing the game
  totalMatchesPlayed: number;
  createdAt: Date;
  updatedAt: Date;
}

const GameSchema: Schema<IGame> = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, unique: true, trim: true },
    icon: { type: String, default: "🎮" },

    totalMatchesPlayed: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Game: Model<IGame> = mongoose.models.Game || mongoose.model<IGame>("Game", GameSchema);

export default Game;
