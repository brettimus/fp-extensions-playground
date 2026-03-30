/**
 * Consensus
 *
 * Spawns two AI coding agents — "Dario" (Claude Code, via the Agent SDK) and
 * "Sam" (OpenAI Codex, via the Codex SDK) — to collaboratively draft
 * implementation plans for an issue. The agents converse through issue
 * comments, review each other's work, and iterate until they reach consensus
 * or exhaust a maximum of 3 rounds.
 *
 * Trigger:
 *   - Desktop: Command palette action "Start Consensus"
 *   - CLI: Add a comment containing "/consensus" on any issue
 *
 * Custom properties:
 *   - consensus_status:  idle | running | dario_drafting | sam_drafting |
 *                        dario_reviewing | sam_reviewing | consensus_reached | failed | no_consensus
 *   - consensus_round:   Current round number (1–3)
 *   - consensus_turn:    Which agent is currently active (dario | sam)
 *
 * Configuration (.fp/config.toml):
 *
 *   [extensions.consensus]
 *   max_rounds = 3            # Maximum negotiation rounds (default 3)
 *   claude_model = "opus"     # Model for Claude agent (default "opus")
 *   codex_model = "o4-mini"   # Model for Codex agent (default "o4-mini")
 */

import type { ExtensionInit, ExtensionIssue } from "@fiberplane/extensions";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Module resolution helper
// ---------------------------------------------------------------------------

/**
 * The fp extension runtime (Bun) resolves modules relative to the extension
 * file (.fp/extensions/), not the project root where node_modules lives.
 * We construct absolute paths to the specific entry files.
 */
const SDK_ENTRIES: Record<string, string> = {
  "@anthropic-ai/claude-agent-sdk": "node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs",
  "@openai/codex-sdk": "node_modules/@openai/codex-sdk/dist/index.js",
};

function projectModulePath(projectDir: string, pkg: string): string {
  const entry = SDK_ENTRIES[pkg];
  if (!entry) throw new Error(`Unknown SDK package: ${pkg}`);
  return join(projectDir, entry);
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ConsensusStatus =
  | "idle"
  | "running"
  | "dario_drafting"
  | "sam_drafting"
  | "dario_reviewing"
  | "sam_reviewing"
  | "consensus_reached"
  | "failed"
  | "no_consensus";

interface ConsensusState {
  issueId: string;
  round: number;
  maxRounds: number;
  darioPlan: string;
  samPlan: string;
  darioFeedback: string;
  samFeedback: string;
  history: Array<{ agent: string; type: string; content: string }>;
}

// ---------------------------------------------------------------------------
// Agent runners
// ---------------------------------------------------------------------------

/**
 * Run Dario (Claude Code) via the Agent SDK.
 * The Agent SDK's query() returns an async iterable of messages.
 */
async function runDario(
  prompt: string,
  cwd: string,
  projectDir: string,
  log: { info: (m: string) => void; warn: (m: string) => void; error: (m: string) => void },
): Promise<string> {
  log.info("[Dario] Starting Claude Code agent...");
  try {
    const sdkPath = projectModulePath(projectDir, "@anthropic-ai/claude-agent-sdk");
    const { query } = await import(sdkPath);
    let result = "";
    for await (const message of query({
      prompt,
      options: {
        cwd,
        allowedTools: ["Read", "Glob", "Grep", "Bash", "WebSearch", "WebFetch"],
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        maxTurns: 30,
        systemPrompt: `You are Dario, an expert software architect and implementation planner. You are collaborating with another AI agent named Sam to draft a comprehensive implementation plan for a software issue.

Your goal is to produce the highest quality, most actionable implementation plan possible. Be thorough, specific, and practical. Include:
- Clear acceptance criteria
- Step-by-step implementation approach
- Key architectural decisions and their rationale
- Edge cases and error handling considerations
- Testing strategy

When reviewing Sam's work, be constructive but rigorous. Point out gaps, suggest improvements, and acknowledge good ideas. When you agree with the overall direction, say so clearly.

IMPORTANT: Your final output should be ONLY the plan/review text. Do not include meta-commentary about the process. Do not use tools unless you need to research the actual codebase to inform your plan.`,
      },
    })) {
      if ("result" in message) {
        result = message.result;
      }
    }
    log.info(`[Dario] Completed. Response length: ${result.length}`);
    return result || "(No response from Dario)";
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[Dario] Agent SDK error: ${msg}`);
    throw new Error(`Dario agent failed: ${msg}`);
  }
}

/**
 * Run Sam (OpenAI Codex) via the Codex SDK.
 * The Codex SDK spawns the codex CLI and exchanges JSONL events.
 */
async function runSam(
  prompt: string,
  cwd: string,
  projectDir: string,
  log: { info: (m: string) => void; warn: (m: string) => void; error: (m: string) => void },
): Promise<string> {
  log.info("[Sam] Starting Codex agent...");
  try {
    const sdkPath = projectModulePath(projectDir, "@openai/codex-sdk");
    const { Codex } = await import(sdkPath);
    const codex = new Codex();
    const thread = codex.startThread({
      workingDirectory: cwd,
      sandboxMode: "danger-full-access",
    });

    const turn = await thread.run(prompt);
    const result = turn.finalResponse || "";
    log.info(`[Sam] Completed. Response length: ${result.length}`);
    return result || "(No response from Sam)";
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`[Sam] Codex SDK error: ${msg}`);
    throw new Error(`Sam agent failed: ${msg}`);
  }
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------

function buildIssueContext(issue: ExtensionIssue): string {
  return [
    `# Issue: ${issue.title}`,
    `**ID:** ${issue.id}`,
    `**Status:** ${issue.status}`,
    issue.priority ? `**Priority:** ${issue.priority}` : null,
    "",
    "## Description",
    issue.description || "(No description provided)",
  ]
    .filter((line) => line !== null)
    .join("\n");
}

function buildDraftPrompt(issueContext: string, agentName: string, otherName: string): string {
  return `You are participating in a consensus-building process with another AI agent named ${otherName}.

Here is the issue you both need to plan for:

${issueContext}

Please draft a comprehensive implementation plan for this issue. Your plan should include:

1. **Summary** — A concise overview of what needs to be done
2. **Acceptance Criteria** — Clear, testable criteria for when this is complete
3. **Implementation Steps** — Ordered, actionable steps with enough detail to execute
4. **Architecture & Design Decisions** — Key technical choices and their rationale
5. **Edge Cases & Error Handling** — What could go wrong and how to handle it
6. **Testing Strategy** — How to verify the implementation works correctly
7. **Estimated Complexity** — Rough effort estimate and risk assessment

Feel free to explore the codebase to inform your plan. Be specific — reference actual files, functions, and patterns you find.

Produce ONLY the plan text. No meta-commentary.`;
}

function buildReviewPrompt(
  issueContext: string,
  ownPlan: string,
  otherPlan: string,
  otherName: string,
  round: number,
  maxRounds: number,
  priorFeedback: string,
): string {
  const isLastRound = round >= maxRounds;

  return `You are reviewing ${otherName}'s implementation plan and refining your own.

## Original Issue
${issueContext}

## Your Previous Plan
${ownPlan}

## ${otherName}'s Plan
${otherPlan}

${priorFeedback ? `## Previous Feedback from ${otherName}\n${priorFeedback}\n` : ""}

## Your Task (Round ${round}/${maxRounds})

Review ${otherName}'s plan carefully. Consider:
- What did they get right that you missed?
- Where do you disagree, and why?
- What synthesis of both plans would be strongest?

${isLastRound
    ? `This is the FINAL round. You MUST produce your final, definitive plan that incorporates the best ideas from both proposals. After this, there are no more revisions.

If you broadly agree with ${otherName}'s direction (even if you'd adjust details), begin your response with "CONSENSUS: YES" followed by your merged final plan.

If you fundamentally disagree on approach, begin with "CONSENSUS: NO" followed by your own final plan and a brief explanation of the core disagreement.`
    : `Produce an updated version of your plan that incorporates valid feedback and good ideas from ${otherName}'s proposal. Explain any significant changes from your previous version.

If you already agree with ${otherName}'s plan and have no material changes, begin your response with "CONSENSUS: YES" and briefly explain why you agree.`
}

Produce ONLY the review/plan text. No meta-commentary about the process.`;
}

function buildRevisionPrompt(
  issueContext: string,
  ownPlan: string,
  feedback: string,
  otherPlan: string,
  otherName: string,
  round: number,
  maxRounds: number,
): string {
  const isLastRound = round >= maxRounds;

  return `You received feedback on your implementation plan. Time to revise.

## Original Issue
${issueContext}

## Your Previous Plan
${ownPlan}

## Feedback from ${otherName}
${feedback}

## ${otherName}'s Current Plan (for reference)
${otherPlan}

## Your Task (Round ${round}/${maxRounds})

Revise your plan taking into account:
1. ${otherName}'s feedback — address valid points, explain disagreements
2. ${otherName}'s plan — borrow good ideas, note where approaches differ
3. Your own research — feel free to explore the codebase for additional context

${isLastRound
    ? `This is the FINAL round. Produce your definitive plan. If you agree with the overall direction and your differences are minor, begin with "CONSENSUS: YES". If you fundamentally disagree, begin with "CONSENSUS: NO".`
    : `Produce an improved plan. If you now agree with ${otherName}'s approach, begin with "CONSENSUS: YES".`
}

Produce ONLY the plan text.`;
}

// ---------------------------------------------------------------------------
// Consensus orchestrator
// ---------------------------------------------------------------------------

function detectConsensus(response: string): boolean {
  const first200 = response.slice(0, 200).toUpperCase();
  return first200.includes("CONSENSUS: YES") || first200.includes("CONSENSUS:YES");
}

async function runConsensusProtocol(
  fp: Parameters<ExtensionInit>[0],
  issueId: string,
): Promise<void> {
  const maxRounds = parseInt(fp.config.get("max_rounds") ?? "3", 10);
  const issue = await fp.issues.get(issueId);
  if (!issue) {
    fp.log.error(`Issue ${issueId} not found`);
    return;
  }

  const issueContext = buildIssueContext(issue);
  const cwd = fp.projectDir;

  const state: ConsensusState = {
    issueId,
    round: 1,
    maxRounds,
    darioPlan: "",
    samPlan: "",
    darioFeedback: "",
    samFeedback: "",
    history: [],
  };

  const updateStatus = async (status: ConsensusStatus, round?: number) => {
    const props: Record<string, unknown> = { consensus_status: status };
    if (round !== undefined) props.consensus_round = String(round);
    await fp.issues.update(issueId, { properties: props });
  };

  const postComment = async (agent: string, type: string, content: string) => {
    const prefix = agent === "dario" ? "🟣 **Dario** (Claude)" : "🟢 **Sam** (Codex)";
    const label = type === "draft" ? "Draft" : type === "review" ? "Review" : "Final Plan";
    const header = `${prefix} — ${label} (Round ${state.round}/${maxRounds})`;
    const fullContent = `${header}\n\n---\n\n${content}`;
    await fp.comments.create(issueId, fullContent);
    state.history.push({ agent, type, content });
  };

  try {
    await updateStatus("running", 1);
    await fp.comments.create(
      issueId,
      `⚡ **Consensus Protocol Started**\n\nTwo AI agents will now collaborate to draft an implementation plan for this issue.\n\n- 🟣 **Dario** — Claude Code (Anthropic)\n- 🟢 **Sam** — Codex (OpenAI)\n\nMax rounds: ${maxRounds}. The agents will draft, review, and refine until they reach consensus.\n\n---`,
    );

    // --- Phase 1: Initial drafts (parallel) ---
    fp.log.info("Phase 1: Initial drafts");
    await updateStatus("dario_drafting", 1);
    await fp.issues.update(issueId, { properties: { consensus_turn: "dario" } });

    const darioPrompt = buildDraftPrompt(issueContext, "Dario", "Sam");
    const samPrompt = buildDraftPrompt(issueContext, "Sam", "Dario");

    // Run both agents in parallel for the initial draft
    const [darioResult, samResult] = await Promise.all([
      runDario(darioPrompt, cwd, cwd, fp.log),
      (async () => {
        await updateStatus("sam_drafting", 1);
        await fp.issues.update(issueId, { properties: { consensus_turn: "sam" } });
        return runSam(samPrompt, cwd, cwd, fp.log);
      })(),
    ]);

    state.darioPlan = darioResult;
    state.samPlan = samResult;

    await postComment("dario", "draft", state.darioPlan);
    await postComment("sam", "draft", state.samPlan);

    // --- Phase 2: Review rounds ---
    for (let round = 1; round <= maxRounds; round++) {
      state.round = round;
      fp.log.info(`Round ${round}/${maxRounds}: Cross-review`);

      // Dario reviews Sam's plan
      await updateStatus("dario_reviewing", round);
      await fp.issues.update(issueId, { properties: { consensus_turn: "dario" } });

      const darioReviewPrompt = round === 1
        ? buildReviewPrompt(
            issueContext,
            state.darioPlan,
            state.samPlan,
            "Sam",
            round,
            maxRounds,
            "",
          )
        : buildRevisionPrompt(
            issueContext,
            state.darioPlan,
            state.samFeedback,
            state.samPlan,
            "Sam",
            round,
            maxRounds,
          );

      const darioReview = await runDario(darioReviewPrompt, cwd, cwd, fp.log);
      state.darioFeedback = darioReview;

      // Check for early consensus from Dario
      if (detectConsensus(darioReview)) {
        state.darioPlan = darioReview;
        await postComment("dario", "final", state.darioPlan);
        await updateStatus("consensus_reached", round);
        await fp.comments.create(
          issueId,
          `✅ **Consensus Reached** (Round ${round}/${maxRounds})\n\nDario agreed with the converged direction. The agents have reached alignment on the implementation plan.`,
        );
        await writeFinalPlan(fp, issueId, state, "dario");
        return;
      }

      await postComment("dario", "review", darioReview);

      // Sam reviews Dario's plan
      await updateStatus("sam_reviewing", round);
      await fp.issues.update(issueId, { properties: { consensus_turn: "sam" } });

      const samReviewPrompt = round === 1
        ? buildReviewPrompt(
            issueContext,
            state.samPlan,
            state.darioPlan,
            "Dario",
            round,
            maxRounds,
            "",
          )
        : buildRevisionPrompt(
            issueContext,
            state.samPlan,
            state.darioFeedback,
            state.darioPlan,
            "Dario",
            round,
            maxRounds,
          );

      const samReview = await runSam(samReviewPrompt, cwd, cwd, fp.log);
      state.samFeedback = samReview;

      // Check for early consensus from Sam
      if (detectConsensus(samReview)) {
        state.samPlan = samReview;
        await postComment("sam", "final", state.samPlan);
        await updateStatus("consensus_reached", round);
        await fp.comments.create(
          issueId,
          `✅ **Consensus Reached** (Round ${round}/${maxRounds})\n\nSam agreed with the converged direction. The agents have reached alignment on the implementation plan.`,
        );
        await writeFinalPlan(fp, issueId, state, "sam");
        return;
      }

      await postComment("sam", "review", samReview);

      // Update plans for next round
      state.darioPlan = darioReview;
      state.samPlan = samReview;
    }

    // --- Phase 3: No consensus after max rounds ---
    fp.log.warn(`No consensus after ${maxRounds} rounds`);
    await updateStatus("no_consensus", maxRounds);
    await fp.comments.create(
      issueId,
      `⚠️ **No Consensus** after ${maxRounds} rounds.\n\nThe agents were unable to fully agree. Both final plans are above. Consider:\n\n1. Review both plans and pick the stronger one\n2. Synthesize the best parts of each manually\n3. Run \`/consensus\` again with a more specific issue description\n\nThe issue description has been updated with both final proposals for your review.`,
    );
    await writeFinalPlan(fp, issueId, state, "both");
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    fp.log.error(`Consensus protocol failed: ${msg}`);
    await updateStatus("failed");
    await fp.comments.create(
      issueId,
      `❌ **Consensus Failed**\n\nAn error occurred during the consensus process:\n\n\`\`\`\n${msg}\n\`\`\`\n\nCheck the extension logs for details.`,
    );
  }
}

/**
 * Write the final plan(s) into the issue description.
 */
async function writeFinalPlan(
  fp: Parameters<ExtensionInit>[0],
  issueId: string,
  state: ConsensusState,
  winner: "dario" | "sam" | "both",
): Promise<void> {
  const issue = await fp.issues.get(issueId);
  if (!issue) return;

  const originalDesc = issue.description || "";
  let planSection: string;

  if (winner === "both") {
    planSection = [
      "",
      "---",
      "",
      "## 🤖 Consensus Results (No Agreement)",
      "",
      "### 🟣 Dario's Final Plan (Claude)",
      "",
      state.darioPlan,
      "",
      "### 🟢 Sam's Final Plan (Codex)",
      "",
      state.samPlan,
      "",
      "---",
      `*Generated by Consensus extension after ${state.maxRounds} rounds*`,
    ].join("\n");
  } else {
    const agentLabel = winner === "dario" ? "🟣 Dario (Claude)" : "🟢 Sam (Codex)";
    const plan = winner === "dario" ? state.darioPlan : state.samPlan;
    planSection = [
      "",
      "---",
      "",
      `## 🤖 Consensus Plan (agreed by ${agentLabel})`,
      "",
      plan,
      "",
      "---",
      `*Generated by Consensus extension — consensus reached in round ${state.round}/${state.maxRounds}*`,
    ].join("\n");
  }

  await fp.issues.update(issueId, {
    description: originalDesc + planSection,
  });

  fp.log.info(`Final plan written to issue ${issueId}`);
}

// ---------------------------------------------------------------------------
// Active runs tracking (prevent concurrent runs on same issue)
// ---------------------------------------------------------------------------

const activeRuns = new Set<string>();

async function startConsensus(
  fp: Parameters<ExtensionInit>[0],
  issueId: string,
): Promise<void> {
  if (activeRuns.has(issueId)) {
    fp.log.warn(`Consensus already running on issue ${issueId}`);
    await fp.ui.notify("Consensus is already running on this issue", { kind: "warning" });
    return;
  }

  activeRuns.add(issueId);
  try {
    await runConsensusProtocol(fp, issueId);
  } finally {
    activeRuns.delete(issueId);
  }
}

// ---------------------------------------------------------------------------
// Extension init
// ---------------------------------------------------------------------------

const init: ExtensionInit = async (fp) => {
  // Register custom properties
  await fp.issues.registerProperty("consensus_status", {
    label: "Consensus",
    icon: "git-merge",
    display: fp.ui.properties.select(
      fp.ui.properties.option("idle", { label: "Idle", color: "neutral" }),
      fp.ui.properties.option("running", { label: "Running", color: "blue" }),
      fp.ui.properties.option("dario_drafting", { label: "Dario Drafting", color: "purple" }),
      fp.ui.properties.option("sam_drafting", { label: "Sam Drafting", color: "mint" }),
      fp.ui.properties.option("dario_reviewing", { label: "Dario Reviewing", color: "purple" }),
      fp.ui.properties.option("sam_reviewing", { label: "Sam Reviewing", color: "mint" }),
      fp.ui.properties.option("consensus_reached", { label: "Consensus ✓", color: "success" }),
      fp.ui.properties.option("no_consensus", { label: "No Consensus", color: "warning" }),
      fp.ui.properties.option("failed", { label: "Failed", color: "destructive" }),
    ),
  });

  await fp.issues.registerProperty("consensus_round", {
    label: "Round",
    icon: "loader",
    display: fp.ui.properties.text(),
  });

  await fp.issues.registerProperty("consensus_turn", {
    label: "Active Agent",
    icon: "user",
    display: fp.ui.properties.select(
      fp.ui.properties.option("dario", { label: "Dario (Claude)", color: "purple" }),
      fp.ui.properties.option("sam", { label: "Sam (Codex)", color: "mint" }),
    ),
  });

  // Desktop: register command palette action
  await fp.ui.registerAction({
    id: "consensus.start",
    label: "Start Consensus",
    icon: "git-merge",
    keywords: ["consensus", "plan", "agents", "collaborate", "dario", "sam"],
    when: async (ctx) => {
      const issueId = ctx.issueId as string | undefined;
      if (!issueId) return false;
      const issue = await fp.issues.get(issueId);
      if (!issue) return false;
      const status = issue.properties?.consensus_status as string | undefined;
      return !status || status === "idle" || status === "consensus_reached" || status === "no_consensus" || status === "failed";
    },
    onExecute: async (ctx) => {
      const issueId = ctx.issueId as string | undefined;
      if (!issueId) {
        await fp.ui.notify("No issue selected", { kind: "error" });
        return;
      }
      await fp.ui.notify("Starting consensus protocol...", { kind: "info" });
      // Run in background — don't block the UI
      startConsensus(fp, issueId).catch((err) => {
        fp.log.error(`Consensus failed: ${err}`);
      });
    },
  });

  // CLI: trigger via /consensus comment
  fp.on("comment:created", async ({ issueId, comment }) => {
    const content = comment.content.trim();
    if (content === "/consensus" || content.startsWith("/consensus ")) {
      fp.log.info(`Consensus triggered via comment on issue ${issueId}`);
      // Run in background so the comment hook returns quickly
      startConsensus(fp, issueId).catch((err) => {
        fp.log.error(`Consensus failed: ${err}`);
      });
    }
  });

  fp.log.info("consensus extension loaded — use /consensus or the command palette to start");
};

export default init;
