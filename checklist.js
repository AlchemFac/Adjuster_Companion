'use strict';

// Selection is temporary; progress lives exclusively in the shared task records.
const dayOneSelections = new Map(DAY_ONE_SETS.map(set => [set, new Set(DAY_ONE_STEPS.filter(step => step[4]).map(step => step[0]))]));
$('#day-one-date').value = today();
function dayOneTask(set, step) {
  return tasks.find(task => task.checklist?.type === 'day-one' && task.checklist.set === set && task.checklist.step === step);
}
function renderDayOneChecklist() {
  const set = $('#day-one-set').value;
  const list = $('#day-one-list');
  list.replaceChildren();
  const linked = tasks.filter(task => task.checklist?.set === set);
  $('#day-one-progress').textContent = `${linked.filter(task => task.done).length} of ${linked.length} added steps completed · ${DAY_ONE_STEPS.length - linked.length} steps not added. Review applicability in the official system.`;
  let group;
  let heading;
  DAY_ONE_STEPS.forEach(([id, section, title, hint, routine]) => {
    if (heading !== section) {
      heading = section;
      group = document.createElement('fieldset');
      const legend = document.createElement('legend'); legend.textContent = section;
      group.append(legend); list.append(group);
    }
    const task = dayOneTask(set, id);
    const row = document.createElement('div'); row.className = 'day-one-step';
    const label = document.createElement('label');
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox';
    checkbox.checked = task ? task.done : dayOneSelections.get(set).has(id);
    checkbox.setAttribute('aria-label', `${task ? task.done ? 'Reopen step' : 'Complete step' : 'Include step'}: ${title}`);
    const text = document.createElement('span'); text.textContent = title;
    label.append(checkbox, text);
    const detail = document.createElement('p'); detail.className = 'muted'; detail.textContent = hint;
    row.append(label, detail);
    checkbox.addEventListener('change', () => {
      if (!task) {
        if (checkbox.checked) dayOneSelections.get(set).add(id);
        else dayOneSelections.get(set).delete(id);
        return;
      }
      setStatus(task, checkbox.checked ? 'Completed' : 'Not Started');
      if (editingId === task.id) $('#task-status').value = task.status;
      saveTasks(); render();
      document.getElementById(`day-one-${id}`).focus();
    });
    checkbox.id = `day-one-${id}`;
    const status = document.createElement('small');
    status.textContent = task ? `${task.status} · Due: ${task.date || 'not set'}` : routine ? 'Not added · routine review' : 'Not added · if applicable';
    row.append(status);
    if (task) {
      const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = 'Edit task';
      edit.setAttribute('aria-label', `Edit checklist task: ${title}`);
      edit.addEventListener('click', () => editTask(task)); row.append(edit);
    }
    group.append(row);
  });
}
$('#day-one-set').addEventListener('change', () => {
  $('#day-one-feedback').textContent = ''; renderDayOneChecklist();
});
$('#day-one-form').addEventListener('submit', event => {
  event.preventDefault();
  const set = $('#day-one-set').value;
  const date = $('#day-one-date').value;
  if (!date || !validDate(date)) { $('#day-one-date').reportValidity(); return; }
  const missing = DAY_ONE_STEPS.filter(step => dayOneSelections.get(set).has(step[0]) && !dayOneTask(set, step[0]));
  if (tasks.length + missing.length > MAX_TASKS) {
    $('#day-one-feedback').textContent = 'Not enough task capacity. No steps were added. Remove old tasks or select fewer steps.'; return;
  }
  missing.forEach(([id, , title, hint]) => tasks.push({
    id: crypto.randomUUID(), title: `${set} · ${title}`, date, done: false,
    category: 'Training', priority: id.endsWith('supervisor') ? 'High' : 'Medium',
    status: 'Not Started', nextAction: hint, waitingOn: '', completedOn: '',
    checklist: { type: 'day-one', set, step: id },
  }));
  if (missing.length) { saveTasks(); render(); }
  $('#day-one-feedback').textContent = missing.length ? `${missing.length} steps added to ${set}. Existing tasks and dates were unchanged.` : 'No missing selected steps to add. Existing tasks were unchanged.';
});
renderDayOneChecklist();
