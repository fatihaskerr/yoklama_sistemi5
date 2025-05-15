from flask import Blueprint, jsonify
from datetime import datetime
from bson import ObjectId
from ..utils.db import get_db

db = get_db()  # Veritabanı bağlantısını almak için

attendance_routes = Blueprint('attendance', __name__)

@attendance_routes.route('/active-courses/<ogrno>', methods=['GET'])
def get_active_courses(ogrno):
    try:
        print(f"[DEBUG] Öğrenci no: {ogrno} için aktif dersler getiriliyor")
        
        # Aktif dersleri getir
        active_courses = list(db.attendance.find({
            "durum": "aktif",
            "tumOgrenciler": ogrno
        }))
        
        # Her ders için katılım durumunu kontrol et
        formatted_courses = []
        for course in active_courses:
            course_id = str(course['_id'])
            
            # Öğretmen adını al
            ogretmen = db.users.find_one({"mail": course.get('ogretmenMail')})
            ogretmen_adi = f"{ogretmen['ad']} {ogretmen['soyad']}" if ogretmen else course.get('ogretmenMail')
            
            # Katılım durumunu katilanlar dizisinden kontrol et
            katilim_yapildi = ogrno in course.get('katilanlar', [])
            
            formatted_course = {
                '_id': course_id,
                'dersKodu': course['dersKodu'],
                'dersAdi': course['dersAdi'],
                'katilimYapildi': katilim_yapildi,
                'ogretmenler': [ogretmen_adi],
                'tarih': course.get('tarih')
            }
            
            formatted_courses.append(formatted_course)
        
        return jsonify(formatted_courses)
        
    except Exception as e:
        print(f"[HATA] Aktif dersler getirme hatası: {str(e)}")
        return jsonify({'error': str(e)}), 500

@attendance_routes.route('/verify-attendance/<ders_id>/<ogrno>', methods=['POST'])
def verify_attendance(ders_id, ogrno):
    try:
        # Dersi bul ve öğrenciyi katilanlar listesine ekle
        result = db.attendance.update_one(
            {"_id": ObjectId(ders_id)},
            {"$addToSet": {"katilanlar": ogrno}}
        )
        
        if result.modified_count > 0:
            print(f"[DEBUG] Öğrenci {ogrno} dersin katılımcılarına eklendi")
            return jsonify({"message": "Yoklama kaydı başarılı"}), 200
        else:
            print(f"[DEBUG] Öğrenci zaten katılımcılarda var veya güncelleme başarısız")
            return jsonify({"message": "Bu ders için zaten yoklama kaydınız var"}), 200
            
    except Exception as e:
        print(f"[HATA] Yoklama kaydı hatası: {str(e)}")
        return jsonify({'error': str(e)}), 500 

@attendance_routes.route('/student-tracking/<ogrno>', methods=['GET'])
def get_student_tracking(ogrno):
    try:
        # Öğrencinin tüm derslerini bul
        all_courses = list(db.attendance.find({
            "tumOgrenciler": ogrno
        }).distinct("dersKodu"))
        
        tracking_data = []
        
        for ders_kodu in all_courses:
            # Her ders için yoklama verilerini topla
            dersler = list(db.attendance.find({
                "dersKodu": ders_kodu,
                "tumOgrenciler": ogrno
            }))
            
            if dersler:
                toplam_ders = len(dersler)
                katildigi_ders = sum(1 for ders in dersler if ogrno in ders.get('katilanlar', []))
                katilmadigi_ders = toplam_ders - katildigi_ders
                katilim_orani = round((katildigi_ders / toplam_ders) * 100) if toplam_ders > 0 else 0
                
                tracking_data.append({
                    "dersKodu": ders_kodu,
                    "dersAdi": dersler[0].get('dersAdi', ''),
                    "toplamDers": toplam_ders,
                    "katildigiDers": katildigi_ders,
                    "katilmadigiDers": katilmadigi_ders,
                    "katilimOrani": katilim_orani
                })
        
        return jsonify(tracking_data)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500 