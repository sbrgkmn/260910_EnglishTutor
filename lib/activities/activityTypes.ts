import type { Correction, Level } from "../types";
export type QuestionType =
  | "speak"
  | "find"
  | "describe"
  | "choose"
  | "personal"
  | "action"
  | "memory";
export type SceneObject = {
  id: string;
  label: string;
  kind: string;
  aliases: string[];
  attributes: { color: string; location: string; action?: string };
  hitbox: { x: number; y: number; width: number; height: number };
};
export type ActivityQuestion = {
  id: string;
  type: QuestionType;
  prompt: string;
  targetId?: string;
  accepted: string[];
  choices?: string[];
  vocabulary: string[];
  hint: string;
  successFeedback?: string;
};
export type ActivityScene = {
  id: string;
  description: string;
  background: string;
  objects: SceneObject[];
  imageSource: "sample" | "generated" | "illustrated";
  composition?: "layered" | "illustration";
  hitboxes: "authored";
  generatedAt?: string;
};
export type Activity = {
  id: string;
  topic: string;
  level: Level;
  variant: number;
  createdAt: string;
  scene: ActivityScene;
  questions: ActivityQuestion[];
};
export type StudentAnswer =
  | { type: "speech" | "text"; text: string }
  | { type: "click"; objectId: string };
export type EvaluationResult = {
  success: boolean;
  attempt: boolean;
  vocabularyBonus: boolean;
  feedback: string;
  corrections: Correction[];
  creative: boolean;
  source: "local" | "ai";
};
