# Cosmic Atlas AI

**Cosmic Atlas AI** transforms an existing high-detail Three.js universe into an adaptive astronomy learning environment. A student asks a natural-language question, the guide selects the most educational object or sequence, the existing camera flies there, and an interactive lesson explains why that destination matters before checking understanding.

This project preserves the original Cosmic Atlas v4.5 renderer and extends it rather than replacing it.

## Education-track experience

- **Ask Cosmic Atlas:** natural-language astronomy questions become structured camera actions.
- **Why am I here? context engine:** every destination explains why it is the best visual evidence for the concept.
- **Guided visual journeys:** processes such as stellar evolution become multi-stop tours.
- **Adaptive learning levels:** Elementary, Middle School, High School, AP Astronomy, College, and Advanced.
- **Misconception correction:** the guide corrects ideas using visual evidence, such as the claim that Pluto left the Solar System.
- **Comparison mode:** side-by-side object properties with camera navigation.
- **Adaptive quiz feedback:** wrong answers receive an explanation and a simpler reframing question.
- **Progress and badges:** explored objects, quiz performance, favorites, galaxies, and object categories are saved locally.
- **Teacher mode:** creates classroom objectives, an ordered visual sequence, discussion questions, and an exit ticket.
- **Presentation mode:** reduces interface clutter and enlarges lesson content for projectors.
- **Offline demonstration:** opening `index.html` directly still supports the full demo flow using a deterministic local lesson planner.
- **Server-side GPT-5.6 mode:** when run with the Node server, the frontend calls `/api/ask`; the API key never enters the browser.

## Preserved Cosmic Atlas systems

The original architecture remains intact, including:

- Three.js WebGL rendering
- Procedural planet and rock textures
- Earth clouds and atmospheric limb
- Jupiter bands and Great Red Spot
- Saturn and Uranus rings
- Multi-scale Solar System, nearby-star, Milky Way, Local Group, cluster, and all-universe presets
- Search and keyboard navigation
- Category filters
- Inspector and NASA links
- Hover labels and selection rings
- Single-click selection and double-click fly-to
- Orbit, pan, zoom, touch, WASD, Q/E, Shift boost, and free-fly controls
- Timeline, orbital simulation, planet rotation, screenshots, fullscreen, performance mode, and telemetry
- Existing object catalog and spreadsheet adapter

## Visual upgrades in this build

- Four permanent camera-centered background star layers:
  - 34,000 microstars
  - 8,200 medium stars
  - 470 hero stars
  - 980 subtle parallax stars
- Round shader-rendered points instead of square particles
- A procedural equirectangular Milky Way sky dome with warped stellar clouds and dust lanes
- Performance-mode draw-range reductions
- Instanced 3D asteroid and Kuiper Belt rocks using five irregular geometry families
- Deterministic belt clumps, gaps, inclinations, eccentricities, and varied rocky/icy palettes
- Unique object-seeded nebula textures with normal and additive gas layers
- More structured star clusters and varied galaxy morphology
- More restrained stellar color and glow behavior

## Catalog data

The supplied workbook was processed into `catalog.generated.json`.

| Section | Rows |
|---|---:|
| Milky Way structures | 132 |
| Nearby galaxies | 40 |
| Internal galaxy features | 600 |
| Groups and clusters | 26 |
| **Total** | **798** |

The backend searches all 798 rows for educational evidence. To protect frame rate and finish the highest-impact hackathon experience first, this iteration navigates the existing rendered universe plus the new Stephenson 2-18 target. The next dataset phase will lazy-render each host galaxy’s 15 internal features only when the user enters that galaxy.

## Quick start: no API

1. Open `index.html` in a modern browser with an internet connection for the Three.js CDN.
2. Select **Ask Cosmic Atlas**.
3. Try:
   - `What is the biggest star known?`
   - `Where are stars born?`
   - `How do stars die?`
   - `What galaxy will collide with ours?`
   - `Take me somewhere life might exist.`
   - `Compare Earth and Mars.`

The page automatically uses its local structured lesson planner when `/api/ask` is unavailable.

## Quick start: GPT-5.6 backend

Requirements: Node.js 20+ and an OpenAI API key with access to the selected model.

```bash
npm install
cp .env.example .env
# Add OPENAI_API_KEY to .env
npm start
```

Open `http://localhost:3000`.

The default model is `gpt-5.6`, which routes to GPT-5.6 Sol. Change `OPENAI_MODEL` in `.env` when another approved GPT-5.6 tier is preferred.

## AI request flow

```text
Student question
      │
      ▼
Browser sends POST /api/ask
(no API key in frontend)
      │
      ▼
Server retrieves relevant evidence
from the 798-row astronomy catalog
      │
      ▼
GPT-5.6 Responses API
with strict JSON Schema
      │
      ▼
Structured lesson action
focus / tour / compare / correction / teacher lesson
      │
      ▼
Existing Cosmic Atlas functions execute
flyToObject() → selectObject() → inspector → quiz
```

## Structured action example

```json
{
  "action": "focus_object",
  "objectId": "stephenson-2-18",
  "objectIds": [],
  "compareIds": [],
  "learningLevel": "highschool",
  "lesson": {
    "title": "What does ‘biggest star’ mean?",
    "summary": "The ranking depends on uncertain radius estimates.",
    "whySelected": "This target shows why scientific measurement definitions matter.",
    "teachingApproach": "Build a causal model from evidence and uncertainty.",
    "uncertainty": "Distance, dust, temperature, and atmospheric boundaries affect the estimate.",
    "quiz": {
      "question": "Why can the title change?",
      "options": ["..."],
      "answer": 0,
      "explanation": "...",
      "easierQuestion": "..."
    },
    "next": ["Compare it with the Sun"]
  },
  "teacher": null
}
```

## Safety and accuracy design

- The model is constrained to rendered object IDs.
- The server validates IDs before returning a plan.
- Astronomy uncertainty must be stated when relevant.
- “Habitable” is separated from “inhabited.”
- The guide does not claim that a candidate record holder has an uncontested title.
- Source URLs from the workbook are retrieved as evidence for the model.
- The local demo uses prewritten, uncertainty-aware lessons for the primary judging flow.

## Build Week documentation

The official OpenAI Build Week pages require a working project, a repository with setup instructions, a public video under three minutes with audio explaining the project and the use of Codex and GPT-5.6, and a `/feedback` Codex Session ID from the main build thread.

Official references:

- https://openai.devpost.com/
- https://openai.devpost.com/details/faqs
- https://openai.devpost.com/rules
- https://developers.openai.com/api/docs/models/gpt-5.6-sol
- https://openai.com/index/introducing-structured-outputs-in-the-api/

See:

- `docs/ARCHITECTURE.md`
- `docs/DEMO_SCRIPT.md`
- `docs/BUILD_WEEK_CHANGELOG.md`
- `docs/DATASET_PHASE_2.md`
- `docs/SUBMISSION_CHECKLIST.md`

## What to document in Git

Because Cosmic Atlas existed before Build Week, clearly mark new work in commits and screenshots. Suggested commit groups:

1. `restore v4.5 baseline`
2. `add AI education shell and local structured demo`
3. `connect GPT-5.6 structured lesson backend`
4. `add adaptive tours quizzes progress and teacher mode`
5. `ingest 798-row catalog for retrieval`
6. `upgrade sky background and instanced belt rocks`
7. `polish accessibility demo and documentation`

Do not claim a feature in the submission unless it is visible in the build or clearly labeled as a future roadmap item.


## v5.2 visual and galaxy-interior update

- Rebalanced the background from a uniform white particle field into a darker photographic deep field with a localized Milky Way band, restrained colored stars, and preserved negative space.
- Added all 40 workbook galaxies to the rendered atlas.
- Added lazy galaxy interiors: entering any workbook galaxy creates its 15 cataloged internal structures, for 600 searchable structures total without rendering all of them at startup.
- Added an interior context bar, feature cycling, feature search, and inspector support.
- Restyled the interface with the native Apple system font stack, calmer near-black panels, and a purple-to-blue accent system.
- Redesigned quizzes with lettered responses, visual clues, and an adaptive two-choice retry after a missed answer.

Run the project with `npm start` so GPT requests and catalog endpoints are available. The frontend still keeps its deterministic offline lesson mode.
