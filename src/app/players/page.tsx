"use client";

import React, { useEffect, useState } from "react";
import { Plus, Search, Trash2, Settings, Download, Upload, HelpCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/Buttons";
import { Card, PlayerCard, GameCard } from "@/components/ui/Cards";
import { BottomSheet } from "@/components/ui/Dialogs";
import { useToast } from "@/components/ui/Toast";
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

  // Sheet states
  const [isPlayerSheetOpen, setIsPlayerSheetOpen] = useState(false);
  const [isGameSheetOpen, setIsGameSheetOpen] = useState(false);

  // Form states
  const [playerName, setPlayerName] = useState("");
  const [playerNickname, setPlayerNickname] = useState("");
  const [playerAvatar, setPlayerAvatar] = useState("👤");

  const [gameName, setGameName] = useState("");
  const [gameIcon, setGameIcon] = useState("🎮");
  const [gameModes, setGameModes] = useState<("Solo" | "Free For All" | "Team Match")[]>(["Solo"]);

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

    // Check duplicate name
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
      
      // Reset & close
      setPlayerName("");
      setPlayerNickname("");
      setPlayerAvatar("👤");
      setIsPlayerSheetOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to create player", "error");
    }
  };

  const handleDeletePlayer = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) {
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

    if (gameModes.length === 0) {
      showToast("Select at least one game mode", "error");
      return;
    }

    // Check duplicate
    if (games.some((g) => g.name.toLowerCase() === gameName.trim().toLowerCase())) {
      showToast("Game with this name already exists", "error");
      return;
    }

    try {
      dataService.saveGame({
        name: gameName.trim(),
        icon: gameIcon,
        supportedModes: gameModes,
      });
      showToast(`Game ${gameName} added!`, "success");

      setGameName("");
      setGameIcon("🎮");
      setGameModes(["Solo"]);
      setIsGameSheetOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to add game", "error");
    }
  };

  const toggleGameMode = (mode: "Solo" | "Free For All" | "Team Match") => {
    if (gameModes.includes(mode)) {
      setGameModes(gameModes.filter((m) => m !== mode));
    } else {
      setGameModes([...gameModes, mode]);
    }
  };

  // Import / Export
  const handleExport = () => {
    try {
      const dataStr = dataService.exportData();
      const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `scoresquad_backup_${new Date().toISOString().slice(0, 10)}.json`;
      
      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", exportFileDefaultName);
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

  const handleReset = () => {
    if (window.confirm("CRITICAL WARNING: This will permanently delete all local sessions, scores, tournaments, players, and match records. Are you absolutely sure?")) {
      dataService.resetAllData();
      showToast("Application data reset", "error");
      loadData();
    }
  };

  // Filtering
  const filteredPlayers = players.filter(
    (p) =>
      p.name.toLowerCase().includes(playerSearch.toLowerCase()) ||
      p.nickname?.toLowerCase().includes(playerSearch.toLowerCase())
  );

  const filteredGames = games.filter((g) =>
    g.name.toLowerCase().includes(gameSearch.toLowerCase())
  );

  return (
    <div className="management-view">
      {/* Sub tabs header */}
      <div className="management-tabs">
        <button className={`tab-btn ${activeTab === "players" ? "active" : ""}`} onClick={() => setActiveTab("players")}>
          Players
        </button>
        <button className={`tab-btn ${activeTab === "games" ? "active" : ""}`} onClick={() => setActiveTab("games")}>
          Games
        </button>
        <button className={`tab-btn ${activeTab === "settings" ? "active" : ""}`} onClick={() => setActiveTab("settings")}>
          Settings
        </button>
      </div>

      {/* Players Section */}
      {activeTab === "players" && (
        <div className="tab-panel">
          <div className="search-bar-row">
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search players..."
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                className="search-input"
              />
            </div>
            <Button size="md" onClick={() => setIsPlayerSheetOpen(true)}>
              <Plus size={18} /> Add
            </Button>
          </div>

          <div className="players-list-scroll">
            {filteredPlayers.length > 0 ? (
              filteredPlayers.map((p) => (
                <div key={p._id} className="player-row-item">
                  <div className="player-card-container">
                    <PlayerCard
                      name={p.name}
                      nickname={p.nickname}
                      avatar={p.avatar}
                      wins={p.wins}
                      losses={p.losses}
                      winRate={p.winRate}
                      points={p.totalPoints}
                      recentForm={p.recentForm}
                    />
                  </div>
                  <button className="delete-row-btn" onClick={() => handleDeletePlayer(p._id, p.name)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-state-box">
                <p>No players match your search.</p>
              </div>
            )}
          </div>

          {/* Add Player Bottom Drawer */}
          <BottomSheet isOpen={isPlayerSheetOpen} onClose={() => setIsPlayerSheetOpen(false)} title="Create New Player">
            <form onSubmit={handleAddPlayer} className="drawer-form">
              <div className="form-group">
                <label className="form-label-el">Name</label>
                <input
                  type="text"
                  placeholder="e.g. Viktor"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="form-input-el"
                  maxLength={15}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label-el">Nickname (optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Viper"
                  value={playerNickname}
                  onChange={(e) => setPlayerNickname(e.target.value)}
                  className="form-input-el"
                  maxLength={15}
                />
              </div>
              <div className="form-group">
                <label className="form-label-el">Select Avatar</label>
                <div className="avatar-grid">
                  {EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`avatar-selection-btn ${playerAvatar === emoji ? "selected" : ""}`}
                      onClick={() => setPlayerAvatar(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-submit-block">
                <Button type="submit" fullWidth size="lg">
                  Save Player Profile
                </Button>
              </div>
            </form>
          </BottomSheet>
        </div>
      )}

      {/* Games Section */}
      {activeTab === "games" && (
        <div className="tab-panel">
          <div className="search-bar-row">
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search games..."
                value={gameSearch}
                onChange={(e) => setGameSearch(e.target.value)}
                className="search-input"
              />
            </div>
            <Button size="md" onClick={() => setIsGameSheetOpen(true)}>
              <Plus size={18} /> Add
            </Button>
          </div>

          <div className="games-list-scroll">
            {filteredGames.length > 0 ? (
              filteredGames.map((g) => (
                <GameCard
                  key={g._id}
                  name={g.name}
                  icon={g.icon}
                  modes={g.supportedModes}
                  totalMatches={g.totalMatchesPlayed}
                />
              ))
            ) : (
              <div className="empty-state-box">
                <p>No games match your search.</p>
              </div>
            )}
          </div>

          {/* Add Game Drawer */}
          <BottomSheet isOpen={isGameSheetOpen} onClose={() => setIsGameSheetOpen(false)} title="Add Custom Game">
            <form onSubmit={handleAddGame} className="drawer-form">
              <div className="form-group">
                <label className="form-label-el">Game Name</label>
                <input
                  type="text"
                  placeholder="e.g. Mario Kart"
                  value={gameName}
                  onChange={(e) => setGameName(e.target.value)}
                  className="form-input-el"
                  maxLength={30}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label-el">Select Game Icon</label>
                <div className="avatar-grid">
                  {GAME_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`avatar-selection-btn ${gameIcon === emoji ? "selected" : ""}`}
                      onClick={() => setGameIcon(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label-el">Supported Match Formats</label>
                <div className="modes-checkbox-row">
                  {(["Solo", "Free For All", "Team Match"] as const).map((mode) => {
                    const isSelected = gameModes.includes(mode);
                    return (
                      <button
                        key={mode}
                        type="button"
                        className={`mode-select-pill ${isSelected ? "selected" : ""}`}
                        onClick={() => toggleGameMode(mode)}
                      >
                        {mode}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="form-submit-block">
                <Button type="submit" fullWidth size="lg">
                  Add Game to Catalog
                </Button>
              </div>
            </form>
          </BottomSheet>
        </div>
      )}

      {/* Settings Section */}
      {activeTab === "settings" && (
        <div className="tab-panel">
          <div className="settings-container">
            <h2 className="settings-section-title">Data Backup & Sync</h2>
            
            <Card className="settings-option-card">
              <div className="option-row">
                <div className="option-info">
                  <h3>Export Local Backup</h3>
                  <p>Download all scores, profiles, and history as a JSON file.</p>
                </div>
                <Button size="md" variant="outline" onClick={handleExport}>
                  <Download size={16} /> Export
                </Button>
              </div>
            </Card>

            <Card className="settings-option-card">
              <div className="option-row">
                <div className="option-info">
                  <h3>Restore Backup</h3>
                  <p>Upload a previously exported JSON file to restore app data.</p>
                </div>
                <div className="upload-btn-wrapper">
                  <Button size="md" variant="outline">
                    <Upload size={16} /> Import
                  </Button>
                  <input type="file" accept=".json" onChange={handleImport} className="file-input-hidden" />
                </div>
              </div>
            </Card>

            <h2 className="settings-section-title danger-text">Factory Reset</h2>
            <Card className="settings-option-card border-danger">
              <div className="option-row">
                <div className="option-info">
                  <h3 className="danger-text">Wipe All Application Data</h3>
                  <p>Deletes all players, matches, active sessions, and database structures. Use with extreme caution.</p>
                </div>
                <Button size="md" variant="danger" onClick={handleReset}>
                  <Trash2 size={16} /> Wipe Data
                </Button>
              </div>
            </Card>

            <h2 className="settings-section-title">App Info</h2>
            <div className="app-info-block">
              <div className="info-row">
                <FileText size={16} className="info-icon" />
                <span>Version 1.0.0 (Production PWA)</span>
              </div>
              <div className="info-row">
                <HelpCircle size={16} className="info-icon" />
                <span>Supports offline game sessions and MongoDB synchronization.</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .management-view {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        .management-tabs {
          display: flex;
          background-color: var(--surface-container-high);
          padding: 4px;
          border-radius: var(--rounded-md);
          width: 100%;
        }
        .tab-btn {
          flex: 1;
          border: none;
          background: none;
          padding: 10px 0;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          font-weight: 700;
          color: var(--on-surface-variant);
          border-radius: var(--rounded-default);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .tab-btn.active {
          background-color: var(--background);
          color: var(--primary-container);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
        }
        :global([data-theme="dark"]) .tab-btn.active {
          color: var(--primary);
        }
        .tab-panel {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }
        .search-bar-row {
          display: flex;
          gap: var(--spacing-xs);
          align-items: center;
        }
        .search-input-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: var(--surface-container-lowest);
          border: 1px solid var(--outline-variant);
          border-radius: var(--rounded-default);
          padding: 0 12px;
          height: 48px;
        }
        :global([data-theme="dark"]) .search-input-wrapper {
          background-color: var(--surface);
        }
        .search-icon {
          color: var(--medium-grey);
        }
        .search-input {
          width: 100%;
          border: none;
          background: none;
          outline: none;
          font-family: 'Outfit', sans-serif;
          font-size: 14px;
          color: var(--on-surface);
        }
        .players-list-scroll,
        .games-list-scroll {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-xs);
        }
        .player-row-item {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
        }
        .player-card-container {
          flex: 1;
        }
        .delete-row-btn {
          border: 1px solid var(--outline-variant);
          background-color: var(--surface-container-low);
          color: var(--error);
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--rounded-default);
          cursor: pointer;
          transition: background-color 0.15s;
        }
        .delete-row-btn:active {
          background-color: var(--error-container);
        }
        .empty-state-box {
          text-align: center;
          padding: var(--spacing-lg);
          background-color: var(--surface-container-low);
          border-radius: var(--rounded-md);
          color: var(--medium-grey);
          font-size: 14px;
        }
        
        /* Form fields styling inside BottomSheet drawer */
        .drawer-form {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }
        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .form-label-el {
          font-size: 12px;
          font-weight: 700;
          color: var(--medium-grey);
          text-transform: uppercase;
        }
        .form-input-el {
          height: 48px;
          padding: 0 var(--spacing-sm);
          border: 1px solid var(--outline-variant);
          border-radius: var(--rounded-default);
          background-color: var(--surface-container-low);
          color: var(--on-surface);
          outline: none;
          font-family: 'Outfit', sans-serif;
          font-size: 15px;
          transition: border-color 0.15s;
        }
        .form-input-el:focus {
          border-color: var(--primary-container);
        }
        :global([data-theme="dark"]) .form-input-el:focus {
          border-color: var(--primary);
        }
        .avatar-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 8px;
        }
        .avatar-selection-btn {
          height: 48px;
          background-color: var(--surface-container-low);
          border: 1px solid var(--outline-variant);
          border-radius: var(--rounded-default);
          font-size: 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
        }
        .avatar-selection-btn.selected {
          background-color: var(--primary-container);
          border-color: var(--primary-container);
          transform: scale(1.05);
        }
        :global([data-theme="dark"]) .avatar-selection-btn.selected {
          background-color: var(--primary);
          border-color: var(--primary);
        }
        .modes-checkbox-row {
          display: flex;
          gap: 8px;
        }
        .mode-select-pill {
          padding: 8px 16px;
          border-radius: var(--rounded-full);
          border: 1px solid var(--outline-variant);
          background-color: var(--surface-container-low);
          color: var(--on-surface-variant);
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
        }
        .mode-select-pill.selected {
          background-color: var(--primary-container);
          color: #ffffff;
          border-color: var(--primary-container);
        }
        :global([data-theme="dark"]) .mode-select-pill.selected {
          background-color: var(--primary);
          color: #131634;
          border-color: var(--primary);
        }
        .form-submit-block {
          margin-top: 8px;
        }

        /* Settings CSS */
        .settings-container {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }
        .settings-section-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--medium-grey);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 12px 0 4px 0;
        }
        .settings-section-title.danger-text,
        .danger-text {
          color: var(--error);
        }
        .settings-option-card {
          padding: var(--spacing-sm);
        }
        .settings-option-card.border-danger {
          border-color: rgba(186, 26, 26, 0.4);
        }
        .option-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          width: 100%;
        }
        .option-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }
        .option-info h3 {
          font-size: 15px;
          font-weight: 700;
          color: var(--on-surface);
        }
        .option-info p {
          font-size: 12px;
          color: var(--medium-grey);
          line-height: 16px;
        }
        .upload-btn-wrapper {
          position: relative;
          overflow: hidden;
          display: inline-block;
        }
        .file-input-hidden {
          font-size: 100px;
          position: absolute;
          left: 0;
          top: 0;
          opacity: 0;
          cursor: pointer;
        }
        .app-info-block {
          background-color: var(--surface-container-low);
          padding: var(--spacing-sm);
          border-radius: var(--rounded-md);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .info-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--on-surface-variant);
        }
        .info-icon {
          color: var(--medium-grey);
        }
      `}</style>
    </div>
  );
}
