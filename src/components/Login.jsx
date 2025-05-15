import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage('');

    try {
      console.log("Giriş denemesi:", { email });
      const result = await login(email, password);
      console.log("Giriş sonucu:", result);

      if (result.success) {
        const user = result.user;
        console.log("Giriş başarılı, kullanıcı:", user);
        
        // Kullanıcı rolüne göre yönlendirme
        if (user.role === 'admin') {
          console.log("Admin rolüne yönlendiriliyor");
          navigate('/admin');
        } else if (user.role === 'teacher' || user.role === 'ogretmen') {
          console.log("Öğretmen rolüne yönlendiriliyor");
          navigate('/teacher');
        } else if (user.role === 'student' || user.role === 'ogrenci') {
          console.log("Öğrenci rolüne yönlendiriliyor");
          navigate('/student');
        } else {
          console.log("Varsayılan yönlendirme");
          navigate('/');
        }
      } else {
        setErrorMessage(result.error);
      }
    } catch (error) {
      console.error('Login hatası detayı:', error);
      setErrorMessage('Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="columns is-centered">
        <div className="column is-one-third">
          <div className="box">
            <h1 className="title has-text-centered">E-Yoklama Sistemi</h1>
            <h2 className="subtitle has-text-centered">Giriş Yap</h2>

            {errorMessage && (
              <div className="notification is-danger">
                <button className="delete" onClick={() => setErrorMessage('')}></button>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label className="label">E-posta</label>
                <div className="control has-icons-left">
                  <input
                    className="input"
                    type="email"
                    placeholder="E-posta adresiniz"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <span className="icon is-small is-left">
                    <i className="fas fa-envelope"></i>
                  </span>
                </div>
              </div>

              <div className="field">
                <label className="label">Şifre</label>
                <div className="control has-icons-left">
                  <input
                    className="input"
                    type="password"
                    placeholder="Şifreniz"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <span className="icon is-small is-left">
                    <i className="fas fa-lock"></i>
                  </span>
                </div>
              </div>

              <div className="field">
                <div className="control">
                  <button
                    className={`button is-primary is-fullwidth ${isLoading ? 'is-loading' : ''}`}
                    type="submit"
                    disabled={isLoading}
                  >
                    Giriş Yap
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;