"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Gamepad2, Trophy, BarChart3, Users, Sun, Moon, CloudLightning, CloudCheck } from "lucide-react";
import { ToastProvider, useToast } from "./Toast";

const Navigation: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { label: "Home", href: "/", icon: Home },
    { label: "Sessions", href: "/sessions", icon: Gamepad2 },
    { label: "Tournaments", href: "/tournaments", icon: Trophy },
    { label: "Stats", href: "/stats", icon: BarChart3 },
    { label: "Players", href: "/players", icon: Users },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className={`nav-item ${isActive ? "active" : ""}`}
            aria-label={item.label}
          >
            <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
            <span className="nav-label">{item.label}</span>
          </button>
        );
      })}
      <style jsx>{`
        .nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          border: none;
          background: none;
          color: var(--on-surface-variant);
          width: 100%;
          height: 100%;
          cursor: pointer;
          transition: color 0.15s ease, transform 0.1s ease;
          position: relative;
        }
        .nav-item:active {
          transform: scale(0.95);
        }
        .nav-item.active {
          color: var(--primary-container);
        }
        :global([data-theme="dark"]) .nav-item.active {
          color: var(--primary);
        }
        .nav-label {
          font-size: 11px;
          font-weight: 600;
        }
        .nav-item.active::after {
          content: "";
          position: absolute;
          top: 4px;
          width: 24px;
          height: 3px;
          background-color: var(--primary-container);
          border-radius: var(--rounded-full);
        }
        :global([data-theme="dark"]) .nav-item.active::after {
          background-color: var(--primary);
        }
      `}</style>
    </nav>
  );
};

const Header: React.FC = () => {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [online, setOnline] = useState(true);

  useEffect(() => {
    // Read theme on mount
    const savedTheme = localStorage.getItem("theme");
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const currentTheme = savedTheme === "dark" || savedTheme === "light" ? savedTheme : systemTheme;
    setTheme(currentTheme as "light" | "dark");

    // Network status
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  return (
    <header className="app-header">
      <div className="header-brand">
        <span className="brand-logo">⚔️</span>
        <span className="brand-name">ScoreSquad</span>
      </div>
      <div className="header-actions">
        <div className={`sync-status ${online ? "online" : "offline"}`} title={online ? "Online & Syncing" : "Offline Mode"}>
          {online ? <CloudCheck size={18} /> : <CloudLightning size={18} />}
          <span className="sync-text">{online ? "Synced" : "Offline"}</span>
        </div>
        <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme">
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>
      <style jsx>{`
        .app-header {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          padding: var(--spacing-sm) var(--gutter);
          border-bottom: 1px solid var(--outline-variant);
          background-color: var(--surface);
          position: sticky;
          top: 0;
          z-index: 90;
        }
        .header-brand {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs);
        }
        .brand-logo {
          font-size: 20px;
        }
        .brand-name {
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--primary-container);
        }
        :global([data-theme="dark"]) .brand-name {
          color: var(--primary);
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .sync-status {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: var(--rounded-full);
          font-size: 11px;
          font-weight: 700;
        }
        .sync-status.online {
          background-color: rgba(107, 203, 119, 0.15);
          color: #2e7d32;
        }
        :global([data-theme="dark"]) .sync-status.online {
          color: #81c784;
        }
        .sync-status.offline {
          background-color: rgba(244, 185, 66, 0.15);
          color: #b77a00;
        }
        :global([data-theme="dark"]) .sync-status.offline {
          color: var(--accent-gold);
        }
        .sync-text {
          font-size: 11px;
        }
        .theme-toggle {
          border: 1px solid var(--outline-variant);
          background-color: var(--surface-container-low);
          color: var(--on-surface);
          border-radius: var(--rounded-default);
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background-color 0.15s;
        }
        .theme-toggle:active {
          transform: scale(0.95);
        }
      `}</style>
    </header>
  );
};

const ServiceWorkerRegistrar: React.FC = () => {
  const { showToast } = useToast();

  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            console.log("Service Worker registered with scope:", registration.scope);
          })
          .catch((error) => {
            console.error("Service Worker registration failed:", error);
          });
      });
    }
  }, [showToast]);

  return null;
};

interface ClientLayoutProps {
  children: React.ReactNode;
}

const ClientLayoutContent: React.FC<ClientLayoutProps> = ({ children }) => {
  return (
    <div className="app-wrapper">
      <Header />
      <main className="main-content fade-in">
        {children}
      </main>
      <Navigation />
      <ServiceWorkerRegistrar />
    </div>
  );
};

export default function ClientLayout({ children }: ClientLayoutProps) {
  return (
    <ToastProvider>
      <ClientLayoutContent>{children}</ClientLayoutContent>
    </ToastProvider>
  );
}
