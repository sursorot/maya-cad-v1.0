# Geometry OS [Project Maya]

Geometry OS is a web-based CAD and floor plan design workspace built with React, TypeScript, Vite, and Konva. It focuses on fast canvas-based drawing, precise geometry editing, and a deployable browser experience.

## Features

- Interactive floor plan canvas with walls, rooms, openings, measurements, and geometry overlays.
- Precision-oriented drawing tools, snapping, bounds, guides, and editing controls.
- Export and workspace features for browser-based design workflows.
- Optional Supabase integration for authentication and persistence when environment variables are configured.

## Tech Stack

- React 19 and TypeScript
- Vite
- Konva and React Konva
- Zustand
- Supabase client, optional for the first static deployment

## Getting Started

Install dependencies from the repository root:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Build the production app:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

The deployable web app lives in `apps/maya-web`. Root npm scripts already point Vite and TypeScript at that app.

## Vercel Deployment

This repo includes `vercel.json`, so Vercel can deploy from the repository root with these settings:

- Framework: Vite
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `apps/maya-web/dist`

Import the GitHub repository into Vercel, keep the Root Directory as `.`, and deploy. The initial deployment can run without environment variables; persistence features stay disabled when Supabase is not configured.

## Environment Variables

Supabase is optional for the first static launch. If persistence or auth is enabled later, add these variables in Vercel Project Settings instead of committing them to Git:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Values prefixed with `VITE_` are bundled into the browser app and are public. Do not put private service-role keys, database passwords, API secrets, or personal tokens in `VITE_*` variables.

## Security Notes

- Never commit `.env`, `.env.local`, app-specific `.env` files, or `keys.txt`.
- Keep real credentials in local environment files or in Vercel environment variables.
- Before making this repository public, run `git status --ignored` and confirm secret files are ignored.
- If any secret was committed in the past, rotate it before publishing and clean the Git history.

## Project Structure

```text
apps/maya-web/        Vite React web app
packages/rl-core/     Shared TypeScript package used by the web app
tools/                Repository scripts and checks
tests/                Workspace command tests
docs/                 Planning and implementation notes
vercel.json           Vercel deployment configuration
```
