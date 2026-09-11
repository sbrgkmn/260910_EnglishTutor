# Starkids visual activities

The MVP has six topics for ages 7–12, A1–B1: Animals, Food, Home, Hobbies, School and My Town. Every topic uses a six-step picture game with the same teacher expressions, voice and hands-free input. Other topics are excluded from setup, workshop and activity APIs. Legacy metadata remains for saved history. Nothing in this local iteration automatically updates the public Site or pushes Git.

## Try it

Run `npm run dev` and open `http://127.0.0.1:3000/?mode=text&dev=true`. Enter a nickname, choose Animals and A1, and start. A guardian acknowledgement is required on first use. Sam’s Voice uses the existing ElevenLabs configuration; Mute lets you try the sequence silently.

1. Answer “I see dog and rabbit.” The teacher models the corrected sentence; semantic success still earns 15 stars.
2. Tap the dog first: no points are removed and the rabbit remains available. Tap the rabbit: +10.
3. Answer “The rabbit are white.” The teacher corrects “are” to “is”; +15.
4. Choose the bird: +10.
5. Answer “I would like a dog.” The next question is about doing something with your dog; +15.
6. Answer “We would play together.” +15 and a completion bonus of 20. Total: 100 stars. Choose Another round or Finish.

Try “No pet for me” for a follow-up about watching animals, or an imaginary dragon for the surprised expression. The follow-up uses an authored choice list, never inserts arbitrary private text into a prompt. Progress has six steps, within the requested 3–6 questions per scene.

For voice input, open without `mode=text`, allow the microphone, and speak after the question. The existing three-second silence detector sends finished speech automatically. Speech input pauses while feedback plays. Text input remains available. Switching tabs pauses listening. Mute, End, reset and navigation cancel current audio or input. Next picture preserves the microphone preference and accumulated session stars; Reset score clears them. Stars and game transcripts are held only in memory and are not saved to the old recap history.

A2/B1 replace the multiple-choice step with an action or open-ended question. Animals also has an alternate memory question: the scene disappears after six seconds. A1 always retains picture choices. Each topic has two sets of find/color targets. The last question responds to the learner’s choice. Topic changes start a fresh game and cancel previous speech.

## Code map

- `components/game/Game.tsx`: picture-first layout, question, input, score, progress, celebration and workshop.
- `ActivityScene.tsx`: responsive authored objects and actual object-aligned buttons, with keyboard labels and debug outlines.
- `lib/game/useGameController.ts`: speech, network cancellation, mic lifecycle, current sentence, session flow and feedback timing.
- `lib/game/gameState.ts` and `lib/activities/calculateScore.ts`: pure transitions, duplicate-answer protection, recoverable wrong taps, scoring and completion bonus.
- `lib/activities/generateActivity.ts`: authored semantic scene before rendering or generation, object aliases, attributes and questions.
- `personalFollowup.ts`: Animals preference-based sixth question.
- `topicLessons.ts`: five additional authored lessons and choice-based follow-ups.
- `lib/tutor/topics.ts`: the six-topic MVP catalog, shared by setup, workshop and browser tools.
- `evaluateAnswer.ts`: conservative local semantic checks, effort points and a few explicitly supported corrections. This is not a general English grammar assessor.
- `handleAnswer.ts`: validation and optional live AI feedback, with game success separated from language accuracy. `/api/activity/answer` is the Next route.
- `lib/images/provider.ts`: server-side vendor adapter. `generateActivityImage.ts` owns fixed child-friendly background prompts.
- `lib/images/sceneCache.ts`: bounded process-local scene cache and in-flight deduplication. `handleActivity.ts` exposes it through `/api/activity`.
- `lib/teacher/` and `components/teacher/`: common expression state mapping, frame manifest and timed crossfades. See [the sprite authoring guide](teacher-sprite-generation.md).
- `public/scenes/`: authored backgrounds, foreground and seven lesson objects. `public/teacher/sprites/`: generated expression pack.
- `hosting/worker.ts`: the same activity handlers and server-side runtime bindings for a future Sites deployment.

## Image generation and accurate hitboxes

Food, Home, Hobbies, School and My Town use five bundled, reviewed 3×2 illustrations. Their six subjects, colors and normalized hitboxes are authored against those images; runtime generation never replaces them. Prompt and review records are in `topic-image-prompts.json` and `topic-image-review.json`. Originals for deferred topics are preserved outside the public app.

Animals uses the bundled, authored park/garden. The optional provider generates **only the background**. Authored trees, bench, flowers and seven lesson objects are rendered over that background, with the same known colors, positions and normalized click coordinates. We do not infer reliable click coordinates from an arbitrary generated raster. This hybrid approach keeps the question facts and hitboxes accurate.

The browser requests a scene once at activity start, not per question. It shows the sample immediately. A generated background may replace it before the first answer; once an answer has been submitted, that activity keeps its current scene. A late result is cached for the next matching activity. The workshop can explicitly regenerate a background at any point.

The process-local cache stores full scene metadata, background, questions, ID and timestamps for up to eight activities, for 24 hours. Concurrent requests for the same activity share generation. Missing credentials or provider failures return and cache the authored sample. Restart or workshop regeneration retries. Nothing is persisted to a database or disk; server restarts/Worker isolate turnover lose the cache. Replace this adapter with object storage for durable shared reuse.

## Environment

No new credential is needed for any of the six bundled games, illustrations or teacher sprites.

```dotenv
# Optional general English evaluation and existing live conversations
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini

# Existing teacher speech; browser is the fallback
VOICE_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=
ELEVENLABS_VOICE_ID=

# Optional runtime scenic backgrounds; sample is the default
IMAGE_PROVIDER=sample
IMAGE_API_KEY=
IMAGE_MODEL=gpt-image-2.5-sunburst
```

Set `IMAGE_PROVIDER=openai` and a server-side `IMAGE_API_KEY` with image-generation access to activate background generation. The image and conversation credentials are intentionally independent. Verify the configured model is available to your account. The adapter uses the OpenAI image generations endpoint and accepts base64 PNG output. No teacher photo or student answers are sent to that image endpoint. Teacher sprites are built-in static assets generated outside normal lessons.

Use `.env.local`, restart the dev server after changing it, and never use `NEXT_PUBLIC_` for secrets. Sites deployment requires equivalent runtime secrets/bindings; local environment files are not uploaded. The current local configuration has Sam’s Voice, but no live conversation/image credentials. The developer workshop identifies the local evaluator as “Guided feedback.”

## Workshop and checks

`?dev=true` enables topic/level selection, authored hitbox outlines, scene JSON/expected answers, background regeneration, voice replay, score reset and all nine sprite states. Selecting a topic or level immediately starts its game. “Follow conversation” returns from a forced pose to the real state machine. No secret values appear in the workshop. This URL flag is a development convenience, not authentication.

`npm test` covers the full score loop, corrections without lost points, invalid inputs, personal follow-ups, teacher mapping, cache deduplication/expiry, image fallback, provider transport, Worker routing, the existing silence detector, speech cancellation and browser voice fallback. `npm run typecheck` and the full Sites-aware build validate both targets. See the session completion report for the actual browser checks performed.

Teacher review of the generated pose pack is still pending. Intermediate frames are optional and are not included yet; calm crossfades work between the nine key poses and reduced-motion users see direct changes. Live image generation and unrestricted AI English evaluation require credentials and have not been exercised against live providers in this iteration. Test microphone recognition in a quiet room on the intended phone/tablet; automated lifecycle checks cannot establish recognition quality.

The larger teacher and six progress dots keep the lesson interface compact. The redundant AI/practice/voice footer is removed. Starkids uses the refreshed rainbow-and-star header logo in `public/starkids-logo-v1.png`; generation records are in `starkids-logo-generation.json`.

## Validation of this iteration

- Full Next.js production build and Sites Worker/static package completed successfully.
- 38 automated tests passed; the five additional topics complete at A1/A2/B1 in both variants and retired topic requests are rejected, including mocked browser-voice fallback and image-provider failure.
- The A1 Animals browser flow completed all six questions with 100 stars, including a wrong tap, grammar correction, pet-specific follow-up, keyboard selection, next-picture score preservation and reset.
- Responsive layouts were checked at 390px, 820px and 1440px, with rabbit target bounds measured at phone/tablet sizes; the phone rabbit target is approximately 61 × 69px.
- A2 alternate-scene memory hiding, level switching and authored-image fallback were exercised in the browser.
- All nine sprite states were selected in the workshop and mapped to their individual generated assets. The mobile gallery was visually inspected.
- Sam’s Voice played lesson questions through the existing speech integration. Console checks reported no warnings/errors.
- Configured secrets were absent from generated build assets. Live image generation and OpenAI feedback remain untested without their credentials.


## Voice and mobile release checks

A silent audio activation clip could finish after another topic started, mistakenly cancelling the new teacher audio. Playback completion now belongs only to the loaded lesson clip. A regression test reproduces the Food → My Town transition. Temporary provider errors use browser speech for that response, then retry Sam’s Voice; mobile autoplay rejection returns control with a replay/typing option. Hear again and unmute reactivate audio from the user’s tap. Slow audio startup is bounded, and older browsers can read/speak a complete question without Intl.Segmenter.

First-visit acknowledgement was exercised on a fresh local origin at 390×844. The default voice flow handled unavailable microphone recognition by exposing text input. My Town completed all six steps with real teacher playback, a recoverable wrong tap, grammar feedback, a personalized follow-up and 100 stars. The modal is centered and scrollable, and lesson input uses 16px text. Automated tests cover the six topics, levels, variants, speech cancellation, silence submission, blocked playback, stalled startup and server routes. Device-size checks are desktop-browser emulation; physical phone microphone quality still depends on the phone/browser and permission settings.

Safari media behavior reference: https://webkit.org/blog/7734/auto-play-policy-changes-for-macos/

## Compact desktop and mobile layout

The lesson is contained in one card: picture and teacher/question side by side above 800px, stacked on smaller screens. The teacher uses the full portrait with `object-fit: contain`. Answer controls sit immediately beneath the lesson; Topics and the brand return to setup. Mobile text input, microphone and send share one row, secondary controls have equal widths, and the progress counter replaces the desktop progress bars. Microphone behavior and lesson scoring are unchanged.

Visual checks at 320px, 390px and 1440px confirmed no horizontal overflow, uncropped portraits, readable question text and usable picture choices. At 390px, the first question and answer/secondary controls fit within an 844px viewport. Typed answers and picture taps advanced My Town through its six-step flow. The automated suite contains 48 passing tests; physical-phone speech recognition is still separate from viewport testing.
