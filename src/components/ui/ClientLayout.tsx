"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Home, Trophy, BarChart3, Users, Settings } from "lucide-react";
import { ToastProvider } from "./Toast";
import dataService from "@/lib/dataService";

const navItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Tournaments", href: "/tournaments", icon: Trophy },
  { label: "Stats", href: "/stats", icon: BarChart3 },
  { label: "Players", href: "/players", icon: Users },
];

const Navigation: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-[60px] bg-surface border-t border-border flex items-center justify-around z-50 md:hidden safe-bottom">
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
            className={`flex flex-col items-center justify-center gap-1 text-[10.5px] font-bold transition-all w-16 h-full cursor-pointer focus:outline-none ${
              isActive ? "text-accent" : "text-text-faint hover:text-text"
            }`}
            aria-label={item.label}
          >
            <Icon className="h-[19px] w-[19px] stroke-[1.8]" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

const Header: React.FC = () => {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between px-4 py-3 md:px-6 md:py-4 border-b border-border/40 bg-surface/90 backdrop-blur-md sticky top-0 z-40">
      {/* Left side brand logo (hidden on desktop because sidebar has it) */}
      <div className="flex items-center gap-2 md:hidden">
        <div className="w-[26px] h-[26px] rounded-[8px] bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center">
          <Trophy className="h-3.5 w-3.5 text-white stroke-[2]" />
        </div>
        <span className="font-display font-bold text-[15px] text-text">ScoreSquad</span>
      </div>

      {/* Placeholder layout spacer on desktop */}
      <div className="hidden md:block font-display font-semibold text-[15.5px] text-text">
        {pathname === "/" && "Dashboard"}
        {pathname.startsWith("/tournaments") && "Tournaments"}
        {pathname.startsWith("/stats") && "Statistics & Standings"}
        {pathname.startsWith("/players") && "Catalog & Settings"}
        {pathname.startsWith("/matches") && "Scoring Round"}
      </div>

    </header>
  );
};

interface ClientLayoutProps {
  children: React.ReactNode;
}

const ClientLayoutContent: React.FC<ClientLayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen w-full bg-background text-text flex flex-col md:grid md:grid-cols-[240px_1fr] relative z-10">
      {/* Desktop Sidebar Navigation */}
      <nav className="hidden md:flex flex-col gap-1 p-5 border-r border-border bg-surface w-[240px] h-screen sticky top-0 z-30">
        <div className="flex items-center gap-2.5 px-2 pb-5 border-b border-border/40 mb-4">
          <div className="w-[30px] h-[30px] rounded-lg bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center">
            <Trophy className="h-4.5 w-4.5 text-white stroke-[2]" />
          </div>
          <span className="font-display font-bold text-[16px] text-text">ScoreSquad</span>
        </div>

        {/* Navigation list */}
        <div className="flex flex-col gap-1">
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
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md font-semibold text-[13.5px] transition-all text-left w-full cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary ${
                  isActive
                    ? "bg-[#7C6FF2]/15 text-text border-l-2 border-primary"
                    : "text-text-dim hover:text-text hover:bg-surface-2"
                }`}
                aria-label={item.label}
              >
                <Icon className="h-[18px] w-[18px] stroke-[1.8]" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Bottom Settings shortcut */}
        <div className="mt-auto pt-4 border-t border-border/40">
          <button
            onClick={() => router.push("/players")}
            className="flex items-center gap-3 px-3 py-2.5 rounded-md font-semibold text-[13.5px] transition-all text-left w-full cursor-pointer text-text-dim hover:text-text hover:bg-surface-2 focus:outline-none"
            aria-label="Settings"
          >
            <Settings className="h-[18px] w-[18px] stroke-[1.8]" />
            <span>Settings</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex flex-col min-w-0 min-h-screen">
        <Header />
        <main className="flex-grow p-4 md:p-6 pb-20 md:pb-6 max-w-[1200px] w-full mx-auto fade-in">
          {children}
        </main>
        <Navigation />
      </div>

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
