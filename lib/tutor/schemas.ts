const strings = { type: "array", items: { type: "string" } };
const corrections = {
  type: "array",
  items: {
    type: "object",
    properties: { original: { type: "string" }, corrected: { type: "string" } },
    required: ["original", "corrected"],
    additionalProperties: false,
  },
};
export const replySchema = {
  type: "object",
  properties: {
    message: { type: "string" },
    corrections,
    newVocabulary: strings,
  },
  required: ["message", "corrections", "newVocabulary"],
  additionalProperties: false,
};
export const reportSchema = {
  type: "object",
  properties: {
    vocabularyPracticed: strings,
    importantCorrections: corrections,
    newVocabulary: strings,
    strengths: strings,
    practiceRecommendation: { type: "string" },
  },
  required: [
    "vocabularyPracticed",
    "importantCorrections",
    "newVocabulary",
    "strengths",
    "practiceRecommendation",
  ],
  additionalProperties: false,
};
