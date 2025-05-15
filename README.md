# e-Yoklama Sistemi

Bu proje, eğitim kurumları için geliştirilmiş modern bir yoklama takip sistemidir. Yüz tanıma teknolojisi kullanarak öğrenci katılımını doğrular ve takip eder.

## Özellikler

- **Çift faktörlü doğrulama**: Yüz tanıma teknolojisi ile güvenli yoklama alma
- **Öğretmen Paneli**: Yoklama başlatma, izleme ve raporlama
- **Öğrenci Paneli**: Aktif dersleri görüntüleme ve yoklamaya katılma
- **Devamsızlık takibi**: Öğrencilerin devam durumunu izleme
- **Veri toplama arayüzü**: Öğrenci yüz verilerini kaydetme ve yönetme

## Kullanılan Teknolojiler

### Frontend
- React.js
- Bulma CSS Framework
- HTML2PDF (Raporlama)

### Backend
- Flask (Python web framework)
- MongoDB (Veritabanı)
- OpenCV ve face_recognition (Yüz tanıma)

## Başlangıç

### Gereksinimler
- Node.js (v14.0.0 veya üstü)
- Python 3.8 veya üstü
- MongoDB

### Kurulum

1. Projeyi klonlayın
```bash
git clone https://github.com/kullanici/yoklama_sistemi.git
cd yoklama_sistemi
```

2. Frontend bağımlılıklarını yükleyin
```bash
npm install
```

3. Backend için sanal ortam oluşturun ve bağımlılıkları yükleyin
```bash
cd backend
python -m venv venv
# Windows için
venv\Scripts\activate
# Linux/Mac için
source venv/bin/activate
pip install -r requirements.txt
```

4. MongoDB bağlantısını yapılandırın
`.env` dosyasını backend klasörüne oluşturun ve MongoDB URI'nizi ekleyin:
```
MONGO_URI=mongodb://localhost:27017/yoklama_sistemi
```

### Çalıştırma

1. Backend sunucusunu başlatın
```bash
cd backend
python run.py
```

2. Frontend geliştirme sunucusunu başlatın
```bash
npm run dev
```

## Kullanım Kılavuzu

### Öğretmen Paneli
1. Öğretmen hesabınızla giriş yapın
2. Yoklama başlatmak için bir ders seçin ve "Yoklama Başlat" düğmesine tıklayın
3. Yoklama detaylarını görüntülemek için "Yoklama Listesi" düğmesine tıklayın
4. Yoklamayı bitirmek için "Yoklama Bitir" düğmesine tıklayın
5. Veri toplama sekmesine geçerek öğrenci yüz verilerini yönetin

### Öğrenci Paneli
1. Öğrenci hesabınızla giriş yapın
2. Aktif derslerinizi görüntüleyin
3. Bir derse katılmak için "Derse Katıl" düğmesine tıklayın
4. Yüz tanıma doğrulamasını tamamlayın
5. Devamsızlık takibinizi görüntülemek için "Devamsızlık Takibi" düğmesine tıklayın

## Katkıda Bulunma

Katkılarınızı memnuniyetle karşılıyoruz! Lütfen bir pull request göndermeden önce değişikliklerinizi tartışmak için bir konu açın.

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır - ayrıntılar için [LICENSE](LICENSE) dosyasına bakın.
