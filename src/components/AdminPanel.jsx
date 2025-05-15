import React, { useState, useEffect, memo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Button from './common/Button';
import Alert from './common/Alert';
import StudentDataCollection from './StudentDataCollection';
import axios from 'axios';

const AdminPanel = ({ user, onLogout }) => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Kullanıcı yönetimi için state'ler
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({
    mail: '',
    sifre: '',
    ad: '',
    soyad: '',
    role: 'student',
    telno: '',
    ogrno: ''
  });
  const [alertMessage, setAlertMessage] = useState(null);

  // Kurs yönetimi state'leri
  const [isAddCourseModalOpen, setIsAddCourseModalOpen] = useState(false);
  const [isEditCourseModalOpen, setIsEditCourseModalOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [newCourse, setNewCourse] = useState({
    dersKodu: '',
    dersAdi: '',
    donem: '',
    teachers: [],
    students: []
  });
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [availableStudents, setAvailableStudents] = useState([]);

  useEffect(() => {
    // Kullanıcıları yükle
    setIsLoading(true);
    axios.get('http://localhost:5000/api/auth/users')
      .then(response => {
        setUsers(response.data.users);
        
        // Kullanılabilir öğretmenleri filtrele
        const teachers = response.data.users.filter(user => user.role === 'teacher');
        setAvailableTeachers(teachers);
        
        // Kullanılabilir öğrencileri filtrele
        const students = response.data.users.filter(user => user.role === 'student');
        setAvailableStudents(students);
      })
      .catch(error => {
        console.error('Kullanıcılar yüklenirken hata oluştu:', error);
        setError('Kullanıcılar yüklenemedi. Lütfen daha sonra tekrar deneyin.');
      })
      .finally(() => {
        setIsLoading(false);
      });
    
    // Kursları yükle
    axios.get('http://localhost:5000/api/courses/all')
      .then(response => {
        console.log('API yanıtı (kurslar):', response.data);
        setCourses(response.data.courses);
      })
      .catch(error => {
        console.error('Kurslar yüklenirken hata oluştu:', error);
        setError('Kurslar yüklenemedi. Lütfen daha sonra tekrar deneyin.');
      });
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Kullanıcı işlemleri için fonksiyonlar
  const addUser = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:5000/api/auth/user/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser)
      });

      const data = await response.json();
      
      if (response.ok) {
        // Kullanıcılar listesini güncelle
        setUsers([...users, data.user]);
        setIsAddUserModalOpen(false);
        // Formu temizle
        setNewUser({
          mail: '',
          sifre: '',
          ad: '',
          soyad: '',
          role: 'student',
          telno: '',
          ogrno: ''
        });
        setAlertMessage({
          type: 'success',
          text: 'Kullanıcı başarıyla eklendi.'
        });
      } else {
        setAlertMessage({
          type: 'error',
          text: data.error || 'Kullanıcı eklenirken bir hata oluştu.'
        });
      }
    } catch (error) {
      console.error('Kullanıcı ekleme hatası:', error);
      setAlertMessage({
        type: 'error',
        text: 'Kullanıcı eklenirken bir hata oluştu: ' + error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateUser = async () => {
    if (!selectedUser) return;

    try {
      setIsLoading(true);
      const response = await fetch(`http://localhost:5000/api/auth/user/update/${selectedUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(selectedUser)
      });

      const data = await response.json();
      
      if (response.ok) {
        // Kullanıcılar listesini güncelle
        const updatedUsers = users.map(user => 
          user._id === selectedUser._id ? {...user, ...data.user} : user
        );
        setUsers(updatedUsers);
        setIsEditUserModalOpen(false);
        setSelectedUser(null);
        setAlertMessage({
          type: 'success',
          text: 'Kullanıcı başarıyla güncellendi.'
        });
      } else {
        setAlertMessage({
          type: 'error',
          text: data.error || 'Kullanıcı güncellenirken bir hata oluştu.'
        });
      }
    } catch (error) {
      console.error('Kullanıcı güncelleme hatası:', error);
      setAlertMessage({
        type: 'error',
        text: 'Kullanıcı güncellenirken bir hata oluştu: ' + error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinize emin misiniz?')) return;

    try {
      setIsLoading(true);
      const response = await fetch(`http://localhost:5000/api/auth/user/delete/${userId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      
      if (response.ok) {
        // Kullanıcılar listesinden sil
        const updatedUsers = users.filter(user => user._id !== userId);
        setUsers(updatedUsers);
        setAlertMessage({
          type: 'success',
          text: 'Kullanıcı başarıyla silindi.'
        });
      } else {
        setAlertMessage({
          type: 'error',
          text: data.error || 'Kullanıcı silinirken bir hata oluştu.'
        });
      }
    } catch (error) {
      console.error('Kullanıcı silme hatası:', error);
      setAlertMessage({
        type: 'error',
        text: 'Kullanıcı silinirken bir hata oluştu: ' + error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewUser({
      ...newUser,
      [name]: value
    });
  };

  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setSelectedUser({
      ...selectedUser,
      [name]: value
    });
  };

  // Kurs işlemleri için fonksiyonlar
  const addCourse = () => {
    setIsLoading(true);
    
    // Zorunlu alanların kontrolü
    if (!newCourse.dersKodu || !newCourse.dersAdi) {
      setAlertMessage({
        type: 'danger',
        message: 'Ders kodu ve ders adı zorunlu alanlardır!'
      });
      setIsLoading(false);
      return;
    }

    // Backend'in beklediği formata dönüştür
    const courseToAdd = {
      dersKodu: newCourse.dersKodu,
      dersAdi: newCourse.dersAdi,
      donem: newCourse.donem,
      ogretmenler: newCourse.teachers || [],
      ogrenciler: newCourse.students || []
    };
    
    console.log('Eklenecek kurs:', courseToAdd);
    
    axios.post('http://localhost:5000/api/courses/add', courseToAdd)
      .then(response => {
        console.log('Kurs ekleme yanıtı:', response.data);
        // Kurslar listesini güncelle
        setCourses(prevCourses => [...prevCourses, response.data.course]);
        
        // Formu sıfırla ve modalı kapat
        setNewCourse({
          dersKodu: '',
          dersAdi: '',
          donem: '',
          teachers: [],
          students: []
        });
        setIsAddCourseModalOpen(false);
        
        // Başarı mesajı göster
        setAlertMessage({
          type: 'success',
          message: 'Kurs başarıyla eklendi!'
        });
      })
      .catch(error => {
        console.error('Kurs eklenirken hata oluştu:', error);
        setAlertMessage({
          type: 'danger',
          message: error.response?.data?.message || 'Kurs eklenirken bir hata oluştu.'
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const updateCourse = () => {
    if (!selectedCourse) return;
    
    setIsLoading(true);
    
    // Zorunlu alanların kontrolü
    if (!selectedCourse.dersKodu || !selectedCourse.dersAdi) {
      setAlertMessage({
        type: 'danger',
        message: 'Ders kodu ve ders adı zorunlu alanlardır!'
      });
      setIsLoading(false);
      return;
    }
    
    const courseId = selectedCourse._id || selectedCourse.id;

    // Backend'in beklediği formata dönüştür
    const courseToUpdate = {
      dersKodu: selectedCourse.dersKodu,
      dersAdi: selectedCourse.dersAdi,
      donem: selectedCourse.donem,
      ogretmenler: selectedCourse.ogretmenler || selectedCourse.teachers || [],
      ogrenciler: selectedCourse.ogrenciler || selectedCourse.students || []
    };
    
    console.log('Güncellenecek kurs:', courseToUpdate);
    
    axios.put(`http://localhost:5000/api/courses/update/${courseId}`, courseToUpdate)
      .then(response => {
        console.log('Kurs güncelleme yanıtı:', response.data);
        // Kurslar listesini güncelle
        setCourses(prevCourses => 
          prevCourses.map(course => 
            (course._id || course.id) === courseId ? {
              ...response.data.course,
              kod: response.data.course.dersKodu,
              ad: response.data.course.dersAdi,
              teachers: response.data.course.ogretmenler,
              students: response.data.course.ogrenciler
            } : course
          )
        );
        
        // Modalı kapat
        setIsEditCourseModalOpen(false);
        setSelectedCourse(null);
        
        // Başarı mesajı göster
        setAlertMessage({
          type: 'success',
          message: 'Kurs başarıyla güncellendi!'
        });
      })
      .catch(error => {
        console.error('Kurs güncellenirken hata oluştu:', error);
        setAlertMessage({
          type: 'danger',
          message: error.response?.data?.message || 'Kurs güncellenirken bir hata oluştu.'
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const deleteCourse = (courseId) => {
    if (!window.confirm('Bu kursu silmek istediğinizden emin misiniz?')) {
      return;
    }
    
    setIsLoading(true);
    
    axios.delete(`http://localhost:5000/api/courses/delete/${courseId}`)
      .then(response => {
        // Kurslar listesini güncelle
        setCourses(prevCourses => 
          prevCourses.filter(course => (course._id || course.id) !== courseId)
        );
        
        // Başarı mesajı göster
        setAlertMessage({
          type: 'success',
          message: 'Kurs başarıyla silindi!'
        });
      })
      .catch(error => {
        console.error('Kurs silinirken hata oluştu:', error);
        setAlertMessage({
          type: 'danger',
          message: error.response?.data?.message || 'Kurs silinirken bir hata oluştu.'
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const handleCourseInputChange = (e) => {
    const { name, value } = e.target;
    setNewCourse(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCourseEditInputChange = (e) => {
    const { name, value } = e.target;
    setSelectedCourse(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleTeacherSelection = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setNewCourse(prev => ({
      ...prev,
      teachers: selectedOptions
    }));
  };

  const handleStudentSelection = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setNewCourse(prev => ({
      ...prev,
      students: selectedOptions
    }));
  };

  const handleEditTeacherSelection = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setSelectedCourse(prev => ({
      ...prev,
      teachers: selectedOptions
    }));
  };

  const handleEditStudentSelection = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setSelectedCourse(prev => ({
      ...prev,
      students: selectedOptions
    }));
  };

  const renderDashboard = () => (
    <div>
      <h2 className="title is-4">Sistem İstatistikleri</h2>
      <div className="columns is-multiline">
        <div className="column is-6">
          <div className="box">
            <h3 className="title is-5">Kullanıcılar</h3>
            <p className="subtitle">{users.length} kayıtlı kullanıcı</p>
            <div className="tags">
              <span className="tag is-primary">
                {users.filter(u => u.role === 'admin').length} Admin
              </span>
              <span className="tag is-info">
                {users.filter(u => u.role === 'teacher').length} Öğretmen
              </span>
              <span className="tag is-success">
                {users.filter(u => u.role === 'student').length} Öğrenci
              </span>
            </div>
          </div>
        </div>
        <div className="column is-6">
          <div className="box">
            <h3 className="title is-5">Dersler</h3>
            <p className="subtitle">{courses.length} aktif ders</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUserManagement = () => (
    <div>
      <h2 className="title is-4">Kullanıcı Yönetimi</h2>
      <Button 
        color="primary" 
        icon="fa-plus" 
        className="mb-4"
        onClick={() => setIsAddUserModalOpen(true)}
      >
        Yeni Kullanıcı Ekle
      </Button>
      
      <div className="table-container">
        <table className="table is-fullwidth is-striped">
          <thead>
            <tr>
              <th>ID</th>
              <th>Ad</th>
              <th>Soyad</th>
              <th>E-posta</th>
              <th>Rol</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id || user._id}>
                <td>{user.id || user._id}</td>
                <td>{user.ad}</td>
                <td>{user.soyad}</td>
                <td>{user.mail}</td>
                <td>
                  <span className={`tag ${
                    user.role === 'admin' ? 'is-primary' : 
                    user.role === 'teacher' ? 'is-info' : 
                    'is-success'
                  }`}>
                    {user.role === 'admin' ? 'Admin' : 
                     user.role === 'teacher' ? 'Öğretmen' : 
                     'Öğrenci'}
                  </span>
                </td>
                <td>
                  <div className="buttons are-small">
                    <Button 
                      color="info" 
                      icon="fa-edit"
                      onClick={() => {
                        setSelectedUser(user);
                        setIsEditUserModalOpen(true);
                      }}
                    >
                      Düzenle
                    </Button>
                    <Button 
                      color="danger" 
                      icon="fa-trash"
                      onClick={() => deleteUser(user._id || user.id)}
                    >
                      Sil
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Kullanıcı Ekleme Modal */}
      <div className={`modal ${isAddUserModalOpen ? 'is-active' : ''}`}>
        <div className="modal-background" onClick={() => setIsAddUserModalOpen(false)}></div>
        <div className="modal-card">
          <header className="modal-card-head">
            <p className="modal-card-title">Yeni Kullanıcı Ekle</p>
            <button className="delete" aria-label="close" onClick={() => setIsAddUserModalOpen(false)}></button>
          </header>
          <section className="modal-card-body">
            <div className="field">
              <label className="label">E-posta *</label>
              <div className="control">
                <input
                  className="input"
                  type="email"
                  placeholder="E-posta adresi"
                  name="mail"
                  value={newUser.mail}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            
            <div className="field">
              <label className="label">Şifre *</label>
              <div className="control">
                <input
                  className="input"
                  type="password"
                  placeholder="Şifre"
                  name="sifre"
                  value={newUser.sifre}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>
            
            <div className="columns">
              <div className="column">
                <div className="field">
                  <label className="label">Ad</label>
                  <div className="control">
                    <input
                      className="input"
                      type="text"
                      placeholder="Ad"
                      name="ad"
                      value={newUser.ad}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
              
              <div className="column">
                <div className="field">
                  <label className="label">Soyad</label>
                  <div className="control">
                    <input
                      className="input"
                      type="text"
                      placeholder="Soyad"
                      name="soyad"
                      value={newUser.soyad}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="field">
              <label className="label">Rol *</label>
              <div className="control">
                <div className="select is-fullwidth">
                  <select
                    name="role"
                    value={newUser.role}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="admin">Admin</option>
                    <option value="teacher">Öğretmen</option>
                    <option value="student">Öğrenci</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="field">
              <label className="label">Telefon</label>
              <div className="control">
                <input
                  className="input"
                  type="tel"
                  placeholder="Telefon numarası"
                  name="telno"
                  value={newUser.telno}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            {newUser.role === 'student' && (
              <div className="field">
                <label className="label">Öğrenci Numarası *</label>
                <div className="control">
                  <input
                    className="input"
                    type="text"
                    placeholder="Öğrenci numarası"
                    name="ogrno"
                    value={newUser.ogrno}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            )}
          </section>
          <footer className="modal-card-foot">
            <button className="button is-success" onClick={addUser}>Kaydet</button>
            <button className="button" onClick={() => setIsAddUserModalOpen(false)}>İptal</button>
          </footer>
        </div>
      </div>

      {/* Kullanıcı Düzenleme Modal */}
      {selectedUser && (
        <div className={`modal ${isEditUserModalOpen ? 'is-active' : ''}`}>
          <div className="modal-background" onClick={() => setIsEditUserModalOpen(false)}></div>
          <div className="modal-card">
            <header className="modal-card-head">
              <p className="modal-card-title">Kullanıcı Düzenle</p>
              <button className="delete" aria-label="close" onClick={() => setIsEditUserModalOpen(false)}></button>
            </header>
            <section className="modal-card-body">
              <div className="field">
                <label className="label">E-posta</label>
                <div className="control">
                  <input
                    className="input"
                    type="email"
                    value={selectedUser.mail}
                    disabled
                  />
                </div>
                <p className="help">E-posta değiştirilemez</p>
              </div>
              
              <div className="field">
                <label className="label">Şifre</label>
                <div className="control">
                  <input
                    className="input"
                    type="password"
                    placeholder="********"
                    name="sifre"
                    value={selectedUser.sifre || ''}
                    onChange={handleEditInputChange}
                  />
                </div>
                <p className="help">Değiştirmek istemiyorsanız boş bırakın</p>
              </div>
              
              <div className="columns">
                <div className="column">
                  <div className="field">
                    <label className="label">Ad</label>
                    <div className="control">
                      <input
                        className="input"
                        type="text"
                        name="ad"
                        value={selectedUser.ad}
                        onChange={handleEditInputChange}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="column">
                  <div className="field">
                    <label className="label">Soyad</label>
                    <div className="control">
                      <input
                        className="input"
                        type="text"
                        name="soyad"
                        value={selectedUser.soyad}
                        onChange={handleEditInputChange}
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="field">
                <label className="label">Rol</label>
                <div className="control">
                  <div className="select is-fullwidth">
                    <select
                      name="role"
                      value={selectedUser.role}
                      onChange={handleEditInputChange}
                    >
                      <option value="admin">Admin</option>
                      <option value="teacher">Öğretmen</option>
                      <option value="student">Öğrenci</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="field">
                <label className="label">Telefon</label>
                <div className="control">
                  <input
                    className="input"
                    type="tel"
                    name="telno"
                    value={selectedUser.telno || ''}
                    onChange={handleEditInputChange}
                  />
                </div>
              </div>
              
              {selectedUser.role === 'student' && (
                <div className="field">
                  <label className="label">Öğrenci Numarası</label>
                  <div className="control">
                    <input
                      className="input"
                      type="text"
                      name="ogrno"
                      value={selectedUser.ogrno || ''}
                      onChange={handleEditInputChange}
                    />
                  </div>
                </div>
              )}
            </section>
            <footer className="modal-card-foot">
              <button className="button is-success" onClick={updateUser}>Güncelle</button>
              <button className="button" onClick={() => setIsEditUserModalOpen(false)}>İptal</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );

  const renderCourseManagement = () => (
    <div>
      <h2 className="title is-4">Ders Yönetimi</h2>
      <Button 
        color="primary" 
        icon="fa-plus" 
        className="mb-4"
        onClick={() => setIsAddCourseModalOpen(true)}
      >
        Yeni Ders Ekle
      </Button>
      
      <div className="table-container">
        <table className="table is-fullwidth is-striped">
          <thead>
            <tr>
              <th>Ders Kodu</th>
              <th>Ders Adı</th>
              <th>Dönem</th>
              <th>Öğretmenler</th>
              <th>Öğrenci Sayısı</th>
              <th>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {courses.map(course => (
              <tr key={course.id || course._id}>
                <td>{course.kod || course.dersKodu}</td>
                <td>{course.ad || course.dersAdi}</td>
                <td>{course.donem}</td>
                <td>
                  {(course.ogretmenler || course.teachers) && Array.isArray(course.ogretmenler || course.teachers) 
                    ? (course.ogretmenler || course.teachers).map(teacherId => {
                        const teacher = users.find(u => (u._id || u.id) === teacherId);
                        return teacher ? `${teacher.ad} ${teacher.soyad}` : teacherId;
                      }).join(', ')
                    : 'Atanmamış'
                  }
                </td>
                <td>
                  {(course.ogrenciler || course.students) && Array.isArray(course.ogrenciler || course.students) 
                    ? (course.ogrenciler || course.students).length
                    : 0
                  }
                </td>
                <td>
                  <div className="buttons are-small">
                    <Button 
                      color="info" 
                      icon="fa-edit"
                      onClick={() => {
                        setSelectedCourse({
                          ...course,
                          dersKodu: course.kod || course.dersKodu,
                          dersAdi: course.ad || course.dersAdi,
                          ogretmenler: course.ogretmenler || course.teachers || [],
                          ogrenciler: course.ogrenciler || course.students || []
                        });
                        setIsEditCourseModalOpen(true);
                      }}
                    >
                      Düzenle
                    </Button>
                    <Button 
                      color="danger" 
                      icon="fa-trash"
                      onClick={() => deleteCourse(course._id || course.id)}
                    >
                      Sil
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Ders Ekleme Modal */}
      <div className={`modal ${isAddCourseModalOpen ? 'is-active' : ''}`}>
        <div className="modal-background" onClick={() => setIsAddCourseModalOpen(false)}></div>
        <div className="modal-card">
          <header className="modal-card-head">
            <p className="modal-card-title">Yeni Ders Ekle</p>
            <button className="delete" aria-label="close" onClick={() => setIsAddCourseModalOpen(false)}></button>
          </header>
          <section className="modal-card-body">
            <div className="field">
              <label className="label">Ders Kodu *</label>
              <div className="control">
                <input
                  className="input"
                  type="text"
                  placeholder="CSE101"
                  name="dersKodu"
                  value={newCourse.dersKodu}
                  onChange={handleCourseInputChange}
                  required
                />
              </div>
            </div>
            
            <div className="field">
              <label className="label">Ders Adı *</label>
              <div className="control">
                <input
                  className="input"
                  type="text"
                  placeholder="Bilgisayar Mühendisliğine Giriş"
                  name="dersAdi"
                  value={newCourse.dersAdi}
                  onChange={handleCourseInputChange}
                  required
                />
              </div>
            </div>
            
            <div className="field">
              <label className="label">Dönem</label>
              <div className="control">
                <input
                  className="input"
                  type="text"
                  placeholder="2023-2024 Bahar"
                  name="donem"
                  value={newCourse.donem}
                  onChange={handleCourseInputChange}
                />
              </div>
            </div>
            
            <div className="field">
              <label className="label">Öğretmenler</label>
              <div className="control">
                <div className="select is-multiple is-fullwidth">
                  <select
                    multiple
                    size="3"
                    onChange={handleTeacherSelection}
                  >
                    {availableTeachers.map(teacher => (
                      <option key={teacher._id || teacher.id} value={teacher._id || teacher.id}>
                        {teacher.ad} {teacher.soyad} ({teacher.mail})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="help">Birden fazla seçim için CTRL tuşunu basılı tutun</p>
            </div>
            
            <div className="field">
              <label className="label">Öğrenciler</label>
              <div className="control">
                <div className="select is-multiple is-fullwidth">
                  <select
                    multiple
                    size="5"
                    onChange={handleStudentSelection}
                  >
                    {availableStudents.map(student => (
                      <option key={student._id || student.id} value={student._id || student.id}>
                        {student.ad} {student.soyad} ({student.ogrno || 'No bilgisi yok'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="help">Birden fazla seçim için CTRL tuşunu basılı tutun</p>
            </div>
          </section>
          <footer className="modal-card-foot">
            <button className="button is-success" onClick={addCourse}>Kaydet</button>
            <button className="button" onClick={() => setIsAddCourseModalOpen(false)}>İptal</button>
          </footer>
        </div>
      </div>
      
      {/* Ders Düzenleme Modal */}
      {selectedCourse && (
        <div className={`modal ${isEditCourseModalOpen ? 'is-active' : ''}`}>
          <div className="modal-background" onClick={() => setIsEditCourseModalOpen(false)}></div>
          <div className="modal-card">
            <header className="modal-card-head">
              <p className="modal-card-title">Ders Düzenle</p>
              <button className="delete" aria-label="close" onClick={() => setIsEditCourseModalOpen(false)}></button>
            </header>
            <section className="modal-card-body">
              <div className="field">
                <label className="label">Ders Kodu *</label>
                <div className="control">
                  <input
                    className="input"
                    type="text"
                    name="dersKodu"
                    value={selectedCourse.dersKodu}
                    onChange={handleCourseEditInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="field">
                <label className="label">Ders Adı *</label>
                <div className="control">
                  <input
                    className="input"
                    type="text"
                    name="dersAdi"
                    value={selectedCourse.dersAdi}
                    onChange={handleCourseEditInputChange}
                    required
                  />
                </div>
              </div>
              
              <div className="field">
                <label className="label">Dönem</label>
                <div className="control">
                  <input
                    className="input"
                    type="text"
                    name="donem"
                    value={selectedCourse.donem || ''}
                    onChange={handleCourseEditInputChange}
                  />
                </div>
              </div>
              
              <div className="field">
                <label className="label">Öğretmenler</label>
                <div className="control">
                  <div className="select is-multiple is-fullwidth">
                    <select
                      multiple
                      size="3"
                      value={selectedCourse.teachers || []}
                      onChange={handleEditTeacherSelection}
                    >
                      {availableTeachers.map(teacher => (
                        <option key={teacher._id || teacher.id} value={teacher._id || teacher.id}>
                          {teacher.ad} {teacher.soyad} ({teacher.mail})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="help">Birden fazla seçim için CTRL tuşunu basılı tutun</p>
              </div>
              
              <div className="field">
                <label className="label">Öğrenciler</label>
                <div className="control">
                  <div className="select is-multiple is-fullwidth">
                    <select
                      multiple
                      size="5"
                      value={selectedCourse.students || []}
                      onChange={handleEditStudentSelection}
                    >
                      {availableStudents.map(student => (
                        <option key={student._id || student.id} value={student._id || student.id}>
                          {student.ad} {student.soyad} ({student.ogrno || 'No bilgisi yok'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="help">Birden fazla seçim için CTRL tuşunu basılı tutun</p>
              </div>
            </section>
            <footer className="modal-card-foot">
              <button className="button is-success" onClick={updateCourse}>Güncelle</button>
              <button className="button" onClick={() => setIsEditCourseModalOpen(false)}>İptal</button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );

  const renderFaceDataManagement = () => (
    <div>
      <h2 className="title is-4">Öğrenci Yüz Verisi Yönetimi</h2>
      <StudentDataCollection />
    </div>
  );

  return (
    <div className="container mt-4">
      <h1 className="title">Admin Paneli</h1>
      <p className="subtitle">Hoş geldiniz, {currentUser?.ad} {currentUser?.soyad}</p>

      {error && (
        <Alert type="danger" message={error} onClose={() => setError('')} />
      )}

      <div className="tabs">
        <ul>
          <li className={activeTab === 'dashboard' ? 'is-active' : ''}>
            <a onClick={() => handleTabChange('dashboard')}>
              <span className="icon"><i className="fas fa-tachometer-alt"></i></span>
              <span>Dashboard</span>
            </a>
          </li>
          <li className={activeTab === 'users' ? 'is-active' : ''}>
            <a onClick={() => handleTabChange('users')}>
              <span className="icon"><i className="fas fa-users"></i></span>
              <span>Kullanıcılar</span>
            </a>
          </li>
          <li className={activeTab === 'courses' ? 'is-active' : ''}>
            <a onClick={() => handleTabChange('courses')}>
              <span className="icon"><i className="fas fa-book"></i></span>
              <span>Dersler</span>
            </a>
          </li>
          <li className={activeTab === 'face_data' ? 'is-active' : ''}>
            <a onClick={() => handleTabChange('face_data')}>
              <span className="icon"><i className="fas fa-camera"></i></span>
              <span>Yüz Verileri</span>
            </a>
          </li>
          <li className={activeTab === 'settings' ? 'is-active' : ''}>
            <a onClick={() => handleTabChange('settings')}>
              <span className="icon"><i className="fas fa-cog"></i></span>
              <span>Ayarlar</span>
            </a>
          </li>
        </ul>
      </div>

      <div className="tab-content">
        {isLoading ? (
          <div className="has-text-centered p-5">
            <span className="icon is-large">
              <i className="fas fa-spinner fa-pulse fa-2x"></i>
            </span>
            <p>Yükleniyor...</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'users' && renderUserManagement()}
            {activeTab === 'courses' && renderCourseManagement()}
            {activeTab === 'face_data' && renderFaceDataManagement()}
            {activeTab === 'settings' && (
              <div>
                <h2 className="title is-4">Sistem Ayarları</h2>
                <p>Bu bölüm şu anda geliştirme aşamasındadır.</p>
              </div>
            )}
          </>
        )}
      </div>

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

export default memo(AdminPanel); 