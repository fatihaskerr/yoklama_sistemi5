from pymongo import MongoClient
from dotenv import load_dotenv
import os
import cv2
import face_recognition
import numpy as np
import time

# .env dosyasını yükle
load_dotenv()

# MongoDB bağlantısı
mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017/yoklama_sistemi')
client = MongoClient(mongo_uri)
db = client.get_database()

def collect_face_data(student_id, student_name):
    """
    Belirli bir öğrenci için yüz verisi toplar.
    Manuel olarak tek bir çağrı ile hızlı toplama sağlar.
    """
    print(f"\n===== {student_name} İÇİN YÜZ VERİSİ TOPLANIYOR =====")
    print("Lütfen yüzünüzü kameraya gösterin. Kamera açılacak ve 5 fotoğraf çekilecek.")
    input("Hazır olduğunuzda Enter'a basın...")
    
    # Dataset dizini kontrolü
    base_dir = "dataset"
    if not os.path.exists(base_dir):
        os.makedirs(base_dir)
        
    student_dir = os.path.join(base_dir, student_id)
    if not os.path.exists(student_dir):
        os.makedirs(student_dir)
    
    # Kamerayı başlat
    camera = cv2.VideoCapture(0)
    if not camera.isOpened():
        print("Kamera açılamadı. Lütfen kamera bağlantınızı kontrol edin.")
        return False
    
    photo_count = 0
    max_photos = 5
    face_encodings = []
    photo_paths = []
    
    time.sleep(1)  # Kameranın hazırlanması için bekle
    
    print("\nYüz verileri toplanıyor...")
    while photo_count < max_photos:
        ret, frame = camera.read()
        if not ret:
            print("Kamera görüntüsü alınamadı.")
            break
        
        # Görüntüyü RGB'ye dönüştür
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Yüz konumlarını bul
        face_locations = face_recognition.face_locations(rgb_frame)
        
        if face_locations:
            # İlk yüzü kullan
            current_encodings = face_recognition.face_encodings(rgb_frame, face_locations)
            
            if current_encodings:
                # Dosya adı oluştur ve kaydet
                photo_path = f"{student_dir}/{photo_count+1}.jpg"
                cv2.imwrite(photo_path, frame)
                photo_paths.append(photo_path)
                
                # Yüz dikdörtgenini çiz
                for (top, right, bottom, left) in face_locations:
                    cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)
                
                # Encoding'i ekle
                face_encodings.append(current_encodings[0])
                photo_count += 1
                
                # Bilgilendirme
                print(f"Fotoğraf {photo_count}/{max_photos} alındı")
        
        # Görüntüyü göster
        cv2.putText(frame, f"Fotoğraf: {photo_count}/{max_photos}", 
                   (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
        cv2.imshow("Yüz Tanıma", frame)
        
        # Escape tuşuna basınca çık
        if cv2.waitKey(100) & 0xFF == 27:
            break
        
        # Her fotoğraf arasında biraz bekle
        if photo_count < max_photos:
            time.sleep(0.5)
    
    # Kamerayı kapat
    camera.release()
    cv2.destroyAllWindows()
    
    if not face_encodings:
        print("Hiç yüz bulunamadı. Lütfen tekrar deneyin.")
        return False
    
    # Tüm encoding'lerin ortalamasını al
    average_encoding = np.mean(face_encodings, axis=0)
    
    # Veritabanına kaydet
    student_update = {
        "ogrenci_id": student_id,
        "foto_galerisi": photo_paths,
        "encoding": average_encoding.tolist(),
    }
    
    # Öğrenci adı soyadı varsa ekle
    name_parts = student_name.strip().split()
    if len(name_parts) >= 2:
        student_update["ad"] = name_parts[0]
        student_update["soyad"] = " ".join(name_parts[1:])
    
    # Veritabanında güncelle
    result = db.ogrenciler.update_one(
        {"ogrenci_id": student_id},
        {"$set": student_update},
        upsert=True
    )
    
    print(f"\nYüz verisi başarıyla kaydedildi. {photo_count} fotoğraf alındı.")
    
    # Yüz önbelleğini güncelle
    try:
        from app.routes.face_attendance import load_student_faces
        load_student_faces()
        print("Yüz verileri önbelleği güncellendi.")
    except ImportError:
        print("Yüz verileri önbelleği güncellenemedi. Uygulama yeniden başlatılana kadar yüz tanıma çalışmayabilir.")
    
    return True

def list_students():
    """
    Sistemdeki öğrencileri listeler
    """
    print("\n===== SİSTEMDEKİ ÖĞRENCİLER =====")
    
    students = list(db.users.find({"role": "student"}, {"_id": 0, "mail": 1, "ad": 1, "soyad": 1, "ogrno": 1}))
    
    if not students:
        print("Sistemde kayıtlı öğrenci bulunamadı.")
        return
    
    print(f"Toplam {len(students)} öğrenci bulundu:\n")
    for i, student in enumerate(students, 1):
        ogrno = student.get("ogrno", "")
        name = f"{student.get('ad', '')} {student.get('soyad', '')}".strip()
        email = student.get("mail", "")
        
        # Yüz verisi var mı kontrol et
        face_data = db.ogrenciler.find_one({"ogrenci_id": ogrno, "encoding": {"$exists": True}})
        face_status = "✓" if face_data else "✗"
        
        print(f"{i}. [{face_status}] {name} (#{ogrno}) - {email}")
    
    print("\n✓: Yüz verisi mevcut, ✗: Yüz verisi eksik")

def main():
    print("===== ÖĞRENCİ YÜZ VERİSİ GÜNCELLEME ARACI =====")
    print("Bu araç, öğrencilerin yüz verilerini manuel olarak güncellemenize yardımcı olur.\n")
    
    list_students()
    
    while True:
        print("\n===== İŞLEMLER =====")
        print("1. Yüz verisi ekle")
        print("2. Öğrenci listesini yenile")
        print("3. Çıkış")
        
        choice = input("\nSeçiminiz (1-3): ")
        
        if choice == "1":
            student_id = input("Öğrenci numarası: ")
            student = db.users.find_one({"ogrno": student_id})
            
            if not student:
                print("Bu numaraya sahip bir öğrenci bulunamadı.")
                continue
            
            student_name = f"{student.get('ad', '')} {student.get('soyad', '')}".strip()
            collect_face_data(student_id, student_name)
            
        elif choice == "2":
            list_students()
            
        elif choice == "3":
            break
            
        else:
            print("Geçersiz seçim. Lütfen tekrar deneyin.")
    
    print("\nProgram sonlandırıldı.")

if __name__ == "__main__":
    main() 