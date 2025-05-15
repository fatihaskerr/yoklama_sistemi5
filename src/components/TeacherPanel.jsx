import React, { useState, useEffect } from "react";
import html2pdf from 'html2pdf.js';

const TeacherPanel = ({ user, onLogout }) => {
  // Debug için eklenen loglar
  console.log("TeacherPanel'e gelen user:", user);
  console.log("TeacherPanel'e gelen user.mail:", user?.mail);

  const [selectedCourse, setSelectedCourse] = useState("");
  const [attendanceStarted, setAttendanceStarted] = useState(false);
  const [attendanceList, setAttendanceList] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [alertMessage, setAlertMessage] = useState(null);
  const [courses, setCourses] = useState([]);
  const [currentAttendanceId, setCurrentAttendanceId] = useState(null);
  const [attendanceDetails, setAttendanceDetails] = useState({
    baslangicZamani: null,
    katilimOrani: 0,
    dersAdi: ''
  });

  useEffect(() => {
    // Öğretmenin derslerini getir
    const fetchTeacherCourses = async () => {
      try {
        console.log("Dersler için istek atılıyor:", user.mail); // Debug log
        const response = await fetch(`http://localhost:5000/api/courses/teacher/${user.mail}`);
        console.log("Backend yanıtı:", response); // Debug log
        const data = await response.json();
        console.log("Gelen dersler:", data); // Debug log
        
        if (response.ok) {
          setCourses(data.courses);
        } else {
          setAlertMessage({
            severity: "error",
            text: "Dersler yüklenirken bir hata oluştu: " + (data.error || "Bilinmeyen hata")
          });
        }
      } catch (error) {
        console.error('Ders yükleme hatası:', error);
        setAlertMessage({
          severity: "error",
          text: "Dersler yüklenirken bir hata oluştu: " + error.message
        });
      }
    };

    if (user && user.mail) {  // user ve mail kontrolü
      console.log("useEffect tetiklendi, user.mail:", user.mail); // Debug log
      fetchTeacherCourses();
    } else {
      console.log("useEffect tetiklendi fakat user.mail yok!"); // Debug log
    }
  }, [user?.mail]); // dependency'i user?.mail olarak güncelledik

  useEffect(() => {
    // Öğretmenin aktif yoklamasını kontrol et
    const checkActiveAttendance = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/courses/active-attendance/${user.mail}`);
        const data = await response.json();
        
        if (response.ok && data.activeAttendance) {
          setSelectedCourse(data.activeAttendance.dersKodu);
          setAttendanceStarted(true);
          setCurrentAttendanceId(data.activeAttendance._id);
        }
      } catch (error) {
        console.error('Aktif yoklama kontrolü hatası:', error);
      }
    };

    if (user?.mail) {
      checkActiveAttendance();
    }
  }, [user?.mail]);

  const startOrEndAttendance = async () => {
    if (!selectedCourse) {
      setAlertMessage({ severity: "warning", text: "Lütfen bir ders seçin." });
      return;
    }

    // Seçili dersin adını bul
    const selectedCourseName = courses.find(course => course.kod === selectedCourse)?.ad;

    try {
      if (attendanceStarted && currentAttendanceId) {
        // Yoklamayı bitir
        const response = await fetch(`http://localhost:5000/api/courses/attendance/${currentAttendanceId}/end`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          setAlertMessage({
            severity: "info",
            text: `${selectedCourseName} için yoklama bitirildi.`
          });
          setAttendanceStarted(false);
          setCurrentAttendanceId(null);
        } else {
          throw new Error('Yoklama bitirilemedi');
        }
      } else {
        // Yeni yoklama başlat
        const response = await fetch('http://localhost:5000/api/courses/attendance/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            dersKodu: selectedCourse,
            ogretmenMail: user.mail
          })
        });

        const data = await response.json();

        if (response.ok) {
          setAlertMessage({
            severity: "success",
            text: `${selectedCourseName} için yoklama başlatıldı.`
          });
          setAttendanceStarted(true);
          setCurrentAttendanceId(data.attendanceId);
        } else {
          throw new Error(data.error || 'Yoklama başlatılamadı');
        }
      }
    } catch (error) {
      console.error('Yoklama işlem hatası:', error);
      setAlertMessage({
        severity: "error",
        text: "Bir hata oluştu: " + error.message
      });
    }
  };

  const handleShowAttendanceList = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/courses/attendance/${currentAttendanceId}`);
      const data = await response.json();
      
      if (response.ok) {
        const katilimOrani = (data.katilanlar.length / data.tumOgrenciler.length * 100).toFixed(1);
        const dersAdi = courses.find(course => course.kod === selectedCourse)?.ad;

        // Aktif yoklama bilgisini al
        const activeAttendanceResponse = await fetch(`http://localhost:5000/api/courses/active-attendance/${user.mail}`);
        const activeData = await activeAttendanceResponse.json();
        
        // Tarihi UTC olarak parse et
        let tarih;
        if (activeData?.activeAttendance?.tarih) {
          const utcDate = new Date(activeData.activeAttendance.tarih);
          // 3 saat geri al
          tarih = new Date(utcDate.getTime() - (3 * 60 * 60 * 1000));
        } else {
          tarih = new Date();
        }

        setAttendanceDetails({
          baslangicZamani: tarih,
          katilimOrani: katilimOrani,
          dersAdi: activeData?.activeAttendance?.dersAdi || dersAdi
        });

        setAttendanceList({
          tumOgrenciler: data.tumOgrenciler,
          katilanlar: data.katilanlar
        });
        setOpenModal(true);
      } else {
        throw new Error('Yoklama listesi alınamadı');
      }
    } catch (error) {
      console.error("Hata:", error);
      setAlertMessage({
        severity: "error",
        text: "Liste yüklenirken hata oluştu: " + error.message
      });
    }
  };

  const handleAttendanceChange = async (ogrenci) => {
    const ogrenciAdSoyad = attendanceList.tumOgrenciler.find(
      o => o.ogrenciNo === ogrenci
    )?.adSoyad;

    if (window.confirm(`${ogrenciAdSoyad} için yoklama durumunu değiştirmek istediğinize emin misiniz?`)) {
      try {
        const response = await fetch(`http://localhost:5000/api/courses/attendance/${currentAttendanceId}/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ogrenci,
            isPresent: !attendanceList.katilanlar.includes(ogrenci)
          })
        });

        if (response.ok) {
          // Listeyi güncelle
          setAttendanceList(prevList => {
            const newKatilanlar = prevList.katilanlar.includes(ogrenci)
              ? prevList.katilanlar.filter(k => k !== ogrenci)
              : [...prevList.katilanlar, ogrenci];

            // Katılım oranını güncelle
            const yeniKatilimOrani = (newKatilanlar.length / prevList.tumOgrenciler.length * 100).toFixed(1);
            setAttendanceDetails(prev => ({
              ...prev,
              katilimOrani: yeniKatilimOrani
            }));

            return {
              ...prevList,
              katilanlar: newKatilanlar
            };
          });
        } else {
          throw new Error('Yoklama güncellenemedi');
        }
      } catch (error) {
        setAlertMessage({
          severity: "error",
          text: "Yoklama güncellenirken hata oluştu: " + error.message
        });
      }
    }
  };

  const handleCloseModal = () => {
    setOpenModal(false);
  };

  const clearAlert = () => {
    setAlertMessage(null);
  };

  const handlePdfDownload = () => {
    const element = document.getElementById('attendance-content');
    
    // Tarihi formatla (GG-AA-YYYY)
    const tarih = new Date(attendanceDetails.baslangicZamani)
      .toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\./g, '-');

    const opt = {
      margin: 1,
      filename: `${selectedCourse}-yoklama-listesi-${tarih}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="container">
      <p className="subtitle has-text-centered mb-4">
        Merhaba, {user.ad} {user.soyad}
      </p>

      <div className="attendance-panel">
        <div className="box">
          <h3 className="title is-5 mb-4">Ders Seçin</h3>
          <div className="field">
            <div className="control">
              <div className="select is-fullwidth">
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                >
                  <option value="">Ders seçin</option>
                  {courses.map((course) => (
                    <option key={course.kod} value={course.kod}>
                      {course.kod} - {course.ad}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="field">
            <div className="control">
              <button
                className={`button is-${
                  attendanceStarted ? "danger" : "primary"
                } is-fullwidth`}
                onClick={startOrEndAttendance}
                disabled={!selectedCourse}
              >
                {attendanceStarted ? "Yoklamayı Bitir" : "Yoklama Başlat"}
              </button>
            </div>
          </div>

          {attendanceStarted && (
            <div className="mt-4">
              <button
                className="button is-info is-fullwidth"
                onClick={handleShowAttendanceList}
              >
                Yoklama Listesini Görüntüle
              </button>
            </div>
          )}
        </div>

        {/* Yoklama Listesi Modal */}
        <div className={`modal ${openModal ? "is-active" : ""}`}>
          <div className="modal-background" onClick={handleCloseModal}></div>
          <div className="modal-card" style={{ maxWidth: '800px', width: '90%' }}>
            <header className="modal-card-head">
              <div className="modal-card-title">
                <h1 className="title is-4 mb-2">{attendanceDetails.dersAdi}</h1>
                <h2 className="subtitle is-6 has-text-grey mb-0">{selectedCourse} - Yoklama Listesi</h2>
              </div>
            </header>
            
            <section className="modal-card-body">
              <div id="attendance-content">
                {/* Yoklama Detayları */}
                <div className="box mb-4">
                  <div className="columns is-mobile">
                    <div className="column">
                      <p className="heading">Başlangıç Zamanı</p>
                      <p className="title is-5">
                        {attendanceDetails.baslangicZamani?.toLocaleString('tr-TR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="column has-text-centered">
                      <p className="heading">Toplam Öğrenci</p>
                      <p className="title is-5">{attendanceList.tumOgrenciler?.length || 0}</p>
                    </div>
                    <div className="column has-text-centered">
                      <p className="heading">Katılan Öğrenci</p>
                      <p className="title is-5">{attendanceList.katilanlar?.length || 0}</p>
                    </div>
                    <div className="column has-text-right">
                      <p className="heading">Katılım Oranı</p>
                      <p className="title is-5">%{attendanceDetails.katilimOrani}</p>
                    </div>
                  </div>
                </div>

                {/* Öğrenci Listesi */}
                {!attendanceList.tumOgrenciler?.length ? (
                  <p className="has-text-centered">Henüz öğrenci kaydı yok.</p>
                ) : (
                  <div className="content">
                    <div className="table-container">
                      <table className="table is-fullwidth is-hoverable">
                        <thead>
                          <tr>
                            <th style={{ width: '60px' }}>#</th>
                            <th>Öğrenci No</th>
                            <th>Ad Soyad</th>
                            <th style={{ width: '150px' }}>Durum</th>
                            <th style={{ width: '100px' }}>İşlem</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceList.tumOgrenciler.map((ogrenci, index) => {
                            const isPresent = attendanceList.katilanlar.includes(ogrenci.ogrenciNo);
                            return (
                              <tr key={ogrenci.ogrenciNo}>
                                <td>{index + 1}</td>
                                <td>{ogrenci.ogrenciNo}</td>
                                <td>{ogrenci.adSoyad}</td>
                                <td>
                                  <span className={`tag ${isPresent ? 'is-success' : 'is-warning'} is-light`}>
                                    {isPresent ? 'Katıldı' : 'Katılmadı'}
                                  </span>
                                </td>
                                <td>
                                  <button 
                                    className={`button is-small ${isPresent ? 'is-light' : 'is-info'}`}
                                    onClick={() => handleAttendanceChange(ogrenci.ogrenciNo)}
                                    disabled={isPresent}
                                    style={isPresent ? {
                                      backgroundColor: '#f5f5f5',
                                      color: '#7a7a7a'
                                    } : {}}
                                  >
                                    {isPresent ? 'İşaretlendi' : 'İşaretle'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </section>
            
            <footer className="modal-card-foot" style={{ justifyContent: 'space-between' }}>
              <button className="button" onClick={handleCloseModal}>Kapat</button>
              <button 
                className="button is-info"
                onClick={handlePdfDownload}
              >
                <span className="icon">
                  <i className="fas fa-file-pdf"></i>
                </span>
                <span>PDF İndir</span>
              </button>
            </footer>
          </div>
        </div>
      </div>
        
      {/* Alert mesajı */}
      {alertMessage && (
        <div className={`notification is-${alertMessage.severity}`}>
          <button className="delete" onClick={clearAlert}></button>
          {alertMessage.text}
        </div>
      )}

      {/* Çıkış Yap Butonu */}
      <div className="has-text-centered mt-4">
        <button className="button is-danger is-light" onClick={onLogout}>
          <span className="icon">
            <i className="fas fa-sign-out-alt"></i>
          </span>
          <span>Çıkış Yap</span>
        </button>
      </div>
    </div>
  );
};

export default TeacherPanel;
