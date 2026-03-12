import promptSeed from "../../data/prompts.seed.json";

export type PromptRecord = {
  id: string;
  sideA: string;
  sideB: string;
};

const prompts = promptSeed as PromptRecord[];
const promptsById = new Map(prompts.map((prompt) => [prompt.id, prompt] as const));

export function getPromptById(promptId: string | null | undefined) {
  return promptId ? promptsById.get(promptId) ?? null : null;
}
