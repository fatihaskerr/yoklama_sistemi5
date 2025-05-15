# Yoklama Sistemi Backend Kurulum Talimatları

Bu belge, Yoklama Sistemi backend uygulamasının kurulumu için adım adım talimatları içerir.

## Gereksinimler

- Python 3.8 veya üzeri
- MongoDB (yerel veya uzak)
- Kamera erişimi (Yüz tanıma için)

## Kurulum Adımları

### 1. Sanal Ortam Oluşturma

```bash
# Windows için
python -m venv venv
venv\Scripts\activate

# Linux/Mac için
python -m venv venv
source venv/bin/activate
```

### 2. Bağımlılıkları Yükleme

```bash
pip install -r requirements.txt
```

### 3. .env Dosyası Oluşturma

`.env.example` dosyasını `.env` olarak kopyalayın ve düzenleyin:

```bash
cp .env.example .env
```

`.env` dosyasını kendi ortamınıza göre düzenleyin:

```
MONGO_URI=mongodb://localhost:27017/yoklama_sistemi
JWT_SECRET_KEY=sizin_gizli_anahtarınız
FLASK_DEBUG=True
```

### 4. Rol Standardizasyonu

Veritabanındaki kullanıcı rollerini standartlaştırmak için aşağıdaki komutu çalıştırın:

```bash
python fix_roles.py
```

### 5. Uygulamayı Çalıştırma

```bash
python run.py
```

Uygulama varsayılan olarak http://localhost:5000 adresinde çalışacaktır.

## Sorun Giderme

### Kamera Sorunu

Kamera erişim sorunları için:

```bash
python camera_test.py
```

### Öğrenci Verisi Sorunu

Öğrenci verileri ile ilgili sorunlar için:

```bash
python check_student_number.py
```

### Rol Standardizasyonu Sorunu

Kullanıcı rolleri ile ilgili sorunlar için:

```bash
python fix_roles.py
```

## API Endpointleri

Temel API endpointleri:

- `/api/auth/login` - Giriş
- `/api/auth/users` - Kullanıcıları listeleme (Admin)
- `/api/courses/` - Ders yönetimi
- `/api/face-attendance/` - Yüz tanıma ile yoklama
- `/api/veri-topla/` - Öğrenci yüz verisi toplama

Daha fazla detay için API dokümantasyonuna bakın. 