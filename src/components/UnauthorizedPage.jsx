import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const UnauthorizedPage = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="container mt-6">
      <div className="columns is-centered">
        <div className="column is-half has-text-centered">
          <h1 className="title is-2">Yetkisiz Erişim</h1>
          <div className="notification is-danger is-light">
            <p className="mb-4">
              Bu sayfaya erişim yetkiniz bulunmamaktadır.
            </p>
            <p className="mb-4">
              Farklı bir hesapla giriş yapmayı deneyebilir veya ana sayfaya dönebilirsiniz.
            </p>
          </div>
          
          <div className="buttons is-centered mt-4">
            {currentUser ? (
              <button onClick={handleLogout} className="button is-danger">
                <span className="icon">
                  <i className="fas fa-sign-out-alt"></i>
                </span>
                <span>Çıkış Yap</span>
              </button>
            ) : (
              <Link to="/login" className="button is-primary">
                <span className="icon">
                  <i className="fas fa-sign-in-alt"></i>
                </span>
                <span>Giriş Yap</span>
              </Link>
            )}
            
            <Link to="/" className="button is-link">
              <span className="icon">
                <i className="fas fa-home"></i>
              </span>
              <span>Ana Sayfa</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage; 