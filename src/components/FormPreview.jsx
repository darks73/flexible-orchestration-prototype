import React, { useMemo, useState } from 'react';
import { renderMarkdown } from '../utils/markdown.js';

export default function FormPreview({ schema, onSubmit }) {
  const initialState = useMemo(() => {
    const state = {};
    (schema?.elements || []).forEach(el => {
      if (el.type === 'checkbox') state[el.id] = Boolean(el.value);
      else state[el.id] = el.value ?? '';
    });
    return state;
  }, [schema]);

  const [values, setValues] = useState(initialState);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const next = {};
    for (const el of schema?.elements || []) {
      const v = values[el.id];
      const val = el.validations || {};
      if (val.required?.enabled) {
        const empty = el.type === 'checkbox' ? false : (v == null || String(v).trim() === '');
        if (empty) next[el.id] = val.required?.i18nKey || 'Required';
      }
      if (typeof val.minLength?.value === 'number' && String(v || '').length < val.minLength.value) {
        next[el.id] = val.minLength?.i18nKey || `Min ${val.minLength.value}`;
      }
      if (typeof val.maxLength?.value === 'number' && String(v || '').length > val.maxLength.value) {
        next[el.id] = val.maxLength?.i18nKey || `Max ${val.maxLength.value}`;
      }
      if (val.regex?.value) {
        try {
          const re = new RegExp(val.regex.value);
          if (!re.test(String(v || ''))) next[el.id] = val.regex?.i18nKey || 'Invalid format';
        } catch {}
      }
      if (val.confirmOf?.fieldId) {
        if (values[val.confirmOf.fieldId] !== v) next[el.id] = val.confirmOf?.i18nKey || 'Does not match';
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = (e) => {
    e?.preventDefault?.();
    if (!validate()) return;
    const out = { ...values };
    onSubmit?.(out);
  };

  const renderEl = (el, parentLayout) => {
    if (el.type === 'row') {
      const layout = el.layout || 'left';
      const rowStyle = {
        display: 'flex',
        gap: 8,
        width: '100%',
        flexWrap: layout === 'distribute' ? 'nowrap' : 'nowrap',
      };
      if (layout === 'left') {
        rowStyle.justifyContent = 'flex-start';
      } else if (layout === 'right') {
        rowStyle.justifyContent = 'flex-end';
      } else if (layout === 'distribute') {
        rowStyle.justifyContent = 'space-between';
      } else if (layout === 'block') {
        rowStyle.flexDirection = 'column';
        rowStyle.alignItems = 'stretch';
      }
      return (
        <div key={el.id} className="preview-row" style={rowStyle}>
          {(el.children || []).map((child) => renderEl(child, layout))}
        </div>
      );
    }
    const common = {
      id: el.id,
      name: el.id,
      disabled: el.readOnly,
      placeholder: el.placeholder,
      'aria-label': el.loginHint || el.label || el.i18nKey || el.id,
      value: el.type === 'checkbox' ? undefined : values[el.id],
      checked: el.type === 'checkbox' ? values[el.id] : undefined,
      onChange: (e) => {
        const next = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setValues((s) => ({ ...s, [el.id]: el.trim && typeof next === 'string' ? next.trimStart() : next }));
      },
      className: 'text-input',
    };
    const label = el.label || el.i18nKey || el.id;
    const isRequired = Boolean(el?.validations?.required?.enabled);
    const shouldShowLabelAbove = ['input', 'password', 'checkbox'].includes(el.type) && label;
    const fieldStyle = {};
    if (parentLayout === 'block') {
      fieldStyle.width = '100%';
    }
    if (parentLayout === 'distribute') {
      fieldStyle.flexGrow = 0;
      fieldStyle.flexShrink = 1;
      fieldStyle.flexBasis = 'auto';
      fieldStyle.minWidth = 0;
    }
    return (
      <div key={el.id} className="preview-field" style={fieldStyle}>
        {shouldShowLabelAbove && (
          <label className="preview-label" htmlFor={el.id}>
            {label}
            {isRequired && <span className="preview-required">*</span>}
          </label>
        )}
        {el.type === 'label' && (
          <div
            className="preview-label-text"
            style={{ textAlign: el.textAlign || 'left' }}
            dangerouslySetInnerHTML={{ __html: renderMarkdown(el.text || label || '') }}
          />
        )}
        {el.type === 'input' && <input type="text" {...common} />}
        {el.type === 'password' && <input type="password" {...common} />}
        {el.type === 'checkbox' && <input type="checkbox" {...common} />}
        {el.type === 'button' && (
          <button className="btn-secondary" onClick={submit} type="button">{label || 'Submit'}</button>
        )}
        {errors[el.id] && <div className="error-text">{errors[el.id]}</div>}
      </div>
    );
  };

  return (
    <form onSubmit={submit} className="preview-card">
      {(schema?.elements || []).map((el) => renderEl(el, null))}
    </form>
  );
}


