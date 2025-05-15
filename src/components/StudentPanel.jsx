import React, { useState, useEffect } from "react";
import AttendanceTracking from './AttendanceTracking';
import FaceVerification from './FaceVerification';

const StudentPanel = ({ user, onLogout }) => {
  const [activeCourses, setActiveCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [isSmsVerified, setIsSmsVerified] = useState(true);
  const [isFaceVerified, setIsFaceVerified] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [showAttendanceTracking, setShowAttendanceTracking] = useState(false);
  const [showFaceVerification, setShowFaceVerification] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchActiveCourses = async () => {
    try {
      console.log("[DEBUG] Aktif dersler isteniyor...");
      console.log("[DEBUG] Kullanıcı bilgileri:", user);
      
      if (!user || !user.ogrno) {
        console.log("[HATA] Kullanıcı bilgileri eksik!");
        return;
      }

      const response = await fetch(`http://localhost:5000/api/attendance/active-courses/${user.ogrno}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log("[DEBUG] API yanıtı:", response);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("[DEBUG] Backend'den gelen dersler ve katılım durumları:", data);
      data.forEach(course => {
        console.log(`[DEBUG] ${course.dersKodu}: katilimYapildi = ${course.katilimYapildi}`);
      });
      
      setActiveCourses(data);
      
    } catch (error) {
      console.error('[HATA] Aktif dersler yüklenirken hata:', error);
      setAlertMessage({
        severity: "error",
        text: "Aktif dersler yüklenirken bir hata oluştu."
      });
    }
  };

  useEffect(() => {
    fetchActiveCourses();
  }, [user]);

  const handleCourseSelect = (course) => {
    setSelectedCourse(course);
    setIsAuthenticated(false);
    setShowPopup(true);
    setAlertMessage(null);
    setIsFaceVerified(false);
  };

  const handleSmsVerification = async () => {
    // SMS doğrulama iş mantığı daha sonra eklenecek
    // Şimdilik direkt başarılı kabul ediyoruz
    setIsSmsVerified(true);
    setAlertMessage({
      severity: "success",
      text: "Doğrulama başarılı.",
    });
  };

  const handleFaceVerificationStart = () => {
    setShowFaceVerification(true);
  };

  const handleFaceVerificationSuccess = (data) => {
    setIsFaceVerified(true);
    setShowFaceVerification(false);
    setAlertMessage({
      severity: "success",
      text: "Yüz tanıma doğrulaması başarıyla tamamlandı.",
    });
  };

  const handleFaceVerificationError = (error) => {
    setAlertMessage({
      severity: "error",
      text: `Yüz tanıma doğrulaması başarısız: ${error.message || "Bilinmeyen hata"}`,
    });
  };

  const handleFaceVerificationCancel = () => {
    setShowFaceVerification(false);
  };

  const handleAuthentication = async () => {
    try {
      if (!selectedCourse || !selectedCourse._id) {
        setAlertMessage({
          severity: "error",
          text: "Seçilmiş bir ders bulunamadı."
        });
        return;
      }
      
      if (!isFaceVerified) {
        setAlertMessage({
          severity: "warning",
          text: "Lütfen yüz tanıma doğrulamasını tamamlayın."
        });
        return;
      }
      
      setLoading(true);

      const response = await fetch(
        `http://localhost:5000/api/attendance/verify-attendance/${selectedCourse._id}/${user.ogrno}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );

      const data = await response.json();

      if (response.ok) {
        setIsAuthenticated(true);
        setShowPopup(false);
        
        await fetchActiveCourses();
        
        setAlertMessage({
          severity: "success",
          text: `${selectedCourse.dersAdi} dersine başarıyla giriş yaptınız.`
        });
      } else {
        throw new Error(data.error || 'Yoklama kaydı başarısız');
      }
    } catch (error) {
      console.error("Yoklama hatası:", error);
      setAlertMessage({
        severity: "error",
        text: "Yoklama kaydı yapılırken hata oluştu: " + (error.message || "Bilinmeyen hata")
      });
    } finally {
      setLoading(false);
    }
  };

  const closePopup = () => {
    setShowPopup(false);
    setShowFaceVerification(false);
    setIsFaceVerified(false);
    setAlertMessage(null);
  };

  const clearAlert = () => {
    setAlertMessage(null);
  };

  return (
    <>
      <div className="container">
        <p className="subtitle has-text-centered mb-4">
          Merhaba, {user.username}
        </p>

        <h2 className="title is-5 has-text-centered mb-4">
          <span className="icon-text">
            <span className="icon">
              <i className="fas fa-book"></i>
            </span>
            <span>Aktif Dersler</span>
          </span>
        </h2>

        {/* Aktif Dersler Listesi */}
        {activeCourses.length === 0 ? (
          <div className="notification is-info is-light has-text-centered">
            <span className="icon-text">
              <span className="icon">
                <i className="fas fa-info-circle"></i>
              </span>
              <span>Aktif dersiniz bulunmamaktadır.</span>
            </span>
          </div>
        ) : (
          <div className="list has-hoverable-list-items">
            {activeCourses.map((course) => (
              <div key={course._id} className="list-item" style={{ marginBottom: '1rem' }}>
                <div className="level is-mobile">
                  <div className="level-left" style={{ flex: 1 }}>
                    <div className="level-item" style={{ width: '100%' }}>
                      <div style={{ width: '100%' }}>
                        <div className="is-flex is-justify-content-space-between is-align-items-center mb-1">
                          <div style={{ flex: 1, marginRight: '1rem', overflow: 'hidden' }}>
                            <p className="mb-0" style={{ 
                              wordBreak: 'break-word', 
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden'
                            }}>
                              {course.dersKodu} - {course.dersAdi}
                            </p>
                          </div>
                          <div style={{ flexShrink: 0 }}>
                            <button
                              className={`button ${course.katilimYapildi ? 'is-light' : 'is-primary'}`}
                              onClick={() => handleCourseSelect(course)}
                              disabled={course.katilimYapildi}
                              style={course.katilimYapildi ? {
                                backgroundColor: '#f5f5f5',
                                color: '#7a7a7a'
                              } : {}}
                            >
                              {course.katilimYapildi ? 'Derse Katılındı' : 'Derse Katıl'}
                            </button>
                          </div>
                        </div>
                        <div className="is-size-7 has-text-grey mt-2">
                          <p className="mb-1">
                            <span className="icon-text">
                              <span className="icon">
                                <i className="fas fa-user-tie"></i>
                              </span>
                              <span>{course.ogretmenler?.[0]}</span>
                            </span>
                          </p>
                          {course.tarih && (
                            <p className="mb-0">
                              <span className="icon-text">
                                <span className="icon">
                                  <i className="fas fa-clock"></i>
                                </span>
                                <span>
                                  {(() => {
                                    const date = new Date(course.tarih);
                                    date.setHours(date.getHours() - 3);
                                    return date.toLocaleString('tr-TR', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      day: '2-digit',
                                      month: '2-digit',
                                      year: 'numeric'
                                    });
                                  })()}
                                </span>
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Çıkış Butonu */}
        <div className="has-text-centered mt-5">
          <button
            className="button is-danger is-light"
            onClick={onLogout}
          >
            <span className="icon">
              <i className="fas fa-sign-out-alt"></i>
            </span>
            <span>Çıkış Yap</span>
          </button>
        </div>
      </div>

      {/* Devamsızlık Takibi Butonu */}
      <div style={{
        position: 'fixed',
        left: '36px',
        bottom: '36px',
        zIndex: 29  
      }}>
        <button
          className="button is-info is-light"
          onClick={() => setShowAttendanceTracking(true)}
        >
          <span className="icon">
            <i className="fas fa-calendar-check"></i>
          </span>
          <span>Devamsızlık Takibi</span>
        </button>
      </div>

      {/* Devamsızlık Takibi Modal */}
      <AttendanceTracking 
        isActive={showAttendanceTracking}
        onClose={() => setShowAttendanceTracking(false)}
        studentId={user.ogrno}
      />

      {/* Doğrulama Popup */}
      {showPopup && selectedCourse && (
        <div className="modal is-active">
          <div className="modal-background" onClick={closePopup}></div>
          <div className="modal-card">
            <header className="modal-card-head">
              <p className="modal-card-title">Derse Giriş Doğrulama</p>
              <button className="delete" aria-label="close" onClick={closePopup}></button>
            </header>
            <section className="modal-card-body">
              {alertMessage && (
                <div className={`notification ${
                  alertMessage.severity === "success" ? "is-success" : 
                  alertMessage.severity === "warning" ? "is-warning" : "is-danger"
                }`}>
                  <button className="delete" onClick={clearAlert}></button>
                  {alertMessage.text}
                </div>
              )}
              
              <h3 className="title is-5 mb-3">{selectedCourse.dersKodu} - {selectedCourse.dersAdi}</h3>
              
              <div className="content">
                <p>
                  <span className="has-text-weight-bold">Öğretmen:</span> {selectedCourse.ogretmenler?.[0] || "Bilgi yok"}
                </p>
                
                {/* Yüz Tanıma Alanı */}
                {showFaceVerification ? (
                  <FaceVerification 
                    courseId={selectedCourse._id}
                    studentId={user.ogrno}
                    onSuccess={handleFaceVerificationSuccess}
                    onError={handleFaceVerificationError}
                    onCancel={handleFaceVerificationCancel}
                  />
                ) : (
                  <div className="box">
                    <h4 className="title is-6">
                      <span className="icon-text">
                        <span className="icon">
                          <i className="fas fa-camera"></i>
                        </span>
                        <span>Yüz Tanıma</span>
                      </span>
                    </h4>
                    
                    {isFaceVerified ? (
                      <div className="notification is-success is-light">
                        <span className="icon-text">
                          <span className="icon">
                            <i className="fas fa-check-circle"></i>
                          </span>
                          <span>Yüz tanıma doğrulaması tamamlandı</span>
                        </span>
                      </div>
                    ) : (
                      <div className="has-text-centered">
                        <p className="mb-4">Derse katılmak için yüz tanıma doğrulaması gereklidir.</p>
                        <button 
                          className="button is-info"
                          onClick={handleFaceVerificationStart}
                        >
                          Yüz Tanıma Başlat
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
            
            <footer className="modal-card-foot">
              <button 
                className={`button is-success ${loading ? 'is-loading' : ''}`}
                onClick={handleAuthentication}
                disabled={!isFaceVerified || loading}
              >
                Derse Giriş Yap
              </button>
              <button className="button" onClick={closePopup}>İptal</button>
            </footer>
          </div>
        </div>
      )}
    </>
  );
};

export default StudentPanel;
