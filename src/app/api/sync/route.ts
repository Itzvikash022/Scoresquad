import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Player from "@/models/Player";
import Game from "@/models/Game";
import Session from "@/models/Session";
import Team from "@/models/Team";
import Match from "@/models/Match";
import Tournament from "@/models/Tournament";

// GET handler: fetch full database state
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    // Check if the query has reset parameter (some environments trigger reset via GET/DELETE)
    const { searchParams } = new URL(req.url);
    if (searchParams.get("reset") === "true") {
      await clearDatabase();
      return NextResponse.json({ message: "Database cleared successfully." });
    }

    const [players, games, sessions, teams, matches, tournaments] = await Promise.all([
      Player.find({}),
      Game.find({}),
      Session.find({}),
      Team.find({}),
      Match.find({}),
      Tournament.find({}),
    ]);

    return NextResponse.json({
      players,
      games,
      sessions,
      teams,
      matches,
      tournaments,
    });
  } catch (error: any) {
    console.error("Sync GET error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST handler: receive background queue sync events
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();
    const queue = body.queue || [];

    for (const event of queue) {
      const { action, entityType, payload } = event;

      // Skip IMPORT commands (custom handle)
      if (action === "IMPORT") {
        if (payload.players) await Player.bulkWrite(payload.players.map((p: any) => ({ replaceOne: { filter: { _id: p._id }, replacement: p, upsert: true } })));
        if (payload.games) await Game.bulkWrite(payload.games.map((g: any) => ({ replaceOne: { filter: { _id: g._id }, replacement: g, upsert: true } })));
        if (payload.sessions) await Session.bulkWrite(payload.sessions.map((s: any) => ({ replaceOne: { filter: { _id: s._id }, replacement: s, upsert: true } })));
        if (payload.teams) await Team.bulkWrite(payload.teams.map((t: any) => ({ replaceOne: { filter: { _id: t._id }, replacement: t, upsert: true } })));
        if (payload.matches) await Match.bulkWrite(payload.matches.map((m: any) => ({ replaceOne: { filter: { _id: m._id }, replacement: m, upsert: true } })));
        if (payload.tournaments) await Tournament.bulkWrite(payload.tournaments.map((t: any) => ({ replaceOne: { filter: { _id: t._id }, replacement: t, upsert: true } })));
        continue;
      }

      if (action === "DELETE") {
        const id = payload._id;
        if (entityType === "PLAYER") await Player.findByIdAndDelete(id);
        if (entityType === "GAME") await Game.findByIdAndDelete(id);
        if (entityType === "SESSION") await Session.findByIdAndDelete(id);
        if (entityType === "TEAM") await Team.findByIdAndDelete(id);
        if (entityType === "MATCH") await Match.findByIdAndDelete(id);
        if (entityType === "TOURNAMENT") await Tournament.findByIdAndDelete(id);
        continue;
      }

      // Handle CREATE or UPDATE
      if (entityType === "PLAYER") {
        await Player.findOneAndUpdate({ _id: payload._id }, payload, { upsert: true });
      } else if (entityType === "GAME") {
        await Game.findOneAndUpdate({ _id: payload._id }, payload, { upsert: true });
      } else if (entityType === "SESSION") {
        await Session.findOneAndUpdate({ _id: payload._id }, payload, { upsert: true });
      } else if (entityType === "TEAM") {
        await Team.findOneAndUpdate({ _id: payload._id }, payload, { upsert: true });
      } else if (entityType === "MATCH") {
        await Match.findOneAndUpdate({ _id: payload._id }, payload, { upsert: true });
      } else if (entityType === "TOURNAMENT") {
        await Tournament.findOneAndUpdate({ _id: payload._id }, payload, { upsert: true });
      }
    }

    return NextResponse.json({ success: true, count: queue.length });
  } catch (error: any) {
    console.error("Sync POST error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE handler: reset all database collections
export async function DELETE() {
  try {
    await dbConnect();
    await clearDatabase();
    return NextResponse.json({ success: true, message: "Server database reset." });
  } catch (error: any) {
    console.error("Sync DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function clearDatabase() {
  await Promise.all([
    Player.deleteMany({}),
    Game.deleteMany({}),
    Session.deleteMany({}),
    Team.deleteMany({}),
    Match.deleteMany({}),
    Tournament.deleteMany({}),
  ]);
}
