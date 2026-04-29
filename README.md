![Maya CAD v1.0 animated demo](docs/screenshots/maya-cad-demo.gif)

# 🏗️ Maya CAD v1.0

Maya CAD v1.0 is a browser-based CAD and floor plan design workspace for drawing, editing, measuring, and exporting architectural layouts. It is built as a fast Vite + React app with a canvas-first interface powered by Konva.

The app is designed to run as a static web application, so it can be hosted on Vercel without a required backend or sign-in flow.

## 🎬 Demo Video

Watch the full app walkthrough on GitHub Releases:

[▶️ Watch or download the Maya CAD v1.0 demo video](https://github.com/sursorot/maya-cad-v1.0/releases/tag/v1.0-demo)

## 📚 Documentation

- [Full Maya CAD User Guide](docs/USER_GUIDE.md) covers setup, workspace layout, drawing tools, architectural workflows, snapping, measurements, exports, projects, shortcuts, performance behavior, and troubleshooting.

## 📸 App Screenshots

### 🖼️ Main CAD Workspace

The main workspace opens directly into a grid-based drawing canvas with a vertical tool palette, bottom control bar, zoom controls, scale indicator, snapping controls, and theme selector.

![Maya CAD main workspace](docs/screenshots/maya-cad-workspace.png)

### ✂️ Editing Tools Panel

The editing tools panel exposes CAD-style operations such as copy, move, offset, trim, group, mirror, fillet, chamfer, explode, align, array, rotate, and more.

![Maya CAD editing tools panel](docs/screenshots/maya-cad-editing-tools.png)

### 📤 Export Panel

The export workflow supports multiple output formats, including PNG, JPEG, SVG, PDF, DXF, and the app's GEOS workspace format, with options for dimensions, grid, transparency, and export scope.

![Maya CAD export panel](docs/screenshots/maya-cad-export-panel.png)

## ✨ What You Can Build

- 🧱 Floor plans with walls, rooms, zones, doors, windows, and openings.
- 📐 Measured drawings with dimensions, snapping, guides, and precision input.
- 🛋️ Layout concepts with assets, markers, annotations, trace images, and text notes.
- 🎨 Styled drawings using fills, strokes, themes, and appearance controls.
- 📤 Export-ready workspace data for browser-based design workflows.

## 🧭 How The App Works

Maya CAD opens directly into a design workspace. The main canvas is the center of the experience, with toolbars, panels, and contextual controls around it.

1. 🖱️ Pick a drawing tool such as wall, line, rectangle, room, opening, dimension, or text.
2. 📍 Click or drag on the canvas to create geometry.
3. 🧲 Use snapping, guides, markers, and precision input to keep drawings accurate.
4. ✏️ Select shapes to move, resize, rotate, style, group, mirror, trim, or edit them.
5. 📏 Add measurements, labels, and annotations to communicate the plan clearly.
6. 🚀 Build and deploy the app as a static web app with Vercel.

## 🧰 Feature Highlights

### 🖼️ Canvas Workspace

- Infinite-feeling drawing surface with pan and zoom.
- Layered rendering for shapes, measurements, markers, overlays, and active drawing previews.
- Shape selection with bounding boxes, resize handles, and rotation controls.
- Trace image support for using reference images while drafting.

### 🧱 Architectural Tools

- Wall drawing with connected centerlines and wall geometry.
- Door, window, and opening placement on walls.
- Room and zone tools for enclosed spaces and labeled areas.
- Measurement overlays for lengths, spans, areas, and dimensions.

### 📐 Precision And Drafting

- Dynamic precision input for coordinate-style drawing.
- Snapping support for endpoints, midpoints, centers, grid, guides, markers, and alignment.
- Orthogonal drawing support for cleaner architectural layouts.
- Guidelines and markers for repeatable alignment.

### ✂️ Editing Tools

- Move, copy, paste, rotate, resize, mirror, group, ungroup, trim, fillet, and explode workflows.
- Shape-level style editing for stroke, fill, opacity, blend mode, shadows, and presets.
- Contextual hints and shortcut modal to help users discover available actions.

### 🎨 Interface Themes

- Clean, modern, cyber, funk, and Windows 95-inspired toolbar styles.
- Footer and panel controls for quickly changing workspace behavior.
- Error boundary support for a more resilient browser experience.

### 🔐 Optional Persistence

- The app can run without sign-in or environment variables.
- Supabase integration is available for future authentication and project persistence.
- When Supabase is not configured, persistence features are disabled gracefully.

## 🧪 User Workflow

```text
Open App
  ↓
Choose Tool
  ↓
Draw Geometry
  ↓
Snap / Measure / Annotate
  ↓
Edit And Style
  ↓
Export Or Deploy
```

## 🛠️ Tech Stack

- ⚛️ React 19
- 🟦 TypeScript
- ⚡ Vite
- 🎨 Konva and React Konva
- 🐻 Zustand
- 🧩 Supabase client, optional
- ▲ Vercel deployment config

## 🚀 Getting Started

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

## 📦 Available Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Type-check and build the production app. |
| `npm run preview` | Preview the built app locally. |
| `npm run lint` | Run repository checks and ESLint. |
| `npm run test` | Run workspace command tests. |

## ▲ Vercel Deployment

This repo includes `vercel.json`, so Vercel can deploy from the repository root with these settings:

- Framework: Vite
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `apps/maya-web/dist`

Import the GitHub repository into Vercel, keep the Root Directory as `.`, and deploy. The initial deployment can run without environment variables; sign-in and persistence are not required.

## 🔧 Environment Variables

Supabase is optional. If persistence or auth is enabled later, add these variables in Vercel Project Settings instead of committing them to Git:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Values prefixed with `VITE_` are bundled into the browser app and are public. Do not put private service-role keys, database passwords, API secrets, or personal tokens in `VITE_*` variables.

## 🔒 Security Notes

- Never commit `.env`, `.env.local`, app-specific `.env` files, or `keys.txt`.
- Keep real credentials in local environment files or in Vercel environment variables.
- `.vercel`, `node_modules`, and build output should remain local-only.
- Before making a repository public, run `git status --ignored` and confirm secret files are ignored.

## 📁 Project Structure

```text
apps/maya-web/        Vite React web app
packages/rl-core/     Shared TypeScript package used by the web app
tools/                Repository scripts and checks
tests/                Workspace command tests
vercel.json           Vercel deployment configuration
```

## 🌐 Deployment Goal

Maya CAD v1.0 is intended to be easy to open, test, and deploy:

- ✅ No sign-in required for the default static app.
- ✅ No secret keys required for the first launch.
- ✅ Public GitHub-friendly README and repository structure.
- ✅ Vercel-ready build configuration.
