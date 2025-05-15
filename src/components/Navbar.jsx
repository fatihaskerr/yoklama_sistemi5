import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const [isActive, setIsActive] = useState(false);
  const { currentUser, logout, isAdmin, isTeacher, isStudent } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar is-primary" role="navigation" aria-label="main navigation">
      <div className="container">
        <div className="navbar-brand">
          <Link className="navbar-item" to="/">
            <img src="/logo.png" alt="Logo" height="28" />
            <span className="ml-2 has-text-weight-bold">e-Yoklama</span>
          </Link>

          <a
            role="button"
            className={`navbar-burger ${isActive ? 'is-active' : ''}`}
            aria-label="menu"
            aria-expanded="false"
            onClick={() => setIsActive(!isActive)}
          >
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
            <span aria-hidden="true"></span>
          </a>
        </div>

        <div className={`navbar-menu ${isActive ? 'is-active' : ''}`}>
          <div className="navbar-start">
            {/* Admin menü öğeleri */}
            {isAdmin() && (
              <>
                <Link className="navbar-item" to="/admin">
                  Dashboard
                </Link>
                <Link className="navbar-item" to="/admin/users">
                  Kullanıcı Yönetimi
                </Link>
                <Link className="navbar-item" to="/veri-toplama">
                  Öğrenci Yüz Verisi Yönetimi
                </Link>
              </>
            )}

            {/* Öğretmen menü öğeleri */}
            {isTeacher() && (
              <>
                <Link className="navbar-item" to="/teacher">
                  Dashboard
                </Link>
                <div className="navbar-item has-dropdown is-hoverable">
                  <a className="navbar-link">Yoklama</a>
                  <div className="navbar-dropdown">
                    <Link className="navbar-item" to="/teacher/yoklama/baslat">
                      Yoklama Başlat
                    </Link>
                    <Link className="navbar-item" to="/teacher/yoklama/listele">
                      Yoklama Listesi
                    </Link>
                  </div>
                </div>
              </>
            )}

            {/* Öğrenci menü öğeleri */}
            {isStudent() && (
              <>
                <Link className="navbar-item" to="/student">
                  Aktif Dersler
                </Link>
                <Link className="navbar-item" to="/student/devamsizlik">
                  Devamsızlık Takibi
                </Link>
              </>
            )}
          </div>

          <div className="navbar-end">
            <div className="navbar-item">
              <div className="buttons">
                {currentUser ? (
                  <>
                    <div className="navbar-item">
                      <span className="has-text-white">{currentUser.ad} {currentUser.soyad}</span>
                    </div>
                    <button className="button is-light" onClick={handleLogout}>
                      <span className="icon">
                        <i className="fas fa-sign-out-alt"></i>
                      </span>
                      <span>Çıkış</span>
                    </button>
                  </>
                ) : (
                  <Link className="button is-light" to="/login">
                    <span className="icon">
                      <i className="fas fa-sign-in-alt"></i>
                    </span>
                    <span>Giriş Yap</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 