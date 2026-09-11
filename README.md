# Starkids

The current MVP offers **Animals, Food, Home, Hobbies, School and My Town** as six-step picture conversations, with teacher expressions, Sam’s Voice and automatic speech submission. See [the activity guide](docs/visual-activities.md).

An experimental English speaking-practice MVP for ages 7–12 and CEFR A1–B1. Built with Next.js App Router, React, TypeScript and Tailwind CSS. It uses an illustrated teacher sprite pack derived from the supplied photograph, clearly identifies the tutor as AI, and supports browser speech or an ElevenLabs voice configured by the owner. The start screen identifies the practice teacher as AI.

## Visual game iteration

Every MVP topic opens a picture game with six questions, authored tap targets, gentle corrections, session stars, a choice-specific follow-up, and a simple celebration. A2/B1 add action prompts; Animals also includes a memory variant. All nine teacher expressions are fixed assets; they follow listening, processing, audio, feedback and completion.

See [Visual activities](docs/visual-activities.md) for the code map, exact 100-star test sequence, image provider/cache setup and limitations. See [Teacher sprite generation](docs/teacher-sprite-generation.md) for asset paths, authoring prompts and review workflow. Use `?mode=text&dev=true` to test without microphone access and open the sprite workshop.

All six scenes and guided feedback work without new credentials. Optional live feedback uses `OPENAI_API_KEY`; optional scenic backgrounds use `IMAGE_PROVIDER=openai`, `IMAGE_API_KEY` and `IMAGE_MODEL`. Teacher sprites do not require runtime image generation. Sam’s Voice continues to use the existing ElevenLabs settings. The general conversation/report code and saved history remain available for future development; picture games keep points and transcripts only for the current session.

## Run locally

Use Node.js 22+ and npm.

```bash
npm ci
cp .env.example .env.local
# Edit .env.local and set OPENAI_API_KEY for live AI conversations.
npm run dev
```

Open http://127.0.0.1:3000. The development server binds to loopback. No accounts, payments, Supabase, or cloud database are required for local development.

`OPENAI_API_KEY` is the only required credential for live tutoring. `OPENAI_MODEL` defaults to `gpt-4.1-mini`; choose a Responses API model that supports strict structured outputs. Never use `NEXT_PUBLIC_` for secrets. Restart the dev server after changing environment variables. No credentials are included in this project.

Without a key, the interface selects **Demo mode**. This uses deliberately limited sample replies, including dolphin and pizza follow-ups and the sample past-tense correction. It tracks questions already asked, explores additional topic prompts, and finishes the practice instead of cycling through the same questions. Live tutoring retains the full bounded conversation and is instructed to build on earlier answers without repeating answered questions. It is useful for trying the interface, microphone, report, and storage flows. It is **not** an AI tutor, does not assess arbitrary English, and does not implement dynamic error correction. Demo labels appear during the conversation and on the recap. Provider errors never silently switch live sessions into demos.

## Test the complete flow

1. Choose a topic, enter a nickname (one word, up to 24 letters), choose age and A1/A2/B1, and start.
2. On first use, a parent/guardian must read and acknowledge the privacy note. This acknowledgement is stored locally; it is a prototype notice, not verified parental identity.
3. **Start talking** automatically plays the opening question and prepares hands-free listening. Use **Mute** to disable tutor audio. The main screen shows only the current spoken sentence; **Transcript** opens the full conversation and replay controls.
4. Select **Text mode** after the greeting, or open `http://127.0.0.1:3000/?mode=text` before starting to test without requesting microphone access. Type `My favorite animal is a dolphin.` followed by `Because they are cute and intelligent.` Check the topic follow-up. Try `Yesterday I go park with my mother.` for the provided demo correction example.
5. For actual teaching evaluation, configure the key and repeat in live AI mode. Try several meaningful errors in one sentence, acceptable alternative phrasing, A1 versus B1 answers, topic changes, and attempts to override the tutor. Expect concise correction after the completed answer and one relevant follow-up question. Model behavior is probabilistic and needs teacher review.
6. Switch to **Voice mode** in a browser that supports Web Speech recognition, such as Chrome. Allow microphone access when prompted. Hands-free conversation starts automatically after the greeting; use the microphone button to resume if paused. Speak naturally: after about **three seconds of silence**, the recognized answer is sent automatically. Listening pauses during the tutor’s reply and resumes afterward. Tap the microphone again to pause; switch to Text mode to edit or send manually. Empty silence never submits a message, and browser recognition restarts preserve an unfinished answer. Switching tabs pauses hands-free mode. Denied permission, missing microphone, and unsupported browsers have text-mode fallbacks.
7. Open the transcript. End the session to generate a recap with topic, duration, level, practiced words, corrections, new words, strengths, and one practice recommendation. The timer suggests finishing at ten minutes; it does not interrupt the student.
8. Visit **My practice**, reload, and reopen the saved recap. Use **Clear history** to delete conversations and reports from this browser. Only the last 20 completed sessions are kept. An in-progress session is held in memory; leaving the page warns before losing it.
9. Disconnect the network or use an invalid key to check the retryable tutor error. The draft stays editable. If report generation fails, an explicitly labeled local recap is still shown and saved when browser storage permits.

```bash
npm test
npm run typecheck
npm run build
npm start
```

The automated tests cover tutoring validation, prompts and reports; speech recognition lifecycle and silence timing; voice selection, sentence sequencing, cancellation and browser fallback; and server-only ElevenLabs requests, audio responses and error redaction. A local browser check completed an Animals conversation in text mode through its recap, including a correction and the optional transcript. Browser speech playback lifecycle and layouts at 390px and 820px were checked. ElevenLabs transport is covered with mocked responses. A live test with the configured Sam’s Voice successfully returned MP3 audio through the application endpoint. Actual microphone accuracy and live teaching quality still need evaluation on the target devices.

## Where to edit

- `lib/tutor/topics.ts`: the 10 topic definitions, including descriptions, starter/follow-up questions, target vocabulary, grammar focus and supported levels. These are minimal conversation seeds, not scripted lesson plans.
- `lib/tutor/corePrompt.ts`: teacher behavior, concise corrections, one-question turns, age-appropriate boundaries and privacy reminders.
- `lib/tutor/levelRules.ts`: A1, A2 and B1 language guidance.
- `lib/tutor/buildTutorPrompt.ts`: combines core behavior, age, CEFR level, topic material and the full bounded session (up to 120 turns). Nicknames are not included in model instructions.
- `lib/tutor/schemas.ts`: structured tutor reply and session-report schemas.
- `lib/tutor/llm.ts`: server-only Responses API transport, `store: false`, timeout and provider error handling. Uses native fetch rather than an SDK.
- `app/api/tutor/route.ts`: server-side opening/reply endpoint, plus a GET that reports whether a key is configured (never its value).
- `app/api/report/route.ts`: AI session-summary endpoint. Reports use the full bounded conversation, rather than only the full bounded session (up to 120 turns).
- `components/conversation.tsx`: conversation state, text input, voice service integration, timer and transcript.
- `lib/speech/`: browser speech recognition, activity detection and hands-free silence timing.
- `lib/voice/types.ts`, `browser.ts`, `elevenlabs.ts` and `index.ts`: voice providers, automatic sentence playback, cancellation and browser fallback.
- `lib/voice/server.ts` and `app/api/tts/route.ts`: server-only ElevenLabs configuration and audio endpoint.
- `hosting/worker.ts`: the same tutor, report and voice handlers for Sites.
- `lib/storage.ts`: local history and acknowledgement persistence.
- `public/teacher.jpg` and `public/teacher-source.jpg`: the supplied identity reference; `public/teacher/sprites/` contains the generated pack used by the interface.
- `app/globals.css`: shared palette, typography, layouts, responsive styles and reduced-motion support.

The optional, feature-detected WebMCP `select_practice_topic` tool changes the same topic selection as the visible UI. It cannot start a session, acknowledge consent, access transcripts, or delete history. It is unavailable on browsers without this experimental API; supported-context validation has not been performed.

## LLM interaction and privacy boundaries

The browser submits a finished text turn to a same-origin server route. The route validates the nickname, age, level, topic, acknowledgement flag, message roles, ordering, and size, then sends context to OpenAI. The key remains server-side, request/response bodies are not logged by application code, and no app-side database stores transcripts. Strict JSON schemas return the spoken message, correction pairs and newly introduced vocabulary. The UI renders model text as text, never HTML. Reports are grounded in the transcript; local fallback reports only use observable turns and recorded corrections.

The browser sends recent transcript text to the app server and OpenAI during live tutoring, even though **persistent transcript storage is local**. `store: false` disables Responses application-state storage; it does not itself guarantee zero provider retention. Review the provider’s applicable data and under-18 requirements before a real child-facing release. Browser speech recognition may send audio to the browser vendor, depending on the browser. The app does not use MediaRecorder, save student audio, or request camera access. When ElevenLabs is enabled, tutor response text is sent to ElevenLabs to generate audio; the app plays it from a temporary object URL and releases it afterward. Provider retention policies still apply. Creating a voice clone happens separately in your ElevenLabs account; the supplied reference recording is not included in the repository or public assets. Avoid putting private information into practice answers.

This local prototype uses prompt-based teaching/safety boundaries, size limits, timeouts and origin checks. It has no verified consent, durable rate limiting, authentication, or production moderation system. Its acknowledgement flag is not an authorization mechanism. The public Sites deployment uses clearly labeled demo conversations until an OpenAI key is configured; ElevenLabs speech is configured separately. Enabling live AI for a child-facing release requires a separate security, safeguarding, data-handling and teaching-quality review.

## Speech and ElevenLabs setup

`SpeechToTextService.speechToText()` returns a cancellable session with transcript, end and error callbacks. `TextToSpeechService.textToSpeech()` returns a promise that settles when playback ends; `cancel()` stops playback. Recognition feeds the current answer; the full conversation transcript is optional. `lib/speech/hands-free.ts` adds local Web Audio activity detection and a three-second silence gate (`SILENCE_MS`), then flushes recognition’s final result before submitting. Microphone samples are inspected in memory, never recorded or saved. This lightweight volume-based detector can be affected by background noise; try a quiet room. Text mode still uses explicit Send. The UI blocks microphone capture while the tutor is speaking and cancels audio and in-flight requests on session end/unmount.

Edit **`.env.local` in the project root** (`/Users/sabrigokmen/Documents/ChatGPT/EnglishTutor/.env.local`):

```dotenv
VOICE_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=your_teacher_voice_id
```

Use the teacher's authorized existing voice ID, or create the voice in your ElevenLabs account using the supplied recording and copy its ID. The owner created Sam’s Voice in ElevenLabs from the supplied recording; the application uses its configured voice ID. Restart `npm run dev` after adding the values. `.env.local` is ignored by Git. Never prefix these variables with `NEXT_PUBLIC_`.

Set `VOICE_PROVIDER=browser` for the built-in browser voice. Missing ElevenLabs credentials also select browser speech; failed ElevenLabs requests fall back to it with a brief notice. Text mode remains available when browser speech is unsupported. `GET /api/tts` exposes only the selected provider. `POST /api/tts` accepts bounded tutor text and returns MP3 audio; the API key and voice ID stay on the server. The implementation uses `eleven_flash_v2_5` and speaks short sentences sequentially, without overlapping playback. End, mute and unmount cancel queued speech, pending requests and audio.

For a live voice check, configure all three values, start an Animals session, and confirm the chosen voice plays the greeting and subsequent answers. Check that the browser only calls `/api/tts`, receives audio, and never receives provider credentials. Test mute, replay, End and a rejected provider request to exercise cancellation and fallback.

## Replacing localStorage with Supabase later

Keep the `SavedSession` type as the storage boundary. Replace `getSessions`, `saveSession` and `clearSessions` with asynchronous repository methods and update the few callers in `app/page.tsx`. Add identity/guardian consent and database row-level access controls before storing children’s transcripts remotely; no Supabase SDK or schema is included now. Add explicit retention/deletion rules and migrate local history only with an intentional user action.

## References

- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data)
- [Browser SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
- [Browser SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)
- [ElevenLabs text-to-speech API](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)
- [ElevenLabs instant voice cloning](https://elevenlabs.io/docs/eleven-creative/voices/voice-cloning/instant-voice-cloning)

## Sites hosting

`npm run build` produces both the normal Next.js production build and a Cloudflare-compatible Sites package in `dist/`. `npm run build:next` builds only Next.js. Local development continues to use `npm run dev`.

The app currently has one prerendered page and no Next server actions, dynamic page routes, or server-rendered per-user content. `scripts/build-sites.mjs` packages that page with its exact Next client chunks and public assets. `hosting/worker.ts` serves static assets through the Sites `ASSETS` binding and routes `/api/tutor`, `/api/report`, `/api/tts`, `/api/activity` and `/api/activity/answer` to shared server handlers in `lib/tutor/` and `lib/voice/server.ts`. Runtime secrets are passed explicitly from Worker bindings; no local environment values are included in the Worker bundle.

The public deployment defaults to demo mode. To enable live tutoring later, configure `OPENAI_API_KEY` as a Sites secret and optionally `OPENAI_MODEL` as a runtime variable, then redeploy. For ElevenLabs, add `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` as server-side Sites secrets and set the runtime variable `VOICE_PROVIDER=elevenlabs`. Local `.env.local` values are not uploaded or bundled. The GitHub repository does not automatically deploy Sites: push the same source revision to the Sites source repository, package the validated `dist/` output with the Sites helper, save a version for that exact commit, and deploy it. The Site identity is recorded in `.openai/hosting.json`.

If you add dynamic Next page routes, server actions, or image optimization later, replace this single-page hosting adapter with a full Next-compatible Worker adapter. Do not expose Next server build intermediates as static assets.
