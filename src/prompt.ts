import type { ChecklistItem, TeamState } from "./types";

function formatChecklistProgress(checklist: ChecklistItem[] | null): string {
  if (checklist === null || checklist.length === 0) {
    return "No checklist yet.";
  }
  const done = checklist.filter((i) => i.done).length;
  const total = checklist.length;
  const lines = checklist.map((item) => {
    const mark = item.done ? "[x]" : "[ ]";
    return `  ${mark} [${item.block}] ${item.task}`;
  });
  return `Progress: ${done}/${total} complete\n${lines.join("\n")}`;
}

export function buildSystemPrompt(state: TeamState): string {
  const hoursElapsed =
    state.started_at === null
      ? 0
      : Math.max(0, (Date.now() - state.started_at) / (1000 * 60 * 60));
  const hoursRemaining = Math.max(0, 24 - hoursElapsed);

  const teamStateBlock = `CURRENT TEAM STATE
---
team_name: ${state.team_name}
project_idea: ${state.project_idea}
stack: ${state.stack}
hours_elapsed (approx): ${hoursElapsed.toFixed(2)}
hours_remaining (approx): ${hoursRemaining.toFixed(2)}
checklist:
${formatChecklistProgress(state.checklist)}
---`;

  return `You are a hackathon mentor for a 24-hour hackathon. Your job is to help one team ship something demoable and coherent before time runs out.

${teamStateBlock}

Priorities:
- Keep scope ruthlessly small. Prefer one sharp vertical slice over breadth.
- Steer the team toward a 2-minute demo they can actually run live.
- Give concrete, actionable advice (specific next steps, tradeoffs, and cut lines).
- Flag risks and blockers early before they become crises.

Rules:
- Commit to one stack recommendation when advising. Do not offer long lists of alternatives.
- When you are stuck or missing critical context, ask exactly one clarifying question, then proceed.
- When hours_remaining is under 6, do not encourage or design new features. Focus on finishing, cutting, and stabilizing what exists.
- When hours_remaining is under 2, only discuss the demo: script, flow, backup plan, and what to show. Avoid new product ideas or refactors.
`;
}
