import React, { useState, useEffect } from 'react';

const StudentDataCollection = () => {
  const [studentInfo, setStudentInfo] = useState({
    ogrenci_id: '',
    ad: '',
    soyad: ''
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState('toplama'); // 'toplama' veya 'goruntuleme'
  const [studentList, setStudentList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Öğrenci listesini al
  const fetchStudentList = async () => {
    try {
      setIsLoading(true);
      // API noktası gerçekte farklı olabilir
      const response = await fetch('http://localhost:5000/api/student/ogrenci-listesi');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setStudentList(data.students || []);
    } catch (error) {
      console.error('Öğrenci listesi yüklenirken hata:', error);
      setMessage({
        type: 'error',
        text: 'Öğrenci listesi yüklenirken bir hata oluştu: ' + error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Aktif tab değiştiğinde öğrenci listesini yükle
  useEffect(() => {
    if (activeTab === 'goruntuleme') {
      fetchStudentList();
    }
  }, [activeTab]);

  const handleChange = (e) => {
    setStudentInfo({
      ...studentInfo,
      [e.target.name]: e.target.value
    });
  };

  const validateForm = () => {
    const { ogrenci_id } = studentInfo;
    
    if (!ogrenci_id) {
      setMessage({
        type: 'error',
        text: 'Öğrenci numarası zorunludur.'
      });
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsProcessing(true);
      setMessage(null);
      
      const response = await fetch('http://localhost:5000/api/student/ogrenci/veri-topla', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(studentInfo)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setIsSuccess(true);
        setMessage({
          type: 'success',
          text: `${data.message} - ${data.fotograf_sayisi} fotoğraf kaydedildi.`
        });
        
        // Öğrenci listesini güncelle
        if (activeTab === 'goruntuleme') {
          fetchStudentList();
        }
      } else {
        throw new Error(data.error || 'Veri toplama sırasında bir hata oluştu');
      }
    } catch (error) {
      console.error('Veri toplama hatası:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Veri toplama sırasında bir hata oluştu'
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleReset = () => {
    setStudentInfo({
      ogrenci_id: '',
      ad: '',
      soyad: ''
    });
    setMessage(null);
    setIsSuccess(false);
  };
  
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setMessage(null);
  };
  
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };
  
  const handleStudentView = (student) => {
    setSelectedStudent(student);
  };
  
  const handleStudentDelete = async (studentId) => {
    if (confirmDelete !== studentId) {
      setConfirmDelete(studentId);
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await fetch(`http://localhost:5000/api/student/ogrenci/veri-sil/${studentId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage({
          type: 'success',
          text: data.message || 'Öğrenci verileri başarıyla silindi'
        });
        setSelectedStudent(null);
        
        // Öğrenci listesini güncelle
        fetchStudentList();
      } else {
        throw new Error(data.error || 'Öğrenci verileri silinirken bir hata oluştu');
      }
    } catch (error) {
      console.error('Veri silme hatası:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Öğrenci verileri silinirken bir hata oluştu'
      });
    } finally {
      setIsLoading(false);
      setConfirmDelete(null);
    }
  };
  
  // Filtrelenmiş öğrenci listesi
  const filteredStudents = searchTerm.trim() === '' 
    ? studentList 
    : studentList.filter(student => 
        student.ogrenci_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.ad?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.soyad?.toLowerCase().includes(searchTerm.toLowerCase())
      );

  return (
    <div className="box">
      <h2 className="title is-4">Öğrenci Yüz Verisi Yönetimi</h2>
      
      {message && (
        <div className={`notification ${message.type === 'success' ? 'is-success' : 'is-danger'}`}>
          <button className="delete" onClick={() => setMessage(null)}></button>
          {message.text}
        </div>
      )}
      
      {/* Tab Menüsü */}
      <div className="tabs is-boxed">
        <ul>
          <li className={activeTab === 'toplama' ? 'is-active' : ''}>
            <a onClick={() => handleTabChange('toplama')}>
              <span className="icon is-small"><i className="fas fa-camera"></i></span>
              <span>Veri Toplama</span>
            </a>
          </li>
          <li className={activeTab === 'goruntuleme' ? 'is-active' : ''}>
            <a onClick={() => handleTabChange('goruntuleme')}>
              <span className="icon is-small"><i className="fas fa-list"></i></span>
              <span>Kayıtlı Öğrenciler</span>
            </a>
          </li>
        </ul>
      </div>
      
      {/* Veri Toplama Tab İçeriği */}
      {activeTab === 'toplama' && (
        <div className="veri-toplama-tab">
          {isSuccess ? (
            <div className="has-text-centered">
              <p className="mb-4">Yüz verileri başarıyla toplandı!</p>
              <button 
                className="button is-primary"
                onClick={handleReset}
              >
                Yeni Öğrenci Ekle
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label className="label">Öğrenci Numarası *</label>
                <div className="control">
                  <input
                    className="input"
                    type="text"
                    name="ogrenci_id"
                    value={studentInfo.ogrenci_id}
                    onChange={handleChange}
                    placeholder="Öğrenci numarası"
                    required
                  />
                </div>
                <p className="help">Öğrenci numarası zorunludur.</p>
              </div>
              
              <div className="field">
                <label className="label">Adı</label>
                <div className="control">
                  <input
                    className="input"
                    type="text"
                    name="ad"
                    value={studentInfo.ad}
                    onChange={handleChange}
                    placeholder="Öğrencinin adı"
                  />
                </div>
              </div>
              
              <div className="field">
                <label className="label">Soyadı</label>
                <div className="control">
                  <input
                    className="input"
                    type="text"
                    name="soyad"
                    value={studentInfo.soyad}
                    onChange={handleChange}
                    placeholder="Öğrencinin soyadı"
                  />
                </div>
              </div>
              
              <div className="field mt-5">
                <div className="control">
                  <button 
                    className={`button is-primary ${isProcessing ? 'is-loading' : ''}`}
                    type="submit"
                    disabled={isProcessing}
                  >
                    <span className="icon">
                      <i className="fas fa-camera"></i>
                    </span>
                    <span>Yüz Verisi Topla</span>
                  </button>
                </div>
                <p className="help mt-2">Bu işlem kamerayı açacak ve öğrencinin yüz verilerini toplayacaktır.</p>
              </div>
            </form>
          )}
          
          <div className="notification is-info is-light mt-5">
            <p className="mb-2"><strong>Bilgi:</strong></p>
            <ul style={{ marginLeft: '1.5rem', listStyleType: 'disc' }}>
              <li>Veri toplama sırasında öğrenci kameraya bakmalıdır.</li>
              <li>İyi aydınlatılmış bir ortamda olduğundan emin olun.</li>
              <li>Toplanan veriler yoklama sırasında öğrenciyi tanımak için kullanılacaktır.</li>
              <li>Yüzün farklı açılardan görünmesi için hafifçe baş hareketleri yapılabilir.</li>
            </ul>
          </div>
        </div>
      )}
      
      {/* Görüntüleme Tab İçeriği */}
      {activeTab === 'goruntuleme' && (
        <div className="goruntuleme-tab">
          <div className="columns">
            {/* Öğrenci Listesi */}
            <div className={`column ${selectedStudent ? 'is-7' : 'is-12'}`}>
              <div className="field">
                <div className="control has-icons-left">
                  <input
                    className="input"
                    type="text"
                    placeholder="Öğrenci ara..."
                    value={searchTerm}
                    onChange={handleSearch}
                  />
                  <span className="icon is-small is-left">
                    <i className="fas fa-search"></i>
                  </span>
                </div>
              </div>
              
              {isLoading ? (
                <div className="has-text-centered py-5">
                  <span className="icon is-large">
                    <i className="fas fa-spinner fa-pulse fa-2x"></i>
                  </span>
                  <p>Yükleniyor...</p>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="notification is-warning is-light">
                  <p className="has-text-centered">Kayıtlı öğrenci bulunamadı.</p>
                </div>
              ) : (
                <div className="table-container" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  <table className="table is-fullwidth is-hoverable is-striped">
                    <thead>
                      <tr>
                        <th>Öğrenci No</th>
                        <th>Ad Soyad</th>
                        <th>Kayıt Durumu</th>
                        <th>İşlemler</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map(student => (
                        <tr key={student.ogrenci_id} className={selectedStudent?.ogrenci_id === student.ogrenci_id ? 'is-selected' : ''}>
                          <td>{student.ogrenci_id}</td>
                          <td>{student.ad} {student.soyad}</td>
                          <td>
                            {student.encoding ? (
                              <span className="tag is-success is-light">Kayıtlı</span>
                            ) : (
                              <span className="tag is-warning is-light">Kayıtsız</span>
                            )}
                          </td>
                          <td>
                            <div className="buttons are-small">
                              <button 
                                className="button is-info"
                                onClick={() => handleStudentView(student)}
                              >
                                <span className="icon is-small">
                                  <i className="fas fa-eye"></i>
                                </span>
                              </button>
                              <button 
                                className="button is-danger"
                                onClick={() => handleStudentDelete(student.ogrenci_id)}
                                disabled={isLoading}
                              >
                                <span className="icon is-small">
                                  <i className={confirmDelete === student.ogrenci_id ? "fas fa-check" : "fas fa-trash-alt"}></i>
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              <div className="has-text-centered mt-5">
                <button
                  className="button is-primary"
                  onClick={() => setActiveTab('toplama')}
                >
                  <span className="icon">
                    <i className="fas fa-plus"></i>
                  </span>
                  <span>Yeni Öğrenci Ekle</span>
                </button>
              </div>
            </div>
            
            {/* Öğrenci Detayları */}
            {selectedStudent && (
              <div className="column is-5">
                <div className="box">
                  <h4 className="title is-5">Öğrenci Detayları</h4>
                  
                  <div className="field">
                    <label className="label">Öğrenci No</label>
                    <p>{selectedStudent.ogrenci_id}</p>
                  </div>
                  
                  <div className="field">
                    <label className="label">Ad Soyad</label>
                    <p>{selectedStudent.ad} {selectedStudent.soyad}</p>
                  </div>
                  
                  <div className="field">
                    <label className="label">Yüz Veri Durumu</label>
                    <p>
                      {selectedStudent.encoding ? (
                        <span className="tag is-success">Kayıtlı</span>
                      ) : (
                        <span className="tag is-warning">Kayıtsız</span>
                      )}
                    </p>
                  </div>
                  
                  {selectedStudent.foto_galerisi && selectedStudent.foto_galerisi.length > 0 && (
                    <div className="field">
                      <label className="label">Kayıtlı Fotoğraf Sayısı</label>
                      <p>{selectedStudent.foto_galerisi.length}</p>
                    </div>
                  )}
                  
                  <div className="field mt-4">
                    <div className="buttons">
                      <button 
                        className="button is-primary is-small"
                        onClick={() => {
                          setStudentInfo({
                            ogrenci_id: selectedStudent.ogrenci_id,
                            ad: selectedStudent.ad || '',
                            soyad: selectedStudent.soyad || ''
                          });
                          setActiveTab('toplama');
                        }}
                      >
                        <span className="icon">
                          <i className="fas fa-redo"></i>
                        </span>
                        <span>Yüz Verilerini Güncelle</span>
                      </button>
                      <button 
                        className="button is-danger is-small"
                        onClick={() => handleStudentDelete(selectedStudent.ogrenci_id)}
                        disabled={isLoading}
                      >
                        <span className="icon">
                          <i className={confirmDelete === selectedStudent.ogrenci_id ? "fas fa-check" : "fas fa-trash-alt"}></i>
                        </span>
                        <span>{confirmDelete === selectedStudent.ogrenci_id ? "Onayla" : "Verileri Sil"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDataCollection; 