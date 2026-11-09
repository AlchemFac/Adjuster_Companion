# Claims Companion

A local, single-user organizer built with HTML, CSS and vanilla JavaScript. No npm installation, backend, external account, AI service, or insurer integration is required.

## Open or update

Keep all runtime files together: `index.html`, `styles.css`, `workspace-data.js`, `app.js`, `checklist-data.js`, `checklist.js`, `template-library-data.js`, and `template-library.js`. Extract the folder somewhere permanent and open `index.html` in a modern browser. A desktop shortcut can point to that file. File-mode storage/clipboard behavior varies by browser; use the same browser and folder location.

For local development or a consistent browser origin, run Python 3 in the project folder:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

On Windows, `py -m http.server 8000 --bind 127.0.0.1` may be needed instead. Open `http://127.0.0.1:8000`, keep the terminal open, and stop it with Ctrl+C. This only serves static files; it is not an application backend. There is no `npm ci` or `npm run dev` step.

Export a backup before updating files, changing computers/browsers, moving the folder, changing ports, or clearing site data. Update with `git pull origin main`, then refresh. Do not mix files from different app versions.

## Claims and tasks

1. Enter a generic claim alias such as **Practice 01**, or a manually entered reference **only if your employer permits its local storage**. Confirm that choice and select Create claim. The checkbox is your acknowledgement, not proof of approval. Never enter customer names, policy numbers, case/accident facts, or unapproved identifiers.
2. Each claim is a collapsible card with its own tasks. Select its summary to expand/collapse; keyboard users can use Enter/Space. Add task selects that claim in the shared editor. Collapse state lasts for the page session; the first claim opens after refresh.
3. A task has a short title, multiline generic description, category, High/Medium/Low priority, due date, optional independent follow-up date, Not Started/In Progress/Waiting/Completed status, a generic waiting-on category, and multiline next steps. Description/next steps are optional and limited to 2,000 characters each; titles to 120.
4. New tasks require a due date. Existing undated tasks are preserved and can remain undated when edited. Follow-up dates are always optional. Changing either date never changes the other or automatically postpones anything.
5. Cancel hides the task editor without changing saved records. Edit updates the same record and ID. The Claim dropdown can move a task into another open claim without duplicating it. Complete/reopen using the task checkbox or status dropdown; follow-up Complete updates that same task. Delete removes only the task, without undo.
6. Close/Reopen is a **manual claim action**. Completing all tasks never closes a claim. Closed claims retain all task fields/statuses; task controls are read-only until reopened. They remain visible through Show claims → Closed/All. Rename changes the label while retaining claim/task IDs. There is no claim deletion shortcut; close unused claims to retain their records.

Categories include Training, Follow-up, Documentation, Planning, Contact, Investigation, Coverage review, Liability review, Repairs, Recovery and Other. Waiting on uses generic Customer, Repair Shop, Internal Review, Other Insurer and Other labels—never actual identities.

## Dashboard, filters and follow-ups

Dashboard counters cover **open claims only**, independently of list filters or collapsed cards: active tasks, tasks due today, overdue tasks, completed today, follow-ups overdue and follow-ups due today. Closing a claim removes its tasks from these counters and follow-up groups without changing their statuses or dates.

Within a claim, tasks sort overdue first, then today, upcoming, undated and completed. Search covers claim label, title, description, category and next steps. Priority/status filters and All/Open/Due shortcuts apply to tasks within displayed claims. Selecting a status clears a conflicting shortcut; selecting a shortcut clears the status filter. Claim visibility is a separate Open/Closed/All filter.

Follow-up groups use **only `followUpDate`**, never the due date. An incomplete task needs a follow-up date and an open claim to appear. Waiting status takes precedence for grouping, while overdue waiting tasks still count as overdue follow-ups and are highlighted. Waiting tasks without follow-up dates remain in their claim but do not appear in follow-ups. Save date in that view changes only the follow-up date. Edit task opens the shared editor for all other fields.

Dates use YYYY-MM-DD calendar strings compared with the browser's local day, not a UTC-derived day. Counters update on return after a day change or within a minute after midnight. Exact timed reminders belong in the employer's official system. A visible end-of-day reminder asks you to verify official-system follow-up records; the app sends no messages or notifications.

## Existing data and backups

The new workspace is one atomic localStorage record at `claims-companion.workspace.v2`, containing claims and tasks together. It supports up to 200 claims and 500 tasks. There is no separate duplicate follow-up database.

On first upgrade, a valid old `claims-companion.tasks.v1` list moves into one collapsible **Existing work** claim. Task IDs, content, priorities and statuses are retained. The old shared date is initially copied to both the due and follow-up fields, preserving both earlier meanings; you can then edit each independently. Old checklist-task content is retained as ordinary tasks, while interactive checklist links are retired. New tasks start with no follow-up date.

The old v1 storage record is retained unchanged as a recovery copy after migration. Once a v2 workspace exists, it takes precedence so refresh never duplicates tasks. The recovery copy does not receive new changes. Explicit Delete all claims and tasks clears current work and the older copy; an empty v2 marker prevents old tasks reappearing. Template Library preferences are not cleared.

Use **Backup → Export claims and tasks (JSON)** before relying on browser storage. A version 2 file has `app`, `version`, `claims` and `tasks`. Keep it safe: it contains references and descriptions **unencrypted**. Import replaces both claims and tasks together after confirmation, never appends duplicates, and validates unique IDs/references, categories, statuses, dates, limits, and task-to-claim links. Invalid/orphaned data, cancellation or a failed storage write leaves current work untouched. Maximum file size is 10 MB, allowing larger multiline descriptions; actual browser storage can fill before the 500-task cap.

Version 1 task exports are still accepted and convert into Existing work. A version 2 export requires this or a newer compatible app version. Template definitions/favorites/recent IDs are separate and **not included** in workspace backups. No completed note drafts are exported.

Storage is local to this browser/profile/origin, with no automatic backup or sync. Other people using the profile can access it. Clearing site data, private browsing or device loss can remove work. Use one editing tab: another tab's changes disable saving in a stale tab until reload, though truly simultaneous writes can still race. Read/write problems show warnings; export any readable work before clearing data. No silent reset or deletion is performed when saved data is unreadable.

## Day 1 reference

The 26 generic Day 1 items in six groups are now **view-only reference**, including the supervisor-review reminders. There are no selection/completion checkboxes, practice sets, progress counters or task-generation buttons. Add relevant tasks to a claim yourself. The reference neither verifies official work nor makes coverage, liability, repair-authorization or recovery decisions. Follow current employer procedures and supervisor guidance.

## Documentation Templates library

The editable **Documentation Assistant / practice note formatter has been removed**. The separate reusable **Template Library remains available** with all 41 placeholder-only scenarios in seven categories: Initial claim handling (5), Customer contact (7), Investigation (7), Coverage (5), Liability (5), Vehicle damage and repairs (6), and Follow-ups and resolution (6).

Search by title/keyword or filter category. Favorites sort first and persist by ID. Recently Used shows the last eight successfully copied template IDs. Copy Template copies the full read-only preview including placeholders; complete private fields later in the employer's approved system and verify all wording against its standards. If clipboard permissions are denied, the preview is selected for manual copying; failed automatic copies do not enter recent history.

Custom generic templates can be created, edited, duplicated or deleted. Definitions require title, category, intended use, body, two distinct uppercase bracketed placeholders, and explicit confirmation that no completed note/confidential content is present. Limits are 100 custom definitions and 100/300/6,000 characters for title/description/body. Checks flag common email/phone/identifier patterns but cannot detect all confidential content. Never put approved claim references into custom definitions—reference approval applies only to claim labels, not reusable wording.

Only generic definitions and favorite/recent IDs persist at `claims-companion.library.v1`. Searches, selected preview text and unsaved editor contents are not stored. Unsaved edits clear on page departure/reload. No claims text is copied automatically into templates. Storage failures leave built-ins usable and changes temporary with a warning. Definitions are local, unencrypted and outside workspace JSON backups.

Try a fictional example: search **Police report**, copy its template into a temporary editor, and leave placeholders unfilled. Star **Repair shop follow-up**, copy it and refresh to verify favorites/recent use. Create **Practice follow-up** with body `Action: [ACTION TAKEN]` and `Next: [NEXT ACTION]`, edit or duplicate its generic wording, then delete the duplicate.

## Checks and changed files

App runtime has no third-party dependencies. Development checks use Node.js and an available Playwright/Chromium installation; start the local server first:

```sh
node --check workspace-data.js
node --check app.js
node --check checklist.js
node --check template-library-data.js
node --check template-library.js
node tests/run.cjs
```

If Playwright is outside Node's normal module path, set `PLAYWRIGHT_MODULE` to its absolute module path. `CHROMIUM_PATH` optionally selects an installed browser; `BASE_URL` selects a different local server. Test tooling is not needed to use the app.

Suites cover the data model/migration, claims/tasks, independent follow-ups/time zones, backup/performance/privacy, static reference/removed formatter, and Template Library. Obsolete interactive checklist and practice-formatter tests were replaced to match the requested removals. See [QUALITY_REVIEW.md](QUALITY_REVIEW.md) for results and limitations.

`workspace-data.js` defines validation/migration; `app.js` owns claims/tasks/backup; `index.html` and `styles.css` present the UI; `checklist-data.js` / `checklist.js` render read-only reference. `documentation.js` was removed. Template Library runtime code is unchanged. Documentation and browser tests were updated for the new behavior.
