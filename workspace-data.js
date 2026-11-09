'use strict';

const WORKSPACE_LIMITS = { claims: 200, tasks: 500, text: 2000, fileBytes: 10 * 1024 * 1024 };
const PRIORITIES = ['High', 'Medium', 'Low'];
const STATUSES = ['Not Started', 'In Progress', 'Waiting', 'Completed'];
const WAITING_ON = ['', 'Customer', 'Repair Shop', 'Internal Review', 'Other Insurer', 'Other'];
const CATEGORIES = ['Training', 'Follow-up', 'Documentation', 'Planning', 'Contact', 'Investigation', 'Coverage review', 'Liability review', 'Repairs', 'Recovery', 'Other'];
function validDate(value) {
  if (typeof value !== 'string') return false;
  if (value === '') return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function boundedText(value, limit, required = false) {
  return typeof value === 'string' && value.length <= limit && (!required || value.trim().length > 0);
}
function validTask(task) {
  return task && boundedText(task.id, 100, true) && boundedText(task.title, 120, true) &&
    typeof task.done === 'boolean' && validDate(task.date) &&
    (task.description === undefined || boundedText(task.description, WORKSPACE_LIMITS.text)) &&
    (task.followUpDate === undefined || validDate(task.followUpDate)) &&
    (task.category === undefined || CATEGORIES.includes(task.category)) &&
    (task.priority === undefined || PRIORITIES.includes(task.priority)) &&
    (task.waitingOn === undefined || WAITING_ON.includes(task.waitingOn)) &&
    (task.status === undefined || (STATUSES.includes(task.status) && task.done === (task.status === 'Completed'))) &&
    (task.nextAction === undefined || boundedText(task.nextAction, WORKSPACE_LIMITS.text)) &&
    (task.completedOn === undefined || validDate(task.completedOn));
}
function normalizeTask(task, claimId = task.claimId, legacy = false) {
  return { id: task.id, claimId, title: task.title, description: task.description ?? '',
    date: task.date, followUpDate: task.followUpDate ?? (legacy ? task.date : ''),
    category: task.category ?? 'Training', priority: task.priority ?? 'Medium',
    waitingOn: task.waitingOn ?? '', nextAction: task.nextAction ?? '', done: task.done,
    status: task.status ?? (task.done ? 'Completed' : 'Not Started'), completedOn: task.done ? (task.completedOn ?? '') : '' };
}
function validTaskList(tasks) {
  return Array.isArray(tasks) && tasks.length <= WORKSPACE_LIMITS.tasks && tasks.every(validTask) && new Set(tasks.map(t => t.id)).size === tasks.length;
}
function normalizeWorkspace(data) {
  if (!data || data.version !== 2 || !Array.isArray(data.claims) || data.claims.length > WORKSPACE_LIMITS.claims || !validTaskList(data.tasks)) throw new Error('Invalid workspace format or capacity.');
  if (!data.claims.every(c => c && boundedText(c.id, 100, true) && boundedText(c.reference, 80, true) && ['Open', 'Closed'].includes(c.status))) throw new Error('Invalid claim.');
  const claimIds = new Set(data.claims.map(c => c.id));
  if (claimIds.size !== data.claims.length || new Set(data.claims.map(c => c.reference.trim().toLocaleLowerCase())).size !== data.claims.length) throw new Error('Duplicate claims.');
  if (!data.tasks.every(t => claimIds.has(t.claimId))) throw new Error('A task refers to a missing claim.');
  return { version: 2, claims: data.claims.map(c => ({ id: c.id, reference: c.reference.trim(), status: c.status })), tasks: data.tasks.map(t => normalizeTask(t)) };
}
function migrateLegacyTasks(tasks) {
  if (!validTaskList(tasks)) throw new Error('Invalid legacy tasks.');
  return { version: 2, claims: tasks.length ? [{ id: 'existing-work', reference: 'Existing work', status: 'Open' }] : [],
    tasks: tasks.map(t => normalizeTask(t, 'existing-work', true)) };
}
function readWorkspaceBackup(data) {
  if (!data || data.app !== 'claims-companion') throw new Error('Not a Claims Companion backup.');
  if (data.version === 1) return migrateLegacyTasks(data.tasks);
  return normalizeWorkspace(data);
}
if (typeof module !== 'undefined') module.exports = { WORKSPACE_LIMITS, validDate, validTask, normalizeWorkspace, migrateLegacyTasks, readWorkspaceBackup };
