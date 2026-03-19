/**
 * Time Tracker
 *
 * Tracks how long issues spend in progress. Records the timestamp when an
 * issue first moves to "in-progress" and computes the total duration when
 * it's marked "done". If an issue is reopened (moved out of "done"), the
 * duration is cleared so it can be recomputed on the next completion.
 *
 * Custom properties:
 *   - started_at: ISO timestamp of when work first began
 *   - duration:   Human-readable elapsed time (e.g. "2h 15m")
 */

import type { ExtensionInit } from "@fiberplane/extensions";

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
  }
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return "<1m";
}

const init: ExtensionInit = async (fp) => {
  await fp.issues.registerProperty("started_at", {
    label: "Started At",
    icon: "clock",
    display: fp.ui.properties.text(),
  });

  await fp.issues.registerProperty("duration", {
    label: "Duration",
    icon: "timer",
    display: fp.ui.properties.text(),
  });

  fp.on("issue:status:changed", async ({ issue, from, to }) => {
    // Moving out of done: clear duration so it can be recomputed
    if (from === "done") {
      const hasDuration = issue.properties?.duration as string | undefined;
      if (hasDuration) {
        await fp.issues.update(issue.id, {
          properties: { duration: "" },
        });
        fp.log.info(`Cleared duration for ${issue.id} (reopened)`);
      }
    }

    // Moving to in-progress: record start time (only if not already set)
    if (to === "in-progress") {
      const existingStart = issue.properties?.started_at as string | undefined;
      if (!existingStart) {
        const now = new Date().toISOString();
        await fp.issues.update(issue.id, {
          properties: { started_at: now },
        });
        fp.log.info(`Started timer for ${issue.id}`);
      }
      return;
    }

    // Moving to done: compute duration
    if (to === "done") {
      const startedAt = issue.properties?.started_at as string | undefined;
      if (!startedAt) {
        fp.log.warn(`${issue.id} marked done but has no started_at timestamp`);
        return;
      }

      const start = new Date(startedAt).getTime();
      const elapsed = Date.now() - start;
      const duration = formatDuration(elapsed);

      await fp.issues.update(issue.id, {
        properties: { duration },
      });

      fp.log.info(`${issue.id} completed in ${duration}`);
      return;
    }
  });

  fp.log.info("time-tracker loaded");
};

export default init;
