# Claims Companion

A personal practice organizer built with HTML, CSS, and vanilla JavaScript. It requires **no npm installation, backend, external account, cloud service, or internet connection**. Use only fictional labels and generic training information. There are no insurer integrations or insurer branding.

## Open the app

For one person, extract all files into a permanent folder and double-click `index.html`. Keep `index.html`, `styles.css`, `app.js`, and `documentation.js` together. Use the same browser and location each time. A desktop shortcut can point to `index.html`.

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
- **Documentation:** Customer contact, Contact attempt, Investigation update, Repair estimate follow-up, and General follow-up. Each includes Purpose, Action taken, Information obtained, Outstanding items, Next steps, and an optional follow-up date. Prompts are hints, never prefilled facts. Missing information is marked `[Not provided]`; the app formats only what you enter and generates no coverage, liability, settlement, or payment decisions. The original learning outlines remain available.
- **Clipboard and clearing:** Copy to Clipboard copies the current preview. If browser policy denies copying, the preview is selected for manual copying. Clear Form empties documentation fields and preview, but leaves your system clipboard unchanged. Changing documentation templates clears the prior form.
- **Navigation and layout:** section links and a keyboard skip link, labeled controls, visible focus, responsive desktop columns and mobile stacking, and scrollable task/follow-up lists for larger workloads.
- **End-of-day reminder:** a visible reminder to verify required follow-ups in the employer's official system. No automatic submission, emails, SMS, push, or background reminders.

## Privacy and data limitations

Never enter real customer names, claim or policy numbers, accident facts, or other confidential insurance information. Documentation also warns against using real information without employer approval. This personal tool is intended for fictional practice; it cannot detect confidential text.

Tasks are unencrypted in `localStorage`, scoped to the current browser profile and origin. People using that profile may see them. They are not automatically backed up or synced. Private browsing, clearing site data, changing origins, or losing the device can remove access. The current maximum is 500 tasks. Documentation fields are limited to 2,000 characters each; task titles to 120 and next actions to 200.

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
node tests/run.cjs
```

The runner uses an installed `playwright` module. If it lives outside Node's normal lookup path, set `PLAYWRIGHT_MODULE` to its absolute module path. Optionally set `CHROMIUM_PATH` for an installed browser and `BASE_URL` for a different local address. It uses system Chromium at `/usr/bin/chromium` when present; otherwise Playwright's browser. No package installation is needed to use the app itself.

`tests/run.cjs` runs workload, follow-up, documentation/clipboard, and final quality suites. Each uses an isolated browser context with fictional data. The quality suite covers 100-task backups, malformed/cancelled/oversized imports, storage failure, keyboard interaction, responsive widths, and network observations. Set `SCREENSHOT_DIR` to capture desktop/mobile review images. See [QUALITY_REVIEW.md](QUALITY_REVIEW.md) for observed results and test limitations.

Manual spot checks: use Tab/Shift+Tab, Enter and Space to create/edit/complete tasks; check screen-reader announcements with your own assistive technology; copy and paste a fictional preview into a temporary editor; export/import a test backup before relying on it. Never use real case information for testing.
