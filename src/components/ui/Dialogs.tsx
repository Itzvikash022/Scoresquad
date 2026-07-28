"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2 className="dialog-title">{title}</h2>
          <button className="dialog-close" onClick={onClose} aria-label="Close modal">
            <X size={20} />
          </button>
        </div>
        <div className="dialog-body">{children}</div>
      </div>
      <style jsx>{`
        .dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.4);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }
        .dialog-content {
          background-color: var(--background);
          border: 1px solid var(--outline-variant);
          border-radius: var(--rounded-lg, 16px);
          width: 100%;
          max-width: 480px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          overflow: hidden;
        }
        .dialog-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--outline-variant);
        }
        .dialog-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--on-surface);
        }
        .dialog-close {
          border: none;
          background: none;
          color: var(--on-surface-variant);
          cursor: pointer;
          width: 32px;
          height: 32px;
          border-radius: var(--rounded-full);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.15s;
        }
        .dialog-close:active {
          background-color: var(--surface-container-high);
        }
        .dialog-body {
          padding: 20px;
          max-height: 80vh;
          overflow-y: auto;
        }
      `}</style>
    </div>
  );
};

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="sheet-overlay" onClick={onClose}>
      <div className="sheet-content slide-up" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle-bar">
          <div className="sheet-handle" />
        </div>
        <div className="sheet-header">
          <h2 className="sheet-title">{title}</h2>
          <button className="sheet-close" onClick={onClose} aria-label="Close sheet">
            <X size={20} />
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
      <style jsx>{`
        .sheet-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.4);
          z-index: 1000;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .sheet-content {
          background-color: var(--background);
          border-top-left-radius: var(--rounded-xl, 24px);
          border-top-right-radius: var(--rounded-xl, 24px);
          border-top: 1px solid var(--outline-variant);
          width: 100%;
          max-width: var(--max-width, 600px);
          display: flex;
          flex-direction: column;
          box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.1);
          max-height: 90vh;
        }
        .sheet-handle-bar {
          display: flex;
          justify-content: center;
          padding: 8px 0 4px 0;
        }
        .sheet-handle {
          width: 36px;
          height: 4px;
          border-radius: var(--rounded-full);
          background-color: var(--outline-variant);
        }
        .sheet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 20px 16px 20px;
          border-bottom: 1px solid var(--outline-variant);
        }
        .sheet-title {
          font-size: 18px;
          font-weight: 700;
          color: var(--on-surface);
        }
        .sheet-close {
          border: none;
          background: none;
          color: var(--on-surface-variant);
          cursor: pointer;
          width: 32px;
          height: 32px;
          border-radius: var(--rounded-full);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background-color 0.15s;
        }
        .sheet-close:active {
          background-color: var(--surface-container-high);
        }
        .sheet-body {
          padding: 20px;
          overflow-y: auto;
          padding-bottom: 40px; /* Safe area space for thumb */
        }
        .slide-up {
          animation: slideUp 0.28s cubic-bezier(0.4, 0, 0.2, 1);
        }
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
