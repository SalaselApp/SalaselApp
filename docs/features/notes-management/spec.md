# Personal Notes management

Canonical feature and requirements: [GitHub issue #37](https://github.com/SalaselApp/SalaselApp/issues/37). This document is a product summary; GitHub Issues remain the work tracker.

## Problem and outcome

Learners currently open individual watch pages to revisit notes. A dedicated Notes navigation entry and page lets a learner find, read, edit, add, clear, and export their browser-local notes without starting playback.

## Actor and journey

A learner opens Notes, expands a playlist, selects a video, and reads or edits its existing plain-text note document. Standalone videos have their own identifiable section. Search finds playlist titles, video titles, and note content while retaining context. A learner can choose a video without notes, write its first note, and return later or open the watch page.

## Product constraints inherited from #37

- One canonical plain-text document per video; playlist headings organize video notes, rather than creating playlist-level documents or notebooks.
- Existing stored playlist context determines grouping. Multiple playlist membership must not duplicate or unexpectedly move a canonical note.
- All existing notes, including extension imports, remain available. Missing video or playlist metadata cannot hide content or prevent reading, editing, clearing, or exporting it.
- Preserve known video order within playlists, display useful last-edited information, and use names where available with explicit fallback labels otherwise.
- Show truthful saving, saved, and error feedback. Saving survives reload and remains consistent with watch-page editing and the extension handoff.
- Clearing a note requires confirmation or undo and remains effective after stale extension snapshots.
- Offer existing single-video and playlist Markdown exports and links to available source content.
- Responsive layouts, keyboard accessibility, Arabic RTL and English LTR apply throughout. Preserve existing data if a migration is needed.

## Source acceptance scenarios

- A1: Notes from two playlists and a standalone video appear together, correctly grouped and titled.
- A2: Expanding a playlist shows its video notes in a clear hierarchy.
- A3: Searching for a video name or a phrase inside a note finds the relevant entry. Playlist-title search is also a source requirement.
- A4: Creating or editing here is reflected on the watch page and survives reload.
- A5: Extension imports appear here and edits remain compatible with the existing handoff.
- A6: Clearing remains effective after a stale extension snapshot.
- A7: Missing metadata does not hide or destroy content; affected notes remain readable, editable and exportable.
- A8: Export a video's notes or a playlist's collected notes from this page.
- A9: Useful empty states, preservation of existing data through any needed migration, and usability on mobile and desktop.

## Risks

Stale extension imports can revive cleared content; title resolution can fail; a video can belong to several playlists; local persistence can fail. Each behavior card owns its relevant acceptance evidence. Visual mockups cannot prove these data behaviors.

## Out of scope

Account/cloud sync, shared or public notes, Admin access to personal notes, AI summaries, arbitrary folders, multiple independently identified note blocks, and a new rich-text editor. Existing podcast playback and notes are already available; podcast notes are included now throughout this feature.

## Design-review status

User requested generated UI proposals before implementation on 2026-11-19. The live app at https://salasel.app/ar and existing repository screenshots are visual references. On 2026-11-19 the user approved the composition, six-card split and dependencies and authorized implementation with the corrections below.

## Approved review corrections — 2026-11-19

- Simplicity, readability and easy navigation are primary goals.
- Use clearly separated top-level sections: السلاسل / البودكاست / مقاطع مستقلة; English Series / Podcasts / Standalone videos.
- Existing podcast notes are included now across all six behaviors, not deferred.
- Unclassified extension-imported notes remain accessible under Standalone videos. No separate extension-only workflow is required.
- Use locale-appropriate directional arrows. Arabic text stays RTL; Back points right in Arabic and left in English. Forward/navigation chevrons mirror appropriately; down/up disclosure arrows retain their meaning.
- Generated images are approved composition references with these corrections. Do not generate replacement images.
