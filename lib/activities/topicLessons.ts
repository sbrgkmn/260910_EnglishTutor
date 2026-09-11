import type { ActivityQuestion, SceneObject } from "./activityTypes";
import type { Level } from "../types";

type Subject = {
  id: string;
  label?: string;
  color: string;
  aliases?: string[];
  kind?: string;
};
type Lesson = {
  title: string;
  description: string;
  subjects: Subject[];
  look?: string;
  lookWords?: string[];
  find: [string, string];
  color: [string, string];
  choose: { prompt: string; target: string; options: string[]; hint: string };
  action?: {
    prompt: string;
    accepted: string[];
    feedback: string;
    openEnded?: boolean;
    hint: string;
  };
  personal: {
    prompt: string;
    hint: string;
    vocabulary: string[];
    followup: string;
    followups?: Record<string, string>;
  };
};
export const topicLessons: Record<string, Lesson> = {
  "my-town": {
    title: "Around town",
    description:
      "A picture town with a library, school, bakery, bicycle, park and bus.",
    subjects: [
      { id: "library", color: "red", aliases: ["libraries"] },
      { id: "school", color: "yellow" },
      { id: "bakery", color: "brown", aliases: ["bread shop"] },
      { id: "bicycle", color: "green", aliases: ["bike"] },
      { id: "park", color: "green" },
      { id: "bus", color: "blue", aliases: ["buses"] },
    ],
    look: "What places and things can you see in this town?",
    find: ["bus", "library"],
    color: ["bus", "school"],
    choose: {
      prompt: "Which one carries lots of people around town?",
      target: "bus",
      options: ["bicycle", "bus", "library"],
      hint: "Look for the big vehicle with windows.",
    },
    action: {
      prompt: "What can you do in a library?",
      accepted: ["read", "reading", "books", "borrow"],
      feedback: "Yes! You can read and borrow books.",
      hint: "You can read a book there.",
    },
    personal: {
      prompt: "Which place would you like to visit?",
      hint: "You could choose the park, library or bakery.",
      vocabulary: ["park", "library", "bakery", "school"],
      followup: "What would you like to do there?",
      followups: {
        park: "What would you like to play in the park?",
        library: "What kind of book would you like to read?",
        bakery: "What would you like to try at the bakery?",
        school: "What would you like to learn at school?",
      },
    },
  },
  hobbies: {
    title: "Time to play",
    description:
      "A football, guitar, paint palette, bicycle, book and kite for different hobbies.",
    subjects: [
      {
        id: "ball",
        label: "football",
        color: "white",
        aliases: ["ball", "soccer"],
      },
      { id: "guitar", color: "brown", aliases: ["music"] },
      {
        id: "palette",
        label: "paint palette",
        color: "brown",
        aliases: ["paint", "painting", "art", "brush"],
      },
      { id: "bicycle", color: "green", aliases: ["bike", "cycling"] },
      { id: "book", color: "blue", aliases: ["reading"] },
      { id: "kite", color: "yellow", aliases: ["kites"] },
    ],
    find: ["guitar", "bicycle"],
    color: ["kite", "book"],
    choose: {
      prompt: "Which one can you use to make music?",
      target: "guitar",
      options: ["guitar", "ball", "kite"],
      hint: "Look for the instrument with strings.",
    },
    action: {
      prompt: "What can you do with the guitar?",
      accepted: ["play", "playing", "music", "sing", "strum"],
      feedback: "Yes! You can play music on the guitar.",
      hint: "Try “I can play music.”",
    },
    personal: {
      prompt: "Which hobby would you like to try?",
      hint: "You could choose music, painting, reading or a game.",
      vocabulary: ["music", "paint", "read", "play", "bike", "kite"],
      followup: "Who would you like to try it with?",
      followups: {
        ball: "Who would you like to play football with?",
        guitar: "What kind of music would you like to play?",
        palette: "What would you like to paint?",
        bicycle: "Where would you like to ride your bike?",
        book: "What would your favourite story be about?",
        kite: "What color would you choose for your own kite?",
      },
    },
  },
  food: {
    title: "A tasty table",
    description:
      "A breakfast picture with an apple, banana, bread, milk, egg and orange juice.",
    subjects: [
      { id: "apple", color: "red", aliases: ["apples"] },
      { id: "banana", color: "yellow", aliases: ["bananas"] },
      { id: "bread", color: "brown", aliases: ["toast", "loaf"] },
      { id: "milk", color: "white", aliases: ["jug"] },
      { id: "egg", color: "white", aliases: ["eggs"] },
      {
        id: "juice",
        label: "orange juice",
        color: "orange",
        aliases: ["juice", "orange juice"],
      },
    ],
    look: "What food and drinks can you see?",
    find: ["banana", "milk"],
    color: ["apple", "banana"],
    choose: {
      prompt: "Which of these can you drink?",
      target: "milk",
      options: ["apple", "milk", "bread"],
      hint: "Look for the white drink in a jug.",
    },
    action: {
      prompt: "What could you put on a slice of bread?",
      openEnded: true,
      accepted: [
        "butter",
        "jam",
        "cheese",
        "egg",
        "honey",
        "spread",
        "chocolate",
        "peanut butter",
        "avocado",
      ],
      feedback: "That sounds like a tasty idea!",
      hint: "You could try butter, jam or cheese.",
    },
    personal: {
      prompt: "Which food or drink would you choose?",
      hint: "Choose something in the picture, or imagine your own breakfast.",
      vocabulary: ["apple", "banana", "bread", "milk", "egg", "juice"],
      followup: "What else would you add to your breakfast?",
      followups: {
        apple: "How would you describe the apple’s taste?",
        banana: "What would you eat with your banana?",
        bread: "What would you like to put on your bread?",
        milk: "What would you eat with your milk?",
        egg: "What would you eat with your egg?",
        juice: "Which fruit juice would you like to try next?",
      },
    },
  },
  school: {
    title: "Ready for school",
    description:
      "School things: a blue backpack, red book, yellow pencil, green ruler, purple notebook and red scissors.",
    subjects: [
      { id: "backpack", color: "blue", aliases: ["bag"] },
      { id: "book", color: "red", aliases: ["books"] },
      { id: "pencil", color: "yellow", aliases: ["pencils"] },
      { id: "ruler", color: "green" },
      { id: "notebook", color: "purple", aliases: ["note book"] },
      { id: "scissors", color: "red" },
    ],
    find: ["ruler", "notebook"],
    color: ["pencil", "backpack"],
    choose: {
      prompt: "Which of these do you use to write?",
      target: "pencil",
      options: ["backpack", "pencil", "ruler"],
      hint: "Look for the yellow writing tool.",
    },
    action: {
      prompt: "What can you do with a pencil?",
      accepted: ["write", "writing", "draw", "drawing", "color", "colour"],
      feedback: "Yes! You can write or draw with a pencil.",
      hint: "Try “I can draw a picture.”",
    },
    personal: {
      prompt: "Which thing would you put in your school bag first?",
      hint: "You could choose a book, pencil or notebook.",
      vocabulary: ["book", "pencil", "notebook", "ruler", "bag"],
      followup: "What would you like to use it for?",
      followups: {
        book: "What kind of book would you bring?",
        pencil: "What would you like to draw with your pencil?",
        notebook: "What would you put on the first page of your notebook?",
        ruler: "What could you measure with your ruler?",
        backpack: "What else would you put in your bag?",
      },
    },
  },
  home: {
    title: "A cozy home",
    description:
      "A yellow lamp, green sofa, white bookshelf, blue bed, brown table and red rug.",
    subjects: [
      { id: "lamp", color: "yellow", aliases: ["light"] },
      { id: "sofa", color: "green", aliases: ["couch"] },
      {
        id: "bookshelf",
        color: "white",
        aliases: ["shelf", "bookcase", "books"],
      },
      { id: "bed", color: "blue" },
      { id: "table", color: "brown" },
      { id: "rug", color: "red", aliases: ["carpet"] },
    ],
    find: ["lamp", "bookshelf"],
    color: ["sofa", "bed"],
    choose: {
      prompt: "Which one gives you light?",
      target: "lamp",
      options: ["rug", "lamp", "sofa"],
      hint: "Look for the yellow lamp shade.",
    },
    action: {
      prompt: "What could you do on the sofa?",
      accepted: [
        "sit",
        "sitting",
        "read",
        "reading",
        "rest",
        "relax",
        "talk",
        "sleep",
      ],
      feedback: "That sounds cozy! You can sit and relax there.",
      hint: "You could sit, read or rest.",
    },
    personal: {
      prompt: "Which thing would you choose for an imaginary room?",
      hint: "You could choose a cozy bed, a sofa or a lamp.",
      vocabulary: ["bed", "sofa", "lamp", "table", "rug", "bookshelf"],
      followup: "What else would you add to your imaginary room?",
      followups: {
        lamp: "What color light would you imagine from your lamp?",
        sofa: "What would you like to do on your sofa?",
        bookshelf: "What stories would you put on your bookshelf?",
        bed: "What color blanket would you choose?",
        table: "What would you put on your table?",
        rug: "What pattern would you choose for your rug?",
      },
    },
  },
};

// Positions are reviewed against the bundled 3 × 2 illustrations, not inferred at runtime.
export function lessonObjects(lesson: Lesson): SceneObject[] {
  return lesson.subjects.map((s, index) => ({
    id: s.id,
    label: s.label || s.id,
    kind: s.kind || "object",
    aliases: [s.id, s.label || s.id, ...(s.aliases || [])],
    attributes: {
      color: s.color,
      location: `${index < 3 ? "top" : "bottom"} ${["left", "middle", "right"][index % 3]}`,
    },
    hitbox: {
      x: 0.01 + (index % 3) * 0.33,
      y: index < 3 ? 0.01 : 0.515,
      width: 0.325,
      height: 0.48,
    },
  }));
}
export function topicFollowup(
  topicId: string,
  choiceId?: string,
): ActivityQuestion {
  const lesson = topicLessons[topicId];
  return {
    id: "followup",
    type: "personal",
    targetId: choiceId,
    prompt:
      (choiceId && lesson.personal.followups?.[choiceId]) ||
      lesson.personal.followup,
    accepted: [],
    vocabulary: ["play", "read", "draw", "share", "because", "with", "like"],
    hint: "You can imagine anything you like.",
    successFeedback: "Thanks for sharing your idea!",
  };
}
export function lessonQuestions(
  topicId: string,
  level: Level,
  variant: number,
  objects: SceneObject[],
): ActivityQuestion[] {
  const lesson = topicLessons[topicId];
  const find = objects.find((o) => o.id === lesson.find[variant])!;
  const color = objects.find((o) => o.id === lesson.color[variant])!;
  const subject =
    color.kind === "person" ? `${color.label}’s shirt` : color.label;
  return [
    {
      id: "look",
      type: "speak",
      prompt: lesson.look || "Look at the picture. What can you see?",
      accepted: [...objects.map((o) => o.id), ...(lesson.lookWords || [])],
      vocabulary: objects.flatMap((o) => o.aliases),
      hint: `Try “I can see ${objects[0].kind === "person" ? "the" : "a"} ${objects[0].label}.”`,
      successFeedback: "Nice! You spotted it.",
    },
    {
      id: "find",
      type: "find",
      prompt: `Can you find the ${find.label}?`,
      targetId: find.id,
      accepted: [find.id],
      vocabulary: [],
      hint: `Look at the ${find.attributes.location} of the picture.`,
    },
    {
      id: "color",
      type: "describe",
      prompt: `What color is the ${subject}?`,
      targetId: color.id,
      accepted: [color.attributes.color],
      vocabulary: [color.id, color.attributes.color],
      hint: `Try “It is ${color.attributes.color}.”`,
      successFeedback: `Yes! The ${subject} is ${color.attributes.color}.`,
    },
    level !== "A1" && lesson.action
      ? {
          id: "action",
          type: lesson.action.openEnded ? "personal" : "action",
          prompt: lesson.action.prompt,
          accepted: lesson.action.accepted,
          vocabulary: lesson.action.accepted,
          hint: lesson.action.hint,
          successFeedback: lesson.action.feedback,
        }
      : {
          id: "choose",
          type: "choose",
          prompt: lesson.choose.prompt,
          accepted: [lesson.choose.target],
          choices: lesson.choose.options,
          vocabulary: [],
          hint: lesson.choose.hint,
        },
    {
      id: "personal",
      type: "personal",
      prompt:
        lesson.personal.prompt +
        (level === "B1" ? " Tell me a little about why." : ""),
      accepted: [],
      vocabulary: lesson.personal.vocabulary,
      hint: lesson.personal.hint,
      successFeedback: "That’s an interesting choice!",
    },
    topicFollowup(topicId),
  ];
}
