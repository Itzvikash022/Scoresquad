"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-card ${toast.type}`}>
            <span className="toast-message">{toast.message}</span>
          </div>
        ))}
      </div>
      <style jsx global>{`
        .toast-container {
          position: fixed;
          top: 16px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 90%;
          max-width: 400px;
          pointer-events: none;
        }
        .toast-card {
          padding: 12px 16px;
          border-radius: var(--rounded-default, 8px);
          color: #ffffff;
          font-size: 14px;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          animation: slideDown 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: auto;
          text-align: center;
        }
        .toast-card.success {
          background-color: var(--accent-green, #6bcb77);
          color: #121212;
        }
        .toast-card.error {
          background-color: var(--error, #ba1a1a);
          color: #ffffff;
        }
        .toast-card.info {
          background-color: var(--primary-container, #282b4a);
          color: #ffffff;
          border: 1px solid var(--outline-variant, #c7c5ce);
        }
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
};
