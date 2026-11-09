# Claims Companion

An independent personal learning organizer using HTML, CSS, and vanilla JavaScript. No dependencies, backend, external assets, analytics, or network integrations.

## Launch

From this directory, run:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open http://127.0.0.1:8000. Keep this address and port consistent: browser storage is scoped to the origin. Stop the server with Ctrl+C. Use a modern browser; clipboard access can depend on browser permissions. If copying fails, the preview is selected for manual copying.

## Files

- `index.html`: accessible form, task filters, templates, and privacy notice.
- `styles.css`: responsive layout and focus styles.
- `app.js`: task creation, completion, deletion, due-date filters, templates, and storage validation.

## Privacy and persistence

Use fictional labels and generic training tasks only. Never enter real customer names, claim or policy numbers, accident facts, or confidential insurance information. The app cannot detect confidential content: this restriction depends on what you enter. There are no insurer integrations or insurer branding.

Tasks are stored unencrypted in localStorage in this browser profile. They are not synced or backed up. Clearing site data, private browsing, or changing origins may remove or hide them. People with access to the same profile can read them. Storage errors are shown in the app; unreadable data is left untouched. Delete all saved tasks clears only this app's storage key. Use a single editing tab; when another tab changes storage, saving in the current tab is disabled until reload to reduce overwrite risk. Simultaneous writes can still race.

Templates are fixed, generic, read-only outlines and are not saved separately. Dates use local calendar days; Due includes overdue and today's incomplete tasks. No reminders run while the app is closed.

## Checks

```sh
node --check app.js
```

In the browser, add `Review training checklist` with yesterday's date; verify it appears under Due. Complete it, verify Completed, then reload and verify persistence. Delete it and reload. Try all templates and copying (or the manual fallback). Verify Delete all saved tasks asks for confirmation. Check the layout at a narrow viewport, and navigate with the keyboard. Never use real case information while testing.

There is no build step or package installation. Editing task text/dates, notifications, accounts, and backup/import are outside this initial scope.
