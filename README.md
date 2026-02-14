# Virtual Video Chat Simulator

A web app that simulates a real-time conversation with a virtual anime character using pre-recorded videos and browser-native speech recognition. Engineered for seamless, zero-black-frame video transitions through a dual-buffer preloading strategy.

---

## Demo

> 📹 Screen recording: https://youtu.be/x5UI4-vsQWs
> 🌐 Live demo: _[Add link here]_

---

## Tech Stack

| Technology | Why It Was Chosen |
|---|---|
| **React + TypeScript** | Predictable state management via hooks and compile-time safety across the video/speech state machine |
| **Tailwind CSS** | Utility-first styling enables rapid, consistent responsive UI without a separate CSS layer |
| **Native HTML5 `<video>`** | Full, low-level control over preloading, playback, and `onended` events — no third-party player overhead |
| **Web Speech API** | Built-in browser speech recognition requires no backend, no API keys, and no network latency |
| **React `useRef` + Callback Pattern** | Exposes imperative `play(key)` control from parent (`App`) to child (`VideoStage`) without re-renders or global state |
| **Docker + Docker Compose** | Eliminates "works on my machine" issues by containerising the Node environment; Compose adds a volume mount for live HMR reloads during development |

---

## Setup

> **Browser requirement:** Works best in **Chrome** or **Edge** — the Web Speech API is not supported in Firefox or Safari.

Place your `.mp4` video files inside `/public/videos/` with the following names before starting via either method:

```
idle.mp4
greeting.mp4
listening.mp4
weather.mp4
general.mp4
goodbye.mp4
fallback.mp4
easter_egg.mp4
```

### Option 1 — Docker Compose (recommended)

No local Node.js installation required. The container runs Vite with `--host` so it is reachable on `localhost:5173`, and the project directory is bind-mounted so **hot module replacement works exactly as it would locally** — saving a file in your editor is reflected in the browser instantly.

```bash
git clone https://github.com/yourname/video-chat-simulator
cd video-chat-simulator
docker compose up
```

Then open [http://localhost:5173](http://localhost:5173).

To stop:

```bash
docker compose down
```

**How it works under the hood:**

The `Dockerfile` uses `node:20-alpine` as a minimal base, copies `package*.json` first (so the `npm install` layer is cached on subsequent builds unless dependencies change), then copies the rest of the source. `node_modules` is declared as an anonymous volume in `docker-compose.yml` so the host directory never shadows the container-installed modules — a common gotcha with bind mounts.

```
services:
  frontend:
    build: ./
    container_name: video-chat-dev
    volumes:
      - .:/app            # bind mount for live HMR
      - /app/node_modules # anonymous volume keeps container's node_modules intact
    ports:
      - "5173:5173"
```

### Option 2 — Local Node.js

Requires Node.js 20+.

```bash
git clone https://github.com/yourname/video-chat-simulator
cd video-chat-simulator
npm install
npm run dev
```

---

## User Flow

1. **Page loads** → `idle` video loops continuously
2. **User clicks "Start Chat"** → state transitions to `greeting`
3. **Greeting video plays** → on end, transitions to `listening`
4. **Listening video loops + microphone activates** → user speaks
5. **Keyword detected** → appropriate response video is selected
6. **Response video plays** → on end, returns to `listening`
7. **User says "bye" / "goodbye"** → `goodbye` video plays → returns to `idle`

---

## State Machine Architecture

```
idle → greeting → listening → response → listening → … → goodbye → idle
```

The entire app is driven by a central state machine (`ChatState`) defined in `types.ts`:

```ts
type ChatState = "idle" | "greeting" | "listening" | "response" | "goodbye";
```

**Why a state machine?**
Without a state machine, concurrent mic events and video `onended` callbacks create race conditions — for example, speech recognition firing while a goodbye video is still playing. A single `state` variable guarantees that only one action can be in flight at a time.

**How transitions work:**
- `App.tsx` owns `state` via `useState<ChatState>`.
- Video `onended` events call `onVideoEnd()`, which inspects the current state and dispatches the next one.
- Speech results call `handleSpeech()`, which maps keywords to `setState(...)` calls.
- `VideoStage` reacts to `state` changes via `useEffect` and calls the internal `play(key)` imperative — it never mutates state itself.

This separation ensures **deterministic, one-directional data flow**: state changes drive video, never the other way around.

---

## Seamless Video Playback Strategy

Avoiding black frames between transitions was the primary engineering challenge. The solution uses a **preload-all + opacity-swap** technique:

**How it works:**

1. **All video elements are mounted in the DOM simultaneously** inside `VideoStage`. Every `VideoKey` (`idle`, `greeting`, `listening`, `weather`, `general`, `goodbye`, `fallback`, `easter_egg`) has a corresponding `<video>` element rendered at all times, stacked absolutely on top of each other.

2. **`preload="auto"` is set on every element.** The browser begins buffering all videos the moment the component mounts — before the user even clicks "Start Chat". By the time any transition occurs, the next video is already in memory.

3. **Visibility is controlled via CSS `opacity`**, not DOM mounting/unmounting. All videos sit at `opacity: 0`. The active video is set to `opacity: 1`. A `transition-opacity duration-200` provides a soft 200ms crossfade with no blank frame.

4. **On every `play(key)` call**, all videos are paused and reset to `currentTime = 0`, then only the target video becomes visible and plays. This guarantees clean transitions even if called mid-playback.

```ts
// VideoStage.tsx — core swap logic
allRefs.forEach((ref) => {
    ref.current.pause();
    ref.current.currentTime = 0;
    ref.current.style.opacity = "0";
});
const target = refs[key].current;
target.style.opacity = "1";
target.play();
```

**Result:** Zero re-renders, zero src-swapping, zero black frames — even on slower connections, because all assets are preloaded upfront.

---

## Speech Recognition Implementation

Speech is handled by a custom hook `useSpeech.ts` wrapping the browser's native `SpeechRecognition` API (with `webkitSpeechRecognition` fallback for Chrome).

**Configuration:**
- `lang: "en-US"`
- `interimResults: false` — only fires after the user stops speaking
- `continuous: false` — single-shot per listening cycle; restarted after each response

**Lifecycle:**
1. `start()` is called when state enters `"listening"`
2. Browser requests microphone permission on first use
3. `onresult` fires with the final transcript → lowercased → passed to `handleSpeech()`
4. `stop()` is called at the start of `playResponse()` before state changes to `"response"`
5. Recognition restarts when the response video ends and state returns to `"listening"`

**Error handling:**
- Any `onerror` event (permission denied, no speech, network error) emits the sentinel value `"__error__"`, which triggers the `fallback` response video — the user always sees a reaction rather than a silent freeze.

---

## Keyword Matching

Keywords are matched case-insensitively against the lowercased transcript using simple `String.includes()` checks. Priority is top-to-bottom:

| Keywords | Response |
|---|---|
| `"bye"`, `"goodbye"` | Ends conversation → `goodbye` state |
| `"hello"`, `"hi"` | Plays `general` response video |
| `"weather"`, `"today"` | Plays `weather` response video |
| `"task"`, `"easter egg"` | Plays `easter_egg` response video |
| _(anything else)_ | Plays `fallback` response video |

**Fallback behavior:** If no keyword matches — or if speech recognition errors — the `general` or `fallback` video plays, ensuring the character always responds. The conversation never gets stuck in silence.

---

## Implemented Features

- ✅ Seamless zero-black-frame video transitions
- ✅ State machine architecture with deterministic transitions
- ✅ Browser-native speech recognition (no backend required)
- ✅ Keyword detection with priority ordering
- ✅ Fallback response on recognition errors
- ✅ Full video preloading on app start
- ✅ Transcript display in UI
- ✅ Looping idle and listening videos
- ✅ Responsive, accessible UI
- ✅ Dockerised development environment with HMR support

---

## Stretch Goals

- ✅ Error fallback (speech recognition failure handled gracefully)
- ✅ Easter egg keyword trigger (`"task"` / `"easter egg"`)
- ⬜ Silence/timeout detection (e.g. auto-fallback after 10s of no speech)
- ⬜ Microphone level visualizer
- ⬜ Mobile optimization

---

## Challenges & Solutions

**1. Black frames between video transitions**
Every approach that involved swapping `src` attributes or unmounting/remounting video elements produced a visible blank frame while the browser fetched and decoded the new source. The solution was to mount all video elements simultaneously with `preload="auto"`, buffer everything upfront, and swap only `opacity` — keeping decode pipelines warm and avoiding any re-fetch.

**2. SpeechRecognition stopping unexpectedly**
The Web Speech API's `continuous: false` mode terminates after the first result. Rather than fighting this, the design embraces it: recognition is intentionally single-shot and explicitly restarted after each response video ends, keeping the mic lifecycle tightly coupled to the state machine.

**3. Race conditions between mic and video state**
With async mic events and async video `onended` callbacks both capable of triggering state changes, race conditions were a real risk. The central `ChatState` machine resolves this: `handleSpeech` checks `state` before acting, `onVideoEnd` only transitions from expected states, and `stop()` is always called before any state transition away from `"listening"`.

**4. Exposing imperative video control across the component boundary**
`VideoStage` owns the video refs, but `App` needs to trigger specific response videos by key. Rather than lifting all refs to `App` or using global state, a `MutableRefObject<(key: VideoKey) => void>` is passed down as `onPlayRef`, and `VideoStage` assigns its `play` callback to it via `useEffect`. This keeps video logic encapsulated while giving `App` clean imperative access.

---

## Known Limitations

- Web Speech API is only reliably supported in Chrome and Edge; Firefox and Safari are unsupported
- No multi-language support (hardcoded to `en-US`)
- Mobile Safari does not support `SpeechRecognition`
- Keyword matching is string-based; it cannot understand intent or handle paraphrasing

---

## Future Improvements

- Replace keyword matching with an LLM (e.g. Claude API) for natural language understanding
- Streaming speech-to-text via Deepgram or AssemblyAI for lower latency
- Emotion detection from audio tone to select more contextually appropriate responses
- WebRTC-based real-time avatar rendering to replace pre-recorded video clips
- Multi-language support via `recognition.lang` configuration
- Silence detection with a countdown timer to auto-trigger fallback after ~10 seconds of no speech# virtual-anime-chat
