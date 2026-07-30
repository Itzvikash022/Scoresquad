"use client";

import React from "react";


export function getInitials(name: string) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, Math.min(2, name.length)).toUpperCase();
}

export function getDeterministicTint(id: string) {
  if (!id) return 1;
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return (Math.abs(hash) % 5) + 1; // Returns 1–5
}

export function getTintClassName(tint: number) {
  switch (tint) {
    case 1:
      return "bg-gradient-to-br from-[#7C6FF2] to-[#5A4FD1] text-white";
    case 2:
      return "bg-gradient-to-br from-[#F2B84B] to-[#C98F27] text-[#231702]";
    case 3:
      return "bg-gradient-to-br from-[#45D999] to-[#1FA774] text-white";
    case 4:
      return "bg-gradient-to-br from-[#F2665E] to-[#C94640] text-white";
    case 5:
    default:
      return "bg-surface-3 text-text-dim border border-border";
  }
}

/** Resolve avatar emoji for a player ID from local storage — only runs client-side */
function resolveAvatar(id?: string): string | null {
  if (!id || typeof window === "undefined") return null;
  try {
    // Lazy require so the dataService module is never evaluated during SSR/static build
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const ds = require("@/lib/dataService").default;
    const players: Array<{ _id: string; avatar?: string }> = ds.getPlayers();
    const player = players.find((p) => p._id === id);
    if (player?.avatar && player.avatar !== "👤") return player.avatar;
  } catch {
    // dataService not available
  }
  return null;
}

const EMOJI_SIZES = {
  xs: "text-[13px]",
  sm: "text-[16px]",
  md: "text-[20px]",
  lg: "text-[24px]",
};

interface PlayerAvatarProps {
  id?: string;
  name?: string;
  avatar?: string; // Explicit override — takes priority over lookup
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  players?: Array<{ id: string; name: string; avatar?: string }>;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  id,
  name,
  avatar: avatarProp,
  size = "md",
  className = "",
  players,
}) => {
  const sizeClasses = {
    xs: "h-6 w-6 rounded-lg",
    sm: "h-[30px] w-[30px] rounded-[9px]",
    md: "h-9 w-9 rounded-[11px]",
    lg: "h-11 w-11 rounded-[13px]",
  };

  const currentSizeClass = sizeClasses[size];

  // Helper to render a single avatar bubble
  const renderBubble = (
    pid: string,
    pname: string,
    pavatar?: string,
    extraClass = ""
  ) => {
    const tint = getDeterministicTint(pid);
    const resolvedEmoji = pavatar || resolveAvatar(pid);
    const tintClass = getTintClassName(tint);

    return (
      <div
        className={`flex items-center justify-center select-none ${currentSizeClass} ${tintClass} ${extraClass}`}
        title={pname}
      >
        {resolvedEmoji ? (
          <span className={`leading-none ${EMOJI_SIZES[size]}`}>
            {resolvedEmoji}
          </span>
        ) : (
          <span className="font-display font-bold text-[inherit] leading-none">
            {getInitials(pname)}
          </span>
        )}
      </div>
    );
  };

  // Team stacked avatars (2 players overlapping)
  if (players && players.length > 1) {
    const offsetClasses = {
      xs: "-ml-[8px] border-2 border-surface",
      sm: "-ml-[9px] border-2 border-surface",
      md: "-ml-[9px] border-2 border-surface",
      lg: "-ml-[10px] border-2 border-surface",
    };
    const p1 = players[0];
    const p2 = players[1];

    return (
      <div className={`flex items-center ${className}`}>
        {renderBubble(p1.id, p1.name, p1.avatar)}
        {renderBubble(p2.id, p2.name, p2.avatar, offsetClasses[size])}
      </div>
    );
  }

  // Single avatar
  const pName = name || "Player";
  return (
    <div className={className}>
      {renderBubble(id || "", pName, avatarProp)}
    </div>
  );
};
