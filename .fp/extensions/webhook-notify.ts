/**
 * Webhook Notify
 *
 * Sends a JSON POST to any webhook URL when issue lifecycle events occur.
 * Works with Zapier, n8n, IFTTT, Discord, Make, or any webhook receiver.
 *
 * Configuration (.fp/config.toml):
 *
 *   [extensions.webhook-notify]
 *   webhook_url = "https://hooks.zapier.com/hooks/catch/..."
 *   # Or use a secret reference:
 *   # webhook_url = "secret:webhook-url"
 *   events = "issue:created,issue:status:changed"  # CSV of events to fire on
 *   project_name = "My Project"                     # Optional label in payloads
 *
 * The webhook_url can also be set via the WEBHOOK_NOTIFY_URL env var.
 */

import type { ExtensionInit } from "@fiberplane/extensions";

function parseCsv(raw: string): Set<string> {
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

async function resolveWebhookUrl(fp: Parameters<ExtensionInit>[0]): Promise<string> {
  if (process.env.WEBHOOK_NOTIFY_URL) {
    return process.env.WEBHOOK_NOTIFY_URL;
  }

  const configValue = fp.config.get("webhook_url") ?? "";
  if (!configValue) return "";

  if (configValue.startsWith("secret:")) {
    const secretKey = configValue.slice("secret:".length);
    const resolved = await fp.secrets.get(secretKey);
    return resolved ?? "";
  }

  return configValue;
}

async function postWebhook(
  url: string,
  payload: Record<string, unknown>,
  log: { warn: (msg: string) => void },
): Promise<void> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      log.warn(`Webhook returned ${res.status}: ${await res.text()}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    log.warn(`Webhook request failed: ${msg}`);
  }
}

function shortId(id: string): string {
  const dash = id.indexOf("-");
  if (dash === -1) return id.slice(0, 8);
  return `${id.slice(0, dash + 1)}${id.slice(dash + 1, dash + 9)}`;
}

const init: ExtensionInit = async (fp) => {
  const webhookUrl = await resolveWebhookUrl(fp);
  if (!webhookUrl) {
    fp.log.warn(
      "No webhook URL configured. Set WEBHOOK_NOTIFY_URL env var, " +
        "or add webhook_url to [extensions.webhook-notify] in .fp/config.toml",
    );
    return;
  }

  const enabledEvents = parseCsv(
    fp.config.get("events", "issue:created,issue:status:changed"),
  );
  const projectName = fp.config.get("project_name", "");

  const basePayload = () => ({
    timestamp: new Date().toISOString(),
    ...(projectName ? { project: projectName } : {}),
  });

  if (enabledEvents.has("issue:created")) {
    fp.on("issue:created", async ({ issue }) => {
      await postWebhook(
        webhookUrl,
        {
          ...basePayload(),
          event: "issue:created",
          issue: {
            id: shortId(issue.id),
            title: issue.title,
            status: issue.status,
            priority: issue.priority,
            description: issue.description || undefined,
          },
        },
        fp.log,
      );
    });
  }

  if (enabledEvents.has("issue:status:changed")) {
    fp.on("issue:status:changed", async ({ issue, from, to }) => {
      await postWebhook(
        webhookUrl,
        {
          ...basePayload(),
          event: "issue:status:changed",
          issue: {
            id: shortId(issue.id),
            title: issue.title,
            status: to,
            priority: issue.priority,
          },
          transition: { from, to },
        },
        fp.log,
      );
    });
  }

  if (enabledEvents.has("issue:updated")) {
    fp.on("issue:updated", async ({ issue, updates }) => {
      const changed = Object.keys(updates);
      if (changed.length === 0) return;

      await postWebhook(
        webhookUrl,
        {
          ...basePayload(),
          event: "issue:updated",
          issue: {
            id: shortId(issue.id),
            title: issue.title,
            status: issue.status,
            priority: issue.priority,
          },
          changed_fields: changed,
        },
        fp.log,
      );
    });
  }

  if (enabledEvents.has("comment:created")) {
    fp.on("comment:created", async ({ issueId, comment }) => {
      await postWebhook(
        webhookUrl,
        {
          ...basePayload(),
          event: "comment:created",
          issue_id: shortId(issueId),
          comment: {
            id: comment.id,
            content:
              comment.content.length > 500
                ? comment.content.slice(0, 500) + "..."
                : comment.content,
            author: comment.author,
          },
        },
        fp.log,
      );
    });
  }

  fp.log.info(
    `Webhook notifications enabled for: ${[...enabledEvents].join(", ")}`,
  );
};

export default init;
