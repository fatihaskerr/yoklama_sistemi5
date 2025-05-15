from flask import Blueprint, jsonify, request
from ..utils.db import get_db
from datetime import datetime
from bson import ObjectId

courses = Blueprint('courses', __name__)

# Veritabanı bağlantısını al
db = get_db()

@courses.route('/teacher/<mail>', methods=['GET'])
def get_teacher_courses(mail):
    try:
        # Öğretmenin derslerini bul
        teacher_courses = list(db.courses.find(
            {"ogretmenler": mail},
            {"_id": 1, "dersKodu": 1, "dersAdi": 1}
        ))

        formatted_courses = [{
            "_id": str(course["_id"]),
            "kod": course["dersKodu"],
            "ad": course["dersAdi"]
        } for course in teacher_courses]
        
        return jsonify({'courses': formatted_courses})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@courses.route('/attendance/start', methods=['POST'])
def start_attendance():
    try:
        data = request.get_json()
        
        if not data or 'dersKodu' not in data or 'ogretmenMail' not in data:
            return jsonify({'error': 'Eksik bilgi'}), 400
            
        course = db.courses.find_one({"dersKodu": data['dersKodu']})
        if not course:
            return jsonify({'error': 'Ders bulunamadı'}), 404
            
        attendance_record = {
            "dersKodu": data['dersKodu'],
            "dersAdi": course['dersAdi'],
            "ogretmenMail": data['ogretmenMail'],
            "tarih": datetime.now(),
            "durum": "aktif",
            "katilanlar": [],
            "tumOgrenciler": course['ogrenciler']
        }
        
        result = db.attendance.insert_one(attendance_record)
        if result.acknowledged:
            return jsonify({'message': 'Yoklama başlatıldı', 'attendanceId': str(result.inserted_id)})
        else:
            return jsonify({'error': 'Yoklama başlatılamadı'}), 500
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@courses.route('/attendance/<attendance_id>/end', methods=['POST'])
def end_attendance(attendance_id):
    try:
        db.attendance.update_one(
            {"_id": ObjectId(attendance_id)},
            {"$set": {"durum": "tamamlandı"}}
        )
        
        attendance = db.attendance.find_one({"_id": ObjectId(attendance_id)})
        
        if attendance:
            katilmayanlar = list(set(attendance['tumOgrenciler']) - set(attendance['katilanlar']))
            db.attendance.update_one(
                {"_id": ObjectId(attendance_id)},
                {"$set": {"katilmayanlar": katilmayanlar}}
            )
        
        return jsonify({'message': 'Yoklama tamamlandı'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@courses.route('/attendance/<attendance_id>', methods=['GET'])
def get_attendance(attendance_id):
    try:
        attendance = db.attendance.find_one({"_id": ObjectId(attendance_id)})
        if not attendance:
            return jsonify({'error': 'Yoklama bulunamadı'}), 404
        
        ogrenci_detaylari = []
        for index, ogrenci_no in enumerate(attendance['tumOgrenciler'], 1):
            ogrenci = db.users.find_one({"ogrno": ogrenci_no})
            ogrenci_detaylari.append({
                "ogrenciNo": ogrenci_no,
                "adSoyad": f"{ogrenci['ad']} {ogrenci['soyad']}" if ogrenci else f"Öğrenci {index}"
            })
        
        return jsonify({
            'tumOgrenciler': ogrenci_detaylari,
            'katilanlar': attendance['katilanlar']
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@courses.route('/attendance/<attendance_id>/update', methods=['POST'])
def update_attendance(attendance_id):
    try:
        data = request.get_json()
        if not data or 'ogrenci' not in data or 'isPresent' not in data:
            return jsonify({'error': 'Eksik bilgi'}), 400
            
        if data['isPresent']:
            db.attendance.update_one(
                {"_id": ObjectId(attendance_id)},
                {"$addToSet": {"katilanlar": data['ogrenci']}}
            )
        else:
            db.attendance.update_one(
                {"_id": ObjectId(attendance_id)},
                {"$pull": {"katilanlar": data['ogrenci']}}
            )
            
        return jsonify({'message': 'Yoklama güncellendi'})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@courses.route('/active-attendance/<teacher_mail>', methods=['GET'])
def get_active_attendance(teacher_mail):
    try:
        active_attendance = db.attendance.find_one({
            "ogretmenMail": teacher_mail,
            "durum": "aktif"
        })
        
        if active_attendance:
            active_attendance['_id'] = str(active_attendance['_id'])
        
        return jsonify({
            'activeAttendance': active_attendance
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@courses.route('/all', methods=['GET'])
def get_all_courses():
    try:
        # Tüm dersleri getir
        all_courses = list(db.courses.find())
        
        # ObjectId'leri string'e dönüştür
        formatted_courses = []
        for course in all_courses:
            course['_id'] = str(course['_id'])
            formatted_courses.append({
                "_id": course['_id'],
                "kod": course.get('dersKodu', ''),
                "ad": course.get('dersAdi', ''),
                "ogretmenler": course.get('ogretmenler', []),
                "ogrenciler": course.get('ogrenciler', []),
                "donem": course.get('donem', '')
            })
        
        return jsonify({'courses': formatted_courses}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@courses.route('/add', methods=['POST'])
def add_course():
    try:
        data = request.get_json()
        
        if not data or 'dersKodu' not in data or 'dersAdi' not in data:
            return jsonify({'error': 'Eksik bilgi. dersKodu ve dersAdi alanları zorunludur.'}), 400
            
        # Kurs zaten var mı kontrol et
        existing_course = db.courses.find_one({"dersKodu": data['dersKodu']})
        if existing_course:
            return jsonify({'error': 'Bu ders kodu zaten kullanılıyor.'}), 409
            
        # Yeni kurs objesi oluştur
        new_course = {
            "dersKodu": data['dersKodu'],
            "dersAdi": data['dersAdi'],
            "ogretmenler": data.get('ogretmenler', []),
            "ogrenciler": data.get('ogrenciler', []),
            "donem": data.get('donem', ''),
            "olusturma_tarihi": datetime.now()
        }
        
        # Veritabanına ekle
        result = db.courses.insert_one(new_course)
        
        if result.acknowledged:
            new_course['_id'] = str(result.inserted_id)
            return jsonify({
                'message': 'Ders başarıyla eklendi', 
                'course': new_course
            }), 201
        else:
            return jsonify({'error': 'Ders eklenirken bir hata oluştu'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@courses.route('/update/<course_id>', methods=['PUT'])
def update_course(course_id):
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Güncellenecek veri bulunamadı'}), 400
            
        # Güncellenecek kurs mevcut mu kontrol et
        existing_course = db.courses.find_one({"_id": ObjectId(course_id)})
        if not existing_course:
            return jsonify({'error': 'Ders bulunamadı'}), 404
            
        # Güncellenecek alanları belirle
        update_data = {}
        
        if 'dersAdi' in data:
            update_data['dersAdi'] = data['dersAdi']
            
        if 'ogretmenler' in data:
            update_data['ogretmenler'] = data['ogretmenler']
            
        if 'ogrenciler' in data:
            update_data['ogrenciler'] = data['ogrenciler']
            
        if 'donem' in data:
            update_data['donem'] = data['donem']
            
        # Güncellenecek veri var mı kontrol et
        if not update_data:
            return jsonify({'message': 'Güncellenecek veri bulunamadı'}), 400
            
        # Veritabanında güncelle
        result = db.courses.update_one(
            {"_id": ObjectId(course_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            # Güncellenmiş dersi getir
            updated_course = db.courses.find_one({"_id": ObjectId(course_id)})
            updated_course['_id'] = str(updated_course['_id'])
            
            return jsonify({
                'message': 'Ders başarıyla güncellendi',
                'course': updated_course
            }), 200
        else:
            return jsonify({'message': 'Hiçbir değişiklik yapılmadı'}), 200
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@courses.route('/delete/<course_id>', methods=['DELETE'])
def delete_course(course_id):
    try:
        # Silinecek kurs mevcut mu kontrol et
        existing_course = db.courses.find_one({"_id": ObjectId(course_id)})
        if not existing_course:
            return jsonify({'error': 'Ders bulunamadı'}), 404
            
        # Derse ait yoklama kayıtları var mı kontrol et
        attendance_records = db.attendance.find_one({"dersKodu": existing_course['dersKodu']})
        if attendance_records:
            # Yoklama kayıtları varsa uyarı ver
            return jsonify({'error': 'Bu derse ait yoklama kayıtları bulunmaktadır. Önce yoklama kayıtlarını silmelisiniz.'}), 400
            
        # Kursu sil
        result = db.courses.delete_one({"_id": ObjectId(course_id)})
        
        if result.deleted_count > 0:
            return jsonify({'message': 'Ders başarıyla silindi'}), 200
        else:
            return jsonify({'error': 'Ders silinirken bir hata oluştu'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500
