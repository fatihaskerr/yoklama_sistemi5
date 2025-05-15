import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="container mt-6">
      <div className="columns is-centered">
        <div className="column is-half has-text-centered">
          <h1 className="title is-1">404</h1>
          <h2 className="subtitle is-3">Sayfa Bulunamadı</h2>
          <p className="mb-5">
            Aradığınız sayfa mevcut değil veya taşınmış olabilir.
          </p>
          <Link to="/" className="button is-primary">
            <span className="icon">
              <i className="fas fa-home"></i>
            </span>
            <span>Ana Sayfaya Dön</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage; 