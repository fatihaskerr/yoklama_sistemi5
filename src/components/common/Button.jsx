import React, { memo } from 'react';
import PropTypes from 'prop-types';

/**
 * Yeniden kullanılabilir buton bileşeni
 */
const Button = ({
  children,
  type = 'button',
  color = 'primary',
  size = '',
  icon,
  isLoading = false,
  isOutlined = false,
  isFullWidth = false,
  disabled = false,
  onClick,
  className = '',
  ...rest
}) => {
  const buttonClasses = [
    'button',
    `is-${color}`,
    size && `is-${size}`,
    isOutlined && 'is-outlined',
    isFullWidth && 'is-fullwidth',
    className
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={buttonClasses}
      disabled={disabled || isLoading}
      onClick={onClick}
      {...rest}
    >
      {icon && !isLoading && (
        <span className="icon">
          <i className={`fas ${icon}`}></i>
        </span>
      )}
      {isLoading && (
        <span className="icon">
          <i className="fas fa-spinner fa-pulse"></i>
        </span>
      )}
      {children && <span>{children}</span>}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  color: PropTypes.string,
  size: PropTypes.oneOf(['small', 'normal', 'medium', 'large']),
  icon: PropTypes.string,
  isLoading: PropTypes.bool,
  isOutlined: PropTypes.bool,
  isFullWidth: PropTypes.bool,
  disabled: PropTypes.bool,
  onClick: PropTypes.func,
  className: PropTypes.string
};

export default memo(Button); 