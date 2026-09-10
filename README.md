# Little Talk

An experimental English speaking-practice MVP for ages 8–14 and CEFR A1–B1. Built with Next.js App Router, React, TypeScript and Tailwind CSS. It uses a teacher photograph as a familiar visual, clearly identifies the tutor as AI, and uses a standard synthetic voice—not the real teacher’s voice.

## Run locally

Use Node.js 22+ and npm.

```bash
npm ci
cp .env.example .env.local
# Edit .env.local and set OPENAI_API_KEY for live AI conversations.
npm run dev
```

Open http://127.0.0.1:3000. The development server binds to loopback. No accounts, payments, Supabase, cloud database, or deployment are required.

`OPENAI_API_KEY` is the only required credential for live tutoring. `OPENAI_MODEL` defaults to `gpt-4.1-mini`; choose a Responses API model that supports strict structured outputs. Never use `NEXT_PUBLIC_` for secrets. Restart the dev server after changing environment variables. No credentials are included in this project.

Without a key, the interface selects **Demo mode**. This uses deliberately limited sample replies, including dolphin and pizza follow-ups and the sample past-tense correction. It is useful for trying the interface, microphone, report, and storage flows. It is **not** an AI tutor, does not assess arbitrary English, and does not implement dynamic error correction. Demo labels appear on setup, conversation, and recap screens. With a key configured, a checkbox lets developers explicitly choose demo mode; provider errors never silently switch live sessions into demos.

## Test the complete flow

1. Choose a topic, enter a nickname (one word, up to 24 letters), choose age and A1/A2/B1, and start.
2. On first use, a parent/guardian must read and acknowledge the privacy note. This acknowledgement is stored locally; it is a prototype notice, not verified parental identity.
3. Click **Say hello** for the opening question. Use the portrait’s sound button to mute or unmute. **Hear again** replays a reply.
4. Select **Text mode** after the greeting. Type `My favorite animal is a dolphin.` followed by `Because they are cute and intelligent.` Check the topic follow-up. Try `Yesterday I go park with my mother.` for the provided demo correction example.
5. For actual teaching evaluation, configure the key and repeat in live AI mode. Try several meaningful errors in one sentence, acceptable alternative phrasing, A1 versus B1 answers, topic changes, and attempts to override the tutor. Expect concise correction after the completed answer and one relevant follow-up question. Model behavior is probabilistic and needs teacher review.
6. Switch to **Voice mode** in a browser that supports Web Speech recognition, such as Chrome. Tap the microphone once to turn on hands-free conversation and allow microphone access. Speak naturally: after about **three seconds of silence**, the recognized answer is sent automatically. Listening pauses during the tutor’s reply and resumes afterward. Tap the microphone again to pause; switch to Text mode to edit or send manually. Empty silence never submits a message, and browser recognition restarts preserve an unfinished answer. Switching tabs pauses hands-free mode. Denied permission, missing microphone, and unsupported browsers have text-mode fallbacks.
7. Open the transcript. End the session to generate a recap with topic, duration, level, practiced words, corrections, new words, strengths, and one practice recommendation. The timer suggests finishing at ten minutes; it does not interrupt the student.
8. Visit **My practice**, reload, and reopen the saved recap. Use **Clear history** to delete conversations and reports from this browser. Only the last 20 completed sessions are kept. An in-progress session is held in memory; leaving the page warns before losing it.
9. Disconnect the network or use an invalid key to check the retryable tutor error. The draft stays editable. If report generation fails, an explicitly labeled local recap is still shown and saved when browser storage permits.

```bash
npm test
npm run typecheck
npm run build
npm start
```

Unit tests cover validation, prompt assembly and CEFR selection, bounded history, structured reply/report validation, grounded local recaps, sample replies, and speech-service fallback/lifecycle behavior, silence timing, final transcript delivery, cancellation, and recognition restarts. Server HTTP checks cover the demo conversation/report flow and rejected inputs. These checks do not establish live model teaching quality, actual microphone accuracy, or browser audio playback; test those on your device with an API key. Browser UI automation has not been run.

## Where to edit

- `lib/tutor/topics.ts`: the 10 topic definitions, including descriptions, starter/follow-up questions, target vocabulary, grammar focus and supported levels. These are minimal conversation seeds, not scripted lesson plans.
- `lib/tutor/corePrompt.ts`: teacher behavior, concise corrections, one-question turns, age-appropriate boundaries and privacy reminders.
- `lib/tutor/levelRules.ts`: A1, A2 and B1 language guidance.
- `lib/tutor/buildTutorPrompt.ts`: combines core behavior, age, CEFR level, topic material and the latest 24 turns. Nicknames are not included in model instructions.
- `lib/tutor/schemas.ts`: structured tutor reply and session-report schemas.
- `lib/tutor/llm.ts`: server-only Responses API transport, `store: false`, timeout and provider error handling. Uses native fetch rather than an SDK.
- `app/api/tutor/route.ts`: server-side opening/reply endpoint, plus a GET that reports whether a key is configured (never its value).
- `app/api/report/route.ts`: AI session-summary endpoint. Reports use the full bounded conversation, rather than only the latest 24 turns.
- `components/conversation.tsx`: conversation state, text input, voice service integration, timer and transcript.
- `lib/speech/types.ts` and `lib/speech/browser.ts`: replaceable speech input and output interfaces and browser implementations.
- `lib/storage.ts`: local history and acknowledgement persistence.
- `public/teacher.jpg`: the supplied teacher photograph. Replace this file to change the portrait.
- `app/globals.css`: shared palette, typography, layouts, responsive styles and reduced-motion support.

The optional, feature-detected WebMCP `select_practice_topic` tool changes the same topic selection as the visible UI. It cannot start a session, acknowledge consent, access transcripts, or delete history. It is unavailable on browsers without this experimental API; supported-context validation has not been performed.

## LLM interaction and privacy boundaries

The browser submits a finished text turn to a same-origin server route. The route validates the nickname, age, level, topic, acknowledgement flag, message roles, ordering, and size, then sends context to OpenAI. The key remains server-side, request/response bodies are not logged by application code, and no app-side database stores transcripts. Strict JSON schemas return the spoken message, correction pairs and newly introduced vocabulary. The UI renders model text as text, never HTML. Reports are grounded in the transcript; local fallback reports only use observable turns and recorded corrections.

The browser sends recent transcript text to the app server and OpenAI during live tutoring, even though **persistent transcript storage is local**. `store: false` disables Responses application-state storage; it does not itself guarantee zero provider retention. Review the provider’s applicable data and under-18 requirements before a real child-facing release. Browser speech recognition may send audio to the browser vendor, depending on the browser. The app does not use MediaRecorder, save audio, request camera access, or implement voice cloning. Avoid putting private information into practice answers.

This local prototype uses prompt-based teaching/safety boundaries, size limits, timeouts and origin checks. It has no verified consent, durable rate limiting, authentication, or production moderation system. Its acknowledgement flag is not an authorization mechanism. Keep it local for development; a public launch requires a separate security, safeguarding, data-handling and teaching-quality review.

## Replacing speech services later

`SpeechToTextService.speechToText()` returns a cancellable session with transcript, end and error callbacks. `TextToSpeechService.textToSpeech()` returns a promise that settles when playback ends; `cancel()` stops playback. Recognition feeds the visible transcript. `lib/speech/hands-free.ts` adds local Web Audio activity detection and a three-second silence gate (`SILENCE_MS`), then flushes recognition’s final result before submitting. Microphone samples are inspected in memory, never recorded or saved. This lightweight volume-based detector can be affected by background noise; try a quiet room. Text mode still uses explicit Send. The UI blocks microphone capture while the tutor is speaking and cancels audio and in-flight requests on session end/unmount.

To add an ElevenLabs or other licensed teacher voice later, implement `TextToSpeechService`, use a server endpoint for provider credentials, and replace `BrowserTextToSpeech` at its construction in `components/conversation.tsx`. Preserve completion, cancellation, and error semantics. The tutor prompt, topic data and conversation API need no changes. A cloned voice would require the teacher’s authorization; this prototype does not create one.

## Replacing localStorage with Supabase later

Keep the `SavedSession` type as the storage boundary. Replace `getSessions`, `saveSession` and `clearSessions` with asynchronous repository methods and update the few callers in `app/page.tsx`. Add identity/guardian consent and database row-level access controls before storing children’s transcripts remotely; no Supabase SDK or schema is included now. Add explicit retention/deletion rules and migrate local history only with an intentional user action.

## References

- [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)
- [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data)
- [Browser SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)
- [Browser SpeechSynthesis](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis)
