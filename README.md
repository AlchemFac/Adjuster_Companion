# Claims Companion

A personal practice organizer built with HTML, CSS, and vanilla JavaScript. It requires **no npm installation, backend, external account, cloud service, or internet connection**. Use only fictional labels and generic training information. There are no insurer integrations or insurer branding.

## Open the app

For one person, extract all files into a permanent folder and double-click `index.html`. Keep `index.html`, `styles.css`, `app.js`, `checklist-data.js`, `checklist.js`, `documentation.js`, `template-library-data.js`, and `template-library.js` together. Use the same browser and location each time. A desktop shortcut can point to `index.html`.

File-based storage behavior varies by browser. For a consistent local origin or development, use Python 3:

```sh
cd Adjuster_Companion
python3 -m http.server 8000 --bind 127.0.0.1
```

On Windows, use `py -m http.server 8000 --bind 127.0.0.1` if `python3` is unavailable. Open `http://127.0.0.1:8000`; keep the terminal open and stop it with Ctrl+C. This serves static files locally; it is not an application backend. There is no build step and no `npm ci` or `npm run dev` command.

Export a task backup before changing browsers, moving the folder, changing the local address/port, updating the app files, or clearing site data.

## Features

- **Workload:** create, edit, prioritize, complete, reopen, and delete generic tasks. Category, priority, status, and optional next action are available in one form. Due dates are optional. Edit updates the original record, retaining its ID. Cancel edit leaves it unchanged.
- **Dashboard:** active tasks, due today, overdue, and completed today. Due/overdue counts also represent follow-ups, including waiting tasks, without duplicate counters. All counts cover the full task list, independent of filters.
- **Search and filters:** search title/category/next action, filter priority and status, or use All/Open/Due shortcuts. Selecting a status resets the shortcut; selecting a shortcut resets the status. Priority and search remain in effect. Completed tasks can be found using Filter status → Completed.
- **Sorting:** active overdue tasks, today's tasks, upcoming tasks, undated tasks, then completed tasks; earlier dates first within each group.
- **Follow-ups:** use the same task record and shared due date. Groups are Overdue, Due Today, Upcoming, and Waiting. Waiting status takes precedence for grouping; overdue waiting tasks remain highlighted and counted. Other undated tasks stay in Workload. Change a date with Save date or in the task editor. Dates are never automatically postponed.
- **Waiting on:** generic Customer, Repair Shop, Internal Review, Other Insurer, or Other categories. Selecting one does not change status or date. Do not enter identities.
- **Completion:** a workload checkbox or follow-up Complete button completes the same task. Unchecking reopens it as Not Started. Completed tasks leave follow-up groups. Completed today counts currently completed tasks with a recorded completion day matching the browser's local date; legacy completions without a known day are not counted as today.
- **Template library:** 41 placeholder-only scenarios in seven categories, searchable with favorites first, category filtering, recent-use shortcuts, and custom generic definitions. Copy without entering private data; fill placeholders later in the approved system.
- **Documentation:** Customer contact, Contact attempt, Investigation update, Repair estimate follow-up, and General follow-up. Each includes Purpose, Action taken, Information obtained, Outstanding items, Next steps, and an optional follow-up date. Prompts are hints, never prefilled facts. Missing information is marked `[Not provided]`; the app formats only what you enter and generates no coverage, liability, settlement, or payment decisions. The original learning outlines remain available.
- **Clipboard and clearing:** Copy to Clipboard copies the current preview. If browser policy denies copying, the preview is selected for manual copying. Clear Form empties documentation fields and preview, but leaves your system clipboard unchanged. Changing documentation templates clears the prior form.
- **Navigation and layout:** section links and a keyboard skip link, labeled controls, visible focus, responsive desktop columns and mobile stacking, and scrollable task/follow-up lists for larger workloads.
- **End-of-day reminder:** a visible reminder to verify required follow-ups in the employer's official system. No automatic submission, emails, SMS, push, or background reminders.

## Day 1 checklist

The Day 1 section adapts the supplied new-file checklist into 26 generic reminders in six groups: file/record review; contact and digital responses; questions/information requests; investigation support (including report, damage, scene, traffic guidance, diagram and witness reviews); authorized decisions/next actions; and supervisor review.

1. Choose a **fictional** Practice A–F set. There is no field for a real claim number, customer, identifier, or case facts. The sets are independent practice labels, not connections to employer files.
2. Routine review steps are preselected. Select conditional steps only when applicable; leave other steps unselected. Selection checkboxes for missing steps mean **include when adding**, not completed.
3. Choose a local calendar date and press **Add selected missing steps**. This creates regular tasks with the same due/follow-up date. Repeating it skips already-added steps, retains existing dates/statuses and creates no duplicates. If capacity would be exceeded, nothing is added.
4. Once added, the step checkbox means **complete/reopen**. Edit task opens the normal workload editor for status, priority, next action or date changes. Changes from either view update the same record. Delete a task in Workload to remove its checklist step; it can then be selected and added again.
5. Progress counts **added** steps only. An unselected or missing step is not treated as completed or automatically marked not applicable. Review applicability and official-system work yourself. Selections before adding are temporary; linked task progress persists and is included in task backups.

The 24-hour unanswered-response reminder is conditional. This app tracks calendar dates, not elapsed hours: set exact timed reminders in the employer's official system. Overdue dates never move automatically. Supervisor reminders call for prompt injury triage review and review of non-auto property damage, without asking for any actual facts here.

This checklist does not decide coverage, liability, payments, repair authorization or recovery. It reminds you to verify the authorized review/decision and communication in the official system. Company-specific system names and decision rules from the photo are intentionally expressed as generic administrative reminders. Follow current employer instructions and supervisor guidance; checking a box does not authorize any action.

## Documentation Templates library

Use **Template library** in the navigation. The desktop view has search/categories/list on the left and title, intended use, preview and Copy Template on the right. Mobile stacks the panels. Selecting or copying a template keeps the current search and category filters.

The 41 original generic scenarios cover Initial claim handling (5), Customer contact (7), Investigation (7), Coverage (5), Liability (5), Vehicle damage and repairs (6), and Follow-ups and resolution (6). Each preview is a neutral scaffold with explicit placeholders. Coverage/liability templates leave determinations and supporting evidence unfilled; contact templates require verification rather than asserting that an attempt or conversation occurred. No deadlines, policy requirements, legal standards or decisions are invented. Review against employer-approved documentation standards and remove inapplicable sections after pasting into the approved system.

- **Copy Template** copies the entire preview, including its heading and placeholders. Fill `[DATE]`, `[CLAIM NUMBER]`, `[PARTY]`, `[ACTION TAKEN]`, `[DETERMINATION]`, and other private fields only inside the employer's approved system. There is no private-data entry form in this library.
- **Favorites:** use the star beside a list item or Add to favorites in the preview. Favorites sort first; Favorites only narrows the list. Favorite IDs persist in this browser.
- **Recently Used:** the last eight distinct successfully copied template IDs, newest first. Failed automatic copying selects the preview for manual copying but does not claim success or add recent history, because manual clipboard activity cannot be verified. Selecting a recent item opens it without changing the filters.
- **Custom templates:** New generic template creates a definition with title, category, intended-use description and placeholder body. Edit changes its existing ID. Duplicate creates a new custom copy of either a built-in or custom definition. Only custom definitions can be deleted, with confirmation; deletion also removes their favorite/recent IDs. Built-ins remain unchanged.
- **Validation:** titles/description/body are required, with limits of 100/300/6,000 characters. A body needs at least two distinct uppercase bracketed placeholders, such as `[PURPOSE]` and `[ACTION TAKEN]`. Saving requires an explicit generic-content confirmation. Common email, phone and identifier patterns are rejected. These checks are not comprehensive: they cannot reliably recognize every name, accident fact, proprietary procedure or confidential detail. Never save completed notes or customer-specific material.
- **Storage:** only generic custom definitions and favorite/recent IDs are saved under `claims-companion.library.v1`. Searches, selected preview text, unsaved custom edits and completed notes are not saved. Unsaved edits clear on departure/reload. The existing practice note formatter remains separate and its drafts stay in memory.
- **Limitations:** up to 100 custom definitions. Templates/favorites are local, unencrypted and not synced. They are **not included in task JSON backups**, and Delete all saved tasks does not delete them. Keep a separate copy of important generic wording if needed. If storage is blocked/full/corrupt, built-ins still work and changes stay in memory with a warning; unknown saved data is left untouched. Changes from another tab disable preference saving here until reload.

### Try it with fictional scenarios

1. Search **Police report**, select **Police report review**, and confirm the preview contains bracketed fields rather than invented report facts. Copy it into a temporary plain-text editor; leave all private placeholders unfilled while testing.
2. Choose **Coverage**, open **Coverage verification**, and verify `[DETERMINATION]` and `[SUPPORTING EVIDENCE]` remain placeholders. The app does not choose an outcome.
3. Star **Repair shop follow-up**, refresh, then turn on Favorites only. Copy it and verify Recently Used shows it; search/category filters remain as chosen.
4. Select New generic template. Use title **Fictional practice follow-up**, category **Follow-ups and resolution**, description **Use for a generic training exercise**, and this body:

   ```text
   Purpose: [PURPOSE]
   Action taken: [ACTION TAKEN]
   Outstanding items: [OUTSTANDING ITEMS]
   Next action: [NEXT ACTION]
   Follow-up date: [FOLLOW-UP DATE]
   ```

5. Confirm it is generic and save. Edit its generic wording, duplicate it, refresh to check persistence, then delete the duplicate. Never fill its placeholders with a real person's details here.
6. Try saving a body without placeholders; it should be rejected. Cancel an unsaved edit and verify it is absent after refresh. If clipboard permission is denied, use the selected preview and your browser's Copy command.

### Files changed for this library

`template-library-data.js` defines the scenarios; `template-library.js` handles navigation, copying, custom definitions and ID-only preferences. `index.html` and `styles.css` add the responsive library panels while preserving the existing tools. `tests/library.cjs` and `tests/run.cjs` add/re-run browser checks; README and the review report describe usage and limitations. Existing workload, follow-up, checklist and practice-formatter logic is unchanged.

## Privacy and data limitations

Never enter real customer names, claim or policy numbers, accident facts, or other confidential insurance information. Documentation also warns against using real information without employer approval. This personal tool is intended for fictional practice; it cannot detect confidential text.

Tasks are unencrypted in `localStorage`, scoped to the current browser profile and origin. People using that profile may see them. They are not automatically backed up or synced. Private browsing, clearing site data, changing origins, or losing the device can remove access. Generic custom template definitions are intentionally saved only after explicit confirmation; they are reusable scaffolds, not completed documentation drafts. The current maximum is 500 tasks. Documentation fields are limited to 2,000 characters each; task titles to 120 and next actions to 200.

**Documentation drafts are never saved in task records, browser storage, or backup files and are never transmitted.** They remain only in the page and are cleared by Clear Form, template changes, reload, or departure/history restoration. Browser/OS clipboard managers or anything you manually paste elsewhere are outside this app's control.

Dates use YYYY-MM-DD calendar strings, compared to the browser's local day without UTC conversion for grouping. Counts refresh on return after a day change or within a minute after midnight while the page is open. The device clock/time zone must be correct.

Use one editing tab. If another tab changes storage, saving is disabled in the stale tab until reload. Truly simultaneous writes can still race. Storage failures show a warning; unreadable saved data is left untouched. Export any readable tasks before deleting saved data. Deleting tasks has no undo.

## Task backup and restore

1. Go to **Backup → Export tasks (JSON)**. Your browser downloads a local file containing task fields only, with format `{"app":"claims-companion","version":1,"tasks":[...]}`.
2. Keep the JSON file somewhere safe. It is **unencrypted** and must contain only generic task information. Backups are manual; keep an up-to-date copy before replacing app files or clearing browser data.
3. To restore, open the app and choose **Import task backup (JSON)**. Review the confirmation: import **replaces all current tasks**, rather than appending. Export the current list first if you need to retain it. Cancel leaves it unchanged.
4. Only version 1 task exports up to 1 MB and 500 unique task IDs are accepted. Invalid dates, categories, priorities, statuses, duplicate IDs, or malformed JSON are rejected without changing tasks. Reimporting the same backup does not duplicate tasks. An empty valid backup replaces the list with no tasks after confirmation.
5. Documentation drafts are never exported or imported. A successful import saves tasks in the current browser; it does not change another browser or an older backup file. Storage failures leave the current task list intact. If another tab has disabled saving, reload first.

## Development checks

Application runtime has no third-party dependencies. Automated checks live in `tests/` and use **Playwright only as development tooling**, not as an app dependency. They need Node.js, Playwright with Chromium available, and the local server above running in another terminal.

```sh
node --check app.js
node --check documentation.js
node --check checklist-data.js
node --check checklist.js
node --check template-library-data.js
node --check template-library.js
node tests/run.cjs
```

The runner uses an installed `playwright` module. If it lives outside Node's normal lookup path, set `PLAYWRIGHT_MODULE` to its absolute module path. Optionally set `CHROMIUM_PATH` for an installed browser and `BASE_URL` for a different local address. It uses system Chromium at `/usr/bin/chromium` when present; otherwise Playwright's browser. No package installation is needed to use the app itself.

`tests/run.cjs` runs workload, follow-up, documentation/clipboard, final quality, Day 1 checklist, and Template Library suites. Each uses an isolated browser context with fictional data. The quality suite covers 100-task backups, malformed/cancelled/oversized imports, storage failure, keyboard interaction, responsive widths, and network observations. Set `SCREENSHOT_DIR` to capture desktop/mobile review images. See [QUALITY_REVIEW.md](QUALITY_REVIEW.md) for observed results and test limitations.

Manual spot checks: use Tab/Shift+Tab, Enter and Space to create/edit/complete tasks; check screen-reader announcements with your own assistive technology; copy and paste a fictional preview into a temporary editor; export/import a test backup before relying on it. Never use real case information for testing.
