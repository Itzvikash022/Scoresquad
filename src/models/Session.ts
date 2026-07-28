import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISession {
  _id: string;
  name: string;
  date: Date;
  durationMinutes: number; // Session duration in minutes
  totalMatches: number;
  mvp?: string; // Reference to Player (ID string)
  champion?: string; // Reference to Player (ID string)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema: Schema<ISession> = new Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    date: { type: Date, default: Date.now },
    durationMinutes: { type: Number, default: 0 },
    totalMatches: { type: Number, default: 0 },
    mvp: { type: String, ref: "Player" },
    champion: { type: String, ref: "Player" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Session: Model<ISession> = mongoose.models.Session || mongoose.model<ISession>("Session", SessionSchema);

export default Session;
