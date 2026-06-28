export interface GlmTokenUsage {
  readonly completionTokens: number;
  readonly promptTokens: number;
  readonly totalTokens: number;
}

export interface GlmToolCall {
  readonly function: {
    readonly arguments: string;
    readonly name: string;
  };
  readonly id: string;
  readonly index?: number;
  readonly type: "function";
}
