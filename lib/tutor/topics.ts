import type { Level } from "../types";
export type Topic = {
  id: string;
  title: string;
  description: string;
  starterQuestions: string[];
  followUpQuestions: string[];
  targetVocabulary: string[];
  grammarFocus: string;
  level: Level[];
  icon: string;
  color: string;
};
export const topics: Topic[] = [
  {
    id: "animals",
    title: "Animals",
    description: "Wild, wonderful & a little fluffy.",
    starterQuestions: ["What is your favorite animal?"],
    followUpQuestions: [
      "Why do you like it?",
      "Have you ever seen one?",
      "What can it do?",
    ],
    targetVocabulary: ["pet", "wild", "fluffy", "intelligent", "dolphin"],
    grammarFocus: "Present simple, can for abilities, past experiences",
    level: ["A1", "A2", "B1"],
    icon: "paw",
    color: "mint",
  },
  {
    id: "my-town",
    title: "My Town",
    description: "Places to go, things to see.",
    starterQuestions: ["What places do you like in a town?"],
    followUpQuestions: ["What can you do there?", "How do you get there?"],
    targetVocabulary: ["park", "library", "shop", "near", "between"],
    grammarFocus: "There is / there are, prepositions of place",
    level: ["A1", "A2", "B1"],
    icon: "town",
    color: "peach",
  },
  {
    id: "daily-routines",
    title: "Daily Routines",
    description: "From good morning to goodnight.",
    starterQuestions: ["What do you do first in the morning?"],
    followUpQuestions: [
      "What do you have for breakfast?",
      "What do you do after school?",
    ],
    targetVocabulary: ["wake up", "breakfast", "usually", "before", "after"],
    grammarFocus: "Present simple, time expressions, adverbs of frequency",
    level: ["A1", "A2", "B1"],
    icon: "sun",
    color: "yellow",
  },
  {
    id: "hobbies",
    title: "Hobbies",
    description: "The things you love to do.",
    starterQuestions: ["What do you like doing in your free time?"],
    followUpQuestions: ["Why do you enjoy it?", "Do you like music?"],
    targetVocabulary: ["play", "draw", "instrument", "practice", "enjoy"],
    grammarFocus: "Like + gerund, present simple",
    level: ["A1", "A2", "B1"],
    icon: "palette",
    color: "lilac",
  },
  {
    id: "food",
    title: "Food",
    description: "Let’s talk about something tasty.",
    starterQuestions: ["What is your favorite food?"],
    followUpQuestions: ["What do you like on pizza?", "Can you cook anything?"],
    targetVocabulary: ["vegetables", "fruit", "delicious", "sweet", "cook"],
    grammarFocus: "Like / dislike, some / any, countable nouns",
    level: ["A1", "A2", "B1"],
    icon: "apple",
    color: "rose",
  },
  {
    id: "family",
    title: "Family",
    description: "The people who make you smile.",
    starterQuestions: ["What do you like doing with your family?"],
    followUpQuestions: [
      "Do you play any games together?",
      "What makes that fun?",
    ],
    targetVocabulary: ["family", "together", "sister", "brother", "help"],
    grammarFocus: "Possessives, present simple",
    level: ["A1", "A2", "B1"],
    icon: "people",
    color: "blue",
  },
  {
    id: "school",
    title: "School",
    description: "Big ideas and everyday adventures.",
    starterQuestions: ["What is your favorite school subject?"],
    followUpQuestions: ["Why do you like it?", "What do you do at break time?"],
    targetVocabulary: ["subject", "learn", "break", "homework", "science"],
    grammarFocus: "Present simple, because",
    level: ["A1", "A2", "B1"],
    icon: "book",
    color: "blue",
  },
  {
    id: "holiday",
    title: "Holiday",
    description: "A little escape, a big adventure.",
    starterQuestions: ["Would you rather visit the beach or the mountains?"],
    followUpQuestions: ["What would you do there?", "What would you pack?"],
    targetVocabulary: ["beach", "mountains", "travel", "suitcase", "explore"],
    grammarFocus: "Past simple, would like, future plans",
    level: ["A1", "A2", "B1"],
    icon: "palm",
    color: "mint",
  },
  {
    id: "feelings",
    title: "Feelings",
    description: "Every feeling has a word.",
    starterQuestions: ["How are you feeling today?"],
    followUpQuestions: ["What makes you happy?", "What helps you feel calm?"],
    targetVocabulary: ["happy", "excited", "tired", "calm", "nervous"],
    grammarFocus: "Be + adjective, because",
    level: ["A1", "A2", "B1"],
    icon: "smile",
    color: "yellow",
  },
  {
    id: "home",
    title: "Home",
    description: "Your own little corner of the world.",
    starterQuestions: ["What would your dream room look like?"],
    followUpQuestions: [
      "What would you put in it?",
      "What could you do there?",
    ],
    targetVocabulary: ["room", "window", "bookshelf", "comfortable", "beside"],
    grammarFocus: "There is / there are, prepositions",
    level: ["A1", "A2", "B1"],
    icon: "home",
    color: "peach",
  },
];
export const getTopic = (id: string) => topics.find((topic) => topic.id === id);
