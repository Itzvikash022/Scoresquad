"use client";

import React, { useEffect, useState } from "react";
import { Plus, Search, Trash2, Settings, Download, Upload, HelpCircle, FileText, UserPlus, Gamepad2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/Toast";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { getGameIcon as getIcon } from "@/lib/iconMap";
import dataService, { ClientPlayer, ClientGame } from "@/lib/dataService";

const EMOJIS = ["👤", "🐍", "🦌", "🦁", "🦊", "🐻", "🐼", "🐨", "🐯", "🤖", "👻", "👾", "🧙", "🐱", "🐶", "🦄"];
const GAME_EMOJIS = ["🎮", "🎲", "🏓", "🏎️", "♟️", "🧩", "⚽", "🏀", "🃏", "🎯", "🎳", "👾"];

export default function ManagementPage() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"players" | "games" | "settings">("players");
  
  // Data lists
  const [players, setPlayers] = useState<ClientPlayer[]>([]);
  const [games, setGames] = useState<ClientGame[]>([]);

  // Search & Filter
  const [playerSearch, setPlayerSearch] = useState("");
  const [gameSearch, setGameSearch] = useState("");

  // Dialog open triggers
  const [isPlayerDialogOpen, setIsPlayerDialogOpen] = useState(false);
  const [isGameDialogOpen, setIsGameDialogOpen] = useState(false);

  // Form states
  const [playerName, setPlayerName] = useState("");
  const [playerNickname, setPlayerNickname] = useState("");
  const [playerAvatar, setPlayerAvatar] = useState("👤");

  const [gameName, setGameName] = useState("");
  const [gameIcon, setGameIcon] = useState("🎮");
  const [editingGameId, setEditingGameId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setPlayers(dataService.getPlayers());
    setGames(dataService.getGames());
  };

  // Form handlers
  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) {
      showToast("Player name is required", "error");
      return;
    }

    if (players.some((p) => p.name.toLowerCase() === playerName.trim().toLowerCase())) {
      showToast("Player with this name already exists", "error");
      return;
    }

    try {
      dataService.savePlayer({
        name: playerName.trim(),
        nickname: playerNickname.trim() || undefined,
        avatar: playerAvatar,
      });
      showToast(`Player ${playerName} created!`, "success");
      
      setPlayerName("");
      setPlayerNickname("");
      setPlayerAvatar("👤");
      setIsPlayerDialogOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to create player", "error");
    }
  };

  const handleDeletePlayer = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}? All statistics for this player will be removed.`)) {
      dataService.deletePlayer(id);
      showToast(`Player ${name} deleted`, "info");
      loadData();
    }
  };

  const handleAddGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameName.trim()) {
      showToast("Game name is required", "error");
      return;
    }

    const isDuplicate = games.some(
      (g) =>
        g.name.toLowerCase() === gameName.trim().toLowerCase() && g._id !== editingGameId
    );

    if (isDuplicate) {
      showToast("Game with this name already exists", "error");
      return;
    }

    try {
      dataService.saveGame({
        _id: editingGameId || undefined,
        name: gameName.trim(),
        icon: gameIcon,
      });
      showToast(`Game ${editingGameId ? "updated" : "added"}!`, "success");

      setGameName("");
      setGameIcon("🎮");
      setEditingGameId(null);
      setIsGameDialogOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to save game", "error");
    }
  };

  const handleEditGame = (id: string, name: string, icon: string) => {
    setEditingGameId(id);
    setGameName(name);
    setGameIcon(icon);
    setIsGameDialogOpen(true);
  };

  const handleDeleteGame = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}? All local logs for this game will be cleared.`)) {
      dataService.deleteGame(id);
      showToast(`Game ${name} deleted`, "info");
      loadData();
    }
  };

  const handleExport = () => {
    try {
      const dataStr = dataService.exportData();
      const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
      const filename = `scoresquad_backup_${new Date().toISOString().slice(0, 10)}.json`;
      
      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", filename);
      linkElement.click();
      showToast("Backup exported successfully!", "success");
    } catch {
      showToast("Failed to export backup", "error");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        const target = event.target;
        if (target && typeof target.result === "string") {
          const success = dataService.importData(target.result);
          if (success) {
            showToast("Backup restored successfully!", "success");
            loadData();
          } else {
            showToast("Invalid backup file format", "error");
          }
        }
      };
    }
  };

  const handleFactoryReset = () => {
    if (window.confirm("WARNING: This will delete ALL local scores, matches, players, and configurations. This action is final. Proceed?")) {
      localStorage.clear();
      showToast("Factory reset complete.", "info");
      window.location.reload();
    }
  };

  // Filter lists
  const filteredPlayers = players.filter(
    (p) =>
      p.name.toLowerCase().includes(playerSearch.toLowerCase()) ||
      p.nickname?.toLowerCase().includes(playerSearch.toLowerCase())
  );

  const filteredGames = games.filter((g) =>
    g.name.toLowerCase().includes(gameSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-5 max-w-[800px] mx-auto">
      {/* Tab navigation headers */}
      <div className="flex bg-surface border border-border rounded-full p-[3px] w-full">
        <button
          onClick={() => setActiveTab("players")}
          className={`flex-1 text-center py-2.5 rounded-full font-bold text-[13px] transition-all cursor-pointer ${
            activeTab === "players" ? "bg-primary text-white" : "text-text-dim hover:text-text"
          }`}
        >
          Players
        </button>
        <button
          onClick={() => setActiveTab("games")}
          className={`flex-1 text-center py-2.5 rounded-full font-bold text-[13px] transition-all cursor-pointer ${
            activeTab === "games" ? "bg-primary text-white" : "text-text-dim hover:text-text"
          }`}
        >
          Games
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`flex-1 text-center py-2.5 rounded-full font-bold text-[13px] transition-all cursor-pointer ${
            activeTab === "settings" ? "bg-primary text-white" : "text-text-dim hover:text-text"
          }`}
        >
          Settings
        </button>
      </div>

      {/* 1. PLAYERS SECTION */}
      {activeTab === "players" && (
        <div className="flex flex-col gap-4 fade-in">
          {/* Search and Trigger row */}
          <div className="flex gap-2.5 items-center">
            <div className="flex-1 flex items-center gap-2 bg-surface border border-border rounded-md px-3 h-11">
              <Search className="h-4.5 w-4.5 text-text-dim shrink-0" />
              <input
                type="text"
                placeholder="Search players..."
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                className="w-full bg-transparent text-[13.5px] text-text outline-none"
              />
            </div>

            <Dialog open={isPlayerDialogOpen} onOpenChange={setIsPlayerDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-11 bg-primary text-white hover:bg-primary-hover font-bold px-4 flex items-center gap-1.5 shrink-0">
                  <UserPlus className="h-4.5 w-4.5" /> Add Player
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-surface border-border sm:max-w-[420px] rounded-xl p-6">
                <DialogHeader className="mb-4">
                  <DialogTitle className="font-display font-bold text-[18px] text-text">
                    Create New Player
                  </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleAddPlayer} className="flex flex-col gap-4">
                  <div>
                    <span className="mono-label text-text-dim block mb-1">Name</span>
                    <input
                      type="text"
                      placeholder="e.g. Viktor"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      className="w-full h-11 bg-surface-2 border border-border rounded-md px-3 text-[14px] text-text font-semibold outline-none focus:ring-1 focus:ring-primary"
                      maxLength={15}
                      required
                    />
                  </div>
                  <div>
                    <span className="mono-label text-text-dim block mb-1">Nickname (optional)</span>
                    <input
                      type="text"
                      placeholder="e.g. Viper"
                      value={playerNickname}
                      onChange={(e) => setPlayerNickname(e.target.value)}
                      className="w-full h-11 bg-surface-2 border border-border rounded-md px-3 text-[14px] text-text font-semibold outline-none focus:ring-1 focus:ring-primary"
                      maxLength={15}
                    />
                  </div>
                  <div>
                    <span className="mono-label text-text-dim block mb-1.5">Select Avatar</span>
                    <div className="grid grid-cols-6 gap-2">
                      {EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className={`h-11 bg-surface-2 border border-border rounded-md text-[18px] flex items-center justify-center cursor-pointer transition-all hover:bg-surface-3 ${
                            playerAvatar === emoji ? "border-primary/60 bg-[#7C6FF2]/10" : ""
                          }`}
                          onClick={() => setPlayerAvatar(emoji)}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button type="submit" className="w-full mt-2 py-6 bg-primary text-white hover:bg-primary-hover font-bold">
                    Save Player Profile
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* List items */}
          <div className="flex flex-col gap-2.5">
            {filteredPlayers.length > 0 ? (
              filteredPlayers.map((p) => (
                <Card key={p._id} className="p-3 border border-border bg-surface rounded-xl flex flex-row items-center gap-3.5">
                  <PlayerAvatar id={p._id} name={p.name} size="sm" />
                  <div className="flex-grow min-w-0">
                    <div className="font-bold text-[14.5px] text-text truncate flex items-center gap-1.5">
                      {p.name}
                      {p.nickname && <span className="text-[11.5px] font-semibold text-accent font-mono">"{p.nickname}"</span>}
                    </div>
                    <div className="text-[12.5px] text-text-dim mt-0.5">
                      {p.wins} wins · {p.losses} losses · WR {p.winRate.toFixed(0)}%
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeletePlayer(p._id, p.name)}
                    className="w-9 h-9 border border-border/80 bg-surface-2 rounded-lg text-danger hover:text-red transition-all cursor-pointer flex items-center justify-center focus:outline-none"
                    title="Delete Player"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </Card>
              ))
            ) : (
              <div className="p-8 text-center text-text-dim border border-dashed border-border rounded-xl bg-surface/50 text-[13.5px]">
                No players match your search criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. GAMES CATALOG SECTION */}
      {activeTab === "games" && (
        <div className="flex flex-col gap-4 fade-in">
          {/* Search and trigger row */}
          <div className="flex gap-2.5 items-center">
            <div className="flex-1 flex items-center gap-2 bg-surface border border-border rounded-md px-3 h-11">
              <Search className="h-4.5 w-4.5 text-text-dim shrink-0" />
              <input
                type="text"
                placeholder="Search games..."
                value={gameSearch}
                onChange={(e) => setGameSearch(e.target.value)}
                className="w-full bg-transparent text-[13.5px] text-text outline-none"
              />
            </div>

            <Dialog open={isGameDialogOpen} onOpenChange={(open) => {
              setIsGameDialogOpen(open);
              if (!open) {
                setEditingGameId(null);
                setGameName("");
                setGameIcon("🎮");
              }
            }}>
              <DialogTrigger asChild>
                <Button className="h-11 bg-primary text-white hover:bg-primary-hover font-bold px-4 flex items-center gap-1.5 shrink-0">
                  <Plus className="h-4.5 w-4.5" /> Add Game
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-surface border-border sm:max-w-[420px] rounded-xl p-6">
                <DialogHeader className="mb-4">
                  <DialogTitle className="font-display font-bold text-[18px] text-text">
                    {editingGameId ? "Edit Game" : "Add Custom Game"}
                  </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleAddGame} className="flex flex-col gap-4">
                  <div>
                    <span className="mono-label text-text-dim block mb-1">Game Name</span>
                    <input
                      type="text"
                      placeholder="e.g. Mario Kart"
                      value={gameName}
                      onChange={(e) => setGameName(e.target.value)}
                      className="w-full h-11 bg-surface-2 border border-border rounded-md px-3 text-[14px] text-text font-semibold outline-none focus:ring-1 focus:ring-primary"
                      maxLength={30}
                      required
                    />
                  </div>
                  <div>
                    <span className="mono-label text-text-dim block mb-1.5">Select Game Icon</span>
                    <div className="grid grid-cols-6 gap-2">
                      {GAME_EMOJIS.map((emoji) => {
                        const IconComponent = getIcon(emoji);
                        return (
                          <button
                            key={emoji}
                            type="button"
                            className={`h-11 bg-surface-2 border border-border rounded-md flex items-center justify-center cursor-pointer transition-all hover:bg-surface-3 ${
                              gameIcon === emoji ? "border-primary/60 bg-[#7C6FF2]/10 text-primary" : "text-text-dim"
                            }`}
                            onClick={() => setGameIcon(emoji)}
                          >
                            <IconComponent className="h-[18px] w-[18px]" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <Button type="submit" className="w-full mt-2 py-6 bg-primary text-white hover:bg-primary-hover font-bold">
                    {editingGameId ? "Update Game" : "Add Game to Catalog"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* List items */}
          <div className="flex flex-col gap-2.5">
            {filteredGames.length > 0 ? (
              filteredGames.map((g) => {
                const IconComponent = getIcon(g.icon);
                return (
                  <Card key={g._id} className="p-3 border border-border bg-surface rounded-xl flex flex-row items-center gap-3.5">
                    <span className="w-9 h-9 bg-surface-3 border border-border/40 rounded-lg flex items-center justify-center text-text">
                      <IconComponent className="h-4.5 w-4.5" />
                    </span>
                    <div className="flex-grow min-w-0">
                      <div className="font-bold text-[14.5px] text-text truncate">{g.name}</div>
                      <div className="text-[12px] text-text-dim mt-0.5">
                        {g.totalMatchesPlayed} match{g.totalMatchesPlayed === 1 ? "" : "es"} played
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => handleEditGame(g._id, g.name, g.icon)}
                        className="border-border bg-surface-2 hover:bg-surface-3 text-[11.5px] font-semibold py-3.5 px-3"
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="xs"
                        onClick={() => handleDeleteGame(g._id, g.name)}
                        className="border-border bg-surface-2 hover:bg-surface-3 text-text-dim text-[11.5px] font-semibold py-3.5 px-3"
                      >
                        Delete
                      </Button>
                    </div>
                  </Card>
                );
              })
            ) : (
              <div className="p-8 text-center text-text-dim border border-dashed border-border rounded-xl bg-surface/50 text-[13.5px]">
                No games match your search criteria.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. SETTINGS & APP INFO SECTION */}
      {activeTab === "settings" && (
        <div className="flex flex-col gap-4 fade-in">
          <h2 className="mono-label text-text-faint text-[10.5px] uppercase mt-2">Data Backup &amp; Sync</h2>
          
          <Card className="p-4 border-border bg-surface rounded-xl flex flex-row items-center justify-between">
            <div className="flex flex-col gap-1 pr-4">
              <h3 className="font-bold text-[14.5px] text-text">Export Local Backup</h3>
              <p className="text-[12px] text-text-dim leading-relaxed">
                Download all scores, profiles, and history as a JSON file.
              </p>
            </div>
            <Button variant="outline" onClick={handleExport} className="border-border bg-surface-2 hover:bg-surface-3 font-semibold text-[13px] flex items-center gap-1.5 py-4.5 px-4 shrink-0">
              <Download className="h-4 w-4" /> Export
            </Button>
          </Card>

          <Card className="p-4 border-border bg-surface rounded-xl flex flex-row items-center justify-between">
            <div className="flex flex-col gap-1 pr-4">
              <h3 className="font-bold text-[14.5px] text-text">Restore Backup</h3>
              <p className="text-[12px] text-text-dim leading-relaxed">
                Upload a previously exported JSON file to restore app data.
              </p>
            </div>
            <div className="relative overflow-hidden inline-block shrink-0">
              <Button variant="outline" className="border-border bg-surface-2 hover:bg-surface-3 font-semibold text-[13px] flex items-center gap-1.5 py-4.5 px-4">
                <Upload className="h-4 w-4" /> Import
              </Button>
              <input type="file" accept=".json" onChange={handleImport} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
            </div>
          </Card>

          <h2 className="mono-label text-danger text-[10.5px] uppercase mt-3">Danger Zone</h2>
          <Card className="p-4 border-danger/35 bg-danger/[0.03] rounded-xl flex flex-row items-center justify-between">
            <div className="flex flex-col gap-1 pr-4">
              <h3 className="font-bold text-[14.5px] text-text">Factory Reset</h3>
              <p className="text-[12px] text-text-dim leading-relaxed">
                Wipe all players, games catalog, and scores locally. This is irreversible.
              </p>
            </div>
            <Button variant="destructive" onClick={handleFactoryReset} className="font-bold text-[13px] py-4.5 px-4 shrink-0">
              Factory Reset
            </Button>
          </Card>

          <h2 className="mono-label text-text-faint text-[10.5px] uppercase mt-3">App Info</h2>
          <div className="p-4 bg-surface-2 border border-border/40 rounded-xl flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[12.5px] text-text-dim">
              <FileText className="h-4.5 w-4.5 text-text-faint" />
              <span>Version 1.0.0 (Production PWA)</span>
            </div>
            <div className="flex items-start gap-2 text-[12.5px] text-text-dim leading-relaxed">
              <HelpCircle className="h-4.5 w-4.5 text-text-faint mt-0.5 shrink-0" />
              <span>Supports offline game sessions and MongoDB synchronization.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
