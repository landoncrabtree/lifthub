# LiftHub

A self-hosted workout tracking PWA. Track exercises, build templates, log workouts, and view progress — all from a browser.

## Features

- Exercise library with built-in exercises and the ability for users to add their own exercises
- Drag and drop template (workout) editor with graphical and JSON editing modes
- Live workout tracking with rest timer and audio cues
- Progress charts (max weight, volume, estimated 1RM) and workout heatmap
- Nutritional tracking (TDEE, calorie, protein, carbs, fat) with the ability to log food via barcode (OpenFoodFacts), custom meals, and USDA database
- PWA with offline support
- Multi-user support for hosting for friends/family.

## Getting Started

### Prerequisites

- Docker and Docker Compose

### Development

```sh
git clone https://github.com/landoncrabtree/lifthub.git
docker compose -f docker-compose-dev.yml up --build -d
```

The app will be available at `http://localhost`.

### Production

```sh
git clone https://github.com/landoncrabtree/lifthub.git

cp .env.example .env
# Modify .env as needed

docker compose build
docker compose up -d
```

Assuming you have the domain pointing to your server's IP address (and firewall rules allow 80/443 traffic), the app will be available at `https://your-domain`.

### CI/CD Example

Check out `.github/workflows/main.yml` for a CI/CD example on using GitHub actions to build and deploy the app to a server.

## Project Structure

```
.
├── backend/          Express API + SQLite
├── frontend/         React + Vite SPA
├── caddy/            Caddyfile and related config
├── docker-compose.yml
└── .env.example
```

See [ARCHITECTURE.md](ARCHITECTURE.md) for details.
