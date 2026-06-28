export interface GlmOpenCodeSessionEvent {
  readonly content?: string;
  readonly data?: Record<string, unknown>;
  readonly message?: string;
  readonly provider?: string;
  readonly tag?: string;
  readonly timestamp?: string;
  readonly tokenUsage?: {
    readonly limit: number;
    readonly used: number;
  };
  readonly type: string;
  readonly uuid?: string;
}
