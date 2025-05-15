from app.utils.db import get_db

# Veritabanı bağlantısı al
db = get_db()

# Test kullanıcıları
test_users = [
    {
        "mail": "admin@test.com",
        "sifre": "123456",
        "ad": "Admin",
        "soyad": "User",
        "role": "admin",
        "telno": "+905555555555"
    },
    {
        "mail": "teacher@test.com",
        "sifre": "123456",
        "ad": "Öğretmen",
        "soyad": "User",
        "role": "teacher",
        "telno": "+905555555556"
    },
    {
        "mail": "student@test.com",
        "sifre": "123456",
        "ad": "Öğrenci",
        "soyad": "User",
        "role": "student",
        "ogrno": "12345678",
        "telno": "+905555555557"
    }
]

# Her bir kullanıcıyı veritabanına ekle
for user in test_users:
    # E-posta adresine göre kullanıcıyı kontrol et
    existing_user = db.users.find_one({"mail": user["mail"]})
    
    if existing_user:
        print(f"Kullanıcı zaten var: {user['mail']}")
    else:
        result = db.users.insert_one(user)
        print(f"Kullanıcı eklendi: {user['mail']}, ID: {result.inserted_id}")

print("İşlem tamamlandı.") 