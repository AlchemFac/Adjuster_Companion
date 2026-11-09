# Claims Companion

An independent personal learning organizer using HTML, CSS, and vanilla JavaScript. No dependencies, backend, external assets, analytics, or network integrations.

## Launch

For personal use, open `index.html` in a modern browser. Keep the folder in the same location and use the same browser. File-based storage behavior varies by browser; a local server gives a consistent origin.

For local development, from this directory run:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000. Keep this address and port consistent: browser storage is scoped to the origin. Stop the server with Ctrl+C. Use a modern browser; clipboard access can depend on browser permissions. If copying fails, the preview is selected for manual copying.

## Files

- `index.html`: accessible form, task filters, templates, and privacy notice.
- `styles.css`: responsive layout and focus styles.
- `app.js`: workload creation/editing, completion, deletion, search/filters, summaries, templates, and storage validation.

## Privacy and persistence

Use fictional labels and generic training tasks only. Never enter real customer names, claim or policy numbers, accident facts, or confidential insurance information. The app cannot detect confidential content: this restriction depends on what you enter. There are no insurer integrations or insurer branding.

Tasks are stored unencrypted in localStorage in this browser profile. They are not synced or backed up. Clearing site data, private browsing, or changing origins may remove or hide them. People with access to the same profile can read them. Storage errors are shown in the app; unreadable data is left untouched. Delete all saved tasks clears only this app's storage key. Use a single editing tab; when another tab changes storage, saving in the current tab is disabled until reload to reduce overwrite risk. Simultaneous writes can still race.

Templates are fixed, generic, read-only outlines and are not saved separately. Dates use local calendar days; Due includes overdue and today's incomplete tasks. No reminders run while the app is closed.

## Workload management

Create or edit a task using the same form: title, category, priority (High/Medium/Low), due date, status (Not Started/In Progress/Waiting/Completed), and optional generic next action. Category, priority, and status have defaults; due dates remain optional for compatibility with existing tasks. Select Edit to populate the form, then Save changes or Cancel edit. The checkbox completes a task in one click; unchecking reopens it as Not Started. The status menu on each task changes its status directly.

Active tasks include all statuses except Completed. Due today and overdue counts include active tasks only. Completed today counts tasks currently completed on the browser's local calendar day; reopening removes them from that count. Original completed tasks without a known completion day are not counted as completed today. Counts cover all tasks, independent of the visible filters.

The list sorts active overdue tasks first, then today's tasks, upcoming tasks, undated tasks, and completed tasks. Within each group, earlier dates come first. Search matches title, category, and next action without case sensitivity. Priority, status, search, and the original All/Open/Due/Completed buttons combine; reset them if an expected task is hidden.

Existing records keep their IDs and original storage key, with defaults for new fields. Editing updates the existing record instead of making a copy. Completion dates are stored as local calendar days. Keep one editing tab open; no background notifications or confidential-content detection are provided.

## Follow-up tracking

Every task's due date is also its follow-up date: one record, one shared date. Assign it when adding or editing a task, or change it with the date field and Save date in Follow-up tracking. Clearing the date leaves the task available in Workload Management. Overdue dates never change automatically.

Incomplete dated tasks appear in Overdue, Due Today, or Upcoming. Tasks with Waiting status appear only in Waiting, even when overdue; an overdue waiting task is highlighted and still counts toward the dashboard's overdue follow-ups. Undated Waiting tasks are shown too. Other undated tasks remain in Workload Management. Completed tasks are excluded from follow-up groups and counts, and remain accessible through the workload Completed filter. Complete in either view updates the same task; reopen in Workload Management if needed.

Waiting-on categories are generic labels only: Customer, Repair Shop, Internal Review, Other Insurer, Other (or Not specified). Selecting a category does not change a task's status or date. Do not enter identities or confidential details.

Dates are stored and compared as YYYY-MM-DD calendar dates using the browser's local day, without UTC conversion for grouping. Counts refresh on window focus and at the next minute check after midnight. The visible end-of-day reminder asks you to verify required follow-ups in your employer's official system; it is not a notification or a record of that verification. No email, SMS, push, or integrations are used.

## Checks

```sh
node --check app.js
```

In the browser, add `Review training checklist` with yesterday's date; verify it appears under Due. Complete it, verify Completed, then reload and verify persistence. Delete it and reload. Try all templates and copying (or the manual fallback). Verify Delete all saved tasks asks for confirmation. Check the layout at a narrow viewport, and navigate with the keyboard. Never use real case information while testing.

Additional workload checks: create tasks dated yesterday, today, and tomorrow in a different order; verify chronological groups and the four summary counts. Edit every field and reload; verify one updated record remains. Combine priority/status filters with a search and check both matches and empty results. Mark a task complete and reopen it; check counts before and after reload. Cancel an edit and verify the original stays unchanged. Repeat with fictional labels only.

There is no build step or package installation. Notifications, accounts, and backup/import are outside this scope.

Follow-up checks: create generic tasks dated yesterday, today, and tomorrow; verify groups and dashboard counts. Set a task to Waiting, choose a waiting-on category, and verify it appears once in Waiting while still counting if overdue. Save a new follow-up date and verify the workload date changes without a new task. Complete it and verify it leaves follow-ups after reload. Confirm overdue dates are unchanged when reopening the app.
