import React from 'react';
import './Checkbox.scss';

function Checkbox(props: { id: string; label: string; onChange: Function; checked: boolean; disabled?: boolean }) {
  const { id, label, onChange, checked, disabled } = props;
  return (
    <div className={disabled ? 'text-muted' : ''}>
      <label htmlFor={id} className="container">
        <input
          type="checkbox"
          checked={checked}
          id={id}
          onChange={(e) => {
            onChange(e);
          }}
          disabled={disabled}
        />
        {label}
        <span className={disabled ? 'checkmark text-muted' : 'checkmark'} />
      </label>
    </div>
  );
}

export default Checkbox;
