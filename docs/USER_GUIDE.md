# Maya CAD User Guide

Maya CAD is a browser-based CAD and floor plan design workspace for drafting architectural layouts, annotating designs, and exporting drawings. This guide explains what the app can do, where the main controls live, and how to use each major feature.

![Maya CAD workspace](screenshots/maya-cad-workspace.png)

## Table Of Contents

- [Quick Start](#quick-start)
- [App Layout](#app-layout)
- [Core Workflow](#core-workflow)
- [Canvas Navigation](#canvas-navigation)
- [Tools Reference](#tools-reference)
- [Architectural Drafting](#architectural-drafting)
- [Precision, Snapping, And Units](#precision-snapping-and-units)
- [Measurements And Dimensions](#measurements-and-dimensions)
- [Editing And Selection](#editing-and-selection)
- [Styles, Appearance, And Layers](#styles-appearance-and-layers)
- [Trace Images](#trace-images)
- [Projects, Auth, And Autosave](#projects-auth-and-autosave)
- [Exporting](#exporting)
- [Simulation And Sunlight](#simulation-and-sunlight)
- [Data Mode](#data-mode)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Performance Behavior](#performance-behavior)
- [Developer And Deployment Notes](#developer-and-deployment-notes)
- [Troubleshooting](#troubleshooting)

## Quick Start

From the repository root:

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. The app loads directly into the CAD workspace. No sign-in or backend is required for the default static app.

Common commands:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server for `apps/maya-web`. |
| `npm run build` | Type-check and build the production app. |
| `npm run preview` | Preview the production build locally. |
| `npm run serve` | Serve the built app with the included Node static server. |
| `npm run lint` | Run repository checks and ESLint. |
| `npm run test` | Run workspace command tests. |
| `npm run build:analyze` | Build and inspect the production bundle. |

Optional Supabase project persistence uses these public Vite variables:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Do not place private service-role keys or database passwords in `VITE_*` variables because they are bundled into browser code.

## App Layout

Maya CAD uses one main workspace screen.

| Area | What It Does |
| --- | --- |
| Header | Opens the project sidebar, creates a new canvas, shows the current project name, exposes save status, and opens export. |
| Left toolbar | Provides drawing, drafting, architecture, measurement, selection, undo, and redo tools. |
| Canvas | Main grid-based drawing area for plans, annotations, dimensions, and overlays. |
| Floating tool panels | Appear for tools such as walls, openings, trace images, text, style controls, and export settings. |
| Footer | Controls grid visibility, toolbar visibility, markers, zoom, measurement display, units, snapping, drawing mode, compass, data mode, and related workspace toggles. |
| Sidebar | Lists saved projects when Supabase persistence is configured. |
| Data mode panel | Optional right-side panel for creating command-log training examples. |

Supported app routes all open the same workspace shell:

| Route | Purpose |
| --- | --- |
| `/` | Main workspace. |
| `/app` | Main workspace alias. |
| `/workspace` | Main workspace alias. |
| `/auth/callback` | Auth callback route, then workspace. |
| `/auth/reset-password` | Password reset route, then workspace. |

## Core Workflow

Most work in Maya CAD follows this pattern:

1. Choose a tool from the toolbar.
2. Set tool options in any floating panel that appears.
3. Click or drag on the canvas to create geometry.
4. Use snapping, ortho, grid, markers, and precision input to keep geometry accurate.
5. Select objects to move, edit, restyle, group, copy, or delete them.
6. Add dimensions, labels, notes, assets, trace images, or analysis overlays.
7. Export the full drawing or selected objects.

## Canvas Navigation

The canvas is the center of the app. It supports drafting on a grid with zoom, pan, selection, drawing previews, and overlays.

| Action | How To Use |
| --- | --- |
| Pan | Hold `Space` and drag. |
| Zoom in | Use the footer zoom controls or `Cmd/Ctrl + +`. |
| Zoom out | Use the footer zoom controls or `Cmd/Ctrl + -`. |
| Fit view | Use `Cmd/Ctrl + 0`. |
| Reset zoom to 100% | Use `Cmd/Ctrl + 1`. |
| Toggle grid | Use the grid button in the footer. |
| Toggle toolbar | Use the toolbar button in the footer. |
| Toggle markers | Use the marker button in the footer. |

The footer also shows zoom level and scale information so you can keep track of the current drawing view.

## Tools Reference

The toolbar is grouped by task. Some tools are always visible, while shape tools such as Circle and Rectangle can be revealed from an expandable shape group.

### Drafting Helpers

| Tool | Purpose | Basic Use |
| --- | --- | --- |
| Guideline | Add construction lines for alignment. | Choose Guideline, set orientation if prompted, then click to place. |
| Trim | Remove or shorten geometry where it intersects other geometry. | Choose Trim, then interact with the geometry segment to trim. |
| Marker | Place reusable snap points. | Choose Marker and click the canvas. Markers can be shown or hidden from the footer. |

### Navigation And Inspection

| Tool | Purpose | Basic Use |
| --- | --- | --- |
| Select | Select, move, box-select, and edit objects. | Click an object, Shift-click to add to selection, or drag a selection box. |
| Measure | Create a temporary or persistent measurement between points. | Click the start point, then click the end point. |

### Basic Geometry

| Tool | Purpose | Basic Use |
| --- | --- | --- |
| Line | Draw a single straight segment. | Click a start point, then click an end point. |
| Polyline | Draw connected segments. | Click each point, press `Enter` to finish, or double-click to close. |
| Arc | Draw curved arc geometry. | Follow the on-canvas prompts to define the arc. |
| Curve | Draw freeform curved geometry. | Click or drag points to define the curve. |
| Circle | Draw circles. | Reveal from the shape group, then place and size on the canvas. |
| Rectangle | Draw rectangles. | Reveal from the shape group, then drag or click to define the rectangle. |

### Architectural Tools

| Tool | Purpose | Basic Use |
| --- | --- | --- |
| Wall | Draw walls with thickness, height, alignment, and wall drawing mode. | Choose Wall, configure the wall panel, then click points on the canvas. |
| Opening | Place doors or windows into walls. | Choose Opening, select door/window preset or custom size, then click a wall. |
| Assets | Add furniture or 2D layout objects. | Choose Assets and place the desired asset in the drawing. |
| Zone | Define room or area zones. | Choose Zone and create an enclosed or labeled area. |
| Dimension | Add explicit dimension annotations. | Choose Dimension and click the points or objects to dimension. |
| Text | Add text labels. | Choose Text, click the canvas, then enter label text. |

### Annotation Tools

Additional annotation-related tool types exist in the workspace model, including pencil, arrow, highlighter, eraser, note, upload, and zoom. Depending on the current UI build, these may appear as contextual controls, experiments, or internal commands rather than permanent toolbar buttons.

## Architectural Drafting

### Walls

The Wall tool is the main architectural drafting feature. When the Wall tool is active, a floating wall panel lets you configure:

| Setting | Meaning |
| --- | --- |
| `L` | Current wall length when editable. |
| `T` | Wall thickness. |
| `H` | Wall height. |
| Mode | Single segment, chain, rectangle, or offset wall drawing. |
| Offset distance | Distance used by offset wall mode. |
| Alignment | Center, inside, or outside wall alignment. |
| Centerline | Shows or hides wall centerlines. |

Typical wall workflow:

1. Select the Wall tool.
2. Set thickness, height, mode, and alignment in the wall panel.
3. Click to start a wall.
4. Click additional points for chain mode.
5. Press `Enter` to finish or `Esc` to cancel.
6. Double-click where supported to close a wall loop.

### Openings

The Opening tool places doors and windows on existing walls.

The opening panel supports:

| Setting | Meaning |
| --- | --- |
| Type | Choose window or door. |
| Presets | Pick a built-in size preset for the selected type. |
| Custom | Allows manual width and height. |
| `W` | Opening width in the current length unit. |
| `H` | Opening height in the current length unit. |

Typical opening workflow:

1. Draw at least one wall.
2. Select Opening.
3. Choose `window` or `door`.
4. Pick a preset or choose Custom.
5. Click on a wall to place the opening.
6. Press `Esc` to cancel placement.

### Zones

Zones represent rooms, regions, or labeled areas. They are useful for communicating spaces in a floor plan. Use zones after drawing walls or boundary geometry, then add labels, styles, or measurements as needed.

### Assets

Assets are 2D objects such as furniture or fixtures that help communicate a layout. Place them after the main geometry is drafted, then select and move them like other canvas objects.

## Precision, Snapping, And Units

Maya CAD includes CAD-style controls for keeping drawings accurate.

### Length Units

The footer can change the displayed length unit. Supported units include:

| Unit | Meaning |
| --- | --- |
| `mm` | Millimeters |
| `cm` | Centimeters |
| `m` | Meters |
| `in` | Inches |
| `ft` | Feet |
| `ft-in` | Feet and inches |

Changing units affects displayed values and panel inputs; it does not change the underlying geometry scale.

### Snapping

Snapping can be toggled globally and configured by snap type.

| Snap Type | Meaning |
| --- | --- |
| Endpoint | Snap to line, wall, and shape endpoints. |
| Midpoint | Snap to the midpoint of supported geometry. |
| Center | Snap to shape centers. |
| Nearest | Snap to the nearest eligible point on geometry. |
| Quadrant | Snap to circle or arc quadrant points. |
| Intersection | Snap to intersections between geometry. |
| Grid | Snap to grid points. |
| Direction | Snap to directional guide vectors. |
| Perpendicular | Snap perpendicular to existing geometry. |
| Ortho | Constrain drawing to horizontal or vertical directions. |
| Marker | Snap to user-placed markers. |

Use `Cmd/Ctrl + P` to toggle snapping. Use `Shift + O` to toggle ortho.

### Drawing Mode

The footer can switch between one-time and chain drawing behavior.

| Mode | Behavior |
| --- | --- |
| One-time | The active tool completes one operation and can return to selection or idle behavior. |
| Chain | The active drawing tool stays active for repeated drawing. |

### Precision Input

Precision input is enabled in the current app configuration. During supported drawing operations, the workspace can show distance, angle, coordinate, or dimension inputs near the cursor. Use this for exact drafting when mouse placement is not precise enough.

## Measurements And Dimensions

Measurements and dimensions help communicate drawing size and intent.

| Feature | Purpose |
| --- | --- |
| Measure tool | Quickly measure between two points. |
| Dimension tool | Add dimension annotations to the drawing. |
| Linear dimensions | Show dimension lines for lengths. |
| Chip dimensions | Show compact measurement labels. |
| Arc dimensions | Show curved measurements for arcs and circles. |
| Span dimensions | Show spans across selected or detected edges. |
| Angle indicators | Show angle information. |
| Area labels | Show area labels for rooms or zones. |

Use the footer measurement controls to show, hide, or configure measurement overlays.

## Editing And Selection

Use the Select tool for most editing.

| Action | How To Use |
| --- | --- |
| Select one object | Click an object. |
| Box select | Drag a selection rectangle. |
| Add to selection | Shift-click another object. |
| Deselect or cancel | Press `Esc`. |
| Delete | Press `Delete` or `Backspace`. |
| Copy | Press `Cmd/Ctrl + C`. |
| Paste | Press `Cmd/Ctrl + V`. |
| Select all | Press `Cmd/Ctrl + A`. |
| Group | Press `Cmd/Ctrl + G`. |
| Ungroup | Press `Cmd/Ctrl + Shift + G`. |
| Nudge | Press arrow keys. Hold Shift for larger nudges. |
| Undo | Press `Cmd/Ctrl + Z` or use the toolbar button. |
| Redo | Press `Cmd/Ctrl + Shift + Z`, `Cmd/Ctrl + Y`, or use the toolbar button. |

The app also exposes editing concepts such as mirror, explode, fillet, trim, move, copy, rotate, resize, and alignment through shortcut hints, contextual editing UI, and workspace commands.

![Maya CAD editing tools](screenshots/maya-cad-editing-tools.png)

## Styles, Appearance, And Layers

Canvas objects support a universal appearance model.

| Style Area | Supported Controls |
| --- | --- |
| Fill | None, solid color, pattern, image, or gradient. |
| Stroke | Color, width, dash pattern, cap, join, and opacity. |
| Opacity | Whole-object transparency. |
| Blend mode | Normal, multiply, screen, overlay, darken, or lighten. |
| Shadow | Offset, blur, and color. |
| Z order | Layering order for overlapping objects. |

Use style panels and contextual property controls after selecting objects. Layers and ordering help keep drawings readable as projects become more complex.

## Trace Images

Trace images let you draft over a reference such as an existing plan, sketch, or site image.

Typical trace workflow:

1. Use the upload or trace-image control to add an image.
2. Calibrate or position the image if prompted.
3. Use the Trace Layers panel to show, hide, lock, unlock, recalibrate, or remove images.
4. Lower opacity when drafting over the image.
5. Lock the trace image to prevent accidental movement.

The Trace Layers panel includes quick actions for all images, such as show all, hide all, and lock all.

## Projects, Auth, And Autosave

The app can run as a static app without sign-in. When Supabase is configured, the project system enables cloud-style project persistence.

| Feature | Behavior |
| --- | --- |
| New canvas | Creates a blank canvas and, when persistence is available, a new project. |
| Project sidebar | Lists saved projects and their recent update times. |
| Open project | Loads the selected project's saved workspace snapshot. |
| Rename | Prompts for a new project name. |
| Duplicate | Creates a copy of a project. |
| Archive | Archives a project. |
| Delete | Deletes a project after confirmation. |
| Autosave | Saves changes after a debounce when a project exists. |
| Manual save | Available from the header/save indicator when a project exists. |

If Supabase is not configured, the app still opens and can be used for local drafting and export. Auth and project persistence features are simply unavailable or inactive.

## Exporting

Use the header Export action to open the export modal.

![Maya CAD export panel](screenshots/maya-cad-export-panel.png)

### Formats

| Format | Best For | Notes |
| --- | --- | --- |
| PNG | High-quality image export. | Supports scale, grid, measurements, background, transparency, and footer options. |
| JPEG | Image export for sharing. | Supports quality control and background color. Transparency is not preserved. |
| SVG | Vector export for design tools and scalable graphics. | Best when you need editable vector output. |
| PDF | Printable documents and client handoff. | Supports page size, orientation, margin, metadata, and footer options. |
| DXF | CAD interoperability. | Uses meters and supports CAD/BIM-oriented options such as layers, BIM data, block references, and architectural dimension styles. |
| GEOS | Native GeometryOS workspace export. | Preserves workspace data, viewport, and settings for app-native workflows. |

### Export Options

| Option | Meaning |
| --- | --- |
| Scope | Export all visible drawing content or only selected objects. |
| Padding | Adds margin around exported content. |
| Include grid | Adds the canvas grid to the export. |
| Include measurements | Includes measurement overlays. |
| Background | Choose white/color background or transparent background where supported. |
| Image scale | Controls raster output resolution. |
| JPEG quality | Controls JPEG compression quality. |
| PDF page size | Sets PDF size such as A4. |
| PDF orientation | Portrait or landscape. |
| PDF margin | Page margin in PDF export. |
| Footer | Adds project metadata, author, company, contact, date, and related title-block information where supported. |

Recommended export choices:

| Need | Recommended Format |
| --- | --- |
| Quick screenshot or preview | PNG |
| Small shareable image | JPEG |
| Scalable graphic | SVG |
| Client-facing document | PDF |
| CAD handoff | DXF |
| Preserve Maya CAD workspace data | GEOS |

## Simulation And Sunlight

The workspace includes optional analysis features.

| Feature | Purpose |
| --- | --- |
| Simulation | Runs agent/navigation-style simulation overlays for spatial workflows. |
| Sunlight | Shows sunlight analysis controls and overlays. |

These features are useful for evaluating layouts beyond static geometry. Treat them as analysis aids: draft the plan first, then enable overlays to inspect behavior or environmental effects.

## Data Mode

Data mode is primarily for contributors and training workflows rather than everyday CAD use. It opens a right-side panel that records meaningful workspace commands, combines them with prompt steps, and exports examples for training.

Data mode supports:

| Feature | Purpose |
| --- | --- |
| Prompt steps | Add natural-language instructions for what the user is trying to do. |
| Command timeline | Records workspace commands created while drawing and editing. |
| Difficulty level | Marks the example complexity. |
| Save example | Creates and downloads a training example. |
| Stored examples | Tracks locally stored examples. |
| Tinker SFT export | Exports collected examples for Tinker supervised fine-tuning workflows. |

Use Data mode only when intentionally collecting examples. Turn it off for normal drafting to keep the workspace focused.

## Keyboard Shortcuts

Press `?` in the app to open the shortcuts modal.

### Global

| Shortcut | Action |
| --- | --- |
| `Cmd/Ctrl + Z` | Undo |
| `Cmd/Ctrl + Shift + Z` | Redo |
| `Cmd/Ctrl + Y` | Redo alternate |
| `?` | Open shortcuts reference |
| `Space + Drag` | Pan canvas |
| `Cmd/Ctrl + +` | Zoom in |
| `Cmd/Ctrl + -` | Zoom out |
| `Cmd/Ctrl + 0` | Fit view |
| `Cmd/Ctrl + 1` | Reset zoom to 100% |
| `Cmd/Ctrl + P` | Toggle snapping |
| `Shift + O` | Toggle ortho |

### Tool Switching

| Shortcut | Tool |
| --- | --- |
| `V` | Select |
| `W` | Wall |
| `O` | Opening |
| `L` | Line |
| `P` | Polyline |
| `A` | Arc |
| `C` | Circle |
| `R` | Rectangle |
| `G` | Guideline |
| `T` | Trim |
| `M` | Marker |
| `D` | Dimension |
| `Z` | Zone |

### Selection And Editing

| Shortcut | Action |
| --- | --- |
| `Delete` or `Backspace` | Delete selected objects |
| `Cmd/Ctrl + C` | Copy selected objects |
| `Cmd/Ctrl + V` | Paste |
| `Cmd/Ctrl + A` | Select all |
| `Esc` | Deselect, cancel, or return to Select |
| `Shift + Click` | Add to selection |
| Arrow keys | Nudge selection |
| `Shift + Arrow keys` | Larger nudge |
| `Cmd/Ctrl + G` | Group |
| `Cmd/Ctrl + Shift + G` | Ungroup |
| `X` | Explode supported compound shapes |

### Drawing

| Shortcut | Action |
| --- | --- |
| `Click` | Place point, object, wall segment, or opening depending on active tool |
| `Enter` | Confirm or finish supported drawing operations |
| `Esc` | Cancel drawing operation |
| `Double Click` | Close supported wall or polyline loops |
| `Shift` while drawing | Apply orthogonal or constrained drawing behavior for supported tools |

## Performance Behavior

Maya CAD automatically adjusts expensive features as drawings grow.

| Shape Count | Mode | Behavior |
| --- | --- | --- |
| 0-200 | Full Quality | All configured features remain enabled. |
| 201-400 | Optimized | Intersection snapping is disabled for smoother performance. |
| 401-600 | Performance Mode | Intersection snapping and wall union rendering are disabled. |
| 601+ | Maximum Performance | Additional heavy wall join calculations are disabled and some visual fidelity may be reduced. |

When the app enters a new performance tier, it can show a toast explaining what changed.

Tips for large drawings:

- Use layers or separate project files for very large plans.
- Hide measurements or markers when they are not needed.
- Disable snapping modes you are not actively using.
- Lock trace images after placement.
- Prefer exporting selected objects when creating partial deliverables.

## Developer And Deployment Notes

### Tech Stack

| Area | Technology |
| --- | --- |
| App framework | React 19 |
| Language | TypeScript |
| Build tool | Vite |
| Canvas | Konva and React Konva |
| State and workspace domain | Zustand plus workspace domain classes |
| Optional persistence | Supabase client |
| Exports | Custom export service with image, SVG, PDF, DXF, and GEOS formats |
| Deployment | Static Vercel deployment |

### Project Structure

```text
apps/maya-web/        Vite React web app
packages/rl-core/     Shared command/data collection package
packages/adapters/    External adapter integrations
tools/                Repository scripts and checks
tests/                Workspace command tests
docs/screenshots/     Documentation screenshots
```

### Deployment To Vercel

Use the included `vercel.json` from the repository root.

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Install command | `npm install` |
| Build command | `npm run build` |
| Output directory | `apps/maya-web/dist` |

The app can deploy without environment variables. Add Supabase variables only when enabling auth or project persistence.

## Troubleshooting

| Problem | What To Try |
| --- | --- |
| App will not start | Run `npm install`, then `npm run dev` from the repository root. |
| Build fails | Run `npm run lint` and `npm run test` to isolate type, lint, or command issues. |
| Snapping feels slow | Disable unused snap types or reduce drawing complexity. Large drawings automatically disable expensive snapping. |
| Wall rendering looks simpler in a large drawing | The app may have entered Performance Mode to keep interaction smooth. |
| Export has the wrong area | Select the objects you need and choose selection scope, or adjust export padding. |
| Export lacks measurements | Enable the include measurements option in the export modal. |
| PNG/JPEG background is not expected | Check transparent background and background color options. JPEG does not preserve transparency. |
| Projects do not save | Confirm Supabase environment variables are configured and that the app has created or loaded a project. |
| Trace image moves accidentally | Lock it in the Trace Layers panel. |
| Keyboard shortcut does not work | Make sure focus is not inside an input field or text editor. |

