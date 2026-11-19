# Personal Notes management

Canonical requirements: [#37](https://github.com/SalaselApp/SalaselApp/issues/37). Current scope incorporates the user's final UI review and acceptance on 2026-11-19.

## Outcome

Learners can find, read, edit, clear and export existing browser-local notes from a dedicated Notes page without starting playback. New documents are written on watch pages. The user cancelled in-page Add/chooser functionality ([#58](https://github.com/SalaselApp/SalaselApp/issues/58)).

## Accepted behavior

- One canonical plain-text document per video. Preserve stored playlist context and avoid duplicates across content membership.
- Three clearly separated sections: **السلاسل / البودكاست / مقاطع مستقلة**, **Series / Podcasts / Standalone videos**. Unmatched extension imports belong in Standalone videos. Missing metadata must never hide retained content.
- Playlist folders start collapsed. Manual disclosure opens them; search reveals matching documents. Search covers known source/group/type titles, current content and accessible older content, retaining useful grouping.
- Arabic places the editor left and navigator right; English mirrors them. Content uses its own text direction. Arabic Back points right, English Back left. Desktop panes scroll independently; mobile navigation retains list state.
- A compact title/date/plain-content editor has one ellipsis menu: current-note download, full-playlist download when applicable, available source navigation, clear confirmation, and conditional older-note access. Every action has a recognizable icon; clear is visibly red.
- Saving is shared with watch-page editing, survives reload and reports real failure. Retain unsaved drafts and confirmed clear intent until a durable write succeeds. Blank tombstones defeat stale extension snapshots.
- Metadata queries contain only saved video/playlist identities in batches of at most50. No note body is sent to a server. Local search remains complete when metadata is unavailable.
- Single-video and playlist Markdown exports retain complete saved text, readable titles/fallback identities and known video order. Playlist export ignores the current search filter.

## Historical data preservation

Read the two formats established in repository history: raw `salasel-video-notes` timestamped block arrays and `progress-storage.state.notes` content/timestamp arrays. Recover absent canonical identities only, retaining all valid ordered blocks and original whitespace/context/time. Never automatically overwrite an existing canonical document or clear tombstone. Conflicting historical content is accessible through read-only View older notes and download.

Preserve original source bytes and archive them locally before ordinary progress writes can remove legacy fields. Recovery must be idempotent and retain recoverable drafts on write failure. Untouched automatic recovery must yield to any fresh canonical identity at hydration and save time, including cross-tab changes without a storage event. Deliberate edits and pending clears retain their normal save semantics.

## Scope and acceptance

Implemented behavior cards: #56 browse, #57 edit, #59 search, #60 clear, #61 export. #58 is cancelled. Existing podcast notes are supported throughout. Account/cloud sync, sharing, rich text, arbitrary folders, extension-permission changes and database migrations are outside scope.

See [verification](verification.md), [browser E2E](end-to-end-2026-11-19.md) and [manual QA](manual-qa.md). Final Notes UI was accepted by the user; live extension handoff, live feedback delivery and personal-profile recovery remain unverified.
