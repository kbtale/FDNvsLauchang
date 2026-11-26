export function isEditableTarget(target) {
  if (!target || typeof target !== 'object') {
    return false;
  }
  const tag = String(target.tagName || '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
    return true;
  }
  if (target.isContentEditable) {
    return true;
  }
  if (typeof target.closest === 'function') {
    if (target.closest('[role="dialog"], [role="alertdialog"], button, a, [role="tab"], [role="switch"]')) {
      return true;
    }
  }
  return false;
}

export function resolveControlShortcut(event) {
  if (!event || event.ctrlKey || event.metaKey || event.altKey || event.repeat) {
    return null;
  }
  if (isEditableTarget(event.target)) {
    return null;
  }
  if (event.code === 'Space' || event.key === ' ') {
    return 'spin';
  }
  if (event.key === '1') {
    return 'score-a';
  }
  if (event.key === '2') {
    return 'score-b';
  }
  return null;
}
