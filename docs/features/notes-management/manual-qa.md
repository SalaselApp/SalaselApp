# Notes and browsing — user QA

Implementation cards: [#56–#61 under Notes #37](https://github.com/SalaselApp/SalaselApp/issues/37), [suggestion link fields #62](https://github.com/SalaselApp/SalaselApp/issues/62), [incremental browsing #63](https://github.com/SalaselApp/SalaselApp/issues/63).

Use the isolated Notes worktree for review. The user subsequently authorized agent visual checks, and a local preview is running at http://localhost:3000. Targeted agent browser checks are recorded separately; the user accepted the final Notes UI. Generated design images are references, not browser evidence.

## Notes

Use a separate browser profile with disposable sample notes so clearing a sample document does not affect personal notes.

1. Open `/ar/notes` and `/en/notes`. Check that the Notes navigation entry is visible and the page is easy to scan.
2. Write sample notes on the watch pages for videos in two different series and one independent podcast, then return to Notes. Verify clear separation between **السلاسل / البودكاست / مقاطع مستقلة** and **Series / Podcasts / Standalone videos**. Imported or unavailable-source samples remain readable under a sensible fallback.
3. Expand a series and open a video note. On a phone-sized viewport, open the editor and go back: query, grouping and list position should be retained. Arabic Back points right; English Back points left. Disclosure arrows keep their expand/collapse meaning.
4. Edit a document, observe saving/saved feedback, reload, and compare its watch-page editor. Repeat for a podcast. A failed save should retain the draft and offer retry rather than falsely showing Saved.
5. Confirm there is no Add note/chooser flow on Notes, per the latest feedback. Create a first note on a watch page and verify it appears in Notes; selecting an existing note must not duplicate it.
6. Search by a series title, video/podcast title and phrase within a note. Check no-results and Clear search. If metadata is unavailable, the local note text must remain searchable and editable.
7. Open Clear notes, cancel once, then confirm for a disposable sample. Only that video's canonical notes should clear. Reload and verify the cleared state. Stale-import and save-failure cases also require the technical evidence recorded by the lead.
8. Export one video/podcast and a series collection as Markdown. Compare downloaded content with the saved documents; missing source metadata must not prevent exporting the retained text.

## Suggestions

1. Open feedback and select اقتراح سلسلة, then اقتراح بودكاست. Each should show **رابط** rather than **رسالة**, with an appropriate URL example.
2. Try an invalid value and a link of the wrong content kind. The form should explain the problem and retain the input.
3. Switch to another feedback type. It should still accept a normal free-text **رسالة**.
4. Check English labels and keyboard/mobile operation. Successful delivery should be exercised only with a configured test destination or stub; implementation agents did not submit live feedback.

## Incremental public browsing

1. Open Series, Podcasts and a series containing more than 20 lessons. Initial lists should show at most 20 entries, then append more as you approach the end or select Load more.
2. Search/filter for an item beyond the initial page. It must be found without manually loading every earlier page. Switch filters while a request is pending; old results must not append into the new list.
3. Check no-results, end-of-list and retry after a failed next-page request. Existing rows should remain visible and retry must not duplicate them.
4. Check bookmarks, progress, Continue/resume links and direct video navigation. Browse in Arabic and English, on desktop and mobile, and use the manual loading control with a keyboard.

## Recording feedback

Record the card number, locale, viewport and exact action for each issue. The final Notes UI is user-approved. Record remaining external integration checks separately; technical checks do not establish live feedback delivery, extension handoff or recovery in a personal browser profile.
