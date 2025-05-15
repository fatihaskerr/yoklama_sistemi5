import React, { memo } from 'react';
import PropTypes from 'prop-types';

/**
 * Yeniden kullanılabilir form input bileşeni
 */
const FormInput = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  icon,
  disabled = false,
  required = false,
  autoComplete = 'off',
  className = '',
  ...rest
}) => {
  return (
    <div className={`field ${className}`}>
      {label && (
        <label className="label" htmlFor={name}>
          {label} {required && <span className="has-text-danger">*</span>}
        </label>
      )}
      <div className={`control ${icon ? 'has-icons-left' : ''}`}>
        <input
          id={name}
          name={name}
          type={type}
          className={`input ${error ? 'is-danger' : ''}`}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          {...rest}
        />
        {icon && (
          <span className="icon is-small is-left">
            <i className={`fas ${icon}`}></i>
          </span>
        )}
      </div>
      {error && <p className="form-error">{error}</p>}
    </div>
  );
};

FormInput.propTypes = {
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  type: PropTypes.string,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onChange: PropTypes.func.isRequired,
  error: PropTypes.string,
  placeholder: PropTypes.string,
  icon: PropTypes.string,
  disabled: PropTypes.bool,
  required: PropTypes.bool,
  autoComplete: PropTypes.string,
  className: PropTypes.string
};

export default memo(FormInput); 