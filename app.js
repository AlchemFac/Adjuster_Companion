'use strict';

const STORAGE_KEY = 'claims-companion.workspace.v2';
const LEGACY_STORAGE_KEY = 'claims-companion.tasks.v1';
const $ = selector => document.querySelector(selector);
let claims = [], tasks = [];
let editingId = null, editingClaimId = null, filter = 'all';
let persistenceEnabled = true;
const expandedClaims = new Set();
function workspace() { return { version: 2, claims, tasks }; }
function today() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function saveTasks() {
  if (!persistenceEnabled) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace())); $('#storage-status').textContent = ''; }
  catch { $('#storage-status').textContent = 'Changes are only in memory: browser storage is unavailable or full. Export a backup before closing; changes may be lost on reload.'; }
}
function loadWorkspace() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw !== null) {
      const data = normalizeWorkspace(JSON.parse(raw)); claims = data.claims; tasks = data.tasks;
    } else {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy !== null) {
        const data = migrateLegacyTasks(JSON.parse(legacy)); claims = data.claims; tasks = data.tasks;
        saveTasks();
        $('#claim-feedback').textContent = 'Existing tasks moved into Existing work. Their former shared date was preserved as both due and follow-up dates; you can now change either independently.';
      }
    }
    if (claims[0]) expandedClaims.add(claims[0].id);
  } catch {
    persistenceEnabled = false;
    $('#storage-status').textContent = 'Saved work could not be read. Existing storage is untouched. Changes are temporary until you resolve storage access or clear saved work below.';
  }
}
function claimFor(task) { return claims.find(c => c.id === task.claimId); }
function openTasks() { const ids = new Set(claims.filter(c => c.status === 'Open').map(c => c.id)); return tasks.filter(t => ids.has(t.claimId)); }
function setStatus(task, status) {
  if (status === 'Completed' && !task.done) task.completedOn = today();
  if (status !== 'Completed') task.completedOn = '';
  task.status = status; task.done = status === 'Completed';
}
function resetEditor(claimId = $('#task-claim').value) {
  editingId = null; $('#task-form').reset(); $('#task-date').required = true; $('#task-title').setCustomValidity('');
  $('#task-claim').value = claimId; $('#save-task').textContent = 'Add task'; $('#cancel-edit').hidden = false;
}
function editTask(task) {
  editingId = task.id;
  $('#task-form').hidden = false;
  $('#task-title').setCustomValidity('');
  for (const [selector, value] of [ ['#task-claim', task.claimId], ['#task-title', task.title], ['#task-description', task.description],
    ['#task-category', task.category], ['#task-priority', task.priority], ['#task-date', task.date], ['#task-followup-date', task.followUpDate],
    ['#task-status', task.status], ['#task-waiting-on', task.waitingOn], ['#task-next-action', task.nextAction] ]) $(selector).value = value;
  // Undated migrated tasks can retain their due date; new tasks require one.
  $('#task-date').required = !!task.date;
  $('#save-task').textContent = 'Save changes'; $('#cancel-edit').hidden = false; $('#task-title').focus();
}
function prepareTask(claim) {
  resetEditor(claim.id); $('#task-date').required = true; $('#task-form').hidden = false;
  $('#task-title').focus();
}
function resetClaimEditor() { editingClaimId = null; $('#claim-form').reset(); $('#save-claim').textContent = 'Create claim'; $('#cancel-claim-edit').hidden = true; }
function renderClaimOptions() {
  const previous = $('#task-claim').value;
  $('#task-claim').replaceChildren();
  claims.forEach(claim => {
    const option = document.createElement('option'); option.value = claim.id;
    option.textContent = `${claim.reference}${claim.status === 'Closed' ? ' (closed)' : ''}`;
    $('#task-claim').append(option);
  });
  $('#task-claim').value = claims.some(c => c.id === previous) ? previous : (claims.find(c => c.status === 'Open')?.id || claims[0]?.id || '');
  if (!claims.length) $('#task-form').hidden = true;
}
function button(text, label, action) {
  const element = document.createElement('button'); element.type = 'button'; element.textContent = text;
  if (label) element.setAttribute('aria-label', label);
  element.addEventListener('click', action); return element;
}
function focusTaskControl(task, id) {
  (document.getElementById(id) || document.getElementById(`claim-${task.claimId}`)?.querySelector('summary') || $('#tasks-title')).focus();
}
function renderTaskRow(task, claim) {
  const row = document.createElement('li'); row.className = `task${task.done ? ' completed' : ''}`;
  const closed = claim.status === 'Closed';
  const check = document.createElement('input'); check.type = 'checkbox'; check.checked = task.done; check.disabled = closed;
  check.id = `task-${task.id}`; check.setAttribute('aria-label', `${task.done ? 'Reopen' : 'Complete'} task: ${task.title}`);
  check.addEventListener('change', () => {
    setStatus(task, check.checked ? 'Completed' : 'Not Started');
    if (editingId === task.id) $('#task-status').value = task.status;
    saveTasks(); render(); focusTaskControl(task, check.id);
  });
  const details = document.createElement('div'); details.className = 'task-details';
  const label = document.createElement('label'); label.htmlFor = check.id; label.textContent = task.title; details.append(label);
  const line = (text, className = '') => { const small = document.createElement('small'); small.textContent = text; small.className = className; details.append(small); };
  line(`${task.category} · ${task.priority} priority${task.waitingOn ? ` · Waiting on: ${task.waitingOn}` : ''}`);
  if (task.description) line(task.description, 'multiline');
  const overdue = !task.done && task.date && task.date < today();
  line(task.date ? `${overdue ? 'Overdue' : 'Due'}: ${task.date}` : 'No due date', overdue ? 'overdue' : '');
  if (task.followUpDate) line(`Follow up: ${task.followUpDate}`);
  if (task.nextAction) line(`Next steps: ${task.nextAction}`, 'multiline');
  const actions = document.createElement('div'); actions.className = 'task-actions';
  const status = document.createElement('select'); status.id = `status-${task.id}`; status.disabled = closed;
  status.setAttribute('aria-label', `Status for ${task.title}`);
  STATUSES.forEach(value => { const option = document.createElement('option'); option.textContent = value; status.append(option); });
  status.value = task.status;
  status.addEventListener('change', () => {
    setStatus(task, status.value); if (editingId === task.id) $('#task-status').value = task.status;
    saveTasks(); render(); focusTaskControl(task, status.id);
  });
  const edit = button('Edit', `Edit task: ${task.title}`, () => editTask(task)); edit.disabled = closed;
  const remove = button('Delete', `Delete task: ${task.title}`, () => {
    tasks = tasks.filter(t => t.id !== task.id); if (editingId === task.id) resetEditor(); saveTasks(); render();
    $('#task-feedback').textContent = 'Task deleted.'; focusTaskControl(task, '');
  }); remove.className = 'danger'; remove.disabled = closed;
  actions.append(status, edit, remove); row.append(check, details, actions); return row;
}
function render({ followups = true } = {}) {
  renderClaimOptions();
  const priority = $('#priority-filter').value, status = $('#status-filter').value;
  const search = $('#task-search').value.trim().toLocaleLowerCase(), scope = $('#claim-filter').value;
  const rank = t => t.done ? 4 : !t.date ? 3 : t.date < today() ? 0 : t.date === today() ? 1 : 2;
  const matches = t => (filter === 'all' || (filter === 'open' && !t.done) || (filter === 'due' && !t.done && t.date && t.date <= today())) &&
    (!priority || t.priority === priority) && (!status || t.status === status) &&
    (!search || `${claimFor(t).reference} ${t.title} ${t.description} ${t.category} ${t.nextAction}`.toLocaleLowerCase().includes(search));
  const container = $('#task-list'); container.replaceChildren();
  let shown = 0;
  claims.filter(c => scope === 'All' || c.status === scope).forEach(claim => {
    const all = tasks.filter(t => t.claimId === claim.id);
    const visible = all.filter(matches).sort((a, b) => rank(a) - rank(b) || a.date.localeCompare(b.date));
    if (search && !visible.length && !claim.reference.toLocaleLowerCase().includes(search)) return;
    shown += visible.length;
    const card = document.createElement('details'); card.className = 'claim-card'; card.dataset.claimId = claim.id; card.id = `claim-${claim.id}`;
    card.open = expandedClaims.has(claim.id);
    const summary = document.createElement('summary');
    summary.textContent = `${claim.reference} · ${claim.status} · ${all.filter(t => !t.done).length} active / ${all.length} ${all.length === 1 ? 'task' : 'tasks'}`;
    card.append(summary);
    card.addEventListener('toggle', () => {
      if (!card.isConnected) return;
      if (card.open) expandedClaims.add(claim.id); else expandedClaims.delete(claim.id);
    });
    const actions = document.createElement('div'); actions.className = 'claim-actions';
    const add = button('Add task', `Add task to ${claim.reference}`, () => prepareTask(claim)); add.disabled = claim.status === 'Closed';
    const rename = button('Rename', `Rename claim: ${claim.reference}`, () => {
      editingClaimId = claim.id; $('#claim-reference').value = claim.reference; $('#claim-approval').checked = false;
      $('#save-claim').textContent = 'Save claim label'; $('#cancel-claim-edit').hidden = false; $('#claim-reference').focus();
    });
    const close = button(claim.status === 'Open' ? 'Close claim' : 'Reopen claim', `${claim.status === 'Open' ? 'Close' : 'Reopen'} claim: ${claim.reference}`, () => {
      claim.status = claim.status === 'Open' ? 'Closed' : 'Open'; saveTasks(); render();
      $('#claim-feedback').textContent = `${claim.reference} is ${claim.status.toLowerCase()}. Tasks are retained. Closed claims are excluded from dashboard and follow-ups.`; $('#claim-filter').focus();
    });
    actions.append(add, rename, close); card.append(actions);
    const list = document.createElement('ul'); list.className = 'claim-tasks';
    visible.forEach(task => list.append(renderTaskRow(task, claim)));
    if (!visible.length) { const empty = document.createElement('li'); empty.className = 'muted'; empty.textContent = all.length ? 'No tasks match these filters.' : 'No tasks yet. Add a task to this claim.'; list.append(empty); }
    card.append(list); container.append(card);
  });
  const open = openTasks(); const day = today();
  $('#active-count').textContent = open.filter(t => !t.done).length;
  $('#today-count').textContent = open.filter(t => !t.done && t.date === day).length;
  $('#overdue-count').textContent = open.filter(t => !t.done && t.date && t.date < day).length;
  $('#completed-count').textContent = open.filter(t => t.done && t.completedOn === day).length;
  $('#followup-overdue-count').textContent = open.filter(t => !t.done && t.followUpDate && t.followUpDate < day).length;
  $('#followup-today-count').textContent = open.filter(t => !t.done && t.followUpDate === day).length;
  $('#task-count').textContent = `${shown} ${shown === 1 ? 'task' : 'tasks'} shown · ${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'} / ${claims.length} ${claims.length === 1 ? 'claim' : 'claims'} total`;
  $('#empty-tasks').hidden = container.children.length > 0;
  $('#empty-tasks').textContent = claims.length ? 'No claims match. Change the claim filter or search.' : 'Create a claim to get started.';
  if (followups) renderFollowups(day);
}
function renderFollowups(day) {
  const groups = { overdue: [], today: [], upcoming: [], waiting: [] };
  openTasks().filter(t => !t.done && t.followUpDate).forEach(t => {
    groups[t.status === 'Waiting' ? 'waiting' : t.followUpDate < day ? 'overdue' : t.followUpDate === day ? 'today' : 'upcoming'].push(t);
  });
  Object.entries(groups).forEach(([group, records]) => {
    const list = $(`#followup-${group}`); list.replaceChildren();
    records.sort((a, b) => a.followUpDate.localeCompare(b.followUpDate)).forEach(task => {
      const row = document.createElement('li'); row.className = `followup-row${task.followUpDate < day ? ' is-overdue' : ''}`;
      const title = document.createElement('strong'); title.textContent = task.title;
      const context = document.createElement('p'); context.textContent = `Claim: ${claimFor(task).reference}`;
      const date = document.createElement('p'); date.className = task.followUpDate < day ? 'overdue' : '';
      date.textContent = `${task.followUpDate < day ? 'Overdue' : task.followUpDate === day ? 'Due today' : 'Upcoming'}: ${task.followUpDate}`;
      row.append(title, context, date);
      if (task.waitingOn) { const waiting = document.createElement('p'); waiting.textContent = `Waiting on: ${task.waitingOn}`; row.append(waiting); }
      if (task.nextAction) { const next = document.createElement('p'); next.className = 'multiline'; next.textContent = `Next steps: ${task.nextAction}`; row.append(next); }
      const controls = document.createElement('div'); controls.className = 'followup-controls';
      const form = document.createElement('form');
      const label = document.createElement('label'); label.textContent = 'Follow-up date';
      const input = document.createElement('input'); input.type = 'date'; input.value = task.followUpDate; input.id = `followup-date-${task.id}`;
      input.setAttribute('aria-label', `Follow-up date for ${task.title}`); label.append(input);
      const save = document.createElement('button'); save.type = 'submit'; save.textContent = 'Save date'; save.setAttribute('aria-label', `Save follow-up date for ${task.title}`);
      form.append(label, save); form.addEventListener('submit', event => {
        event.preventDefault(); if (!validDate(input.value)) return;
        task.followUpDate = input.value; if (editingId === task.id) $('#task-followup-date').value = task.followUpDate;
        saveTasks(); render(); $('#followup-feedback').textContent = 'Follow-up date updated. The task due date is unchanged.';
        (document.getElementById(input.id) || $('#followups-title')).focus();
      });
      const complete = button('Complete', `Complete follow-up: ${task.title}`, () => {
        setStatus(task, 'Completed'); if (editingId === task.id) $('#task-status').value = task.status;
        saveTasks(); render(); $('#followup-feedback').textContent = 'Task marked completed.'; $('#followups-title').focus();
      });
      const edit = button('Edit task', `Edit follow-up task: ${task.title}`, () => editTask(task));
      controls.append(form, complete, edit); row.append(controls); list.append(row);
    });
    if (!records.length) { const empty = document.createElement('li'); empty.className = 'muted'; empty.textContent = 'No follow-ups in this group.'; list.append(empty); }
  });
}
$('#claim-form').addEventListener('submit', event => {
  event.preventDefault();
  const reference = $('#claim-reference').value.trim(); const renaming = !!editingClaimId;
  if (!reference || !$('#claim-approval').checked) return;
  if (claims.some(c => c.id !== editingClaimId && c.reference.toLocaleLowerCase() === reference.toLocaleLowerCase())) { $('#claim-feedback').textContent = 'A claim with this label already exists.'; return; }
  if (editingClaimId) claims.find(c => c.id === editingClaimId).reference = reference;
  else {
    if (claims.length >= WORKSPACE_LIMITS.claims) { $('#claim-feedback').textContent = 'Claim limit reached (200).'; return; }
    const claim = { id: crypto.randomUUID(), reference, status: 'Open' }; claims.push(claim); expandedClaims.add(claim.id);
    $('#claim-filter').value = 'Open'; renderClaimOptions(); resetEditor(claim.id);
    $('#task-form').hidden = false;
  }
  saveTasks(); resetClaimEditor(); render(); $('#task-feedback').textContent = ''; $('#claim-feedback').textContent = renaming ? 'Claim label updated.' : 'Claim created. Add tasks below.';
});
$('#cancel-claim-edit').addEventListener('click', resetClaimEditor);
$('#task-form').addEventListener('submit', event => {
  event.preventDefault();
  const title = $('#task-title').value.trim(), date = $('#task-date').value, followUpDate = $('#task-followup-date').value;
  $('#task-title').setCustomValidity(title ? '' : 'Enter a generic task title.'); if (!title) { $('#task-title').reportValidity(); return; }
  const claim = claims.find(c => c.id === $('#task-claim').value);
  if (!claim || claim.status === 'Closed') { $('#task-feedback').textContent = 'Choose an open claim, or reopen this claim first.'; return; }
  const existing = tasks.find(t => t.id === editingId);
  if ((!date && (!existing || existing.date)) || !validDate(date) || !validDate(followUpDate)) { $('#task-date').reportValidity(); return; }
  if (!existing && tasks.length >= WORKSPACE_LIMITS.tasks) { $('#task-feedback').textContent = 'Task limit reached (500).'; return; }
  const task = existing || { id: crypto.randomUUID(), done: false, completedOn: '' };
  Object.assign(task, { claimId: claim.id, title, date, followUpDate, description: $('#task-description').value.trim(),
    category: $('#task-category').value, priority: $('#task-priority').value, waitingOn: $('#task-waiting-on').value, nextAction: $('#task-next-action').value.trim() });
  setStatus(task, $('#task-status').value); if (!existing) tasks.push(task);
  expandedClaims.add(claim.id); saveTasks(); resetEditor(claim.id); $('#task-date').required = true; render();
  $('#task-feedback').textContent = existing ? 'Task updated.' : 'Task added.'; $('#task-title').focus();
});
$('#task-title').addEventListener('input', () => $('#task-title').setCustomValidity(''));
$('#cancel-edit').addEventListener('click', () => { resetEditor(); $('#task-form').hidden = true; });
$('#claim-filter').addEventListener('change', () => render({ followups: false }));
for (const selector of ['#priority-filter', '#status-filter']) $(selector).addEventListener('change', () => {
  if (selector === '#status-filter' && $('#status-filter').value) {
    filter = 'all'; document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === 'all')));
  }
  render({ followups: false });
});
$('#task-search').addEventListener('input', () => render({ followups: false }));
document.querySelectorAll('[data-filter]').forEach(b => b.addEventListener('click', () => {
  filter = b.dataset.filter; $('#status-filter').value = '';
  document.querySelectorAll('[data-filter]').forEach(other => other.setAttribute('aria-pressed', String(b === other))); render({ followups: false });
}));
$('#clear-data').addEventListener('click', () => {
  if (!confirm('Delete all claims and their tasks from this browser? Export a backup first. This cannot be undone.')) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 2, claims: [], tasks: [] }));
    claims = []; tasks = []; expandedClaims.clear(); persistenceEnabled = true; resetEditor(); resetClaimEditor(); render();
    $('#claim-feedback').textContent = ''; $('#task-feedback').textContent = ''; $('#followup-feedback').textContent = '';
    try { localStorage.removeItem(LEGACY_STORAGE_KEY); $('#storage-status').textContent = 'All saved claims and tasks deleted. Template preferences are unchanged.'; }
    catch { $('#storage-status').textContent = 'Current work cleared, but the older recovery copy could not be removed. Check browser storage settings.'; }
  } catch { $('#storage-status').textContent = 'Saved work could not be cleared. Existing work is unchanged.'; }
});
window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY || event.key === null) { persistenceEnabled = false; $('#storage-status').textContent = 'Work changed in another tab. Changes here are temporary; reload before editing.'; }
});
let renderedDay = today();
function refreshCalendar() { if (renderedDay !== today()) { renderedDay = today(); render(); } }
window.addEventListener('focus', refreshCalendar); setInterval(refreshCalendar, 60000);
$('#export-tasks').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify({ app: 'claims-companion', ...workspace() }, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = `claims-companion-workspace-${today()}.json`; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000); $('#backup-status').textContent = 'Exported claims and tasks. Template definitions and drafts are not included.';
});
$('#import-tasks').addEventListener('change', async event => {
  const file = event.target.files[0]; if (!file) return;
  try {
    if (file.size > WORKSPACE_LIMITS.fileBytes) throw new Error('Backup exceeds 10 MB.');
    const imported = readWorkspaceBackup(JSON.parse(await file.text()));
    if (!persistenceEnabled) throw new Error('Reload or resolve unreadable storage first.');
    if (!confirm(`Replace all current work with ${imported.claims.length} claims and ${imported.tasks.length} tasks? Export a backup first.`)) { $('#backup-status').textContent = 'Import cancelled. Existing work is unchanged.'; return; }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(imported)); claims = imported.claims; tasks = imported.tasks;
    expandedClaims.clear(); if (claims[0]) expandedClaims.add(claims[0].id);
    resetEditor(); resetClaimEditor(); $('#task-form').hidden = true; $('#claim-filter').value = 'All';
    filter = 'all'; $('#priority-filter').value = ''; $('#status-filter').value = ''; $('#task-search').value = '';
    document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.filter === 'all')));
    $('#storage-status').textContent = ''; $('#claim-feedback').textContent = ''; $('#task-feedback').textContent = ''; $('#followup-feedback').textContent = ''; render(); $('#backup-status').textContent = 'Claims and tasks imported. Existing work was replaced; template preferences are unchanged.';
  } catch (error) { $('#backup-status').textContent = `Import failed: ${error instanceof SyntaxError ? 'Invalid JSON.' : error.message} Existing work is unchanged.`; }
  finally { event.target.value = ''; }
});
for (const category of CATEGORIES) { const option = document.createElement('option'); option.textContent = category; $('#task-category').append(option); }
loadWorkspace(); render();
