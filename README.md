# LiftHub

A self-hosted workout tracking PWA. Track exercises, build templates, log workouts, and view progress — all from a browser.

## Features

- Exercise library with 93 seeded exercises across 13 muscle groups
- Drag-and-drop template builder with graphical and JSON editing modes
- Live workout tracking with rest timer and audio cues
- Progress charts (max weight, volume, estimated 1RM) and workout heatmap
- PWA with offline support
- Dark mode
- Auto-SSL via Caddy

## Getting Started

### Prerequisites

- Docker and Docker Compose

### Setup

1. Clone the repository and create an environment file:

```sh
cp .env.example .env
```

2. Edit `.env`:

```
DOMAIN=localhost
JWT_SECRET=your-random-secret-here
```

For production, set `DOMAIN` to your actual domain (e.g. `lifthub.example.com`). Caddy will automatically provision SSL certificates via Let's Encrypt.

3. Start the stack:

```sh
docker compose up --build -d
```

The app will be available at `http://localhost` (or `https://your-domain` in production).

### Data Persistence

SQLite data is stored in the `sqlite-data` Docker volume. To back up:

```sh
docker compose cp backend:/app/data/gym.db ./gym-backup.db
```

## Project Structure

```
.
├── backend/          Express API + SQLite
├── frontend/         React + Vite SPA
├── Caddyfile         Reverse proxy config
├── docker-compose.yml
└── .env.example
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for details.
