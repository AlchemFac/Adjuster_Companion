'use strict';

const LIBRARY_STORAGE_KEY = 'claims-companion.library.v1';
const libraryElement = selector => document.querySelector(selector);
let libraryState = { version: 1, custom: [], favorites: [], recent: [] };
let libraryPersistenceEnabled = true;
let librarySelectedId = BUILTIN_LIBRARY_TEMPLATES[0].id;
let libraryEditingId = null;

function allLibraryTemplates() { return [...BUILTIN_LIBRARY_TEMPLATES, ...libraryState.custom]; }
function selectedLibraryTemplate() { return allLibraryTemplates().find(t => t.id === librarySelectedId); }
function customTemplateError(template) {
  if (!template || !['title', 'description', 'body'].every(field => typeof template[field] === 'string' && template[field].trim())) return 'Title, description and body are required.';
  if (template.title.length > 100 || template.description.length > 300 || template.body.length > 6000) return 'Template exceeds the title, description or body length limit.';
  if (!LIBRARY_CATEGORIES.includes(template.category)) return 'Choose a supported category.';
  const placeholders = new Set(template.body.match(/\[[A-Z][A-Z0-9 _-]{1,60}\]/g) || []);
  if (placeholders.size < 2) return 'Use at least two distinct bracketed placeholders. Do not save a completed note.';
  const text = `${template.title}\n${template.description}\n${template.body}`.replace(/\[[^\]\n]+\]/g, '[PLACEHOLDER]');
  if (/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(text) ||
      /(?:\+?\d[\d ().-]*){7,}/.test(text) || /\b[A-HJ-NPR-Z0-9]{17}\b/i.test(text) ||
      /\b(?:claim|policy)\s*(?:number|no\.?|#)\s*[:=-]\s*(?!\[)[A-Z0-9][A-Z0-9-]{2,}/i.test(text)) {
    return 'Possible contact details or identifier detected. Replace private details with bracketed placeholders.';
  }
  return '';
}
function normalizeCustomTemplate(template) {
  return { id: template.id, title: template.title.trim(), category: template.category,
    description: template.description.trim(), body: template.body.trim() };
}
function loadLibraryState() {
  try {
    const raw = localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (raw === null) return;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || !Array.isArray(data.custom) || data.custom.length > 100 ||
      !Array.isArray(data.favorites) || data.favorites.length > 141 || !Array.isArray(data.recent) || data.recent.length > 8 ||
      !data.custom.every(t => t && /^custom-[a-z0-9-]{1,80}$/i.test(t.id) && !customTemplateError(t)) ||
      new Set(data.custom.map(t => t.id)).size !== data.custom.length ||
      ![...data.favorites, ...data.recent].every(id => typeof id === 'string')) throw new Error('Invalid library data');
    const ids = new Set([...BUILTIN_LIBRARY_TEMPLATES, ...data.custom].map(t => t.id));
    libraryState = { version: 1, custom: data.custom.map(normalizeCustomTemplate),
      favorites: [...new Set(data.favorites)].filter(id => ids.has(id)), recent: [...new Set(data.recent)].filter(id => ids.has(id)) };
  } catch {
    libraryPersistenceEnabled = false;
    libraryElement('#library-storage-status').textContent = 'Saved template preferences could not be read. Existing storage is untouched; library changes are temporary until storage access is restored and the page reloaded.';
  }
}
function saveLibraryState() {
  if (!libraryPersistenceEnabled) return;
  try {
    // Only template definitions and IDs are ever read here. The note formatter is separate.
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(libraryState));
    libraryElement('#library-storage-status').textContent = '';
  } catch {
    libraryElement('#library-storage-status').textContent = 'Template changes are temporary: browser storage is unavailable or full. They may be lost on reload. Built-in templates remain usable.';
  }
}
function selectLibraryTemplate(id) {
  if (!allLibraryTemplates().some(t => t.id === id)) return;
  librarySelectedId = id;
  libraryElement('#library-feedback').textContent = '';
  renderLibrary();
}
function toggleLibraryFavorite(id) {
  libraryState.favorites = libraryState.favorites.includes(id) ? libraryState.favorites.filter(value => value !== id) : [...libraryState.favorites, id];
  saveLibraryState(); renderLibrary();
}
function renderLibrary() {
  const query = libraryElement('#library-search').value.trim().toLocaleLowerCase();
  const category = libraryElement('#library-category').value;
  const favoritesOnly = libraryElement('#library-favorites-only').checked;
  const templates = allLibraryTemplates();
  const visible = templates.filter(t => (!category || t.category === category) &&
    (!favoritesOnly || libraryState.favorites.includes(t.id)) &&
    `${t.title} ${t.category} ${t.description} ${t.body}`.toLocaleLowerCase().includes(query))
    .sort((a, b) => Number(libraryState.favorites.includes(b.id)) - Number(libraryState.favorites.includes(a.id)) || a.title.localeCompare(b.title));
  const list = libraryElement('#library-list');
  const oldScroll = list.scrollTop;
  list.replaceChildren();
  visible.forEach(template => {
    const item = document.createElement('li'); item.className = 'library-item';
    const choose = document.createElement('button'); choose.type = 'button';
    choose.className = 'library-choose';
    choose.setAttribute('aria-pressed', String(template.id === librarySelectedId));
    choose.setAttribute('aria-label', `Open template: ${template.title}`);
    const title = document.createElement('strong'); title.textContent = template.title;
    const label = document.createElement('small'); label.textContent = `${template.category}${template.id.startsWith('custom-') ? ' · Custom' : ''}`;
    choose.append(title, label); choose.addEventListener('click', () => {
      selectLibraryTemplate(template.id);
      libraryElement('#library-selected-title').focus();
    });
    const favorite = document.createElement('button'); favorite.type = 'button'; favorite.textContent = libraryState.favorites.includes(template.id) ? '★' : '☆';
    favorite.className = 'library-star'; favorite.dataset.favoriteId = template.id;
    favorite.setAttribute('aria-label', `Favorite template: ${template.title}`);
    favorite.setAttribute('aria-pressed', String(libraryState.favorites.includes(template.id)));
    favorite.addEventListener('click', () => {
      toggleLibraryFavorite(template.id);
      [...list.querySelectorAll('[data-favorite-id]')].find(b => b.dataset.favoriteId === template.id)?.focus();
    });
    item.append(choose, favorite); list.append(item);
  });
  list.scrollTop = oldScroll;
  libraryElement('#library-count').textContent = `${visible.length} of ${templates.length} templates · favorites first`;
  if (!visible.length) { const empty = document.createElement('li'); empty.textContent = 'No templates match. Adjust the search, category or favorites filter.'; list.append(empty); }
  const recent = libraryElement('#library-recent'); recent.replaceChildren();
  libraryState.recent.forEach(id => {
    const template = templates.find(t => t.id === id);
    if (!template) return;
    const item = document.createElement('li'); const button = document.createElement('button');
    button.type = 'button'; button.textContent = template.title;
    button.addEventListener('click', () => { selectLibraryTemplate(id); libraryElement('#library-selected-title').focus(); });
    item.append(button); recent.append(item);
  });
  if (!recent.children.length) { const empty = document.createElement('li'); empty.className = 'muted'; empty.textContent = 'Copy a template to add it here.'; recent.append(empty); }
  const selected = selectedLibraryTemplate();
  libraryElement('#library-selected-title').textContent = selected.title;
  libraryElement('#library-selected-category').textContent = selected.category;
  libraryElement('#library-description').textContent = selected.description;
  libraryElement('#library-preview').value = selected.body;
  const favorite = libraryState.favorites.includes(selected.id);
  libraryElement('#library-favorite').textContent = favorite ? 'Remove from favorites' : 'Add to favorites';
  libraryElement('#library-favorite').setAttribute('aria-pressed', String(favorite));
  libraryElement('#library-edit').hidden = !selected.id.startsWith('custom-');
  libraryElement('#library-delete').hidden = !selected.id.startsWith('custom-');
}
function clearLibraryEditor() {
  libraryElement('#library-custom-form').reset();
  libraryElement('#library-custom-form').hidden = true;
  libraryElement('#library-custom-status').textContent = '';
  libraryEditingId = null;
}
function openLibraryEditor(mode) {
  clearLibraryEditor();
  const source = mode === 'new' ? null : selectedLibraryTemplate();
  libraryEditingId = mode === 'edit' ? source.id : null;
  libraryElement('#library-editor-title').textContent = mode === 'edit' ? 'Edit generic template' : mode === 'duplicate' ? 'Duplicate as a custom template' : 'New generic template';
  if (source) {
    libraryElement('#library-custom-title').value = mode === 'duplicate' ? `${source.title.slice(0, 93)} (copy)` : source.title;
    libraryElement('#library-custom-category').value = source.category;
    libraryElement('#library-custom-description').value = source.description;
    libraryElement('#library-custom-body').value = source.body;
  }
  libraryElement('#library-custom-form').hidden = false;
  libraryElement('#library-custom-title').focus();
}
libraryElement('#library-custom-form').addEventListener('submit', event => {
  event.preventDefault();
  const template = { id: libraryEditingId || `custom-${crypto.randomUUID()}`, title: libraryElement('#library-custom-title').value.trim(),
    category: libraryElement('#library-custom-category').value, description: libraryElement('#library-custom-description').value.trim(),
    body: libraryElement('#library-custom-body').value.trim() };
  const error = customTemplateError(template);
  if (error) { libraryElement('#library-custom-status').textContent = error; return; }
  if (!libraryEditingId && libraryState.custom.length >= 100) { libraryElement('#library-custom-status').textContent = 'Custom template limit reached (100). Delete unused definitions first.'; return; }
  if (libraryEditingId) libraryState.custom = libraryState.custom.map(t => t.id === libraryEditingId ? template : t);
  else libraryState.custom.push(template);
  librarySelectedId = template.id;
  saveLibraryState(); clearLibraryEditor(); renderLibrary();
  libraryElement('#library-feedback').textContent = 'Generic template saved in this session. Check the storage message for persistence problems.';
  libraryElement('#library-selected-title').focus();
});
libraryElement('#library-new').addEventListener('click', () => openLibraryEditor('new'));
libraryElement('#library-edit').addEventListener('click', () => openLibraryEditor('edit'));
libraryElement('#library-duplicate').addEventListener('click', () => openLibraryEditor('duplicate'));
libraryElement('#library-custom-cancel').addEventListener('click', () => { clearLibraryEditor(); libraryElement('#library-selected-title').focus(); });
libraryElement('#library-delete').addEventListener('click', () => {
  const template = selectedLibraryTemplate();
  if (!template.id.startsWith('custom-') || !confirm('Delete this custom template definition? This cannot be undone.')) return;
  libraryState.custom = libraryState.custom.filter(t => t.id !== template.id);
  libraryState.favorites = libraryState.favorites.filter(id => id !== template.id);
  libraryState.recent = libraryState.recent.filter(id => id !== template.id);
  librarySelectedId = BUILTIN_LIBRARY_TEMPLATES[0].id;
  saveLibraryState(); clearLibraryEditor(); renderLibrary();
  libraryElement('#library-feedback').textContent = 'Custom template deleted.';
  libraryElement('#library-selected-title').focus();
});
libraryElement('#library-favorite').addEventListener('click', () => toggleLibraryFavorite(librarySelectedId));
libraryElement('#library-search').addEventListener('input', renderLibrary);
libraryElement('#library-category').addEventListener('change', renderLibrary);
libraryElement('#library-favorites-only').addEventListener('change', renderLibrary);
libraryElement('#library-copy').addEventListener('click', async () => {
  const template = selectedLibraryTemplate();
  const text = template.body;
  try {
    await navigator.clipboard.writeText(text);
    if (allLibraryTemplates().some(t => t.id === template.id)) {
      libraryState.recent = [template.id, ...libraryState.recent.filter(id => id !== template.id)].slice(0, 8);
      saveLibraryState(); renderLibrary();
    }
    if (librarySelectedId === template.id) libraryElement('#library-feedback').textContent = 'Template copied with placeholders. Complete and verify it only in the approved system.';
  } catch {
    if (librarySelectedId !== template.id) return;
    const preview = libraryElement('#library-preview'); preview.focus(); preview.select();
    libraryElement('#library-feedback').textContent = 'Automatic copying is unavailable. The complete template is selected; use your browser’s Copy command. Recent use is recorded only after successful automatic copying.';
  }
});
[ '#library-category', '#library-custom-category' ].forEach(selector => LIBRARY_CATEGORIES.forEach(category => {
  const option = document.createElement('option'); option.value = category; option.textContent = category; libraryElement(selector).append(option);
}));
window.addEventListener('storage', event => {
  if (event.key === LIBRARY_STORAGE_KEY || event.key === null) {
    libraryPersistenceEnabled = false;
    libraryElement('#library-storage-status').textContent = 'Template preferences changed in another tab. Changes here are temporary; reload before editing to avoid overwriting another tab.';
  }
});
window.addEventListener('pagehide', clearLibraryEditor);
window.addEventListener('pageshow', event => { if (event.persisted) clearLibraryEditor(); });
loadLibraryState(); renderLibrary();
