# Notes management — design and card review

Prepared 2026-11-19 from [feature #37](https://github.com/SalaselApp/SalaselApp/issues/37). The user approved this decomposition and the image composition references on 2026-11-19, with the written corrections below. It is not a second work tracker. Approved cards belong in GitHub Issues, with these assets attached or linked from the relevant issue bodies.

## Visual authority

Inspected the live Arabic catalogue, playlist detail and video notes editor at https://salasel.app/ar without starting the local app. Also inspected the existing `watch-notes-ar-desktop.png`, `parity-series-ar-desktop.png`, and supplied brand mark in `design-previews/podcast-ui-review/`.

Keep flat navy #0f172a, slate #1e293b, thin #334155 borders, restrained teal #0d9488 accents, familiar sans typography, compact header, existing logo, and a plain-text editor. This is an extension of the learning app, not a visual rebrand. UI/UX Pro Max's automatic education recommendation returned playful fonts and a newsletter layout; those are unsuitable here and are not adopted. Its error-recovery, feedback and navigation guidance informs the proposals alongside Impeccable's Operate principles.

## Proposed interaction

Desktop: playlist/video tree beside a generous editor, with search above the workspace. Arabic puts the tree on the right; English mirrors the structure. Expanding collections and selecting a video are separate actions. Selecting a note keeps its content visible while searching. A modest Add note action opens an inline video chooser, not playback. Source navigation and exports sit near the selected document; playlist export belongs to its group menu. Clear notes sits in a secondary menu and asks which video's document will be cleared.

Mobile: a full-width grouped list opens a full-width editor. Back restores list expansion, query and scroll position. Never squeeze both columns onto a phone. Editing controls stay reachable when a keyboard is open.

Alternative structures considered: inline expanded editors would become long and hard to scan; a three-column notebook layout adds unnecessary navigation and fails on small laptops. The proposed two-pane desktop / single-pane mobile arrangement provides clear context and comfortable writing space.

All note text and sample content in generated mockups are synthetic. Images are proposals, not screenshots of an implemented feature. Pixel renderings, Arabic text distortions and generated logo artifacts are not implementation requirements; production uses existing assets and real text.

## Proposed vertical cards

1. **Browse and read notes by playlist and video.** After this card, a learner can open Notes and read existing browser-local and imported notes in named, expandable playlist/video groups and a standalone section. **Blocked by:** none. **Source acceptance:** A1, A2, A5 (import visibility), A7 (readable fallback), A9 (empty state, existing-data preservation and responsive browse).
2. **Edit an existing video's notes with reliable save feedback.** After this card, a learner can edit on Notes, see saving/saved/error feedback, reload, and find the same content on the watch page with compatible extension handoff. **Blocked by:** 1. **Source acceptance:** A4 (editing), A5 (editing compatibility), A7 (editing fallback), A9 (migration/preservation and responsive editor).
3. **Add notes to a chosen video without playback.** After this card, a learner can choose a playlist video or available standalone video without notes and create its first document. **Blocked by:** 2, which delivers the shared editing/save journey. **Source acceptance:** A4 (creation), A9 (first use).
4. **Find notes by playlist title, video title or note text.** After this card, a learner can search and open matching notes with grouping context, including a useful no-results state. **Blocked by:** 1. **Source acceptance:** A3 and A9 (no results and responsive search).
5. **Clear a video's notes without stale-import resurrection.** After this card, a learner can confirm clearing the selected document, see all app views agree, and receive stale snapshots without content returning. **Blocked by:** 2. **Source acceptance:** A6; A5 (clear compatibility), A7 (clearing fallback), A9 (responsive confirmation).
6. **Export one video's notes or a playlist's collected notes.** After this card, a learner can download existing Markdown exports directly from Notes, including notes whose source metadata is unavailable. **Blocked by:** 1. **Source acceptance:** A8, A7 (exportable fallback), A9 (responsive export).

Each card carries its own observable evidence and preservation/accessibility constraints. No final test, hardening or integration card is added. Cards 2, 4 and 6 can become available after card 1; cards 3 and 5 follow card 2. Implementation is authorized with the approved corrections.

## Mockup-to-card mapping

| Asset | Intended review | Proposed cards |
| --- | --- | --- |
| `proposed/01-workspace-ar.png` | RTL desktop hierarchy, editor and saved state; video export placement | 1, 2, 6 |
| `proposed/02-search-en.png` | LTR search result context and query affordance | 4 |
| `proposed/03-add-note-ar.png` | Select a video without notes before writing | 3 |
| `proposed/04-clear-missing-source-en.png` | Clear confirmation and retained orphan content | 5; fallback context for 1, 2, 6 |
| `proposed/05-mobile-list-ar.png` | Narrow-screen grouped browsing | 1, 4 |
| `proposed/06-mobile-editor-ar.png` | Full-width editor and save-error recovery | 2; action locations for 5, 6 |

## States and behavior not proven by generated images

- First use: explain that notes stay in this browser; offer Add note and a path to content. Never imply an account is required.
- No results: retain the typed query and offer Clear search; distinguish from having no saved notes.
- Initial loading: do not show a misleading empty library while notes or titles are resolving.
- Saving: announce saving and saved truthfully; errors retain draft content and offer retry. Never discard an unpersisted edit on selection or navigation.
- Metadata unavailable: label explicitly, preserve stored context, retain note content and safe identity. Only offer source links when available; Markdown export remains available.
- Multiple playlists: one canonical document, grouped by stored context. Editing or clearing affects that document everywhere; do not duplicate it into each playlist.
- Import conflict and clearing: source compatibility and stale-data handling require observable evidence inside cards 2 and 5, not decorative sync indicators.
- Keyboard: tree disclosures, selection, search, menus, editor and confirmation are reachable with visible focus. Save/error changes are announced. Confirmation returns focus to its trigger.
- Touch and language: 44px targets, no hover-only actions, readable contrast, Arabic RTL and English LTR; retain the app's existing locale conventions.

## Publication and approval

Exact draft GitHub issue bodies and asset mappings are staged in `publication-draft.json` solely for review/publication. Card breakdown, dependency edges and visual direction are approved as of 2026-11-19. Publish six issues under #37 with durable mockup links; implementation uses the written corrections below. Nothing in a generated image overrides the parent spec.

## Approved user corrections — 2026-11-19

- Simplicity, readability and easy navigation are primary goals.
- Use clearly separated top-level sections: السلاسل / البودكاست / مقاطع مستقلة; English Series / Podcasts / Standalone videos.
- Existing podcast notes are included now across all six behaviors, not deferred.
- Unclassified extension-imported notes remain accessible under Standalone videos. No separate extension-only workflow is required.
- Use locale-appropriate directional arrows. Arabic text stays RTL; Back points right in Arabic and left in English. Forward/navigation chevrons mirror appropriately; down/up disclosure arrows retain their meaning.
- Generated images are approved composition references with these corrections. Do not generate replacement images.
