# Comments API

API reference for fetching and interacting with plan comments.

## Base URL

```
https://app.fp.dev/bs
```

## Get comments (JSON)

**No authentication required.** Supports CORS for cross-origin fetch.

```bash
curl -s https://app.fp.dev/bs/api/plans/a8k2m1x/comments
```

With version filter:

```bash
curl -s "https://app.fp.dev/bs/api/plans/a8k2m1x/comments?version=2"
```

**Response (200 OK):**

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "cssSelector": "body > div > p:nth-of-type(1)",
    "content": "This paragraph needs more detail",
    "authorName": "Alice",
    "userId": null,
    "deleteToken": "a1b2c3d4-...",
    "versionNumber": 1,
    "elementText": "The first paragraph of the plan...",
    "createdAt": "2026-03-16T17:30:00.000Z",
    "updatedAt": null
  }
]
```

Note: `deleteToken` is included in GET responses for all comments. Anonymous comments have a UUID token; authenticated comments have `null`.

## Get comments (Markdown)

Returns all comments as structured markdown. **No authentication required.** Two equivalent routes:

```bash
# API route
curl -s https://app.fp.dev/bs/api/plans/a8k2m1x/comments.md

# Browser-accessible SSR route
curl -s https://app.fp.dev/bs/a8k2m1x/comments.md
```

With version filter (API route only):

```bash
curl -s "https://app.fp.dev/bs/api/plans/a8k2m1x/comments.md?version=2"
```

**Response (200 OK, Content-Type: text/markdown):**

```markdown
## Comments on "Auth System Migration"

Plan: https://app.fp.dev/bs/a8k2m1x

### On "The first paragraph of the plan..." (Paragraph 1)

> This paragraph needs more detail

— **Alice**, 16 Mar

---

### On Heading 2

> Agreed, let's expand the rationale

— **Bob**, 16 Mar
```

### Markdown format

- Top-level heading with plan title and plan URL
- Comments grouped by CSS selector
- Each group has a human-readable element name derived from the selector tag (e.g., "Paragraph 1", "Heading 2")
- Element text preview shown in quotes when available (first 60 chars)
- Each comment is blockquoted, followed by author name and short date

## Sidebar Copy button

The plan page comment sidebar includes a **Copy** button that copies all comments in the same markdown format to the clipboard. This uses the client-side `commentsToMarkdown()` function which also includes element text previews when available.

## Post a comment

```bash
curl -s -X POST https://app.fp.dev/bs/api/plans/a8k2m1x/comments \
  -H "Content-Type: application/json" \
  -d '{
    "cssSelector": "body > div > p:nth-of-type(1)",
    "content": "This needs more detail",
    "authorName": "Alice",
    "elementText": "The first paragraph of the plan...",
    "versionNumber": 1
  }'
```

| Field | Required | Max | Notes |
|-------|----------|-----|-------|
| `cssSelector` | Yes | 500 chars | CSS selector anchoring the comment |
| `content` | Yes | 2000 chars | Comment text |
| `authorName` | No | 100 chars | Display name |
| `elementText` | No | 120 chars | Text of the target element (truncated server-side) |
| `versionNumber` | No | — | Plan version being commented on |

**Response (201 Created):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "cssSelector": "body > div > p:nth-of-type(1)",
  "content": "This needs more detail",
  "authorName": "Alice",
  "userId": null,
  "deleteToken": "a1b2c3d4-...",
  "versionNumber": 1,
  "elementText": "The first paragraph of the plan...",
  "createdAt": "2026-03-16T17:30:00.000Z",
  "updatedAt": null,
  "delete_token": "a1b2c3d4-..."
}
```

Anonymous comments include both `deleteToken` (from the row) and `delete_token` (legacy alias) in the creation response. Store this token to allow the commenter to edit or delete their own comment later.

## Update a comment

Requires either authentication (plan owner or comment author) or a delete token for anonymous comments:

```bash
# Authenticated update (comment author or plan owner)
curl -s -X PUT https://app.fp.dev/bs/api/plans/a8k2m1x/comments/550e8400-... \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer fp_pat_xxx..." \
  -d '{ "content": "Updated comment text" }'

# Anonymous update with token
curl -s -X PUT https://app.fp.dev/bs/api/plans/a8k2m1x/comments/550e8400-... \
  -H "Content-Type: application/json" \
  -H "X-Delete-Token: a1b2c3d4-..." \
  -d '{ "content": "Updated comment text" }'
```

**Response (200 OK):**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "cssSelector": "body > div > p:nth-of-type(1)",
  "content": "Updated comment text",
  "authorName": "Alice",
  "userId": null,
  "deleteToken": "a1b2c3d4-...",
  "versionNumber": 1,
  "elementText": "The first paragraph of the plan...",
  "createdAt": "2026-03-16T17:30:00.000Z",
  "updatedAt": "2026-03-16T18:15:00.000Z"
}
```

Only the `content` field can be updated. Max 2000 characters.

## Delete a comment

Requires either authentication (plan owner or comment author) or a delete token for anonymous comments:

```bash
# Authenticated deletion
curl -s -X DELETE https://app.fp.dev/bs/api/plans/a8k2m1x/comments/550e8400-... \
  -H "Authorization: Bearer fp_pat_xxx..."

# Anonymous deletion with token
curl -s -X DELETE https://app.fp.dev/bs/api/plans/a8k2m1x/comments/550e8400-... \
  -H "X-Delete-Token: a1b2c3d4-..."
```

**Response (200 OK):**

```json
{
  "deleted": true
}
```

## Error responses

Authentication errors (from the router layer) return JSON with a `message` field:

```json
{
  "message": "Authentication or delete token required"
}
```

Validation and authorization errors (from the comment store) return JSON with an `error` field:

```json
{
  "error": "Invalid content (max 2000 chars)"
}
```

| Status | Meaning |
|--------|---------|
| 400 | Invalid request (missing fields, validation failure) |
| 401 | Authentication or delete token required |
| 403 | Not the comment author or plan owner |
| 404 | Comment not found |

## Limits

| Field | Max size |
|-------|----------|
| `cssSelector` | 500 characters |
| `content` | 2000 characters |
| `authorName` | 100 characters |
| `elementText` | 120 characters (truncated server-side) |
