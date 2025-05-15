from flask import Flask
from pymongo import MongoClient
from dotenv import load_dotenv
import os

# .env dosyasını yükle
load_dotenv()

# MongoDB bağlantısı
mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/yoklama_sistemi')
client = MongoClient(mongo_uri)
db = client.get_database()

def standardize_roles():
    """
    Veritabanındaki kullanıcı rollerini standartlaştırır.
    'ogretmen' -> 'teacher'
    'ogrenci' -> 'student'
    """
    print("Rol standardizasyonu başlatılıyor...")
    
    # Öğretmen rolünü güncelle
    teacher_result = db.users.update_many(
        {"role": "ogretmen"},
        {"$set": {"role": "teacher"}}
    )
    
    # Öğrenci rolünü güncelle
    student_result = db.users.update_many(
        {"role": "ogrenci"},
        {"$set": {"role": "student"}}
    )
    
    print(f"Toplam {teacher_result.modified_count} öğretmen kaydı güncellendi.")
    print(f"Toplam {student_result.modified_count} öğrenci kaydı güncellendi.")

if __name__ == "__main__":
    standardize_roles()
    print("İşlem tamamlandı.") 