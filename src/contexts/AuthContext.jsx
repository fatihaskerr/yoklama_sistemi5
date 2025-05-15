import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Navigate } from 'react-router-dom';

const API_URL = 'http://localhost:5000/api';

// Context oluşturma
const AuthContext = createContext(null);

// Local storage keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_INFO_KEY = 'user_info';

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // İlk yükleme sırasında local storage'dan kullanıcı bilgilerini al
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const userInfoStr = localStorage.getItem(USER_INFO_KEY);
        const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
        
        if (userInfoStr && accessToken) {
          setCurrentUser(JSON.parse(userInfoStr));
          setupAxiosInterceptors();
        }
      } catch (error) {
        console.error('Kimlik doğrulama başlatılırken hata:', error);
        clearAuthData();
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Token ve kullanıcı bilgilerini kaydet
  const saveAuthData = (accessToken, refreshToken, user) => {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(USER_INFO_KEY, JSON.stringify(user));
    setCurrentUser(user);
  };

  // Local storage'dan tokenleri al
  const getAuthTokens = () => {
    return {
      accessToken: localStorage.getItem(ACCESS_TOKEN_KEY),
      refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY)
    };
  };

  // Oturum bilgilerini temizle
  const clearAuthData = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_INFO_KEY);
    setCurrentUser(null);
  };

  // Giriş yapma işlemi
  const login = async (email, password) => {
    setError(null);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, {
        mail: email,
        sifre: password
      });

      const { access_token, refresh_token, user } = response.data;
      saveAuthData(access_token, refresh_token, user);
      
      // Axios için default Authorization header'ını ayarla
      setupAxiosInterceptors();
      return { success: true, user };
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Giriş sırasında bir hata oluştu';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Çıkış yapma işlemi
  const logout = async () => {
    try {
      const { refreshToken } = getAuthTokens();
      
      // API'ye çıkış bildir (token'ı geçersiz kılmak için)
      if (refreshToken) {
        await axios.post(`${API_URL}/auth/logout`, { 
          refresh_token: refreshToken 
        });
      }
    } catch (error) {
      console.error('Çıkış yapılırken hata:', error);
    } finally {
      // Local storage'ı temizle
      clearAuthData();
    }
  };

  // Access token yenileme
  const refreshAccessToken = async () => {
    try {
      const { refreshToken } = getAuthTokens();
      
      if (!refreshToken) {
        throw new Error('Refresh token bulunamadı');
      }

      const response = await axios.post(`${API_URL}/auth/refresh-token`, {
        refresh_token: refreshToken
      });

      const { access_token } = response.data;
      
      // Sadece access token'ı güncelle
      localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
      
      return { success: true, accessToken: access_token };
    } catch (error) {
      console.error('Token yenilenirken hata:', error);
      // Hata durumunda oturumu sonlandır
      clearAuthData();
      return { success: false, error: 'Oturum süresi doldu, lütfen tekrar giriş yapın' };
    }
  };

  // Axios interceptors (token yönetimi için)
  const setupAxiosInterceptors = () => {
    // Request interceptor - her istekte Authorization header'ı ekle
    axios.interceptors.request.use(
      (config) => {
        const { accessToken } = getAuthTokens();
        if (accessToken) {
          config.headers['Authorization'] = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - 401 hatası durumunda token yenileme
    axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        
        // Token süresi dolduğunda ve daha önce yenileme denemesi yapılmadıysa
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            // Token yenileme işlemi
            const { success, accessToken } = await refreshAccessToken();
            
            if (success) {
              // Yeni token ile header'ı güncelle ve isteği tekrarla
              axios.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
              originalRequest.headers['Authorization'] = `Bearer ${accessToken}`;
              return axios(originalRequest);
            }
          } catch (refreshError) {
            console.error('Token yenileme hatası:', refreshError);
            // Yenileme başarısız olursa çıkış yap ve login sayfasına yönlendir
            clearAuthData();
            window.location.href = '/login';
          }
        }
        
        return Promise.reject(error);
      }
    );
  };

  // Şifre değiştirme
  const changePassword = async (currentPassword, newPassword) => {
    try {
      const response = await axios.post(`${API_URL}/auth/change-password`, {
        current_password: currentPassword,
        new_password: newPassword
      });

      return { success: true, message: response.data.message };
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Şifre değiştirme sırasında bir hata oluştu';
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  // Kullanıcı rolünü kontrol et
  const hasRole = (requiredRole) => {
    if (!currentUser || !currentUser.role) return false;
    
    // Rol alternatiflerini kontrol et
    switch (requiredRole) {
      case 'admin':
        return currentUser.role === 'admin';
      case 'teacher':
        return currentUser.role === 'teacher' || currentUser.role === 'ogretmen';
      case 'student':
        return currentUser.role === 'student' || currentUser.role === 'ogrenci';
      default:
        return currentUser.role === requiredRole;
    }
  };

  // Context değerlerini oluştur
  const value = {
    currentUser,
    loading,
    error,
    login,
    logout,
    changePassword,
    isAuthenticated: !!currentUser,
    isAdmin: () => hasRole('admin'),
    isTeacher: () => hasRole('teacher'),
    isStudent: () => hasRole('student'),
    hasRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth hook must be used within an AuthProvider');
  }
  return context;
};

// Korumalı Route bileşeni
export const ProtectedRoute = ({ 
  children, 
  requiredRole = null, 
  redirectPath = '/login' 
}) => {
  const { currentUser, loading, isAuthenticated, hasRole } = useAuth();
  const navigate = useNavigate();
  
  // Yükleme sırasında bekleme ekranı göster
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Yükleniyor...</p>
      </div>
    );
  }
  
  // Kullanıcı giriş yapmadıysa yönlendir
  if (!isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }
  
  // Rol kontrolü yapılıyorsa kontrol et
  if (requiredRole && !hasRole(requiredRole)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  // Her şey yolundaysa children'ı göster
  return children;
}; 