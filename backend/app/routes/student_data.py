from flask import Blueprint, jsonify, request
from ..utils.db import get_db
from bson import ObjectId
import numpy as np
import os
import shutil

student_data = Blueprint("student_data", __name__)
db = get_db()

@student_data.route('/ogrenci-listesi', methods=['GET'])
def get_student_list():
    """Tüm öğrencilerin listesini döndürür"""
    try:
        # Öğrencileri veritabanından çek
        students = list(db.ogrenciler.find())
        
        # BSON ObjectId'leri string'e dönüştür
        for student in students:
            if '_id' in student:
                student['_id'] = str(student['_id'])
                
            # Verimliliği artırmak için encoding verisini JSON yanıtından çıkar
            if 'encoding' in student:
                student['encoding'] = True
            else:
                student['encoding'] = False
                
        return jsonify({"success": True, "students": students}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@student_data.route('/ogrenci-ara', methods=['GET'])
def search_students():
    """Öğrencileri arama kriteri ile filtreleyerek döndürür"""
    try:
        # URL parametrelerini al
        search_term = request.args.get('q', '')
        
        if not search_term:
            return jsonify({"success": False, "error": "Arama terimi gereklidir"}), 400
        
        # Regex ile arama (ad, soyad veya öğrenci no içinde arama yap)
        query = {
            "$or": [
                {"ad": {"$regex": search_term, "$options": "i"}},
                {"soyad": {"$regex": search_term, "$options": "i"}},
                {"ogrenci_id": {"$regex": search_term, "$options": "i"}}
            ]
        }
        
        students = list(db.ogrenciler.find(query))
        
        # BSON ObjectId'leri string'e dönüştür
        for student in students:
            if '_id' in student:
                student['_id'] = str(student['_id'])
                
            # Verimliliği artırmak için encoding verisini JSON yanıtından çıkar
            if 'encoding' in student:
                student['encoding'] = True
            else:
                student['encoding'] = False
                
        return jsonify({"success": True, "students": students}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@student_data.route('/ogrenci-detay/<ogrenci_id>', methods=['GET'])
def get_student_detail(ogrenci_id):
    """Belirli bir öğrencinin detaylarını döndürür"""
    try:
        # Öğrenciyi veritabanından çek
        student = db.ogrenciler.find_one({"ogrenci_id": ogrenci_id})
        
        if not student:
            return jsonify({"success": False, "error": "Öğrenci bulunamadı"}), 404
            
        # BSON ObjectId'leri string'e dönüştür
        if '_id' in student:
            student['_id'] = str(student['_id'])
            
        # Verimliliği artırmak için encoding verisini JSON yanıtından çıkar
        if 'encoding' in student:
            # Gerçek encoding verisini gönderme, sadece var olup olmadığını belirt
            student['encoding'] = True
        else:
            student['encoding'] = False
            
        return jsonify({"success": True, "student": student}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@student_data.route('/ogrenci-ekle', methods=['POST'])
def add_student():
    """Yeni bir öğrenci ekler (yüz verisi olmadan)"""
    try:
        data = request.json
        if not data:
            return jsonify({"success": False, "error": "Veri alınamadı"}), 400
        
        # Zorunlu alanları kontrol et
        if 'ogrenci_id' not in data:
            return jsonify({"success": False, "error": "Öğrenci ID'si zorunludur"}), 400
        
        # Öğrenci ID'si zaten var mı kontrol et
        existing_student = db.ogrenciler.find_one({"ogrenci_id": data['ogrenci_id']})
        if existing_student:
            return jsonify({"success": False, "error": "Bu ID'ye sahip bir öğrenci zaten mevcut"}), 409
        
        # Minimum öğrenci verileri
        new_student = {
            "ogrenci_id": data['ogrenci_id'],
            "ad": data.get('ad', ''),
            "soyad": data.get('soyad', ''),
            "sinif": data.get('sinif', ''),
            "bolum": data.get('bolum', ''),
            "eklenme_tarihi": data.get('eklenme_tarihi', '')
        }
        
        # Veritabanına ekle
        result = db.ogrenciler.insert_one(new_student)
        
        if result.acknowledged:
            # Eklenen öğrenciyi döndür
            new_student['_id'] = str(result.inserted_id)
            return jsonify({
                "success": True, 
                "message": "Öğrenci başarıyla eklendi",
                "student": new_student
            }), 201
        else:
            return jsonify({"success": False, "error": "Öğrenci eklenirken bir hata oluştu"}), 500
            
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@student_data.route('/ogrenci-guncelle/<ogrenci_id>', methods=['PUT'])
def update_student(ogrenci_id):
    """Mevcut bir öğrenciyi günceller"""
    try:
        data = request.json
        if not data:
            return jsonify({"success": False, "error": "Veri alınamadı"}), 400
        
        # Öğrenciyi kontrol et
        existing_student = db.ogrenciler.find_one({"ogrenci_id": ogrenci_id})
        if not existing_student:
            return jsonify({"success": False, "error": "Öğrenci bulunamadı"}), 404
        
        # Güncellenecek alanları belirle
        update_data = {}
        allowed_fields = ['ad', 'soyad', 'sinif', 'bolum', 'eklenme_tarihi', 'notlar']
        
        for field in allowed_fields:
            if field in data:
                update_data[field] = data[field]
        
        # Güncelleme yapılacak veri var mı kontrol et
        if not update_data:
            return jsonify({"success": False, "error": "Güncellenecek alan bulunamadı"}), 400
        
        # Veritabanını güncelle
        result = db.ogrenciler.update_one(
            {"ogrenci_id": ogrenci_id},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            # Güncellenmiş öğrenciyi al
            updated_student = db.ogrenciler.find_one({"ogrenci_id": ogrenci_id})
            if '_id' in updated_student:
                updated_student['_id'] = str(updated_student['_id'])
                
            # Encoding verisini JSON yanıtından çıkar
            if 'encoding' in updated_student:
                updated_student['encoding'] = True
            else:
                updated_student['encoding'] = False
                
            return jsonify({
                "success": True, 
                "message": "Öğrenci başarıyla güncellendi",
                "student": updated_student
            }), 200
        else:
            return jsonify({"success": True, "message": "Hiçbir değişiklik yapılmadı"}), 200
            
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@student_data.route('/ogrenci/veri-sil/<ogrenci_id>', methods=['DELETE'])
def delete_student_data(ogrenci_id):
    """Belirli bir öğrencinin yüz verilerini ve fotoğraflarını siler"""
    try:
        # Öğrenciyi veritabanından çek
        student = db.ogrenciler.find_one({"ogrenci_id": ogrenci_id})
        
        if not student:
            return jsonify({"success": False, "error": "Öğrenci bulunamadı"}), 404
            
        # Öğrencinin fotoğraflarını depolandığı klasörden sil
        student_dir = f"student_photos/{ogrenci_id}"
        if os.path.exists(student_dir):
            shutil.rmtree(student_dir)
            
        # Öğrencinin encoding verisini veritabanından temizle
        db.ogrenciler.update_one(
            {"ogrenci_id": ogrenci_id},
            {"$unset": {"encoding": "", "foto_galerisi": ""}}
        )
        
        # Yüz verisi önbelleğini yenile (face_attendance.py'deki fonksiyona ulaşamıyorsak)
        try:
            from .face_attendance import load_student_faces
            load_student_faces()
        except ImportError:
            # Yüz verileri önbelleği yenileme API'sini çağır
            pass
            
        return jsonify({
            "success": True, 
            "message": f"{ogrenci_id} numaralı öğrencinin yüz verileri başarıyla silindi"
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@student_data.route('/ogrenci-sil/<ogrenci_id>', methods=['DELETE'])
def delete_student(ogrenci_id):
    """Bir öğrenciyi tamamen siler"""
    try:
        # Öğrenciyi veritabanından çek
        student = db.ogrenciler.find_one({"ogrenci_id": ogrenci_id})
        
        if not student:
            return jsonify({"success": False, "error": "Öğrenci bulunamadı"}), 404
            
        # Öğrencinin fotoğraflarını depolandığı klasörden sil
        student_dir = f"student_photos/{ogrenci_id}"
        if os.path.exists(student_dir):
            shutil.rmtree(student_dir)
            
        # Öğrenciyi veritabanından tamamen sil
        result = db.ogrenciler.delete_one({"ogrenci_id": ogrenci_id})
        
        if result.deleted_count > 0:
            # Yüz verisi önbelleğini yenile
            try:
                from .face_attendance import load_student_faces
                load_student_faces()
            except ImportError:
                # Yüz verileri önbelleği yenileme API'sini çağır
                pass
                
            return jsonify({
                "success": True, 
                "message": f"{ogrenci_id} numaralı öğrenci başarıyla silindi"
            }), 200
        else:
            return jsonify({"success": False, "error": "Öğrenci silinirken bir hata oluştu"}), 500
            
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500 