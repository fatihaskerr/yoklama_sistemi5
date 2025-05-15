from pymongo import MongoClient
from dotenv import load_dotenv
import os
from pprint import pprint

# .env dosyasını yükle
load_dotenv()

# MongoDB bağlantısı
mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/yoklama_sistemi')
client = MongoClient(mongo_uri)
db = client.get_database()

def check_user_by_email(email):
    """Belirli bir e-posta adresine sahip kullanıcının detaylarını kontrol eder"""
    user = db.users.find_one({"mail": email})
    if not user:
        print(f"'{email}' e-posta adresine sahip kullanıcı bulunamadı.")
        return
    
    print(f"\n===== KULLANICI BİLGİLERİ: {email} =====")
    # _id'yi hariç tutarak kullanıcı bilgilerini göster
    user_info = {k: v for k, v in user.items() if k != '_id'}
    pprint(user_info)
    
    # Öğrenci numarası varsa, yüz verisi kayıtlarını kontrol et
    if user.get("ogrno"):
        student_data = db.ogrenciler.find_one({"ogrenci_id": user["ogrno"]})
        print(f"\n===== ÖĞRENCİ VERİSİ KONTROLÜ: #{user['ogrno']} =====")
        if student_data:
            has_face_encoding = "encoding" in student_data
            print(f"Öğrenci verisi bulundu: {len(student_data)}")
            print(f"Yüz verisi mevcut: {'Evet' if has_face_encoding else 'Hayır'}")
            if has_face_encoding:
                print(f"Fotoğraf sayısı: {len(student_data.get('foto_galerisi', []))}")
        else:
            print(f"Öğrenci numarası '{user['ogrno']}' için öğrenci verisi bulunamadı.")
    else:
        print("\nBu kullanıcıya ait öğrenci numarası bulunmuyor.")

def find_user_by_name(name):
    """İsim veya soyisim içeren kullanıcıları bulur"""
    name_parts = name.lower().split()
    users = []
    
    # İsim veya soyisimin herhangi birini içeren kullanıcıları bul
    for part in name_parts:
        name_query = {"$or": [
            {"ad": {"$regex": part, "$options": "i"}},
            {"soyad": {"$regex": part, "$options": "i"}}
        ]}
        found_users = list(db.users.find(name_query, {"_id": 0, "mail": 1, "ad": 1, "soyad": 1, "ogrno": 1, "role": 1}))
        users.extend(found_users)
    
    # Yinelenen kullanıcıları kaldır
    unique_emails = set()
    unique_users = []
    for user in users:
        if user["mail"] not in unique_emails:
            unique_emails.add(user["mail"])
            unique_users.append(user)
    
    if not unique_users:
        print(f"'{name}' ismi için kullanıcı bulunamadı.")
        return
    
    print(f"\n===== '{name}' İSMİ İÇİN BULUNAN KULLANICILAR =====")
    for i, user in enumerate(unique_users, 1):
        name_text = f"{user.get('ad', '')} {user.get('soyad', '')}".strip()
        role_text = user.get('role', '')
        ogrno_text = f"#{user.get('ogrno', '')}" if user.get('ogrno') else ''
        print(f"{i}. {name_text} ({role_text}) {ogrno_text} - {user.get('mail', '')}")

def check_student_number(student_number):
    """Belirli bir öğrenci numarasına ait kayıtları kontrol eder"""
    # users tablosunda öğrenci numarası kontrolü
    user = db.users.find_one({"ogrno": student_number})
    
    print(f"\n===== ÖĞRENCİ NUMARASI KONTROLÜ: #{student_number} =====")
    
    if user:
        name = f"{user.get('ad', '')} {user.get('soyad', '')}".strip()
        print(f"Kullanıcı bulundu: {name} ({user.get('mail', '')})")
        
        # Rol kontrolü
        role = user.get('role', '')
        if role != 'student':
            print(f"DİKKAT: Bu kullanıcının rolü 'student' değil: '{role}'")
    else:
        print(f"Bu öğrenci numarasına sahip kullanıcı bulunamadı.")
    
    # ogrenciler tablosunda öğrenci verisi kontrolü
    student_data = db.ogrenciler.find_one({"ogrenci_id": student_number})
    
    if student_data:
        has_face_encoding = "encoding" in student_data
        print(f"\nÖğrenci verisi bulundu")
        print(f"Yüz verisi mevcut: {'Evet' if has_face_encoding else 'Hayır'}")
        if has_face_encoding:
            print(f"Fotoğraf sayısı: {len(student_data.get('foto_galerisi', []))}")
    else:
        print(f"\nÖğrenci numarası için kayıtlı veri bulunamadı.")

def list_face_data():
    """Yüz verisi olan tüm öğrencileri listeler"""
    face_data = list(db.ogrenciler.find({"encoding": {"$exists": True}}, 
                                       {"_id": 0, "ogrenci_id": 1, "ad": 1, "soyad": 1}))
    
    print("\n===== YÜZ VERİSİ OLAN ÖĞRENCİLER =====")
    if not face_data:
        print("Sistemde yüz verisi olan öğrenci bulunamadı.")
        return
    
    print(f"Toplam {len(face_data)} öğrenci yüz verisi bulundu:")
    for i, student in enumerate(face_data, 1):
        student_id = student.get("ogrenci_id", "")
        name = f"{student.get('ad', '')} {student.get('soyad', '')}".strip()
        if not name:
            # İsim yoksa users tablosundan bul
            user = db.users.find_one({"ogrno": student_id})
            if user:
                name = f"{user.get('ad', '')} {user.get('soyad', '')}".strip()
        
        print(f"{i}. {name or 'İsimsiz'} (#{student_id})")

def main():
    print("===== VERİTABANI KONTROL ARACI =====")
    print("Bu araç, kullanıcı ve öğrenci verilerini kontrol etmenize yardımcı olur.\n")
    
    while True:
        print("\n===== İŞLEMLER =====")
        print("1. E-posta ile kullanıcı kontrolü")
        print("2. İsim ile kullanıcı arama")
        print("3. Öğrenci numarası kontrolü")
        print("4. Yüz verisi olan öğrencileri listele")
        print("5. Çıkış")
        
        choice = input("\nSeçiminiz (1-5): ")
        
        if choice == "1":
            email = input("E-posta adresi: ")
            check_user_by_email(email)
            
        elif choice == "2":
            name = input("İsim veya soyisim: ")
            find_user_by_name(name)
            
        elif choice == "3":
            student_number = input("Öğrenci numarası: ")
            check_student_number(student_number)
            
        elif choice == "4":
            list_face_data()
            
        elif choice == "5":
            break
            
        else:
            print("Geçersiz seçim. Lütfen tekrar deneyin.")
    
    print("\nProgram sonlandırıldı.")

if __name__ == "__main__":
    main() 