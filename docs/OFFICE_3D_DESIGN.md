# 2.5D Isometric Office — Design & Work Tracking

## Overview

Replace the existing SVG `OfficeRoom` with a **Three.js 2.5D isometric office** scene embedded in the Stage dashboard. Single floor, cyberpunk aesthetic matching the existing Catppuccin Mocha dark theme.

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Renderer | Three.js (WebGL) | User requirement; MIT licensed; best for 2.5D/3D |
| React binding | `@react-three/fiber` + `@react-three/drei` | Mature R3F ecosystem; composable with existing React components |
| Camera | Fixed isometric (orthographic) | Clean 2.5D perspective, no rotation needed |
| Agent representation | Flat billboarded sprites in 3D space | Easy to swap with real art later; CSS-canvas generated placeholders |
| Interactivity | Full interactive | Click everything, drag agents, panels for all props |
| Replaces | Existing `OfficeRoom.tsx` (SVG) | Direct replacement in `view === 'office'` |

## Visual Design

### Color Palette (Catppuccin Mocha)
- Background: `#11111b` (crust)
- Floor: `#1e1e2e` (base) with grid lines `#313244` (surface0)
- Walls: `#181825` (mantle)
- Furniture: `#313244` (surface0) / `#45475a` (surface1)
- Accent glow: Per-agent colors from `AGENTS` config
- Ambient: Warm dim `#f9e2af` (yellow) ceiling lights

### Scene Layout (Single Floor — "The Office")

```
+------------------------------------------------------------------+
|  [Window]   [Poster]   [Clock]   [Whiteboard/OPS]   [Server Rack]|  ← Back Wall
|                                                                    |
|  [Chora]    [Subrosa]  [Thaum]   [Primus]   [Mux]   [Praxis]    |  ← Agent Desks
|  [Desk+PC]  [Desk+PC]  [Desk+PC] [Desk+PC]  [Desk+PC][Desk+PC]  |
|                                                                    |
|  [Plant]              [Plant]          [Coffee Machine]            |  ← Props
|                                                                    |
+------------------------------------------------------------------+
                              Floor (grid pattern)
```

### Isometric View
- Camera: OrthographicCamera at 45° azimuth, ~35° elevation
- Scene size: ~20×12 units (width × depth)
- Y-axis is height (vertical)

### Agent Sprites
- Generated via HTML Canvas → texture at runtime
- 32×48 pixel sprites with:
  - Agent-colored body/outfit
  - Skin-tone head
  - Eyes, hair accent
  - Name label below
- Billboarded (always face camera)
- Animation: bob on idle, walk cycle offset

### Interactive Elements
- **Desks**: Click → Agent detail panel (profile, current mission, recent events)
- **Whiteboard**: Click → Full ops dashboard overlay (events, missions, conversations, memories)
- **Coffee Machine**: Click → Shows "break room" stats / agent activity summary
- **Server Rack**: Click → System health panel (connection status, API latency)
- **Agents**: Click → Agent panel; Drag → Move agent position
- **Plants/Window/Clock**: Decorative, hover tooltip

### Overlay Panels (HTML/React)
- Floating panels positioned via CSS `position: absolute` over the canvas
- Match existing zinc-800/900 card styling
- Close button + click-outside-to-dismiss

## Architecture

```
src/app/stage/
├── OfficeRoom.tsx          ← REPLACED (backup as OfficeRoom.svg.tsx)
├── office3d/
│   ├── Office3DScene.tsx   ← Main R3F Canvas component
│   ├── OfficeFloor.tsx     ← Floor geometry + grid
│   ├── OfficeWalls.tsx     ← Back wall + side walls + window
│   ├── OfficeFurniture.tsx ← Desks, monitors, chairs, rack, plants, coffee
│   ├── OfficeWhiteboard.tsx← Whiteboard with live data texture
│   ├── OfficeLighting.tsx  ← Ceiling lights, ambient, glow
│   ├── AgentSprite.tsx     ← Billboarded agent with canvas texture
│   ├── AgentManager.tsx    ← State machine, movement, behavior derivation
│   ├── InteractionManager.tsx ← Raycasting, click/drag handlers
│   ├── OverlayPanels.tsx   ← HTML panels for agent/prop detail views
│   ├── useOfficeState.ts   ← Combined hook: agents, stats, events
│   └── constants.ts        ← Colors, positions, dimensions
```

## Data Flow

```
useSystemStats() ──→ Whiteboard texture
useEvents()      ──→ Agent behavior derivation + speech bubbles
useMissions()    ──→ Agent "working" state
useConversations()─→ Agent "chatting" state + speech content
useMemories()    ──→ Agent detail panel
```

## Work Tracking

### Phase 1: Foundation ✅→🔄
- [ ] Install three.js + @react-three/fiber + @react-three/drei
- [ ] Create office3d/ directory structure
- [ ] Create Office3DScene with OrthographicCamera
- [ ] Create OfficeFloor (plane + grid)
- [ ] Create OfficeWalls (back wall + window)
- [ ] Create OfficeLighting (ambient + ceiling spots)
- [ ] Wire into page.tsx replacing OfficeRoom

### Phase 2: Furniture & Props
- [ ] Create desk geometry (6 desks with monitors)
- [ ] Create coffee machine
- [ ] Create server rack with blinking LEDs
- [ ] Create plants (simple low-poly)
- [ ] Create wall clock
- [ ] Create poster ("SUBCORP / AUTONOMY THROUGH ALIGNMENT")
- [ ] Create whiteboard with live data texture

### Phase 3: Agents
- [ ] Canvas-based sprite texture generator
- [ ] AgentSprite component (billboarded)
- [ ] Agent behavior state machine (idle/walk/work/chat/coffee/celebrate)
- [ ] Movement interpolation (smooth walking to targets)
- [ ] Speech bubble rendering (3D or HTML overlay)
- [ ] Agent dragging support

### Phase 4: Interactivity
- [ ] Raycasting click detection on all objects
- [ ] Agent detail panel (profile, missions, events)
- [ ] Desk click → agent info
- [ ] Whiteboard click → ops dashboard overlay
- [ ] Coffee machine click → activity summary
- [ ] Server rack click → system health
- [ ] Hover tooltips for decorative items
- [ ] Click-outside-to-dismiss panels

### Phase 5: Polish
- [ ] Time-of-day sky colors (day/dusk/night)
- [ ] Ambient particle effects
- [ ] Monitor screen glow
- [ ] Status bar below canvas (agent states, session info)
- [ ] Performance optimization (instancing, texture atlases)
- [ ] Responsive sizing

## Agent Desk Assignments (Isometric Grid)

| Agent | Grid Position | Desk X | Desk Z | Color |
|-------|--------------|--------|--------|-------|
| Chora | 0 | -7.5 | 0 | #b4befe |
| Subrosa | 1 | -4.5 | 0 | #f38ba8 |
| Thaum | 2 | -1.5 | 0 | #cba6f7 |
| Primus | 3 | 1.5 | 0 | #f5c2e7 |
| Mux | 4 | 4.5 | 0 | #74c7ec |
| Praxis | 5 | 7.5 | 0 | #a6e3a1 |

## Dependencies to Install

```bash
npm install three @react-three/fiber @react-three/drei @types/three
```
