# AugmentedWorkSpace

A Snap Spectacles lens that turns your desk into a multi-monitor setup. You outline your workspace with a resizable **measurement frame**, confirm it, and three virtual panels (left, right and top) appear around it, sized and anchored to match. That gives you extra "monitors" in AR without any extra hardware.

> **Status: work in progress.** The frame system (resizing, measurement, and placing panels in the world) works. The widgets that go inside the panels are still in development.

<!-- TODO: add a demo GIF or screenshot here -->
<!-- ![Demo](docs/demo.gif) -->

## How it works

```
                ┌───────────────────────┐
                │       Top panel       │
                └───────────────────────┘
   ┌─────────┐  ┌───────────────────────┐  ┌─────────┐
   │  Left   │  │   Your workspace      │  │  Right  │
   │  panel  │  │ (measurement frame)   │  │  panel  │
   └─────────┘  └───────────────────────┘  └─────────┘
```

1. **Measure.** A measurement frame appears attached to the menu. Grab and move it to where you want it. Once it moves more than a small threshold, it detaches from the menu and stays fixed in the world.
2. **Resize.** Drag any edge handle to resize the frame along that axis. The opposite edge stays fixed while you drag, so it behaves like resizing a window on a desktop.
3. **Confirm.** The frame's size and position are saved, the menu and measurement frame are hidden, and the left, right and top panels are created around that area.
4. **Edit.** An edit toggle turns the resize handles on the side panels on and off, so you can adjust them after they're placed.
5. **Reset.** Brings the measurement frame back to the menu at its default size so you can start over.

## The frame math

### Resizing from one edge (`ResizeFrame.ts`)

When you grab an edge:

- The **opposite edge is locked** as a world-space anchor point.
- The drag axis is the frame's local up or right vector, converted to world space and flipped for the bottom and left edges.
- On every update, the hand's planecast point is projected onto that axis: `dot(hand − anchor, axis)`. The change since the grab started becomes the change in width or height, scaled by a per-axis sensitivity and clamped to a minimum size.
- The frame is then **re-centered** at `anchor + axis × (newSize / 2)`, which is why only the grabbed edge moves.

After each resize, the handles, the background and the four border strips are repositioned and rescaled in world space to match the frame's new total size. Handles can be enabled or disabled per edge, both visually and for interaction.

### Building the panels (`HudCreation.ts`)

Each panel's size is a **ratio of the measurement frame's total size**. By default:

| Panel | Width | Height |
|---|---|---|
| Left / Right | 0.5 × measurement | 1.0 × measurement |
| Top | 1.0 × measurement | 0.5 × measurement |

The UI Kit `Frame` component separates `innerSize` from `totalSize`, which includes padding. So the target total size is converted back to an inner size by subtracting each frame's padding. Panels are placed edge to edge with the measurement frame, with configurable gaps (`gapX`, `gapY`) and an optional depth offset. Everything is placed in the world anchor's local space, so the whole layout stays together.

Placement runs over two delayed callbacks: the first sets sizes and positions, and the second calls `forceRefresh()` on each panel's resize script. That way the handles and borders snap to the final layout, not an in-between one.

## Project structure

```
Assets/
  Scripts/
    PointManager.ts      # Measurement flow: attach/detach, reset, confirm
    ResizeFrame.ts       # Edge-drag resizing + handle/border layout
    HudCreation.ts       # Builds and places the left/right/top panels
    WidgetController.ts  # Edit-mode toggle; widget hosting (WIP)
    GPTWidget.ts         # ChatGPT widget prototype (WIP)
  ResizableFrame.prefab  # Reusable resizable frame
  Scene.scene
```

## Built with

- [Lens Studio](https://ar.snap.com/lens-studio) 5.15 + TypeScript
- Snap Spectacles
- Spectacles Interaction Kit (hand interaction, `Interactable`)
- Spectacles UI Kit (`Frame`, buttons)

## Running it

1. Clone the repo and open `AugmentedWorkSpace.esproj` in Lens Studio 5.15 or later.
2. Preview it in Lens Studio's Spectacles preview, or push it to a paired pair of Spectacles.
3. Move and resize the measurement frame, then press **Confirm**.

## Roadmap

- [x] Resizable frames with per-edge handles
- [x] Measurement → world-locked workspace
- [x] Auto-generated left/right/top panels
- [ ] Widgets inside the panels (AI assistant via ChatGPT, more planned)
- [ ] Moving widgets between panels
- [ ] Saving the workspace layout between sessions
