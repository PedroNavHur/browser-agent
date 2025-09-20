export type ChatMessage = {
  id: string;
  role: "user" | "agent";
  text: string;
  hint?: string;
};
