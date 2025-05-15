from flask import Blueprint, request, jsonify
import cv2
import os
import face_recognition
import numpy as np
from ..utils.db import get_db

db = get_db()

veri_topla = Blueprint('veri_topla', __name__)

def ensure_dir(directory):
    if not os.path.exists(directory):
        os.makedirs(directory)
        print(f"Dizin oluşturuldu: {directory}")
    return directory

@veri_topla.route('/ogrenci/veri-topla', methods=['POST'])
def veri_topla_route():
    kamera = None
    try:
        data = request.json
        if not data:
            return jsonify({"error": "Veri alınamadı"}), 400

        ogrenci_id = data.get("ogrenci_id")
        ogrenci_ad = data.get("ad", "")
        ogrenci_soyad = data.get("soyad", "")

        if not ogrenci_id:
            return jsonify({"error": "Öğrenci ID'si sağlanmalı"}), 400

        base_dir = "dataset"
        klasor_yolu = os.path.join(ensure_dir(base_dir), ogrenci_id)
        ensure_dir(klasor_yolu)

        kamera = cv2.VideoCapture(0)
        if not kamera.isOpened():
            return jsonify({"error": "Kamera açılırken hata oluştu"}), 400

        sayac = 0
        max_goruntu = 10
        foto_galerisi = []
        yuz_encodings = []

        print(f"'{ogrenci_ad} {ogrenci_soyad}' için veri toplama başlatıldı...")

        while sayac < max_goruntu:
            ret, kare = kamera.read()
            if not ret:
                return jsonify({"error": "Kamera verisi okunamadı"}), 400

            rgb_kare = cv2.cvtColor(kare, cv2.COLOR_BGR2RGB)
            yuzu_tespit_et = face_recognition.face_locations(rgb_kare)

            cv2.putText(kare, f"Foto: {sayac+1}/{max_goruntu}",
                        (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)

            if yuzu_tespit_et:
                try:
                    current_encodings = face_recognition.face_encodings(rgb_kare, yuzu_tespit_et)
                    if current_encodings:
                        dosya_adi = os.path.join(klasor_yolu, f"{sayac+1}.jpg")
                        cv2.imwrite(dosya_adi, kare)

                        foto_galerisi.append(dosya_adi)
                        yuz_encodings.append(current_encodings[0])
                        sayac += 1
                        print(f"Fotoğraf {sayac}/{max_goruntu} kaydedildi.")
                except Exception as encode_error:
                    print(f"[UYARI] Yüz encoding alınırken hata: {encode_error}")

            cv2.imshow("Yüzünüzü kameraya gösterin", kare)

            if cv2.waitKey(1) & 0xFF == ord('q'):
                print("İşlem kullanıcı tarafından sonlandırıldı.")
                break

            cv2.waitKey(200)

        if kamera:
            kamera.release()
        cv2.destroyAllWindows()

        if not yuz_encodings:
            return jsonify({"error": "Yüz verileri alınamadı"}), 400

        ortalama_encoding = np.mean(yuz_encodings, axis=0)

        ogrenci_update = {
            "ogrenci_id": ogrenci_id,
            "foto_galerisi": foto_galerisi,
            "encoding": ortalama_encoding.tolist()
        }

        if ogrenci_ad:
            ogrenci_update["ad"] = ogrenci_ad
        if ogrenci_soyad:
            ogrenci_update["soyad"] = ogrenci_soyad

        result = db.ogrenciler.update_one(
            {"ogrenci_id": ogrenci_id},
            {"$set": ogrenci_update},
            upsert=True
        )

        return jsonify({
            "message": "Yüz verileri başarıyla toplandı",
            "ogrenci_id": ogrenci_id,
            "fotograf_sayisi": len(foto_galerisi)
        }), 200

    except Exception as e:
        if kamera:
            kamera.release()
        cv2.destroyAllWindows()
        print(f"Veri toplama hatası: {str(e)}")
        return jsonify({"error": f"Veri toplama sırasında bir hata oluştu: {str(e)}"}), 500


@veri_topla.route('/ogrenci/veri-sil/<ogrenci_id>', methods=['DELETE'])
def veri_sil_route(ogrenci_id):
    try:
        if not ogrenci_id:
            return jsonify({"error": "Öğrenci ID'si sağlanmalı"}), 400

        result = db.ogrenciler.delete_one({"ogrenci_id": ogrenci_id})

        klasor_yolu = f"dataset/{ogrenci_id}"
        if os.path.exists(klasor_yolu):
            for file in os.listdir(klasor_yolu):
                os.remove(os.path.join(klasor_yolu, file))
            os.rmdir(klasor_yolu)

        return jsonify({
            "message": "Öğrenci yüz verileri silindi",
            "deleted_count": result.deleted_count
        }), 200

    except Exception as e:
        print(f"Veri silme hatası: {str(e)}")
        return jsonify({"error": f"Veri silme sırasında bir hata oluştu: {str(e)}"}), 500
