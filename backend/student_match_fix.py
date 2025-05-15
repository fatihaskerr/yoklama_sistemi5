from pymongo import MongoClient
from dotenv import load_dotenv
import os
import pprint

# .env dosyasını yükle
load_dotenv()

# MongoDB bağlantısı
mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/yoklama_sistemi')
client = MongoClient(mongo_uri)
db = client.get_database()

def check_student_data():
    """
    Öğrenci verileri ve kullanıcı verileri arasındaki eşleşmeyi kontrol eder
    ve sonuçları gösterir
    """
    print("Öğrenci veri kontrolü başlatılıyor...")
    
    # Tüm öğrencileri çek (yüz verisi olanlar)
    students_with_face_data = list(db.ogrenciler.find({"encoding": {"$exists": True}}))
    print(f"Yüz verisi olan öğrenci sayısı: {len(students_with_face_data)}")
    
    # Kullanıcı tablosundaki tüm öğrencileri getir
    users_students = list(db.users.find({"role": "student"}))
    print(f"Kullanıcı tablosundaki öğrenci sayısı: {len(users_students)}")
    
    # Her iki tabloda eşleşen öğrencileri bul
    matched_students = []
    unmatched_faces = []
    users_without_face = []
    
    # Yüz verisi olan öğrencileri kullanıcılar ile eşleştir
    for face_student in students_with_face_data:
        ogrenci_id = face_student.get("ogrenci_id")
        matching_user = None
        
        # Kullanıcılar tablosunda bu öğrenci numarası ile eşleşen var mı?
        for user in users_students:
            if user.get("ogrno") == ogrenci_id:
                matching_user = user
                matched_students.append({
                    "ogrenci_id": ogrenci_id,
                    "user_id": str(user.get("_id")),
                    "mail": user.get("mail"),
                    "ad": face_student.get("ad") or user.get("ad"),
                    "soyad": face_student.get("soyad") or user.get("soyad")
                })
                break
                
        if not matching_user:
            unmatched_faces.append({
                "ogrenci_id": ogrenci_id,
                "ad": face_student.get("ad", ""),
                "soyad": face_student.get("soyad", "")
            })
    
    # Yüz verisi olmayan kullanıcıları bul
    for user in users_students:
        ogrno = user.get("ogrno")
        if not ogrno:
            print(f"UYARI: Öğrenci kullanıcısının öğrenci numarası yok: {user.get('mail')}")
            continue
            
        # Bu öğrenci numarası ile yüz verisi var mı?
        has_face = any(face.get("ogrenci_id") == ogrno for face in students_with_face_data)
        
        if not has_face:
            users_without_face.append({
                "mail": user.get("mail"),
                "ogrno": ogrno,
                "ad": user.get("ad", ""),
                "soyad": user.get("soyad", "")
            })
    
    # Sonuçları göster
    print("\n===== EŞLEŞTİRME SONUÇLARI =====")
    print(f"Eşleşen öğrenci sayısı: {len(matched_students)}")
    print(f"Eşleşmeyen yüz verisi sayısı: {len(unmatched_faces)}")
    print(f"Yüz verisi olmayan öğrenci sayısı: {len(users_without_face)}")
    
    # Eşleşmeyen yüz verilerini göster
    if unmatched_faces:
        print("\n----- EŞLEŞTİRİLEMEYEN YÜZ VERİLERİ -----")
        for face in unmatched_faces:
            print(f"Öğrenci No: {face['ogrenci_id']}, Ad-Soyad: {face['ad']} {face['soyad']}")
    
    # Yüz verisi olmayan öğrencileri göster
    if users_without_face:
        print("\n----- YÜZ VERİSİ OLMAYAN ÖĞRENCİLER -----")
        for user in users_without_face:
            print(f"Öğrenci No: {user['ogrno']}, E-posta: {user['mail']}, Ad-Soyad: {user['ad']} {user['soyad']}")
            
    return matched_students, unmatched_faces, users_without_face

def check_course_attendance():
    """
    Ders yoklama kayıtları ve öğrenci eşleşmelerini kontrol eder
    """
    print("\n===== DERS YOKLAMA KONTROLÜ =====")
    
    # Tüm aktif dersleri getir
    all_courses = list(db.attendance.find())
    print(f"Toplam ders yoklama kaydı: {len(all_courses)}")
    
    course_issues = []
    
    for course in all_courses:
        course_id = course.get("_id")
        ders_kodu = course.get("dersKodu", "")
        
        # Derse kayıtlı öğrenciler
        students = course.get("tumOgrenciler", [])
        
        # Katılan öğrenciler
        participants = course.get("katilanlar", [])
        
        # Bu derse kayıtlı öğrencilerin yüz verisi var mı?
        face_data_count = 0
        for student_id in students:
            face_data = db.ogrenciler.find_one({
                "ogrenci_id": student_id,
                "encoding": {"$exists": True}
            })
            if face_data:
                face_data_count += 1
        
        # Sonuçları ekle
        course_summary = {
            "course_id": str(course_id),
            "ders_kodu": ders_kodu,
            "ders_adi": course.get("dersAdi", ""),
            "ogrenci_sayisi": len(students),
            "katilan_sayisi": len(participants),
            "yuz_verisi_olan": face_data_count
        }
        
        # Yüz verisi olmayan öğrenciler varsa, bu derste sorun var
        if face_data_count < len(students):
            course_issues.append(course_summary)
        
    # Sorunlu dersleri göster
    if course_issues:
        print(f"\nYüz verisi eksik olan {len(course_issues)} ders var:")
        for issue in course_issues:
            print(f"Ders: {issue['ders_kodu']} - {issue['ders_adi']}")
            print(f"  Toplam Öğrenci: {issue['ogrenci_sayisi']}, Yüz Verisi Olan: {issue['yuz_verisi_olan']}, Katılanlar: {issue['katilan_sayisi']}")
    else:
        print("Tüm derslerdeki öğrencilerin yüz verileri tam!")

def fix_student_data():
    """
    Eşleşmeyen öğrenci verilerini düzeltir - KULLANIM DİKKAT GEREKTİRİR
    """
    print("\n===== ÖĞRENCİ VERİ DÜZELTME =====")
    print("Bu işlem yalnızca test amaçlıdır ve veri kaybına yol açabilir.")
    
    confirmation = input("Öğrenci verilerini düzeltmek istediğinize emin misiniz? (evet/hayır): ")
    if confirmation.lower() != 'evet':
        print("İşlem iptal edildi.")
        return
    
    # Kullanıcı tablosundaki öğrencileri getir
    users_students = list(db.users.find({"role": "student"}))
    
    for user in users_students:
        ogrno = user.get("ogrno")
        if not ogrno:
            continue
            
        # Öğrenci koleksiyonunda bu numaraya ait kayıt var mı?
        student_record = db.ogrenciler.find_one({"ogrenci_id": ogrno})
        
        if not student_record:
            # Kayıt yoksa yeni oluştur
            print(f"Öğrenci {ogrno} için kayıt oluşturuluyor...")
            db.ogrenciler.insert_one({
                "ogrenci_id": ogrno,
                "ad": user.get("ad", ""),
                "soyad": user.get("soyad", "")
            })
        else:
            # Kayıt varsa güncelle
            if not student_record.get("ad") and user.get("ad"):
                print(f"Öğrenci {ogrno} adı ekleniyor: {user.get('ad')}")
                db.ogrenciler.update_one(
                    {"ogrenci_id": ogrno},
                    {"$set": {"ad": user.get("ad")}}
                )
                
            if not student_record.get("soyad") and user.get("soyad"):
                print(f"Öğrenci {ogrno} soyadı ekleniyor: {user.get('soyad')}")
                db.ogrenciler.update_one(
                    {"ogrenci_id": ogrno},
                    {"$set": {"soyad": user.get("soyad")}}
                )
    
    print("Öğrenci verileri güncellendi.")

def main():
    print("===== ÖĞRENCİ VERİ KONTROL ARACI =====")
    print("Bu araç, öğrenci verileri ve yüz tanıma verilerini kontrol eder.\n")
    
    # Öğrenci verilerini kontrol et
    matched, unmatched, missing = check_student_data()
    
    # Ders yoklama kayıtlarını kontrol et
    check_course_attendance()
    
    # Düzeltme seçeneği
    if unmatched or missing:
        print("\n===== DÜZELTME SEÇENEKLERİ =====")
        print("1. Öğrenci verilerini düzelt")
        print("2. Çıkış")
        
        choice = input("Seçiminiz (1-2): ")
        
        if choice == "1":
            fix_student_data()
    
    print("\nİşlem tamamlandı.")

if __name__ == "__main__":
    main() 