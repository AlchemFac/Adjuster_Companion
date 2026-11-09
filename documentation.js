'use strict';

const templates = {
  daily: 'DAILY LEARNING PLAN\n\nLearning goal: [generic topic]\nTraining material to review: [topic]\nPractice activity: [fictional exercise]\nQuestions for a mentor: [generic questions]\nNext learning step: [action]',
  followup: 'GENERIC FOLLOW-UP CHECKLIST\n\n[ ] Review the training checklist\n[ ] Identify the next generic action\n[ ] Review approved learning materials\n[ ] Prepare a generic question for a mentor\n[ ] Set a follow-up date\n\nUse fictional exercises only.',
  practice: 'PRACTICE DOCUMENTATION OUTLINE\n\nExercise: [fictional training label]\nPurpose: [generic learning objective]\nChecklist reviewed: [training topic]\nLearning takeaway: [generic observation]\nNext practice step: [action]\n\nDo not include real customer or case information.'
};
// Documentation is deliberately isolated from task storage and all network APIs.
const documentationTemplates = {
  'customer-contact': { title: 'Customer contact', hints: [
    'Generic purpose of the practice contact', 'Only the contact action actually taken in the exercise',
    'Only information supplied in the fictional exercise', 'Unresolved generic items, if known', 'Only planned generic next steps'
  ] },
  'contact-attempt': { title: 'Contact attempt', hints: [
    'Generic purpose of the attempted contact', 'Attempt method and outcome, only if supplied in the exercise',
    'Any information actually obtained; leave blank if unknown', 'Generic items still awaiting a response', 'Planned next contact step, if known'
  ] },
  'investigation-update': { title: 'Investigation update', hints: [
    'Generic purpose of the practice update', 'Review or inquiry actually performed in the exercise',
    'Only supplied fictional information; do not infer findings', 'Generic information still needed', 'Planned review steps; do not infer insurance decisions'
  ] },
  'repair-followup': { title: 'Repair estimate follow-up', hints: [
    'Generic reason for following up on a practice estimate', 'Generic follow-up action actually taken',
    'Only the practice update actually received; do not infer amounts or approval', 'Generic items awaiting clarification', 'Planned follow-up steps; do not infer authorization or payment'
  ] },
  'general-followup': { title: 'General follow-up', hints: [
    'Generic reason for the practice follow-up', 'Only the generic action actually taken',
    'Only the information actually obtained', 'Unresolved generic items, if known', 'Only planned generic next steps'
  ] }
};
const documentationFields = [
  ['purpose', 'Purpose'], ['action', 'Action taken'], ['information', 'Information obtained'],
  ['outstanding', 'Outstanding items'], ['next', 'Next steps']
];
const docElement = selector => document.querySelector(selector);
function updateDocumentationPreview() {
  const selected = docElement('#template-select').value;
  const template = documentationTemplates[selected];
  if (!template) { docElement('#template-preview').value = templates[selected]; return; }
  const sections = documentationFields.map(([id, label]) => {
    const entered = docElement(`#doc-${id}`).value.trim();
    return `${label}:\n${entered || '[Not provided]'}`;
  });
  if (docElement('#include-doc-date').checked) {
    const value = docElement('#doc-date').value;
    sections.push(`Follow-up date:\n${value || '[Not provided]'}`);
  }
  docElement('#template-preview').value = `${template.title.toUpperCase()}\n\n${sections.join('\n\n')}`;
  docElement('#copy-status').textContent = '';
}
function showDocumentationTemplate() {
  const template = documentationTemplates[docElement('#template-select').value];
  const fields = docElement('#documentation-fields');
  fields.replaceChildren();
  docElement('#documentation-form').reset();
  docElement('#documentation-form').hidden = !template;
  docElement('#doc-date-label').hidden = true;
  if (template) {
    documentationFields.forEach(([id, title], index) => {
      const label = document.createElement('label');
      label.textContent = title;
      const input = document.createElement('textarea');
      input.id = `doc-${id}`; input.rows = 2; input.maxLength = 2000;
      input.autocomplete = 'off'; input.spellcheck = false;
      input.placeholder = template.hints[index];
      label.append(input); fields.append(label);
    });
  }
  updateDocumentationPreview();
  docElement('#copy-status').textContent = '';
}
function clearDocumentation() {
  docElement('#documentation-form').reset();
  docElement('#doc-date-label').hidden = true;
  docElement('#template-preview').value = '';
  docElement('#copy-status').textContent = '';
}
docElement('#template-select').addEventListener('change', showDocumentationTemplate);
docElement('#documentation-form').addEventListener('submit', event => event.preventDefault());
docElement('#documentation-form').addEventListener('input', updateDocumentationPreview);
docElement('#include-doc-date').addEventListener('change', () => {
  const enabled = docElement('#include-doc-date').checked;
  docElement('#doc-date-label').hidden = !enabled;
  if (!enabled) docElement('#doc-date').value = '';
  updateDocumentationPreview();
});
docElement('#clear-documentation').addEventListener('click', () => {
  clearDocumentation();
  docElement('#copy-status').textContent = 'Form and preview cleared. Your system clipboard is unchanged.';
  (docElement('#doc-purpose') || docElement('#template-select')).focus();
});
docElement('#copy-template').addEventListener('click', async () => {
  const preview = docElement('#template-preview');
  const text = preview.value;
  if (!text) { docElement('#copy-status').textContent = 'Nothing to copy. Enter generic practice information or select a template.'; return; }
  // Do not display a stale copy result after a user clears or switches templates.
  try {
    await navigator.clipboard.writeText(text);
    if (preview.value === text) docElement('#copy-status').textContent = 'Copied to clipboard. Review before using in any approved system.';
  } catch {
    if (preview.value !== text) return;
    preview.focus(); preview.select();
    docElement('#copy-status').textContent = 'Automatic copying is unavailable. The preview is selected; use your browser’s Copy command.';
  }
});
// Clear DOM values on departure and history restoration; no draft storage is used.
window.addEventListener('pagehide', clearDocumentation);
window.addEventListener('pageshow', event => { if (event.persisted) clearDocumentation(); });
showDocumentationTemplate();
