# 🎬 DevTok

> A TikTok/Reels-style short video platform for developers. Dark terminal aesthetic. Pure HTML + CSS + Vanilla JS.

---

## 📁 Project Structure

```
DevTok/
├── index.html        — App shell & layout
├── style.css         — Dark theme, animations, responsive
├── script.js         — Video logic, interactions, state
├── videos/
│   ├── video1.mp4    ← Drop your videos here
│   ├── video2.mp4
│   └── ...
└── README.md
```

---

## 🚀 Quick Start

1. Drop `.mp4` files into the `/videos/` folder
2. Edit the `VIDEO_DATA` array in `script.js` to register them
3. Open `index.html` in a browser (use a local server for video loading)

```bash
# Recommended: use a simple local server
npx serve .
# or
python3 -m http.server 8080
```

---

## ✨ Features

| Feature | Details |
|---|---|
| Vertical scroll snapping | CSS `scroll-snap-type: y mandatory` |
| Auto play / pause | IntersectionObserver + scroll events |
| Double tap to like | Touch & click double-tap detection |
| Like / Save / Share / Comment | Full interaction with animated state |
| Progress bar | Per-video `timeupdate` tracking |
| Mute / unmute | Per-video + global state |
| Keyboard navigation | ↑↓ / J K / Space / M / L |
| Comment drawer | Slide-up panel, add comments |
| Lazy loading | `preload="none"` → load on demand |
| Graceful fallback | Placeholder if video file is missing |
| Responsive | Mobile-first, sidebar hidden on small screens |

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `↑` / `K` | Previous video |
| `↓` / `J` | Next video |
| `Space` | Play / Pause |
| `M` | Mute / Unmute |
| `L` | Like |

---

## 🔧 Extending with a Backend

`VIDEO_DATA` in `script.js` is designed to be a drop-in replacement for a fetch call:

```js
// Replace the static array with:
const VIDEO_DATA = await fetch('/api/videos').then(r => r.json());
```

---

## 🎨 Customization

All design tokens live at the top of `style.css`:

```css
:root {
  --accent:   #6EE7B7;  /* neon mint */
  --accent2:  #818CF8;  /* soft indigo */
  --accent3:  #F472B6;  /* hot pink */
  --bg:       #0A0A0F;
  ...
}
```
