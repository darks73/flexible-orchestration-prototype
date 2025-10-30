import React from 'react';

export default function FormEditorFields({ element, onChange }) {
  if (!element) return <div className="muted">Select an element to edit</div>;

  const set = (path, value) => {
    const parts = path.split('.');
    const next = { ...element };
    let cur = next;
    for (let i = 0; i < parts.length - 1; i++) {
      cur[parts[i]] = { ...(cur[parts[i]] || {}) };
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
    onChange(next);
  };

  const b = element;
  const v = element.validations || {};

  return (
    <div className="editor-fields">
      <div className="section-title">Basic</div>
      <label className="input-label">Id</label>
      <input className="text-input" value={b.id} readOnly />

      <label className="input-label">Label</label>
      <input className="text-input" value={b.label || ''} onChange={(e) => set('label', e.target.value)} />

      <label className="input-label">Localization key</label>
      <input className="text-input" value={b.i18nKey || ''} onChange={(e) => set('i18nKey', e.target.value)} />

      {b.type !== 'label' && (
        <>
          <label className="input-label">Value</label>
          <input className="text-input" value={String(b.value ?? '')} onChange={(e) => set('value', e.target.value)} />

          <label className="input-label">Placeholder</label>
          <input className="text-input" value={b.placeholder || ''} onChange={(e) => set('placeholder', e.target.value)} />
        </>
      )}

      <div className="row">
        <label className="input-label">Read only</label>
        <input type="checkbox" checked={!!b.readOnly} onChange={(e) => set('readOnly', e.target.checked)} />
      </div>
      {b.type !== 'label' && (
        <div className="row">
          <label className="input-label">Trim value</label>
          <input type="checkbox" checked={!!b.trim} onChange={(e) => set('trim', e.target.checked)} />
        </div>
      )}

      <label className="input-label">Login hint (accessibility)</label>
      <input className="text-input" value={b.loginHint || ''} onChange={(e) => set('loginHint', e.target.value)} />

      <div className="section-title">Validations</div>
      {b.type !== 'label' && b.type !== 'button' && (
        <>
          <div className="row">
            <label className="input-label">Required</label>
            <input type="checkbox" checked={!!v.required?.enabled} onChange={(e) => set('validations.required.enabled', e.target.checked)} />
          </div>
          <label className="input-label">Required error key</label>
          <input className="text-input" value={v.required?.i18nKey || ''} onChange={(e) => set('validations.required.i18nKey', e.target.value)} />

          <label className="input-label">Min length</label>
          <input className="text-input" type="number" value={v.minLength?.value ?? ''} onChange={(e) => set('validations.minLength.value', e.target.value ? Number(e.target.value) : undefined)} />
          <label className="input-label">Min length error key</label>
          <input className="text-input" value={v.minLength?.i18nKey || ''} onChange={(e) => set('validations.minLength.i18nKey', e.target.value)} />

          <label className="input-label">Max length</label>
          <input className="text-input" type="number" value={v.maxLength?.value ?? ''} onChange={(e) => set('validations.maxLength.value', e.target.value ? Number(e.target.value) : undefined)} />
          <label className="input-label">Max length error key</label>
          <input className="text-input" value={v.maxLength?.i18nKey || ''} onChange={(e) => set('validations.maxLength.i18nKey', e.target.value)} />

          <label className="input-label">Regex</label>
          <input className="text-input" value={v.regex?.value || ''} onChange={(e) => set('validations.regex.value', e.target.value)} />
          <label className="input-label">Regex error key</label>
          <input className="text-input" value={v.regex?.i18nKey || ''} onChange={(e) => set('validations.regex.i18nKey', e.target.value)} />

          <label className="input-label">Confirm of field id</label>
          <input className="text-input" value={v.confirmOf?.fieldId || ''} onChange={(e) => set('validations.confirmOf.fieldId', e.target.value)} />
          <label className="input-label">Confirm error key</label>
          <input className="text-input" value={v.confirmOf?.i18nKey || ''} onChange={(e) => set('validations.confirmOf.i18nKey', e.target.value)} />
        </>
      )}
    </div>
  );
}


