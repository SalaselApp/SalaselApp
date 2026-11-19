# Incremental public content loading

Approved user request, 2026-11-19: public content must not load the entire collection at once. Load about 20 items from the database first, then fetch and append more as the learner scrolls.

## Outcome and surfaces

A learner browses long Series, Podcasts and playlist lesson lists without waiting for or downloading the whole collection. Show a manual Load more fallback. Simplicity, readability and current navigation remain priorities.

## Acceptance

- Bounded database reads and initial public payloads; 20 visible items plus at most one lookahead row per page.
- Fetch and append further pages near the bottom, with stable ordering and no duplicate rows or skipped items for a stable dataset.
- Search and current filters (including bookmarks) cover the full matching collection, not only downloaded pages. Query/filter changes reset paging and ignore stale in-flight responses.
- Show loading, end-of-list, no-results and error/retry states accurately. A failed next page retains loaded rows; retry does not duplicate them.
- Preserve current progress, resume, details/watch routes, podcast visibility rules and locale behavior.
- Arabic RTL, English LTR, mobile and keyboard/manual loading remain usable.
- Notes metadata/search stays independent and must not be truncated to the currently displayed catalogue page.
- Opening a playlist or video must not silently fetch the whole catalogue or all lessons when a direct lookup suffices.

## Scope and risks

Public browsing only, not Admin pagination. Concurrent requests, cursor stability, full-dataset filtering and distinguishing errors from empty pages are constraints inside this behavior card. No test-only or backend-only cards are added.
