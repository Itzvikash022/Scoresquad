"use client";

import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "text" | "accent";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  sticky?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  fullWidth = false,
  sticky = false,
  children,
  className = "",
  disabled,
  ...props
}) => {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${fullWidth ? "btn-block" : ""} ${
        sticky ? "btn-sticky" : ""
      } ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
      <style jsx>{`
        .btn {
          font-family: 'Outfit', sans-serif;
          font-weight: 700;
          border-radius: var(--rounded-default, 8px);
          cursor: pointer;
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: none;
          outline: none;
          text-align: center;
          user-select: none;
          vertical-align: middle;
        }
        
        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
        }

        /* Sizes */
        .btn-sm {
          padding: 8px 14px;
          font-size: 13px;
        }
        .btn-md {
          padding: 12px 20px;
          font-size: 15px;
          min-height: 48px; /* Large tap target */
        }
        .btn-lg {
          padding: 16px 28px;
          font-size: 17px;
          min-height: 56px; /* Thumb-friendly tap target */
        }
        
        .btn-block {
          width: 100%;
        }

        /* Variants */
        .btn-primary {
          background-color: var(--primary-container, #282b4a);
          color: #ffffff;
        }
        .btn-primary:active:not(:disabled) {
          background-color: var(--primary, #131634);
          transform: scale(0.97);
        }

        :global([data-theme="dark"]) .btn-primary {
          background-color: var(--primary, #c2c4eb);
          color: #131634;
        }
        :global([data-theme="dark"]) .btn-primary:active:not(:disabled) {
          background-color: var(--inverse-primary, #b0b3e6);
        }

        .btn-secondary {
          background-color: var(--secondary-container, #e6e3d2);
          color: var(--on-secondary-container, #666558);
        }
        .btn-secondary:active:not(:disabled) {
          background-color: #d8d4bf;
          transform: scale(0.97);
        }

        .btn-outline {
          background-color: transparent;
          border: 2px solid var(--outline-variant, #c7c5ce);
          color: var(--on-surface);
        }
        .btn-outline:active:not(:disabled) {
          background-color: var(--surface-container-low);
          transform: scale(0.97);
        }

        .btn-danger {
          background-color: var(--error, #ba1a1a);
          color: #ffffff;
        }
        .btn-danger:active:not(:disabled) {
          background-color: #93000a;
          transform: scale(0.97);
        }

        .btn-accent {
          background-color: var(--accent-green, #6BCB77);
          color: #121212;
        }
        .btn-accent:active:not(:disabled) {
          opacity: 0.9;
          transform: scale(0.97);
        }

        .btn-text {
          background-color: transparent;
          color: var(--primary-container);
          padding: 8px 12px;
        }
        :global([data-theme="dark"]) .btn-text {
          color: var(--primary);
        }
        .btn-text:active:not(:disabled) {
          background-color: var(--surface-container-low);
        }

        /* Floating / Sticky action style */
        .btn-sticky {
          position: fixed;
          bottom: 88px; /* Above bottom navigation (72px + padding) */
          right: 20px;
          z-index: 80;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
          border-radius: var(--rounded-full, 999px);
          width: 56px;
          height: 56px;
          padding: 0;
        }
      `}</style>
    </button>
  );
};

interface ChipProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  selected = false,
  onClick,
  icon,
}) => {
  return (
    <button
      type="button"
      className={`chip ${selected ? "selected" : ""}`}
      onClick={onClick}
      disabled={!onClick}
    >
      {icon && <span className="chip-icon">{icon}</span>}
      <span className="chip-label">{label}</span>
      <style jsx>{`
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: var(--rounded-full, 9999px);
          border: 1px solid var(--outline-variant, #c7c5ce);
          background-color: var(--surface);
          color: var(--on-surface-variant);
          font-family: 'Outfit', sans-serif;
          font-size: 13px;
          font-weight: 600;
          cursor: ${onClick ? "pointer" : "default"};
          transition: all 0.15s ease;
          user-select: none;
        }
        .chip:active {
          transform: ${onClick ? "scale(0.96)" : "none"};
        }
        .chip.selected {
          background-color: var(--primary-container, #282b4a);
          color: #ffffff;
          border-color: var(--primary-container, #282b4a);
        }
        :global([data-theme="dark"]) .chip.selected {
          background-color: var(--primary, #c2c4eb);
          color: #131634;
          border-color: var(--primary, #c2c4eb);
        }
        .chip-icon {
          display: flex;
          align-items: center;
        }
      `}</style>
    </button>
  );
};

interface BadgeProps {
  variant?: "success" | "warning" | "error" | "info" | "neutral";
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ variant = "neutral", children }) => {
  return (
    <span className={`badge badge-${variant}`}>
      {children}
      <style jsx>{`
        .badge {
          display: inline-flex;
          align-items: center;
          padding: 4px 10px;
          border-radius: var(--rounded-sm, 4px);
          font-family: 'Outfit', sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }
        .badge-success {
          background-color: rgba(107, 203, 119, 0.15);
          color: #2e7d32;
        }
        :global([data-theme="dark"]) .badge-success {
          color: #81c784;
        }
        .badge-warning {
          background-color: rgba(244, 185, 66, 0.15);
          color: #b77a00;
        }
        :global([data-theme="dark"]) .badge-warning {
          color: var(--accent-gold);
        }
        .badge-error {
          background-color: rgba(186, 26, 26, 0.1);
          color: var(--error);
        }
        .badge-info {
          background-color: rgba(40, 43, 74, 0.1);
          color: var(--primary-container);
        }
        :global([data-theme="dark"]) .badge-info {
          background-color: rgba(194, 196, 235, 0.15);
          color: var(--primary);
        }
        .badge-neutral {
          background-color: var(--surface-container-high);
          color: var(--on-surface-variant);
        }
      `}</style>
    </span>
  );
};
