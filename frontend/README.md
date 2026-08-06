# SpaceForge Frontend

Vite + React + TypeScript + Tailwind UI for SpaceForge Enterprise.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:8080

From monorepo root you can also run `npm run dev:frontend`.

## Layout

```
src/pages/                  routes / pages
src/components/data-agent/  core product UI
src/platform/               backend adapters
src/services/               API wrappers
src/features/               feature modules
public/                     static assets
```
