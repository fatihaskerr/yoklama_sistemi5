from flask import Blueprint, jsonify, request
import cv2
import face_recognition
from bson import ObjectId
import time
import numpy as np
import datetime
from ..utils.db import get_db

face_attendance = Blueprint("face_attendance", __name__)
db = get_db()

# Cache ayarları
student_faces_cache = {}
last_cache_update = 0
CACHE_EXPIRY = 3600
FACE_RECOGNITION_TOLERANCE = 0.55

def load_student_faces():
    global student_faces_cache, last_cache_update
    try:
        students = list(db.ogrenciler.find({"encoding": {"$exists": True}}))
        cache = {}
        for student in students:
            student_id = student["ogrenci_id"]
            encoding = np.array(student["encoding"])
            name = f"{student.get('ad', '')} {student.get('soyad', '')}".strip()
            cache[student_id] = {"encoding": encoding, "name": name}
        student_faces_cache = cache
        last_cache_update = time.time()
        print(f"{len(cache)} öğrencinin yüz verisi önbelleğe alındı.")
        return True
    except Exception as e:
        print(f"Yüz verileri yüklenirken hata: {e}")
        return False

def get_cached_faces(course_students=None):
    global last_cache_update
    if time.time() - last_cache_update > CACHE_EXPIRY:
        load_student_faces()
    if course_students:
        return {sid: data for sid, data in student_faces_cache.items() if sid in course_students}
    return student_faces_cache

def preprocess_frame(frame, scale=0.25):
    small_frame = cv2.resize(frame, (0, 0), fx=scale, fy=scale)
    return small_frame[:, :, ::-1]

def release_camera(camera):
    if camera and camera.isOpened():
        camera.release()
        cv2.destroyAllWindows()

@face_attendance.route('/yoklama-al/<ders_id>', methods=['POST'])
def yoklama_al(ders_id):
    camera = None
    try:
        attendance = db.attendance.find_one({"_id": ObjectId(ders_id)})
        if not attendance:
            return jsonify({"error": "Ders bulunamadı"}), 404

        course_students = attendance.get("tumOgrenciler", [])
        student_faces = get_cached_faces(course_students)

        if not student_faces:
            return jsonify({"error": "Yüz verisi bulunamadı"}), 404

        known_face_encodings = [d["encoding"] for d in student_faces.values()]
        known_face_ids = list(student_faces.keys())

        camera = cv2.VideoCapture(0, cv2.CAP_DSHOW)  # ÖNEMLİ: Kamera hatası için DSHOW
        if not camera.isOpened():
            return jsonify({"error": "Kamera başlatılamadı"}), 400

        baslangic = time.time()
        max_sure = 30
        while time.time() - baslangic < max_sure:
            ret, frame = camera.read()
            if not ret:
                continue

            rgb_small_frame = preprocess_frame(frame)
            face_locations = face_recognition.face_locations(rgb_small_frame)
            if not face_locations:
                continue

            face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)
            if not face_encodings:
                continue

            for face_encoding in face_encodings:
                distances = face_recognition.face_distance(known_face_encodings, face_encoding)
                best_idx = np.argmin(distances)
                match_ratio = 1 - distances[best_idx]

                if match_ratio > FACE_RECOGNITION_TOLERANCE:
                    student_id = known_face_ids[best_idx]
                    student_name = student_faces[student_id]["name"]
                    release_camera(camera)
                    return jsonify({
                        "message": "Yüz tanıma başarılı",
                        "ogrenci_id": student_id,
                        "ogrenci_adi": student_name,
                        "match_ratio": f"{match_ratio:.2f}"
                    }), 200

        release_camera(camera)
        return jsonify({"message": "Tanıma başarısız"}), 404

    except Exception as e:
        print(f"Yüz tanıma hatası: {str(e)}")
        release_camera(camera)
        return jsonify({"error": f"Yüz tanıma hatası: {str(e)}"}), 500

@face_attendance.route('/cache-refresh', methods=['POST'])
def refresh_cache():
    success = load_student_faces()
    if success:
        return jsonify({"message": f"Önbellek güncellendi. {len(student_faces_cache)} yüz yüklendi."}), 200
    else:
        return jsonify({"error": "Önbellek güncelleme hatası"}), 500

@face_attendance.route('/system-status', methods=['GET'])
def system_status():
    try:
        cached_students = len(student_faces_cache)
        total_students = db.ogrenciler.count_documents({})
        face_data_students = db.ogrenciler.count_documents({"encoding": {"$exists": True}})
        last_update_time = datetime.datetime.fromtimestamp(last_cache_update).strftime('%Y-%m-%d %H:%M:%S')

        return jsonify({
            "success": True,
            "status": {
                "cached_students": cached_students,
                "total_students": total_students,
                "face_data_students": face_data_students,
                "last_cache_update": last_update_time,
                "face_recognition_tolerance": FACE_RECOGNITION_TOLERANCE,
                "cache_expiry_seconds": CACHE_EXPIRY
            }
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500