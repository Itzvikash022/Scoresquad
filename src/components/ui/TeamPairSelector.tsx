import React, { useState } from "react";
import { Check, Plus, Users, Shield, User, X } from "lucide-react";
import { PlayerAvatar } from "@/components/ui/PlayerAvatar";
import { Button } from "@/components/ui/button";
import { ClientPlayer, ClientTeam } from "@/lib/dataService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TeamPairSelectorProps {
  players: ClientPlayer[];
  teams: ClientTeam[];
  selectedPlayerIds: string[];
  selectedTeamIds: string[];
  matchMode: "Solo" | "Free For All" | "Team Match";
  onModeChange: (mode: "Solo" | "Free For All" | "Team Match") => void;
  onPlayerToggle: (pId: string) => void;
  onTeamToggle: (tId: string) => void;
  onCreateTeamPair: (p1Id: string, p2Id: string) => void;
  hideModeSwitcher?: boolean;
}

export const TeamPairSelector: React.FC<TeamPairSelectorProps> = ({
  players,
  teams,
  selectedPlayerIds,
  selectedTeamIds,
  matchMode,
  onModeChange,
  onPlayerToggle,
  onTeamToggle,
  onCreateTeamPair,
  hideModeSwitcher = false,
}) => {
  // Modal creation state
  const [open, setOpen] = useState(false);
  const [player1Id, setPlayer1Id] = useState("");
  const [player2Id, setPlayer2Id] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleCreatePair = () => {
    if (!player1Id || !player2Id) {
      setErrorMsg("Please select two players.");
      return;
    }
    if (player1Id === player2Id) {
      setErrorMsg("Players must be different.");
      return;
    }
    setErrorMsg("");
    onCreateTeamPair(player1Id, player2Id);
    setPlayer1Id("");
    setPlayer2Id("");
    setOpen(false);
  };

  // Filter out teams that don't have exactly 2 members to keep them as "pairs"
  const teamPairs = teams.filter((t) => t.members && t.members.length === 2);

  return (
    <div className="flex flex-col gap-4">
      {!hideModeSwitcher && (
        <>
          {/* Mode Toggle Switcher */}
          <div className="flex bg-surface-2 border border-border rounded-full p-[3px]">
            <button
              type="button"
              onClick={() => onModeChange("Solo")}
              className={`flex-1 text-center py-2 rounded-full font-bold text-[12.5px] transition-all cursor-pointer ${
                matchMode === "Solo"
                  ? "bg-primary text-white"
                  : "text-text-dim hover:text-text"
              }`}
            >
              Individual Solo
            </button>
            <button
              type="button"
              onClick={() => onModeChange("Team Match")}
              className={`flex-1 text-center py-2 rounded-full font-bold text-[12.5px] transition-all cursor-pointer ${
                matchMode === "Team Match"
                  ? "bg-primary text-white"
                  : "text-text-dim hover:text-text"
              }`}
            >
              Team Pairs
            </button>
            <button
              type="button"
              onClick={() => onModeChange("Free For All")}
              className={`flex-1 text-center py-2 rounded-full font-bold text-[12.5px] transition-all cursor-pointer ${
                matchMode === "Free For All"
                  ? "bg-primary text-white"
                  : "text-text-dim hover:text-text"
              }`}
            >
              Free For All
            </button>
          </div>

          {/* Mode Details Caption */}
          <p className="text-text-dim text-[13px] leading-relaxed">
            {matchMode === "Solo" &&
              "Head-to-head battle between 2 individual players."}
            {matchMode === "Team Match" &&
              "Select two pairs to battle. Points are aggregated per team."}
            {matchMode === "Free For All" &&
              "Multiple individual players competing in a single round."}
          </p>
        </>
      )}

      {/* INDIVIDUAL MODES: Solo or Free For All */}
      {matchMode !== "Team Match" ? (
        <div className="flex flex-col gap-2">
          <span className="mono-label text-text-faint">Available Players</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {players.map((p) => {
              const isSelected = selectedPlayerIds.includes(p._id);
              return (
                <button
                  key={p._id}
                  type="button"
                  onClick={() => onPlayerToggle(p._id)}
                  className={`flex items-center justify-between p-3 border rounded-[14px] bg-surface transition-all text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary ${
                    isSelected ? "border-primary/50 bg-[#7C6FF2]/[0.05]" : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <PlayerAvatar id={p._id} name={p.name} size="sm" />
                    <div>
                      <div className="font-bold text-[13.5px] text-text">
                        {p.name}
                      </div>
                      <div className="text-[11.5px] text-text-dim">
                        {p.wins} wins · {p.winRate}% WR
                      </div>
                    </div>
                  </div>
                  <div
                    className={`w-[22px] h-[22px] rounded-[7px] flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-primary text-white"
                        : "border-1.5 border-border"
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* TEAM MODE: Team Pairs */
        <div className="flex flex-col gap-3">
          <span className="mono-label text-text-faint">Saved Combos</span>
          
          <div className="flex flex-col gap-2">
            {teamPairs.map((t) => {
              const isSelected = selectedTeamIds.includes(t._id);
              
              // Resolve member profiles for avatars
              const memberProfiles = t.members.map((pId) => {
                const profile = players.find((p) => p._id === pId);
                return { id: pId, name: profile?.name || "Player" };
              });

              return (
                <button
                  key={t._id}
                  type="button"
                  onClick={() => onTeamToggle(t._id)}
                  className={`flex items-center justify-between p-3 border rounded-[14px] bg-surface transition-all text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary ${
                    isSelected
                      ? "border-primary/50 bg-[#7C6FF2]/[0.08]"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <PlayerAvatar size="sm" players={memberProfiles} />
                    <div>
                      <div className="font-bold text-[13.5px] text-text">
                        {t.name}
                      </div>
                      <div className="text-[11.5px] text-text-dim">
                        {t.wins} wins · {t.winRate}% WR
                      </div>
                    </div>
                  </div>
                  <div
                    className={`w-[22px] h-[22px] rounded-[7px] flex items-center justify-center transition-all ${
                      isSelected
                        ? "bg-primary text-white"
                        : "border-1.5 border-border"
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
            
            {teamPairs.length === 0 && (
              <div className="p-6 text-center text-text-dim border border-dashed border-border rounded-lg bg-surface/50 text-[13px] italic">
                No team pairs saved yet. Create one below!
              </div>
            )}
          </div>

          {/* New Pair Sheet Trigger */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full py-5 border-dashed border-border rounded-md text-text-dim text-[13.5px] font-semibold flex items-center justify-center gap-2 hover:bg-surface-2 transition-all hover:border-primary/50"
              >
                <Plus className="h-4 w-4" /> New pair
              </Button>
            </DialogTrigger>
            
            <DialogContent className="bg-surface border border-border sm:max-w-[420px] rounded-lg p-6">
              <DialogHeader className="mb-4">
                <DialogTitle className="font-display font-bold text-[18px] text-text">
                  Create team pair
                </DialogTitle>
              </DialogHeader>

              {errorMsg && (
                <div className="p-2 mb-2 bg-danger/10 border border-danger/30 text-danger text-[12px] rounded-md font-semibold">
                  {errorMsg}
                </div>
              )}

              <div className="flex flex-col gap-4">
                <div>
                  <span className="mono-label text-text-dim block mb-1">
                    Player 1
                  </span>
                  <Select value={player1Id} onValueChange={setPlayer1Id}>
                    <SelectTrigger className="w-full bg-surface-2 border-border text-text rounded-md">
                      <SelectValue placeholder="Select player 1" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface border-border text-text">
                      {players
                        .filter((p) => p._id !== player2Id)
                        .map((p) => (
                          <SelectItem key={p._id} value={p._id}>
                            {p.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <span className="mono-label text-text-dim block mb-1">
                    Player 2
                  </span>
                  <Select value={player2Id} onValueChange={setPlayer2Id}>
                    <SelectTrigger className="w-full bg-surface-2 border-border text-text rounded-md">
                      <SelectValue placeholder="Select player 2" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface border-border text-text">
                      {players
                        .filter((p) => p._id !== player1Id)
                        .map((p) => (
                          <SelectItem key={p._id} value={p._id}>
                            {p.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={handleCreatePair}
                  className="w-full mt-4 bg-primary text-white hover:bg-primary-hover py-6 font-bold"
                >
                  Save &amp; select pair
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
};
