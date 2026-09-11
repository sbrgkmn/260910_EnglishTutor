import { topicLessons, lessonObjects, lessonQuestions } from "./topicLessons";
import { getPracticeTopic } from "../tutor/topics";
import { personalFollowup } from "./personalFollowup";
import type { Level } from "../types";
import type { Activity, ActivityQuestion, SceneObject } from "./activityTypes";
const objects: SceneObject[] = [
  {
    id: "dog",
    label: "dog",
    kind: "animal",
    aliases: ["dog", "dogs", "puppy"],
    attributes: { color: "brown", location: "near the bench" },
    hitbox: { x: 0.12, y: 0.51, width: 0.2, height: 0.3 },
  },
  {
    id: "cat",
    label: "cat",
    kind: "animal",
    aliases: ["cat", "cats", "kitten"],
    attributes: { color: "orange", location: "under the tree" },
    hitbox: { x: 0.04, y: 0.24, width: 0.14, height: 0.23 },
  },
  {
    id: "rabbit",
    label: "rabbit",
    kind: "animal",
    aliases: ["rabbit", "rabbits", "bunny"],
    attributes: { color: "white", location: "beside the flowers" },
    hitbox: { x: 0.64, y: 0.54, width: 0.17, height: 0.3 },
  },
  {
    id: "bird",
    label: "bird",
    kind: "animal",
    aliases: ["bird", "birds"],
    attributes: {
      color: "blue",
      location: "on a branch",
      action: "sitting on a branch",
    },
    hitbox: { x: 0.33, y: 0.12, width: 0.14, height: 0.19 },
  },
  {
    id: "butterfly",
    label: "butterfly",
    kind: "animal",
    aliases: ["butterfly", "butterflies"],
    attributes: {
      color: "yellow",
      location: "above the flowers",
      action: "flying",
    },
    hitbox: { x: 0.78, y: 0.13, width: 0.13, height: 0.19 },
  },
  {
    id: "backpack",
    label: "backpack",
    kind: "object",
    aliases: ["backpack", "bag"],
    attributes: { color: "blue", location: "on the bench" },
    hitbox: { x: 0.47, y: 0.4, width: 0.12, height: 0.25 },
  },
  {
    id: "ball",
    label: "ball",
    kind: "object",
    aliases: ["ball"],
    attributes: { color: "red", location: "on the grass" },
    hitbox: { x: 0.4, y: 0.75, width: 0.12, height: 0.19 },
  },
];
export function generateActivity(
  level: Level,
  variant = 0,
  topicId = "animals",
): Activity {
  if (!getPracticeTopic(topicId)) throw new Error("Unknown lesson topic");
  if (topicId !== "animals") {
    const lesson = topicLessons[topicId];
    const objects = lessonObjects(lesson);
    const alternate = variant % 2;
    return {
      id: `${topicId}-${level}-${alternate}-v1`,
      topic: topicId,
      level,
      variant: alternate,
      createdAt: new Date().toISOString(),
      scene: {
        id: `${topicId}-v1`,
        description: lesson.description,
        background: `/scenes/topics/${topicId}-v1.jpg`,
        objects,
        imageSource: "illustrated",
        composition: "illustration",
        hitboxes: "authored",
      },
      questions: lessonQuestions(topicId, level, alternate, objects),
    };
  }
  const alternate = variant % 2 === 1;
  const target = alternate ? "backpack" : "rabbit";
  const questions: ActivityQuestion[] = [
    {
      id: "look",
      type: "speak",
      prompt: "Look at the picture. What animals can you see?",
      accepted: ["dog", "cat", "rabbit", "bird", "butterfly"],
      vocabulary: ["dog", "cat", "rabbit", "bird", "butterfly"],
      hint: "Try “I can see a dog.”",
    },
    {
      id: "find",
      type: "find",
      prompt: `Can you find the ${target}?`,
      targetId: target,
      accepted: [target],
      vocabulary: [],
      hint: alternate ? "Look on the bench." : "Look beside the flowers.",
    },
    {
      id: "color",
      type: "describe",
      prompt: `What color is the ${target}?`,
      targetId: target,
      accepted: [alternate ? "blue" : "white"],
      vocabulary: [target, alternate ? "blue" : "white"],
      hint: alternate
        ? "Try “The backpack is blue.”"
        : "Try “The rabbit is white.”",
    },
    level === "A1"
      ? {
          id: "choose",
          type: "choose",
          prompt: "Which of these animals can fly?",
          accepted: ["bird"],
          choices: ["dog", "bird", "rabbit"],
          vocabulary: ["bird", "fly"],
          hint: "Look for the animal with feathers.",
        }
      : alternate
        ? {
            id: "memory",
            type: "memory",
            prompt: "Take a good look! What color was the ball?",
            accepted: ["red"],
            vocabulary: ["red", "ball"],
            hint: "It was the same color as a strawberry.",
          }
        : {
            id: "action",
            type: "action",
            prompt: "What is the butterfly doing?",
            targetId: "butterfly",
            accepted: ["fly", "flying", "flies"],
            vocabulary: ["butterfly", "flying"],
            hint: "Try “The butterfly is flying.”",
          },
    {
      id: "pet",
      type: "personal",
      prompt:
        level === "B1"
          ? "Which animal would you choose as a pet, and why?"
          : "Which animal would you like as a pet?",
      accepted: [],
      vocabulary: ["rabbit", "dog", "cat", "bird", "because"],
      hint: "You can choose any animal, or say “No pet for me.”",
    },
    personalFollowup(),
  ];
  return {
    id: `animals-${level}-${alternate ? "garden" : "park"}-v2`,
    topic: "animals",
    level,
    variant: alternate ? 1 : 0,
    createdAt: new Date().toISOString(),
    scene: {
      id: alternate ? "garden-v1" : "park-v1",
      description: alternate
        ? "A sunny garden with a bench and flowers."
        : "A cheerful park with a tree, bench and flowers.",
      background: alternate ? "/scenes/garden.svg" : "/scenes/park.svg",
      objects: structuredClone(objects),
      imageSource: "sample",
      hitboxes: "authored",
    },
    questions,
  };
}
