# Teacher sprite pack

The identity reference is `public/teacher-source.jpg`; the original photograph also remains at `public/teacher.jpg`. The local app now uses **nine generated expression sprites** at `public/teacher/sprites/<state>/key-v1.jpg`. The master neutral was generated from the supplied photograph using Codex’s built-in image-generation tool, then every expression was generated separately using that master as its reference. No runtime API key was needed. Original generated PNGs remain in the Codex generated-images directory; the app uses 768px-high JPEG exports for fast loading.

All nine key poses have been visually inspected and wired to lesson events and the existing conversation screen. This is a preview pack: `spriteManifest.approved` remains `false` until the teacher reviews it. That review flag is documentation, not a runtime blocker. No teacher photo is sent to an image provider during lessons. The workshop includes a gallery of every pose. The exact production prompt structure and expression directions are recorded below.

## Create and approve assets outside the student session

Use the source photograph as an image reference for every generation. First create one neutral portrait, then use that approved neutral plus the photograph for every expression. Use identical 4:5 portrait framing (the v1 originals are 1122 × 1402), camera, crop, clothing and background. Export aligned JPG/WebP or PNG frames; transparent PNG is optional. Review each image with the teacher before treating it as an approved release asset and setting `spriteManifest.approved` to `true`.

Recommended base prompt (v1 additionally retained green eye makeup and specified a cream background, soft light and mid-chest crop):

> Use the attached teacher photograph as the identity reference. Make a warm, softly illustrated portrait for an English learning activity for ages 7–12. Preserve the person's age, face shape, facial features, dark brown hair, hairstyle, black clothing, jewelry and recognizable identity. Keep the same head-and-shoulders framing, lighting, camera and pale warm background in every frame. Subtle expression only. No text, exaggerated features, lip sync or new accessories.

For v1, expression edits used the following common wrapper, with one direction from the table. Keep this prompt set when revising assets:

> Edit this master teacher sprite to make exactly ONE expression key pose. Keep the exact same recognizable adult woman, age, face shape, dark brown hairstyle, makeup, earrings, black top, necklace, painterly illustration style and cream background. Preserve exact camera, crop, head position, face scale, framing and soft even lighting so it crossfades smoothly with the reference; only change facial expression and the tiny requested head movement. 4:5 portrait, same dimensions. Do not add accessories, text, hands, new objects or extra panels. No change to clothing or identity. Save as a separate PNG asset.

Expression directions:

| State / directory | Expression instruction |
| --- | --- |
| neutral | Relaxed, attentive expression with a small natural smile. |
| listening | Slight head tilt, attentive eyes, lips comfortably closed. |
| thinking | Thoughtful eyes and a very small upward glance, relaxed brows. |
| speaking | Lips slightly parted as if asking a friendly short question. |
| happy | A slightly brighter, natural smile; no exaggerated excitement. |
| encouraging | Kind, reassuring smile and a subtle nod posture. |
| surprised | Lifted brows, slightly widened eyes, lips parted in a small “oh”; curious delight, no shock. |
| celebrating | Delighted open natural smile with teeth showing, raised cheeks, eyes a little narrower with joy, small lift of chin; no hand gestures. |
| correction | Patient caring expression, slightly concentrated brow, small asymmetric supportive smile, a subtle downward nod; never stern. |

“Gentle correction” uses the `correction` directory and state name.

## Intermediate frames

The v1 pack contains key poses only. All transitions currently use the calm crossfade fallback; no additional assets are required to run it. Intermediate frames are an optional refinement.

For a transition, keep both approved endpoint images as references. Request three evenly spaced in-between poses with no change in identity, scale, lighting or background. Review flicker by stepping between images. Do not use unreviewed frames.

Example paths:

```
public/teacher/sprites/neutral/key-v1.jpg
public/teacher/sprites/listening/neutral-to-listening-01.webp
public/teacher/sprites/listening/neutral-to-listening-02.webp
public/teacher/sprites/listening/neutral-to-listening-03.webp
public/teacher/sprites/listening/key-v1.jpg
```

Add the intermediate paths with 80–120ms `duration` values to `spriteManifest.transitions['neutral->listening']`. The destination key pose is appended automatically. Support neutral→listening, listening→thinking, thinking→speaking, speaking→neutral, neutral→happy and happy→neutral in the same way. Other transitions can omit intermediates and crossfade between key poses. State arrays can also contain several frames. Reduced-motion users see the final pose immediately without pulse or transition animation.

`TeacherAvatar` maps the conversation and evaluation through `teacherStateFor`. Audio playback owns the speaking pulse; a correction or happy expression can accompany speech without losing playback synchronization. Use `?dev=true` → Animals → Lesson workshop to inspect all states and authored hitboxes.

Do not generate or modify teacher sprites from the runtime `/api/activity` endpoint. New poses are an asset-authoring workflow, not a student feature.
