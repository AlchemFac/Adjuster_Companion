'use strict';

const STORAGE_KEY = 'claims-companion.tasks.v1';
const MAX_TASKS = 500;
const $ = (selector) => document.querySelector(selector);
let tasks = [];
let filter = 'all';
let editingId = null;
const PRIORITIES = ['High', 'Medium', 'Low'];
const STATUSES = ['Not Started', 'In Progress', 'Waiting', 'Completed'];
const WAITING_ON = ['', 'Customer', 'Repair Shop', 'Internal Review', 'Other Insurer', 'Other'];
const CATEGORIES = ['Training', 'Follow-up', 'Documentation', 'Planning', 'Other'];
let persistenceEnabled = true;

function validDate(value) {
  if (value === '') return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function validTask(task) {
  return task && typeof task.id === 'string' && task.id.length > 0 && task.id.length <= 100 &&
    typeof task.title === 'string' && task.title.trim().length > 0 && task.title.length <= 120 &&
    typeof task.done === 'boolean' && typeof task.date === 'string' && validDate(task.date) &&
    (task.checklist === undefined || validDayOneLink(task.checklist)) &&
    (task.waitingOn === undefined || WAITING_ON.includes(task.waitingOn)) &&
    (task.category === undefined || CATEGORIES.includes(task.category)) &&
    (task.priority === undefined || PRIORITIES.includes(task.priority)) &&
    (task.status === undefined || (STATUSES.includes(task.status) && task.done === (task.status === 'Completed'))) &&
    (task.nextAction === undefined || (typeof task.nextAction === 'string' && task.nextAction.length <= 200)) &&
    (task.completedOn === undefined || (typeof task.completedOn === 'string' && validDate(task.completedOn)));
}
// Only known task fields may reach persistent storage or backups.
function normalizeTask(task) {
  return { id: task.id, title: task.title, date: task.date, done: task.done,
    category: task.category ?? 'Training', priority: task.priority ?? 'Medium',
    status: task.status ?? (task.done ? 'Completed' : 'Not Started'),
    nextAction: task.nextAction ?? '', waitingOn: task.waitingOn ?? '',
    completedOn: task.done ? (task.completedOn ?? '') : '',
    ...(task.checklist ? { checklist: { type: 'day-one', set: task.checklist.set, step: task.checklist.step } } : {}) };
}
function validTaskList(data) {
  return Array.isArray(data) && data.length <= MAX_TASKS && data.every(validTask) &&
    new Set(data.map(t => t.id)).size === data.length &&
    new Set(data.filter(t => t.checklist).map(t => `${t.checklist.set}:${t.checklist.step}`)).size === data.filter(t => t.checklist).length;
}
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return;
    const data = JSON.parse(raw);
    if (!validTaskList(data)) throw new Error('Invalid data');
    tasks = data.map(normalizeTask);
  } catch {
    persistenceEnabled = false;
    $('#storage-status').textContent = 'Saved tasks could not be read. Existing storage has been left untouched. New tasks are temporary until you delete saved tasks below or resolve browser storage access.';
  }
}
function saveTasks() {
  if (!persistenceEnabled) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    $('#storage-status').textContent = '';
  } catch {
    $('#storage-status').textContent = 'Changes are only in memory: browser storage is unavailable or full. They may be lost when this page closes. Try again after freeing storage.';
  }
}
function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function setStatus(task, status) {
  if (status === 'Completed' && !task.done) task.completedOn = today();
  if (status !== 'Completed') task.completedOn = '';
  task.status = status;
  task.done = status === 'Completed';
}
function resetEditor() {
  editingId = null;
  $('#task-form').reset();
  $('#task-title').setCustomValidity('');
  $('#save-task').textContent = 'Add task';
  $('#cancel-edit').hidden = true;
}
function editTask(task) {
  editingId = task.id;
  $('#task-title').setCustomValidity('');
  $('#task-title').value = task.title;
  $('#task-category').value = task.category;
  $('#task-priority').value = task.priority;
  $('#task-date').value = task.date;
  $('#task-status').value = task.status;
  $('#task-waiting-on').value = task.waitingOn;
  $('#task-next-action').value = task.nextAction;
  $('#save-task').textContent = 'Save changes';
  $('#cancel-edit').hidden = false;
  $('#task-feedback').textContent = 'Editing task. Save changes or cancel.';
  $('#task-title').focus();
}
function render({ followups = true } = {}) {
  const list = $('#task-list');
  list.replaceChildren();
  const localToday = today();
  const priority = $('#priority-filter').value;
  const status = $('#status-filter').value;
  const search = $('#task-search').value.trim().toLocaleLowerCase();
  const rank = task => task.done ? 4 : !task.date ? 3 : task.date < localToday ? 0 : task.date === localToday ? 1 : 2;
  const visible = tasks.filter(t =>
    (filter === 'all' || (filter === 'open' && !t.done) || (filter === 'done' && t.done) || (filter === 'due' && !t.done && t.date && t.date <= localToday)) &&
    (!priority || t.priority === priority) && (!status || t.status === status) &&
    (!search || `${t.title} ${t.category} ${t.nextAction}`.toLocaleLowerCase().includes(search))
  ).sort((a, b) => rank(a) - rank(b) || a.date.localeCompare(b.date));
  visible.forEach(task => {
    const row = document.createElement('li');
    row.className = `task${task.done ? ' completed' : ''}`;
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = task.done;
    check.id = `task-${task.id}`;
    check.setAttribute('aria-label', `${task.done ? 'Reopen' : 'Complete'} task: ${task.title}`);
    check.addEventListener('change', () => {
      setStatus(task, check.checked ? 'Completed' : 'Not Started');
      if (editingId === task.id) $('#task-status').value = task.status;
      saveTasks(); render();
      const replacement = document.getElementById(check.id);
      (replacement || $('#task-title')).focus();
    });
    const details = document.createElement('div');
    details.className = 'task-details';
    const label = document.createElement('label');
    label.htmlFor = check.id;
    label.textContent = task.title;
    const meta = document.createElement('small');
    meta.textContent = `${task.category} · ${task.priority} priority${task.waitingOn ? ` · Waiting on: ${task.waitingOn}` : ''}`;
    details.append(label, meta);
    const date = document.createElement('small');
    const overdue = !task.done && task.date && task.date < localToday;
    date.textContent = task.date ? `${overdue ? 'Overdue' : !task.done && task.date === localToday ? 'Due today' : 'Due'}: ${task.date}` : 'No due date';
    if (overdue) date.className = 'overdue';
    details.append(date);
    if (task.nextAction) {
      const next = document.createElement('small');
      next.textContent = `Next: ${task.nextAction}`;
      details.append(next);
    }
    const actions = document.createElement('div');
    actions.className = 'task-actions';
    const statusSelect = document.createElement('select');
    statusSelect.id = `status-${task.id}`;
    statusSelect.setAttribute('aria-label', `Status for ${task.title}`);
    STATUSES.forEach(status => {
      const option = document.createElement('option');
      option.value = status; option.textContent = status;
      statusSelect.append(option);
    });
    statusSelect.value = task.status;
    statusSelect.addEventListener('change', () => {
      setStatus(task, statusSelect.value);
      if (editingId === task.id) $('#task-status').value = task.status;
      saveTasks(); render();
      (document.getElementById(statusSelect.id) || $('#task-title')).focus();
      $('#task-feedback').textContent = 'Task status updated.';
    });
    const edit = document.createElement('button');
    edit.type = 'button'; edit.textContent = 'Edit';
    edit.setAttribute('aria-label', `Edit task: ${task.title}`);
    edit.addEventListener('click', () => editTask(task));
    const remove = document.createElement('button');
    remove.type = 'button'; remove.textContent = 'Delete';
    remove.className = 'danger';
    remove.setAttribute('aria-label', `Delete task: ${task.title}`);
    remove.addEventListener('click', () => {
      tasks = tasks.filter(t => t.id !== task.id);
      if (editingId === task.id) resetEditor();
      saveTasks(); render();
      $('#task-feedback').textContent = 'Task deleted.';
      $('#task-title').focus();
    });
    actions.append(statusSelect, edit, remove);
    row.append(check, details, actions);
    list.append(row);
  });
  if (followups) renderFollowups(localToday);
  if (typeof renderDayOneChecklist === 'function') renderDayOneChecklist();
  $('#active-count').textContent = tasks.filter(t => !t.done).length;
  $('#today-count').textContent = tasks.filter(t => !t.done && t.date === localToday).length;
  $('#overdue-count').textContent = tasks.filter(t => !t.done && t.date && t.date < localToday).length;
  $('#completed-count').textContent = tasks.filter(t => t.done && t.completedOn === localToday).length;
  $('#task-count').textContent = `${visible.length} shown · ${tasks.length} total`;
  $('#empty-tasks').hidden = visible.length > 0;
  $('#empty-tasks').textContent = tasks.length ? 'No tasks match this filter.' : 'A clear slate. Add a generic task to get started.';
}
function renderFollowups(localToday) {
  const active = tasks.filter(task => !task.done);
  const groups = { overdue: [], today: [], upcoming: [], waiting: [] };
  active.forEach(task => {
    if (task.status === 'Waiting') groups.waiting.push(task);
    else if (task.date) groups[task.date < localToday ? 'overdue' : task.date === localToday ? 'today' : 'upcoming'].push(task);
  });
  Object.entries(groups).forEach(([group, records]) => {
    const list = $(`#followup-${group}`);
    list.replaceChildren();
    records.sort((a, b) => (a.date || '9999-12-31').localeCompare(b.date || '9999-12-31')).forEach(task => {
      const overdue = task.date && task.date < localToday;
      const row = document.createElement('li');
      row.className = `followup-row${overdue ? ' is-overdue' : ''}`;
      const details = document.createElement('div');
      details.className = 'task-details';
      const title = document.createElement('strong');
      title.textContent = task.title;
      const date = document.createElement('p');
      date.className = overdue ? 'overdue' : 'muted';
      date.textContent = !task.date ? 'No follow-up date set' : `${overdue ? 'Overdue' : task.date === localToday ? 'Due today' : 'Upcoming'}: ${task.date}`;
      details.append(title, date);
      if (task.nextAction) {
        const next = document.createElement('p'); next.textContent = `Next: ${task.nextAction}`; details.append(next);
      }
      const controls = document.createElement('div');
      controls.className = 'followup-controls';
      const dateForm = document.createElement('form');
      const dateLabel = document.createElement('label');
      dateLabel.textContent = 'Follow-up date';
      const input = document.createElement('input');
      input.type = 'date'; input.value = task.date; input.id = `followup-date-${task.id}`;
      input.setAttribute('aria-label', `Follow-up date for ${task.title}`);
      dateLabel.append(input);
      const save = document.createElement('button');
      save.type = 'submit'; save.textContent = 'Save date';
      save.setAttribute('aria-label', `Save follow-up date for ${task.title}`);
      dateForm.append(dateLabel, save);
      dateForm.addEventListener('submit', event => {
        event.preventDefault();
        if (!validDate(input.value)) { input.reportValidity(); return; }
        task.date = input.value;
        if (editingId === task.id) $('#task-date').value = task.date;
        saveTasks(); render();
        $('#followup-feedback').textContent = task.date ? `Follow-up date saved: ${task.date}.` : 'Follow-up date cleared. The task remains in Workload Management.';
        (document.getElementById(input.id) || $('#followups-title')).focus();
      });
      const waitingLabel = document.createElement('label');
      waitingLabel.textContent = 'Waiting on (category only)';
      const waiting = document.createElement('select');
      waiting.id = `waiting-${task.id}`;
      waiting.setAttribute('aria-label', `Waiting on for ${task.title}`);
      WAITING_ON.forEach(category => {
        const option = document.createElement('option'); option.value = category; option.textContent = category || 'Not specified'; waiting.append(option);
      });
      waiting.value = task.waitingOn;
      waiting.addEventListener('change', () => {
        task.waitingOn = waiting.value;
        if (editingId === task.id) $('#task-waiting-on').value = task.waitingOn;
        saveTasks(); render();
        document.getElementById(waiting.id)?.focus();
        $('#followup-feedback').textContent = 'Waiting-on category saved.';
      });
      waitingLabel.append(waiting);
      const complete = document.createElement('button');
      complete.type = 'button'; complete.textContent = 'Complete';
      complete.setAttribute('aria-label', `Complete follow-up: ${task.title}`);
      complete.addEventListener('click', () => {
        setStatus(task, 'Completed');
        if (editingId === task.id) $('#task-status').value = task.status;
        saveTasks(); render();
        $('#followup-feedback').textContent = 'Follow-up and its workload task marked completed.';
        $('#followups-title').focus();
      });
      controls.append(dateForm, waitingLabel, complete);
      row.append(details, controls); list.append(row);
    });
    if (!records.length) {
      const empty = document.createElement('li'); empty.className = 'muted'; empty.textContent = 'No follow-ups in this group.'; list.append(empty);
    }
  });
}
$('#task-form').addEventListener('submit', event => {
  event.preventDefault();
  const titleInput = $('#task-title');
  const title = titleInput.value.trim();
  const date = $('#task-date').value;
  titleInput.setCustomValidity(title ? '' : 'Enter a generic task title.');
  if (!title) { titleInput.reportValidity(); return; }
  if (!validDate(date)) { $('#task-date').focus(); return; }
  const existing = editingId ? tasks.find(t => t.id === editingId) : null;
  if (!existing && tasks.length >= MAX_TASKS) { $('#task-feedback').textContent = 'Task limit reached (500). Delete old tasks before adding more.'; return; }
  const task = existing || { id: crypto.randomUUID(), done: false, completedOn: '' };
  Object.assign(task, { title, date, category: $('#task-category').value,
    priority: $('#task-priority').value, waitingOn: $('#task-waiting-on').value, nextAction: $('#task-next-action').value.trim() });
  setStatus(task, $('#task-status').value);
  if (!existing) tasks.push(task);
  saveTasks(); resetEditor(); render();
  $('#task-feedback').textContent = existing ? 'Task updated.' : 'Task added. If hidden, check your search and filters.';
  titleInput.focus();
});
$('#task-title').addEventListener('input', () => $('#task-title').setCustomValidity(''));
$('#cancel-edit').addEventListener('click', () => {
  resetEditor(); $('#task-feedback').textContent = 'Edit cancelled.'; $('#task-title').focus();
});
['#priority-filter', '#status-filter'].forEach(selector => $(selector).addEventListener('change', () => {
  // A selected status should not silently conflict with an Open/Due shortcut.
  if (selector === '#status-filter' && $('#status-filter').value) {
    filter = 'all';
    document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === 'all')));
  }
  render({ followups: false });
}));
$('#task-search').addEventListener('input', () => render({ followups: false }));
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  filter = button.dataset.filter;
  $('#status-filter').value = '';
  document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  render({ followups: false });
}));
$('#clear-data').addEventListener('click', () => {
  if (!confirm('Delete all tasks saved by Claims Companion in this browser? This cannot be undone.')) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    tasks = []; persistenceEnabled = true; resetEditor();
    $('#task-feedback').textContent = '';
    $('#followup-feedback').textContent = '';
    $('#storage-status').textContent = 'All saved tasks deleted.';
    render();
  } catch { $('#storage-status').textContent = 'Saved tasks could not be deleted. Use your browser’s site-data settings to remove them.'; }
});
// Use one editing tab per browser profile to avoid overwriting another tab’s work.
window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY || event.key === null) {
    $('#storage-status').textContent = 'Saved tasks changed in another tab. Reload before editing; this tab will not overwrite them.';
    persistenceEnabled = false;
  }
});
// Returning from a date picker or another window must not discard pending date edits.
let renderedDay = today();
function refreshCalendar() {
  if (today() !== renderedDay) { renderedDay = today(); render(); }
}
window.addEventListener('focus', refreshCalendar);
setInterval(refreshCalendar, 60000);
loadTasks(); render();

$('#export-tasks').addEventListener('click', () => {
  const backup = { app: 'claims-companion', version: 1, tasks: tasks.map(normalizeTask) };
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url; link.download = `claims-companion-tasks-${today()}.json`;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  $('#backup-status').textContent = `Exported ${tasks.length} tasks. Documentation drafts are not included.`;
});
$('#import-tasks').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 1024 * 1024) throw new Error('Backup exceeds the 1 MB size limit.');
    const backup = JSON.parse(await file.text());
    if (!backup || backup.app !== 'claims-companion' || backup.version !== 1 || !validTaskList(backup.tasks)) {
      throw new Error('Invalid backup. Choose a version 1 Claims Companion task export with unique task IDs (maximum 500 tasks).');
    }
    if (!persistenceEnabled) throw new Error('Reload or clear unreadable saved tasks before importing. No tasks were changed.');
    const imported = backup.tasks.map(normalizeTask);
    if (!confirm(`Replace all ${tasks.length} current tasks with ${imported.length} imported tasks? Export a backup first. This cannot be undone.`)) {
      $('#backup-status').textContent = 'Import cancelled. No tasks were changed.'; return;
    }
    // Persist before replacing in-memory tasks: storage failures leave current tasks intact.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
    tasks = imported; resetEditor();
    filter = 'all'; $('#priority-filter').value = ''; $('#status-filter').value = ''; $('#task-search').value = '';
    document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === 'all')));
    $('#storage-status').textContent = ''; $('#task-feedback').textContent = ''; $('#followup-feedback').textContent = '';
    render();
    $('#backup-status').textContent = `Imported ${tasks.length} tasks, replacing the previous list. Documentation drafts were not imported.`;
  } catch (error) {
    $('#backup-status').textContent = error instanceof SyntaxError ? 'Invalid JSON. No tasks were changed.' : `Import failed: ${error.message} No tasks were changed.`;
  } finally { event.target.value = ''; }
});
