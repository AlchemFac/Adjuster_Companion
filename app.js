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
    typeof task.done === 'boolean' && typeof task.date === 'string' && validDate(task.date);
}
function loadTasks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return;
    const data = JSON.parse(raw);
    if (!Array.isArray(data) || data.length > MAX_TASKS || !data.every(validTask) || new Set(data.map(t => t.id)).size !== data.length) throw new Error('Invalid data');
    tasks = data;
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
function render() {
  const list = $('#task-list');
  list.replaceChildren();
  const localToday = today();
  const visible = tasks.filter(t => filter === 'all' || (filter === 'open' && !t.done) || (filter === 'done' && t.done) || (filter === 'due' && !t.done && t.date && t.date <= localToday));
  visible.forEach(task => {
    const row = document.createElement('li');
    row.className = `task${task.done ? ' completed' : ''}`;
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.checked = task.done;
    check.id = `task-${task.id}`;
    check.addEventListener('change', () => { task.done = check.checked; saveTasks(); render(); });
    const label = document.createElement('label');
    label.htmlFor = check.id;
    label.textContent = task.title;
    if (task.date) {
      const date = document.createElement('small');
      const overdue = !task.done && task.date < localToday;
      date.textContent = `${overdue ? 'Overdue' : 'Follow up'}: ${task.date}`;
      if (overdue) date.className = 'overdue';
      label.append(date);
    }
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Delete';
    remove.setAttribute('aria-label', `Delete task: ${task.title}`);
    remove.addEventListener('click', () => {
      tasks = tasks.filter(t => t.id !== task.id);
      saveTasks(); render();
      $('#task-title').focus();
    });
    row.append(check, label, remove);
    list.append(row);
  });
  $('#task-count').textContent = `${tasks.filter(t => !t.done).length} open · ${tasks.filter(t => t.done).length} completed`;
  $('#empty-tasks').hidden = visible.length > 0;
  $('#empty-tasks').textContent = tasks.length ? 'No tasks match this filter.' : 'A clear slate. Add a generic task to get started.';
}
$('#task-form').addEventListener('submit', event => {
  event.preventDefault();
  const title = $('#task-title').value.trim();
  const date = $('#task-date').value;
  if (!title || !validDate(date)) { $('#task-title').focus(); return; }
  if (tasks.length >= MAX_TASKS) { $('#storage-status').textContent = 'Task limit reached (500). Delete old tasks before adding more.'; return; }
  tasks.push({ id: crypto.randomUUID(), title, date, done: false });
  saveTasks();
  $('#task-form').reset();
  render();
  $('#task-title').focus();
});
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
    tasks = []; persistenceEnabled = true;
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
loadTasks(); render(); showTemplate();
