// Shared output truncation for built-in tools. Caps a tool result at a
// character budget and marks it truncated. MVP keeps the marker inline; the
// OpenCode-style on-disk full-output pointer is a future addition (recorded in
// module.md) and not required for the client four.

const TRUNCATION_MARKER = "\n...[truncated]";

export interface TruncatedOutput {
  readonly output: string;
  readonly truncated: boolean;
}

export const truncateOutput = (
  value: string,
  maxChars: number
): TruncatedOutput =>
  value.length <= maxChars
    ? { output: value, truncated: false }
    : {
        output: `${value.slice(0, maxChars)}${TRUNCATION_MARKER}`,
        truncated: true,
      };
