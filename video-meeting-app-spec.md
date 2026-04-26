# Video Meeting App — Full Build Spec

A private web-based video calling app for a small friend group, with real-time AI note-taking and end-of-call summaries. Everything is free to run. No account required — just enter your name and join.

---

## How It Works (Plain English)

1. Someone opens the app, types their name, and clicks "Create Meeting"
2. The app generates a unique room link to share with friends
3. Friends open the link, type their name, and join the video call
4. Before joining, everyone previews their camera and mic in a device test screen
5. During the call, each person's browser captures their own microphone audio every 3 seconds and sends it to Groq's Whisper API, which converts it to text
6. Because each person only sends their own audio, we already know who is speaking — no guessing needed
7. When the call ends, the full transcript is sent to Groq's Llama model to produce a polished summary with key points, decisions, action items, and homework
8. The summary appears on a dedicated page that can be copied or downloaded

---

## Stack

| Layer | Tool | Why |
|---|---|---|
| Framework | Next.js 14 (App Router) | Routing, API routes, server logic all in one place |
| Video | LiveKit Cloud + `@livekit/components-react` | Handles all WebRTC complexity, screen share built in |
| Transcription | Groq API — `whisper-large-v3-turbo` | Free, fast, accurate across Japanese and English |
| AI Summary | Groq API — `llama-3.3-70b-versatile` | Free, open-source, capable enough for meeting notes |
| Animations | Framer Motion | All UI transitions and motion |
| Styling | Tailwind CSS | Layout and base styles |
| QR Code | `qrcode.react` | Client-side QR generation from room URL |
| Room IDs | `nanoid` | Short, URL-safe unique room IDs |
| Deployment | Vercel | Free hosting, works perfectly with Next.js |

### Why Groq for everything

Groq runs open-source models (Whisper, Llama) on custom hardware they built. It is free with no credit card required. The free tier gives 2,000 transcription requests per day and generous LLM token limits — far more than a friend group will ever use. Their business is selling hardware to enterprises, so the free API exists as a long-term showcase and is not going away.

One `GROQ_API_KEY` handles both transcription and AI notes. No other AI service needed.

---

## Environment Variables

Create a `.env.local` file in the project root. Never hardcode any of these values in code.

```
NEXTAUTH_URL=             # your domain, e.g. https://yourapp.vercel.app

# LiveKit — from cloud.livekit.io dashboard
LIVEKIT_URL=              # starts with wss://
LIVEKIT_API_KEY=
LIVEKIT_API_SECRET=

# Groq — from console.groq.com (free, no credit card)
GROQ_API_KEY=
```

---

## File Structure

```
/app
  /page.tsx                          <- Landing page (name input, join/create)
  /room/[roomId]/page.tsx            <- Meeting room with device test + LiveKit
  /room/[roomId]/summary/page.tsx    <- Post-call summary

  /api
    /rooms/route.ts                  <- POST: create room
    /livekit/token/route.ts          <- POST: generate LiveKit JWT
    /transcription/route.ts          <- POST: audio chunk in, transcript text out
    /summary/route.ts                <- POST: full transcript in, structured summary out

/components
  /room
    VideoTile.tsx                    <- Round floating participant bubble
    ControlBar.tsx                   <- Mute, camera, screen share, leave
    ScreenSharePicker.tsx            <- Choose what to share
    DeviceTestModal.tsx              <- Camera/mic preview before joining
    LoadingScreen.tsx                <- While connecting
    ErrorScreen.tsx                  <- Camera denied, connection failed, etc.
  /AuthProvider.tsx                  <- (removed — no auth)

/lib
  /animations.ts                     <- Shared Framer Motion presets
  /groq.ts                           <- Groq client
  /livekit.ts                        <- LiveKit token generation
  /rooms.ts                          <- Room creation and lookup
```

---

## TypeScript Types

```ts
// /types/index.ts

export type TranscriptLine = {
  speaker: string       // display name of the participant who said this
  text: string
  timestamp: number     // milliseconds since call started
}

export type BulletPoint = {
  id: string
  speaker: string       // who triggered this point
  text: string
  timestamp: number
}

export type CallSummary = {
  title: string
  date: string
  duration: string
  participants: string[]
  keyPoints: string[]
  decisions: string[]
  actionItems: { person: string; task: string }[]
  homework: { person: string; task: string }[]
}

// Data channel message types (sent between participants via LiveKit)
export type DataChannelMessage =
  | { type: 'transcript'; speaker: string; text: string; ts: number }
  | { type: 'bullets'; bullets: BulletPoint[] }
  | { type: 'chat'; sender: string; text: string; ts: number }
```

---

## Pages

### Landing page (`/`)
- Centered layout: app name, "Enter your name" input, "Join Meeting" and "Create Meeting" buttons
- If user clicks Join/Create without typing a name: shake the input with a light red outline for 1 second
- "Join Meeting" opens a popup with meeting code input + Cancel/Join buttons
- "Create Meeting" opens a popup with a generated room link + copy button + Cancel/Start buttons
- Clicking Start calls `POST /api/rooms`, gets back `{ roomId }`, redirects to `/room/[roomId]?name=...`
- Clicking Join redirects to `/room/[roomId]?name=...`
- All elements animate in on mount with staggered Framer Motion fade-up

### Room page (`/room/[roomId]`)
- Reads `name` from query params
- Shows `DeviceTestModal` first — camera preview, mic level indicator, toggle buttons
- User clicks "Join meeting" to proceed
- Client-side: fetch LiveKit token from `/api/livekit/token` with `{ roomId, name }`
- Show `LoadingScreen` while fetching token and while LiveKit is connecting
- Show `ErrorScreen` if camera/mic is denied or connection fails
- Once connected: render floating round webcams
- On leave: send full transcript to `/api/summary`, store result in `sessionStorage`, navigate to `/room/[roomId]/summary`

### Summary page (`/room/[roomId]/summary`)
- Read summary from `sessionStorage` on mount, then immediately clear it
- If no data: show "No summary available" with a home button
- If data: render `SummaryPage`
- "Copy" button copies plain text version to clipboard
- "Download" button saves as `.txt` file

---

## Components

### VideoTile
- Renders a round floating bubble with participant initials
- Camera off: shows a frozen gray background with camera-off icon centered
- Mic off: no icon shown (clean design)
- Camera + mic off: both icons centered side by side
- Speaking indicator: bubble scales up 1.12x with blue glow ring
- Name tag below the bubble
- Gentle floating drift animation (cloud-like movement)

### ControlBar
- Fixed to bottom center of the screen
- Icon-only buttons in a floating rounded pill: Mute, Camera, Screen Share, Chat, Notes, Leave
- Each button: `whileTap={{ scale: 0.93 }}` for click feedback
- Mute and camera toggle local participant tracks
- Screen share: opens picker, then switches to Keynote layout
- Leave: red button with confirmation popup

### DeviceTestModal
- Shows before joining any meeting
- Camera preview in a rounded rectangle
- Real-time mic level bar
- Toggle buttons for mic and camera
- "Join meeting" button to proceed
- If permissions denied: shows error with "Join anyway" option

### ScreenSharePicker
- Google Meet-style modal
- Tabs: "Your entire screen", "A window", "A tab"
- Thumbnail placeholders for each option
- "Share tab audio" checkbox
- Cancel and Share buttons

---

## Screen Share Layout (Keynote Mode)
- Shared screen centered in the viewport
- Webcams arranged around the screen like sitting around a table:
  - Top row: first half of participants
  - Bottom row: remaining participants
- Smaller webcam bubbles (130px)
- Subtle drift animation continues
- "Exit presentation" button in top-right
- Light gray/white theme (no dark background)

---

## API Routes

### `POST /api/livekit/token`

```
Request:  { roomId: string, name: string }
Response: { token: string }
```

- Use `AccessToken` from `livekit-server-sdk`
- Set: participant identity = name, participant name = name, TTL = 4 hours
- Grant: `roomJoin`
- Return the signed token string

### `POST /api/rooms`

```
Request:  (empty)
Response: { roomId: string }
```

- Generate `roomId` with `nanoid(10)`
- Store `{ roomId, createdBy: "anonymous", createdAt: Date.now() }` in `/tmp/rooms.json`
- Return `{ roomId }`

### `POST /api/transcription`

```
Request:  FormData — audio (Blob, webm/opus), speaker (string)
Response: { text: string | null }
```

- Send audio to Groq transcription endpoint
- Model: `whisper-large-v3-turbo`
- Set `response_format: 'verbose_json'` to get confidence data
- If text is empty or `avg_logprob` very low: return `{ text: null }`
- Do not throw on Groq errors — catch and return `{ text: null }`

### `POST /api/summary`

```
Request:  { transcript: TranscriptLine[], participants: string[], duration: string }
Response: CallSummary object
```

- Call Groq chat completions with model `llama-3.3-70b-versatile`
- System prompt extracts title, keyPoints, decisions, actionItems, homework
- Return parsed JSON object
- On parse failure: return fallback with empty arrays

---

## Animations

Install: `npm install framer-motion`

Define all presets in `/lib/animations.ts` and import from there everywhere. Never define one-off animation values inline.

```ts
import { Variants, Transition } from 'framer-motion'

export const fadeUp: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: 8 },
}
export const fadeUpTransition: Transition = {
  duration: 0.3,
  ease: [0.25, 0.46, 0.45, 0.94],
}

export const slideFromRight: Variants = {
  initial: { x: '100%', opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit:    { x: '100%', opacity: 0 },
}
export const slideFromRightTransition: Transition = {
  type: 'spring', stiffness: 300, damping: 30,
}

export const slideFromLeft: Variants = {
  initial: { x: -20, opacity: 0 },
  animate: { x: 0, opacity: 1 },
}
export const slideFromLeftTransition: Transition = {
  type: 'spring', stiffness: 400, damping: 28,
}

export const scaleIn: Variants = {
  initial: { scale: 0.95, opacity: 0 },
  animate: { scale: 1, opacity: 1 },
  exit:    { scale: 0.97, opacity: 0 },
}
export const scaleInTransition: Transition = {
  duration: 0.25,
  ease: [0.25, 0.46, 0.45, 0.94],
}

export const staggerContainer: Variants = {
  animate: {
    transition: { staggerChildren: 0.07 },
  },
}
```

Where each preset is used:

| Component | Animation |
|---|---|
| Landing page elements | `staggerContainer` + `fadeUp` on mount |
| Sign-in card | `scaleIn` |
| `VideoTile` entering/leaving | `AnimatePresence` + `fadeUp` + `layout` prop |
| `VideoTile` speaking border | Framer Motion `animate` on `boxShadow` |
| `NotebookPanel`, `ChatPanel` | `AnimatePresence` + `slideFromRight` |
| Each `BulletPoint` | `slideFromLeft` with stagger from parent |
| `SummaryPage` card | `scaleIn` |
| `SummaryPage` sections | `staggerContainer` + `fadeUp` |
| `LoadingScreen` dots | Staggered opacity pulse |
| All buttons | `whileTap={{ scale: 0.93 }}` |
| Name input error | Shake `x: [-8, 8, -8, 8, -4, 4, 0]` + red border |

---

## Error Handling

| Scenario | What to do |
|---|---|
| Camera or mic permission denied | Show `ErrorScreen`: "Please allow camera and microphone access in your browser settings" |
| Screen share picker cancelled by user | Do nothing. Do not show an error. Do not log to console. |
| LiveKit drops connection mid-call | Show a non-blocking "Reconnecting..." banner. Dismiss it automatically when LiveKit reconnects. |
| `/api/transcription` fails or returns null | Log silently. Skip this 3-second chunk. The call continues normally. |
| `/api/summary` fails | On the summary page, show "Summary could not be generated" and display the raw transcript as a readable fallback. |
| LiveKit token fetch fails | Show `ErrorScreen` with a "Try again" button that retries the token fetch. |
| User opens a room that has no entry in your DB | Create the room entry on the fly. LiveKit creates rooms automatically on first join, so this is safe. |
| User navigates to summary page directly with no session data | Show "No summary available" with a button to go home. |

---

## Build Order

Test each step independently before moving to the next one. Do not proceed if the current step has unresolved bugs.

1. Next.js project scaffolded — Tailwind, Framer Motion, and `nanoid` installed — blank page deploys to Vercel successfully
2. Landing page — clicking "Create Meeting" generates a roomId and redirects to the room URL with name param
3. Device test modal — camera preview and mic level visible before joining
4. `/api/livekit/token` — returns a valid token (verify with curl or Postman)
5. Room page — basic video call works, camera and audio are live
6. ControlBar — mute, camera toggle, screen share, and leave all work correctly
7. `TranscriptCapture` + `/api/transcription` — spoken audio comes back as text from Groq Whisper
8. `/api/summary` + SummaryPage — summary generates and displays correctly after leaving a call
9. Animation pass — apply all Framer Motion presets across every component
10. Error handling pass — manually test every scenario in the error table above

---

## Critical Rules for the AI Building This

- `LIVEKIT_API_SECRET` and `GROQ_API_KEY` must only ever be used in `/api/` route files. Never import them in any component. Next.js will throw a build error if you try — this is intentional.
- `TranscriptCapture` must only initialize `MediaRecorder` after confirming `room.state === 'connected'`. Check this before starting.
- `MediaRecorder` must use `{ mimeType: 'audio/webm;codecs=opus' }`. This is what Groq Whisper expects.
- Call `mediaRecorder.stop()` before unmounting `TranscriptCapture` so the final audio chunk is flushed and sent.
- Store the 45-second interval ID in a `useRef`, not `useState`, to avoid stale closure bugs where the interval captures an outdated version of the transcript state.
- `AnimatePresence` requires every animated child to have a unique stable `key` prop. Use `participant.identity` for video tiles and `bullet.id` for bullet points. Never use array index as a key.
- Keep the full transcript in React state during the call. Only write to `sessionStorage` once, at call end, for the summary page to read. The summary page must clear `sessionStorage` immediately on mount.
- When receiving LiveKit data channel messages, always check the `type` field before processing. Silently ignore messages with unknown types.
- The screen share cancel case is not an error. When `setScreenShareEnabled(true)` rejects because the user dismissed the picker, catch the rejection and do nothing. Do not surface it to the user.
- Groq's API is fully OpenAI-compatible. Use the `groq-sdk` npm package or call the API directly with `fetch`. The base URL is `https://api.groq.com/openai/v1`.
