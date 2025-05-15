import React, { useState, useEffect, useCallback, useRef } from 'react';

const FaceVerification = ({ courseId, studentId, onSuccess, onError, onCancel }) => {
  const [status, setStatus] = useState('waiting'); // waiting, processing, success, error
  const [message, setMessage] = useState('Kameraya erişim için hazırlanıyor...');
  const [countdown, setCountdown] = useState(null);
  const [error, setError] = useState(null);
  const [matchRatio, setMatchRatio] = useState(null);
  const [tipsIndex, setTipsIndex] = useState(0);
  
  // Interval referansları için useRef kullanımı (bellek sızıntısını önlemek için)
  const timerRef = useRef(null);
  const tipsTimerRef = useRef(null);

  // Kullanıcı için yardımcı ipuçları
  const tips = [
    "Yüzünüzü kameraya düzgün gösterin",
    "İyi aydınlatılmış bir ortamda olduğunuzdan emin olun",
    "Yüzünüz tam karşıya bakmalı",
    "Gözlüklerinizi çıkarmanız tanıma başarısını artırabilir",
    "Biraz daha yaklaşmayı deneyin",
    "Şapka veya maske gibi aksesuarlar yüz tanımayı zorlaştırabilir"
  ];

  // Cleanup fonksiyonu
  const cleanupTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    if (tipsTimerRef.current) {
      clearInterval(tipsTimerRef.current);
      tipsTimerRef.current = null;
    }
  }, []);

  // Component unmount olunca temizlik yapın
  useEffect(() => {
    return () => {
      cleanupTimers();
    };
  }, [cleanupTimers]);

  const startFaceVerification = useCallback(async () => {
    try {
      cleanupTimers(); // Mevcut zamanlayıcıları temizle
      setStatus('processing');
      setMessage('Kameraya erişim sağlanıyor...');
      setError(null);
      setMatchRatio(null);

      // İpuçlarını döngüsel olarak göster
      tipsTimerRef.current = setInterval(() => {
        setTipsIndex(prevIndex => (prevIndex + 1) % tips.length);
      }, 3000);

      // Countdown başlat
      let timeLeft = 20; // Maksimum 20 saniye
      setCountdown(timeLeft);
      
      timerRef.current = setInterval(() => {
        timeLeft--;
        setCountdown(timeLeft);
        
        if (timeLeft <= 0) {
          cleanupTimers();
          throw new Error('Zaman aşımı: Yüz tanıma tamamlanamadı');
        }
      }, 1000);

      // Backend'e istek at (doğrudan öğrenci ID'si gönderilmiyor, sunucu tarafında tespit edilecek)
      const response = await fetch(`http://localhost:5000/api/face-attendance/yoklama-al/${courseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({})
      });

      // İstek tamamlandığında countdown'u durdur
      cleanupTimers();

      // Ön kontroller
      if (!response) {
        throw new Error('Sunucudan yanıt alınamadı');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Yüz tanıma işlemi başarısız oldu');
      }

      // Başarılı tanıma
      setStatus('success');
      setMessage(data.message || 'Yüz tanıma başarılı!');
      
      // Eşleşme oranını ayarla
      if (data.match_ratio) {
        setMatchRatio(data.match_ratio);
      }
      
      // Başarılı callback'i çağır
      if (onSuccess) {
        setTimeout(() => {
          onSuccess(data);
        }, 1500);
      }
    } catch (error) {
      console.error('Yüz tanıma hatası:', error);
      setStatus('error');
      setMessage('Hata: ' + (error.message || 'Bilinmeyen bir hata oluştu'));
      setError(error.message || 'Bilinmeyen bir hata oluştu');
      
      if (onError) {
        onError(error);
      }
    }
  }, [courseId, cleanupTimers, tips, onSuccess, onError]);

  // Component mount olduğunda yüz tanıma işlemini başlat
  useEffect(() => {
    startFaceVerification();
  }, [startFaceVerification]);

  const handleRetry = () => {
    setStatus('waiting');
    setMessage('Yüz tanıma yeniden başlatılıyor...');
    setError(null);
    startFaceVerification();
  };

  return (
    <div className="face-verification">
      <div className="notification is-light mb-4 has-text-centered">
        <div className="mb-3">
          {status === 'waiting' && (
            <span className="icon is-large">
              <i className="fas fa-spinner fa-pulse fa-2x"></i>
            </span>
          )}
          
          {status === 'processing' && (
            <div>
              <span className="icon is-large">
                <i className="fas fa-camera fa-2x"></i>
              </span>
              <div className="mt-2">
                <progress 
                  className="progress is-primary" 
                  max="100" 
                  value={(20 - (countdown || 0)) * 5}
                ></progress>
                <p className="is-size-7 mt-1">Kalan süre: {countdown} saniye</p>
              </div>
            </div>
          )}
          
          {status === 'success' && (
            <span className="icon is-large has-text-success">
              <i className="fas fa-check-circle fa-2x"></i>
            </span>
          )}
          
          {status === 'error' && (
            <span className="icon is-large has-text-danger">
              <i className="fas fa-exclamation-triangle fa-2x"></i>
            </span>
          )}
        </div>
        
        <p className="is-size-5 mb-2">{message}</p>
        
        {matchRatio && (
          <p className="is-size-6 has-text-grey">Eşleşme oranı: {matchRatio}</p>
        )}
        
        {status === 'processing' && (
          <>
            <p className="is-size-6 mb-2">Lütfen kameraya bakın ve yüzünüzün açıkça görünmesini sağlayın.</p>
            <p className="is-size-7 has-text-grey">İpucu: {tips[tipsIndex]}</p>
          </>
        )}
        
        {status === 'error' && (
          <div className="content mt-3">
            <p className="has-text-danger is-size-7 mb-3">{error}</p>
            <div className="buttons is-centered mt-4">
              <button 
                className="button is-primary"
                onClick={handleRetry}
              >
                <span className="icon">
                  <i className="fas fa-redo"></i>
                </span>
                <span>Tekrar Dene</span>
              </button>
              <button 
                className="button is-light"
                onClick={onCancel}
              >
                <span className="icon">
                  <i className="fas fa-times"></i>
                </span>
                <span>İptal</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FaceVerification; 