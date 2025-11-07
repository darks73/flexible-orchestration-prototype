import React, { useCallback, useMemo, useRef } from 'react';
import { renderMarkdown } from '../utils/markdown.js';

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
  const markdownEditorRef = useRef(null);

  const applyWrappedFormatting = useCallback((prefix, suffix = prefix, placeholder = 'text') => {
    const textarea = markdownEditorRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd, value } = textarea;
    const selected = selectionStart !== selectionEnd ? value.slice(selectionStart, selectionEnd) : placeholder;
    const before = value.slice(0, selectionStart);
    const after = value.slice(selectionEnd);
    const nextValue = `${before}${prefix}${selected}${suffix}${after}`;
    set('text', nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      const start = before.length + prefix.length;
      const end = start + selected.length;
      textarea.setSelectionRange(start, end);
    });
  }, [set]);

  const applyBulletList = useCallback(() => {
    const textarea = markdownEditorRef.current;
    if (!textarea) return;
    const { selectionStart, selectionEnd, value } = textarea;
    const before = value.slice(0, selectionStart);
    const selection = value.slice(selectionStart, selectionEnd) || 'List item';
    const after = value.slice(selectionEnd);
    const lines = selection.split('\n').map((line) => {
      const trimmed = line.trim();
      return trimmed.startsWith('- ') ? trimmed : `- ${trimmed || 'List item'}`;
    });
    const nextValue = `${before}${lines.join('\n')}${after}`;
    set('text', nextValue);
    requestAnimationFrame(() => {
      textarea.focus();
      const start = before.length;
      const end = start + lines.join('\n').length;
      textarea.setSelectionRange(start, end);
    });
  }, [set]);

  const labelTextPreview = useMemo(() => renderMarkdown(b.text || ''), [b.text]);

  return (
    <div className="editor-fields">
      <div className="section-title">Basic</div>
      <label className="input-label">Id</label>
      <div className="read-only-text">{b.id}</div>

      <label className="input-label">Label</label>
      <input className="text-input" value={b.label || ''} onChange={(e) => set('label', e.target.value)} />

      <label className="input-label">Localization key</label>
      <input className="text-input" value={b.i18nKey || ''} onChange={(e) => set('i18nKey', e.target.value)} />

      {b.type === 'row' && (
        <>
          <div className="section-title">Layout</div>
          <div className="layout-toolbar">
            {[
              { value: 'left', icon: 'format_align_left', label: 'Align left' },
              { value: 'right', icon: 'format_align_right', label: 'Align right' },
              { value: 'block', icon: 'view_agenda', label: 'Stack vertically' },
              { value: 'distribute', icon: 'view_column', label: 'Distribute evenly' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={`btn-secondary layout-icon-btn${(b.layout || 'left') === option.value ? ' active' : ''}`}
                aria-pressed={(b.layout || 'left') === option.value}
                aria-label={option.label}
                title={option.label}
                onClick={() => set('layout', option.value)}
              >
                <span className="material-icons">{option.icon}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {b.type === 'label' && (
        <>
          <div className="section-title">Text Alignment</div>
          <div className="text-align-toolbar">
            {[
              { value: 'left', icon: 'format_align_left', label: 'Align left' },
              { value: 'center', icon: 'format_align_center', label: 'Align center' },
              { value: 'right', icon: 'format_align_right', label: 'Align right' },
              { value: 'justify', icon: 'format_align_justify', label: 'Justify' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                className={`btn-secondary text-align-icon-btn${(b.textAlign || 'left') === option.value ? ' active' : ''}`}
                aria-pressed={(b.textAlign || 'left') === option.value}
                aria-label={option.label}
                title={option.label}
                onClick={() => set('textAlign', option.value)}
              >
                <span className="material-icons">{option.icon}</span>
              </button>
            ))}
          </div>
          <div className="section-title">Content</div>
          <div className="markdown-editor">
            <div className="markdown-toolbar">
              <button
                type="button"
                onClick={() => applyWrappedFormatting('**')}
                className="btn-secondary markdown-icon-btn"
                aria-label="Bold"
                title="Bold"
              >
                <span className="material-icons">format_bold</span>
              </button>
              <button
                type="button"
                onClick={() => applyWrappedFormatting('*')}
                className="btn-secondary markdown-icon-btn"
                aria-label="Italic"
                title="Italic"
              >
                <span className="material-icons">format_italic</span>
              </button>
              <button
                type="button"
                onClick={() => applyWrappedFormatting('`')}
                className="btn-secondary markdown-icon-btn"
                aria-label="Inline code"
                title="Inline code"
              >
                <span className="material-icons">code</span>
              </button>
              <button
                type="button"
                onClick={() => applyWrappedFormatting('# ', '', 'Heading')}
                className="btn-secondary markdown-icon-btn"
                aria-label="Heading"
                title="Heading"
              >
                <span className="material-icons">title</span>
              </button>
              <button
                type="button"
                onClick={applyBulletList}
                className="btn-secondary markdown-icon-btn"
                aria-label="Bulleted list"
                title="Bulleted list"
              >
                <span className="material-icons">format_list_bulleted</span>
              </button>
            </div>
            <textarea
              ref={markdownEditorRef}
              className="text-input markdown-textarea"
              rows={6}
              value={b.text || ''}
              placeholder="Add formatted text using markdown..."
              onChange={(e) => set('text', e.target.value)}
            />
            <div className="markdown-preview" dangerouslySetInnerHTML={{ __html: labelTextPreview }} />
          </div>
        </>
      )}

      {!['label', 'row'].includes(b.type) && (
        <>
          <label className="input-label">Value</label>
          <input className="text-input" value={String(b.value ?? '')} onChange={(e) => set('value', e.target.value)} />

          <label className="input-label">Placeholder</label>
          <input className="text-input" value={b.placeholder || ''} onChange={(e) => set('placeholder', e.target.value)} />
        </>
      )}

      {!['row'].includes(b.type) && (
        <div className="row">
          <label className="input-label">Read only</label>
          <input type="checkbox" checked={!!b.readOnly} onChange={(e) => set('readOnly', e.target.checked)} />
        </div>
      )}
      {!['label', 'button', 'row'].includes(b.type) && (
        <div className="row">
          <label className="input-label">Trim value</label>
          <input type="checkbox" checked={!!b.trim} onChange={(e) => set('trim', e.target.checked)} />
        </div>
      )}

      <label className="input-label">Login hint (accessibility)</label>
      <input className="text-input" value={b.loginHint || ''} onChange={(e) => set('loginHint', e.target.value)} />

      <div className="section-title">Validations</div>
      {!['label', 'button', 'row'].includes(b.type) && (
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


