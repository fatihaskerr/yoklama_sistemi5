import React, { memo } from 'react';
import PropTypes from 'prop-types';

/**
 * Bildirim/uyarı mesajları için ortak bileşen
 * @param {string} type - notification tipi (success, danger, warning, info)
 * @param {string} message - gösterilecek mesaj
 * @param {function} onClose - kapatma işleyicisi
 */
const Alert = ({ type = 'info', message, onClose }) => {
  if (!message) return null;
  
  return (
    <div className={`notification is-${type}`}>
      {onClose && (
        <button className="delete" onClick={onClose}></button>
      )}
      {message}
    </div>
  );
};

Alert.propTypes = {
  type: PropTypes.oneOf(['success', 'danger', 'warning', 'info', 'primary']),
  message: PropTypes.string,
  onClose: PropTypes.func
};

export default memo(Alert); 