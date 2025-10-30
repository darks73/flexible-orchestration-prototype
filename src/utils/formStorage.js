const STORAGE_PREFIX = 'frontendFormSchema:';

export function loadFormSchema(nodeId) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + nodeId);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to load form schema', e);
    return null;
  }
}

export function saveFormSchema(nodeId, schema) {
  try {
    localStorage.setItem(STORAGE_PREFIX + nodeId, JSON.stringify(schema));
  } catch (e) {
    console.warn('Failed to save form schema', e);
  }
}

export function createEmptySchema() {
  return { elements: [], outputs: {} };
}


