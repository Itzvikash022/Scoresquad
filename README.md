# 🏆 ScoreSquad — Local Multiplayer Game Companion PWA

ScoreSquad is a production-ready Progressive Web Application (PWA) designed as a digital scorekeeper and tournament companion for local multiplayer game nights (e.g. board games, console games, sports, card games). 

It is built as a **companion app** to eliminate the hassle of manually keeping score, tracking players, mapping tournaments, and calculating leaderboards.

---

## 🏗️ Architecture: Local-First Synchronization

ScoreSquad runs on a **local-first** replication architecture. The app requires zero network latency to read or write data, making it resilient during game nights with spotty connections:

* **Immediate Writes**: Creating players, logging matches, or advancing tournaments writes immediately to local storage and updates the UI instantly.
* **Background Sync Queue**: Operations are added to an offline queue. When network connectivity is active, the app synchronizes queues with the MongoDB Atlas cloud backend via `/api/sync`.
* **Complete Offline Support**: A custom service worker (`public/sw.js`) pre-caches core page structures, rendering the application fully operational offline.

---

## 🎨 Design System: Kinetic Scoring

Developed as a native-feeling mobile app constrained to `max-width: 600px` (centered on desktop viewports):
* **Typography**: Outfit Google Font for sports styling.
* **Theme Controls**: Dynamic Dark & Light modes with a script loader preventing startup flash.
* **Thumb-Friendly Widgets**: Large touch-optimized dialers (`+1`, `-1`, `+5`, `+10`) for registering points without keyboard input.

---

## 🎮 Core Features

### 1. Management Hub (Players & Games)
* Register players with custom emoji avatars, nicknames, and stats.
* Catalog games and specify supported play formats (Solo, Free For All, Team Match).
* Export database backups in a clean JSON format or restore backups in one click.

### 2. Match Creator Wizard
* Select games and matching play modes.
* Build teams dynamically with shuffle randomizers, quick swaps, and auto-balancing tools.
* Log scores using touch dialers.

### 3. Session Companion (Game Nights)
* Run active sessions to track score progress during a game night.
* Auto-calculates **MVP** (highest total points) and **Champion** (most match wins) upon session finalization.

### 4. Tournament Companion (Custom vs. Action Mode)
* **Custom Mode**: Generates round-robin matches but keeps player lineups editable via inline dropdowns on matchup cards. Play and log games in any ordering.
* **Action Mode**: Predefined fixed matchups.
  * *Group Stage*: Round-robin matchups are played across game slot matrices (e.g., Game `1`, `2`, `3`, `4`, `5`).
  * *Semifinals*: Auto-generated series between the 2nd and 3rd place teams once the group stage concludes.
  * *Finals*: Auto-generated series between the 1st place team and the semifinal winner.
* Renders an interactive Celebration Wrapped modal on completion.

### 5. Leaderboards & Match Logs
* View points leaderboards for individuals and team combinations.
* Match history logs with game filters.
* Analytics showing most active players, top games, and win rates.

---

## 🛠️ Installation & Setup

### 1. Clone the repository
```bash
git clone https://github.com/Itzvikash022/Scoresquad.git
cd Scoresquad
```

### 2. Install dependencies
```bash
npm install
```

### 3. Database Credentials
Create a `.env.local` file in the root directory:
```env
# MongoDB Atlas Connection URI
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/scoresquad?retryWrites=true&w=majority

# Application base URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

### 5. Production Build
```bash
npm run build
npm start
```
