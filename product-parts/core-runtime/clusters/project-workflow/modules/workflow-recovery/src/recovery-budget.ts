import {
  type DocumentRef,
  PLAN_PATH,
} from "../../workflow-plan/src/workflow-plan-facade.js";
import {
  byteLength,
  KIT_COMMAND,
  type PacketSection,
  RECOVERY_SCHEMA,
  type RecoveryInput,
  type RecoveryPacket,
} from "./recovery-model.js";
import { schemaSection } from "./recovery-schema.js";
import {
  changesSection,
  decisionsSection,
  focusTask,
  nextSection,
  objectiveSection,
  recentSection,
  roundsSection,
  stateSection,
  taskSection,
  upcomingSection,
  verificationSection,
} from "./recovery-sections.js";

interface Part extends PacketSection {
  order: number;
}

interface Candidate {
  /** Alternatives tried in order; the first that fits is included. */
  options: Part[];
  reference: string;
}

const RULES_POINTER =
  "rules: follow the Workflow Kit section of AGENTS.md (managed by the kit).";
const TASK_CAPS = [2000, 1000, 500, 250, 120, 60];
const HEADING_PATTERN = /^(#{1,6})\s+(.+?)\s*#*\s*$/u;
const SLUG_DROP = /[^\p{L}\p{N}\s-]/gu;
const SLUG_SPACE = /\s+/gu;

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(SLUG_DROP, "")
    .trim()
    .replace(SLUG_SPACE, "-");
}

/** Returns the Markdown section under a heading (text or slug match), or null. */
export function extractHeading(text: string, heading: string): string | null {
  const lines = text.split("\n");
  const wanted = slug(heading);
  let start = -1;
  let level = 0;
  for (const [index, line] of lines.entries()) {
    const match = HEADING_PATTERN.exec(line);
    if (!match?.[1] || match[2] === undefined) {
      continue;
    }
    if (start === -1 && slug(match[2]) === wanted) {
      start = index;
      level = match[1].length;
    } else if (start !== -1 && match[1].length <= level) {
      return lines.slice(start, index).join("\n").trimEnd();
    }
  }
  return start === -1 ? null : lines.slice(start).join("\n").trimEnd();
}

function render(
  input: RecoveryInput,
  parts: Part[],
  references: string[],
  omitted: string[],
  bytes: number
): string {
  const sorted = [...parts].sort((left, right) => left.order - right.order);
  const head = [
    "# Workflow recovery packet",
    `bytes: ${bytes} / budget: ${input.budgetBytes}${bytes > input.budgetBytes ? " (over budget)" : ""}`,
    `included: ${sorted.map((part) => part.name).join(", ")}`,
    `omitted: ${omitted.length > 0 ? omitted.join(", ") : "none"}`,
    RULES_POINTER,
  ].join("\n");
  const body = sorted.map((part) => `## ${part.name}\n${part.text}`);
  const refs = `## references\n${references.length > 0 ? references.map((line) => `- ${line}`).join("\n") : "- none"}`;
  return `${[head, ...body, refs].join("\n\n")}\n`;
}

/** Renders until the byte count printed in the header matches the text. */
function settle(
  input: RecoveryInput,
  parts: Part[],
  references: string[],
  omitted: string[]
): { bytes: number; text: string } {
  let bytes = 0;
  let text = render(input, parts, references, omitted, bytes);
  for (
    let attempt = 0;
    attempt < 4 && byteLength(text) !== bytes;
    attempt += 1
  ) {
    bytes = byteLength(text);
    text = render(input, parts, references, omitted, bytes);
  }
  return { bytes: byteLength(text), text };
}

/**
 * Scope and task documents, one entry per path: a whole-document reference
 * wins over a heading reference, and a path is required if any ref says so.
 */
function documentRefs(input: RecoveryInput): DocumentRef[] {
  const scope = input.plan.scope;
  const refs: DocumentRef[] = [];
  if (scope?.spec) {
    refs.push({ path: scope.spec, required: true });
  }
  refs.push(
    ...(scope?.context ?? []),
    ...(focusTask(input.plan)?.context ?? [])
  );
  const byPath = new Map<string, DocumentRef>();
  for (const ref of refs) {
    const known = byPath.get(ref.path);
    if (!known) {
      byPath.set(ref.path, { ...ref });
      continue;
    }
    byPath.set(ref.path, {
      ...(known.heading && !ref.heading ? { path: ref.path } : known),
      required: known.required || ref.required,
    });
  }
  return [...byPath.values()];
}

function documentCandidates(
  input: RecoveryInput,
  references: string[]
): Candidate[] {
  const candidates: Candidate[] = [];
  for (const ref of documentRefs(input)) {
    const label = ref.heading ? `${ref.path}#${ref.heading}` : ref.path;
    const text = input.readDocument(ref.path);
    if (text === null) {
      references.push(`${label}: missing file`);
      continue;
    }
    if (!ref.required) {
      references.push(
        `${label} (${byteLength(text)} bytes, optional): read the file when needed`
      );
      continue;
    }
    const options: Part[] = [
      { name: `document ${ref.path}`, order: 12, text: text.trimEnd() },
    ];
    const section = ref.heading ? extractHeading(text, ref.heading) : null;
    if (section) {
      options.push({ name: `document ${label}`, order: 12, text: section });
    }
    candidates.push({
      options,
      reference: `${label} (${byteLength(text)} bytes): read the file`,
    });
  }
  return candidates;
}

function optionalCandidates(
  input: RecoveryInput,
  references: string[]
): Candidate[] {
  const candidates: Candidate[] = [];
  const add = (
    name: string,
    order: number,
    text: string | null,
    reference: (bytes: number) => string
  ) => {
    if (text !== null) {
      candidates.push({
        options: [{ name, order, text }],
        reference: reference(byteLength(text)),
      });
    }
  };
  add(
    "rounds",
    8,
    roundsSection(input),
    (bytes) => `rounds (${bytes} bytes): run \`${KIT_COMMAND} history\``
  );
  add(
    "decisions",
    9,
    decisionsSection(input),
    (bytes) => `decisions (${bytes} bytes): scope.decisions in ${PLAN_PATH}`
  );
  add(
    "verification",
    11,
    verificationSection(input),
    (bytes) =>
      `verification (${bytes} bytes): .harness/workflow/local/verification/last.json`
  );
  return [...candidates, ...documentCandidates(input, references)];
}

/** Sections that always stay; `schema` only when the next step has an input. */
function mandatoryParts(input: RecoveryInput, cap: number | null): Part[] {
  const schema = schemaSection(input);
  return [
    { name: "state", order: 1, text: stateSection(input) },
    { name: "next", order: 2, text: nextSection(input) },
    { name: "objective", order: 3, text: objectiveSection(input) },
    { name: "task", order: 4, text: taskSection(input, cap) },
    ...(schema === null ? [] : [{ name: "schema", order: 5, text: schema }]),
    { name: "upcoming", order: 6, text: upcomingSection(input) },
    { name: "recent", order: 7, text: recentSection(input) },
    { name: "changes", order: 10, text: changesSection(input) },
  ];
}

function assembleWithCap(
  input: RecoveryInput,
  cap: number | null
): RecoveryPacket {
  const references: string[] = [];
  const omitted: string[] = [];
  const candidates = optionalCandidates(input, references);
  const fits = (parts: Part[]) =>
    settle(input, parts, references, omitted).bytes <= input.budgetBytes;
  let parts = mandatoryParts(input, cap);
  const optional: { candidate: Candidate; part: Part }[] = [];
  for (const candidate of candidates) {
    const chosen = candidate.options.find((option) => fits([...parts, option]));
    if (chosen) {
      parts = [...parts, chosen];
      optional.push({ candidate, part: chosen });
      if (chosen !== candidate.options[0]) {
        references.push(
          `${candidate.reference} (only its section is included)`
        );
      }
    } else {
      omitted.push(candidate.options[0]?.name ?? "section");
      references.push(candidate.reference);
    }
  }
  while (!fits(parts) && optional.length > 0) {
    const last = optional.pop();
    if (last) {
      parts = parts.filter((part) => part !== last.part);
      omitted.push(last.part.name);
      references.push(last.candidate.reference);
    }
  }
  const { bytes, text } = settle(input, parts, references, omitted);
  const sorted = [...parts].sort((left, right) => left.order - right.order);
  return {
    budget: input.budgetBytes,
    bytes,
    event: input.event,
    included: sorted.map((part) => part.name),
    omitted,
    overBudget: bytes > input.budgetBytes,
    references,
    schema: RECOVERY_SCHEMA,
    sections: sorted.map(({ name, text: sectionText }) => ({
      name,
      text: sectionText,
    })),
    text,
    truncated: cap !== null && taskSection(input, cap) !== taskSection(input),
  };
}

/**
 * Assembles the packet by priority within `budgetBytes`. Mandatory sections
 * always stay; when they do not fit, long task fields are shortened with a
 * marker, step by step. Optional sections move to references when they do
 * not fit. Nothing is cut silently: an oversized packet says so.
 */
export function assemblePacket(input: RecoveryInput): RecoveryPacket {
  let packet = assembleWithCap(input, null);
  for (const cap of TASK_CAPS) {
    if (!packet.overBudget) {
      break;
    }
    packet = assembleWithCap(input, cap);
  }
  return packet;
}
