/**
 * Screenshot Reminder
 *
 * When an issue is marked as done, logs a reminder to attach a screenshot
 * of the completed work. Prints instructions for using `fp attach` and
 * `fp comment --attach` to make it easy to follow through.
 */

import type { ExtensionInit } from "@fiberplane/extensions";

function shortId(id: string): string {
  const dash = id.indexOf("-");
  if (dash === -1) return id.slice(0, 8);
  return `${id.slice(0, dash + 1)}${id.slice(dash + 1, dash + 9)}`;
}

const init: ExtensionInit = (fp) => {
  fp.on("issue:status:changed", ({ issue, from, to }) => {
    if (to !== "done") return;

    const id = shortId(issue.id);

    fp.log.info(
      [
        "",
        "─────────────────────────────────────────────",
        `📸  Screenshot reminder for ${id}`,
        "─────────────────────────────────────────────",
        "",
        `"${issue.title}" is done — consider attaching a screenshot!`,
        "",
        "Quick attach (add screenshot as a comment):",
        `  fp comment add ${id} --attach screenshot.png "Done! Here's the result."`,
        "",
        "Or get a markdown reference to use anywhere:",
        `  fp attach screenshot.png`,
        "",
        "Supported formats: png, jpg, jpeg, gif, webp, svg",
        "─────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
  });

  fp.log.info("screenshot-reminder loaded");
};

export default init;
