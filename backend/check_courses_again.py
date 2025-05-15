from app.utils.db import get_db
import datetime

def check_courses():
    db = get_db()
    
    # Veritabanı adını kontrol et
    print(f"Kullanılan veritabanı: {db.name}")
    
    # Koleksiyonları listele
    print("\nVeritabanındaki koleksiyonlar:")
    collections = db.list_collection_names()
    for collection in collections:
        count = db[collection].count_documents({})
        print(f"  - {collection}: {count} kayıt")
    
    # Courses koleksiyonunu kontrol et
    course_count = db.courses.count_documents({})
    print(f"\nCourses koleksiyonundaki kayıt sayısı: {course_count}")
    
    if course_count > 0:
        print("\nMevcut dersler:")
        for i, course in enumerate(db.courses.find()):
            print(f"  {i+1}. {course.get('dersKodu', 'Kod Yok')} - {course.get('dersAdi', 'İsim Yok')}")
            # ObjectId'yi string'e dönüştür ve yazdır
            print(f"     ID: {course.get('_id')}")
    
    # Admin panel incelenirken yapılan HTTP istekleri kontrol edilebilir
    print("\nAPI Endpoint bilgisi:")
    print("Admin panelinde dersler çekilirken şu endpoint kullanılıyor:")
    print("GET http://localhost:5000/api/courses/all")
    print("\nCORS ayarlarını kontrol et. Frontend'in bu endpoint'e erişim izni olduğundan emin ol.")

if __name__ == "__main__":
    check_courses() 