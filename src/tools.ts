import { tool } from "ai";
import { z } from "zod";
import type { ChecklistItem, TeamState } from "./types";

const CHECKLIST_BLOCKS: ChecklistItem["block"][] = [
  "0-6h",
  "6-12h",
  "12-18h",
  "18-24h"
];

const CHECKLIST_TASKS = [
  "setup/deploy",
  "schema/API",
  "UI/data wiring",
  "core feature",
  "bug fixes",
  "error handling",
  "polish",
  "demo rehearsal"
] as const;

function buildDefaultChecklist(): ChecklistItem[] {
  return CHECKLIST_TASKS.map((task, i) => ({
    block: CHECKLIST_BLOCKS[Math.floor(i / 2)]!,
    task,
    done: false
  }));
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function createTools(
  state: TeamState,
  setState: (update: Partial<TeamState>) => void
) {
  return {
    evaluate_idea: tool({
      description:
        "Record the team's project idea and return a quick feasibility read.",
      inputSchema: z.object({
        idea: z.string().describe("The project idea summary"),
        team_size: z.number().describe("Number of people on the team"),
        stack: z.string().optional().describe("Stack if already chosen")
      }),
      execute: async ({ idea, team_size }) => {
        setState({ project_idea: idea });
        const words = wordCount(idea);
        const overLimit = words > 30;
        const feasibility = overLimit ? ("medium" as const) : ("high" as const);
        const verdict = overLimit
          ? "Idea is broad; narrow to one user story and demo path before building."
          : "Idea is concise enough to scope for a 24h build.";
        const team_size_note =
          team_size <= 1
            ? "Solo: keep surface area tiny and reuse hosted services."
            : team_size <= 3
              ? "Small team: split deploy/schema vs UI clearly."
              : "Larger team: risk duplicate work—assign one owner per vertical slice.";
        return { feasibility, verdict, team_size_note };
      }
    }),

    suggest_stack: tool({
      description:
        "Pick one recommended stack for the project and persist it on the team state.",
      inputSchema: z.object({
        project_type: z.string().describe("What kind of app or experience"),
        team_skills: z.string().optional().describe("Team's strengths"),
        has_backend: z
          .boolean()
          .optional()
          .describe("Whether they need server/API persistence")
      }),
      execute: async ({ has_backend }) => {
        const recommendation =
          has_backend === false
            ? "Astro on Cloudflare Pages"
            : "TanStack Start on Cloudflare Workers + D1 + Tailwind";
        setState({ stack: recommendation });
        return recommendation;
      }
    }),

    generate_checklist: tool({
      description:
        "Create the standard 24h hackathon checklist and save it to team state.",
      inputSchema: z.object({
        idea: z.string(),
        stack: z.string(),
        team_size: z.number()
      }),
      execute: async ({ idea, stack, team_size }) => {
        void idea;
        void stack;
        void team_size;
        const checklist = buildDefaultChecklist();
        setState({ checklist });
        return checklist;
      }
    }),

    mark_task_done: tool({
      description: "Mark a checklist item as done by its 0-based index.",
      inputSchema: z.object({
        index: z.number().describe("0-based index into the checklist")
      }),
      execute: async ({ index }) => {
        if (state.checklist === null) {
          return { error: "No checklist yet. Run generate_checklist first." };
        }
        if (
          !Number.isInteger(index) ||
          index < 0 ||
          index >= state.checklist.length
        ) {
          return {
            error: `Invalid index ${index}. Valid range: 0–${state.checklist.length - 1}.`
          };
        }
        const checklist = state.checklist.map((item, i) =>
          i === index ? { ...item, done: true } : item
        );
        setState({ checklist });
        return { index, task: checklist[index]!.task, done: true };
      }
    }),

    generate_team_name: tool({
      description: "Suggest three short team names the model can refine.",
      inputSchema: z.object({
        idea: z.string(),
        vibe: z.enum(["serious", "funny", "technical"]).optional()
      }),
      execute: async ({ idea, vibe }) => {
        const slug =
          idea
            .slice(0, 24)
            .replace(/\s+/g, "-")
            .replace(/[^a-zA-Z0-9-]/g, "")
            .toLowerCase() || "team";
        const base = [`${slug}-labs`, `team-${slug}`, `${slug}-crew`];
        if (vibe === "serious") {
          return [`${slug}-ventures`, `${slug}-systems`, `${slug}-works`];
        }
        if (vibe === "funny") {
          return [
            `${slug}-goblins`,
            `sleep-deprived-${slug}`,
            `${slug}-and-chaos`
          ];
        }
        if (vibe === "technical") {
          return [`${slug}-/dev`, `${slug}-core`, `async-${slug}`];
        }
        return base;
      }
    })
  };
}
