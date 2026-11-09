'use strict';

const STORAGE_KEY = 'claims-companion.tasks.v1';
const MAX_TASKS = 500;
const templates = {
  daily: 'DAILY LEARNING PLAN\n\nLearning goal: [generic topic]\nTraining material to review: [topic]\nPractice activity: [fictional exercise]\nQuestions for a mentor: [generic questions]\nNext learning step: [action]',
  followup: 'GENERIC FOLLOW-UP CHECKLIST\n\n[ ] Review the training checklist\n[ ] Identify the next generic action\n[ ] Review approved learning materials\n[ ] Prepare a generic question for a mentor\n[ ] Set a follow-up date\n\nUse fictional exercises only.',
  practice: 'PRACTICE DOCUMENTATION OUTLINE\n\nExercise: [fictional training label]\nPurpose: [generic learning objective]\nChecklist reviewed: [training topic]\nLearning takeaway: [generic observation]\nNext practice step: [action]\n\nDo not include real customer or case information.'
};
const $ = (selector) => document.querySelector(selector);
let tasks = [];
let filter = 'all';
let editingId = null;
const PRIORITIES = ['High', 'Medium', 'Low'];
const STATUSES = ['Not Started', 'In Progress', 'Waiting', 'Completed'];
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
    (task.category === undefined || CATEGORIES.includes(task.category)) &&
    (task.priority === undefined || PRIORITIES.includes(task.priority)) &&
    (task.status === undefined || (STATUSES.includes(task.status) && task.done === (task.status === 'Completed'))) &&
    (task.nextAction === undefined || (typeof task.nextAction === 'string' && task.nextAction.length <= 200)) &&
    (task.completedOn === undefined || (typeof task.completedOn === 'string' && validDate(task.completedOn)));
}
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return;
    const data = JSON.parse(raw);
    if (!Array.isArray(data) || data.length > MAX_TASKS || !data.every(validTask) || new Set(data.map(t => t.id)).size !== data.length) throw new Error('Invalid data');
    // Extend existing records in place; retain IDs and the original storage key.
    // Legacy completed tasks have no known completion day and are not counted as today.
    tasks = data.map(task => ({ ...task, category: task.category ?? 'Training',
      priority: task.priority ?? 'Medium', status: task.status ?? (task.done ? 'Completed' : 'Not Started'),
      nextAction: task.nextAction ?? '', completedOn: task.done ? (task.completedOn ?? '') : '' }));
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
  $('#task-next-action').value = task.nextAction;
  $('#save-task').textContent = 'Save changes';
  $('#cancel-edit').hidden = false;
  $('#task-feedback').textContent = 'Editing task. Save changes or cancel.';
  $('#task-title').focus();
}
function render() {
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
    meta.textContent = `${task.category} · ${task.priority} priority`;
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
  $('#active-count').textContent = tasks.filter(t => !t.done).length;
  $('#today-count').textContent = tasks.filter(t => !t.done && t.date === localToday).length;
  $('#overdue-count').textContent = tasks.filter(t => !t.done && t.date && t.date < localToday).length;
  $('#completed-count').textContent = tasks.filter(t => t.done && t.completedOn === localToday).length;
  $('#task-count').textContent = `${visible.length} shown · ${tasks.length} total`;
  $('#empty-tasks').hidden = visible.length > 0;
  $('#empty-tasks').textContent = tasks.length ? 'No tasks match this filter.' : 'A clear slate. Add a generic task to get started.';
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
    priority: $('#task-priority').value, nextAction: $('#task-next-action').value.trim() });
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
['#priority-filter', '#status-filter'].forEach(selector => $(selector).addEventListener('change', render));
$('#task-search').addEventListener('input', render);
document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  filter = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  render();
}));
function showTemplate() { $('#template-preview').value = templates[$('#template-select').value]; $('#copy-status').textContent = ''; }
$('#template-select').addEventListener('change', showTemplate);
$('#copy-template').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText($('#template-preview').value);
    $('#copy-status').textContent = 'Template copied.';
  } catch {
    $('#template-preview').focus(); $('#template-preview').select();
    $('#copy-status').textContent = 'Automatic copying is unavailable. The template is selected; use your browser’s Copy command.';
  }
});
$('#clear-data').addEventListener('click', () => {
  if (!confirm('Delete all tasks saved by Claims Companion in this browser? This cannot be undone.')) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    tasks = []; persistenceEnabled = true; resetEditor();
    $('#task-feedback').textContent = '';
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
window.addEventListener('focus', render);
// Refresh calendar-day counts overnight without rebuilding controls every minute.
let renderedDay = today();
setInterval(() => {
  if (today() !== renderedDay) { renderedDay = today(); render(); }
}, 60000);
loadTasks(); render(); showTemplate();
