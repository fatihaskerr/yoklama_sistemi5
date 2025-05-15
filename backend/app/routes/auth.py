from flask import Blueprint, request, jsonify
from ..utils.db import get_db
from ..utils.auth import generate_token, token_required, decode_token, invalidate_refresh_token, ROLE_ADMIN, ROLE_TEACHER, ROLE_STUDENT
from bson import ObjectId

db = get_db()

auth = Blueprint('auth', __name__)

@auth.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()

        # Eksik alanları kontrol et
        if not data or 'mail' not in data or 'sifre' not in data:
            return jsonify({'error': "Eksik alanlar: 'mail' ve 'sifre' gereklidir"}), 400

        # MongoDB kullanıcı bilgilerini al
        user = db.users.find_one({"mail": data['mail'], "sifre": data['sifre']})
        
        if user:
            # JSON serialization için ObjectId string'e dönüştür
            user['_id'] = str(user['_id'])
            
            # Rol standardizasyonu
            if user['role'] == 'ogretmen':
                user['role'] = ROLE_TEACHER
            elif user['role'] == 'ogrenci':
                user['role'] = ROLE_STUDENT
            
            # JWT tokenları oluştur
            access_token = generate_token(user, token_type="access")
            refresh_token = generate_token(user, token_type="refresh")
            
            # Tüm gerekli kullanıcı bilgilerini gönder
            return jsonify({
                'message': 'Giriş başarılı',
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': {
                    'mail': user['mail'],
                    'role': user['role'],
                    'ad': user['ad'],
                    'soyad': user['soyad'],
                    'ogrno': user.get('ogrno'),  # Öğrenci numarasını da ekle
                    'telno': user.get('telno'),  # Telefon numarasını da ekle
                    'id': user['_id']  # Kullanıcı ID
                }
            })
        else:
            return jsonify({'error': 'Geçersiz kullanıcı adı veya şifre'}), 401
            
    except Exception as e:
        print(f"Login hatası: {e}")
        return jsonify({'error': str(e)}), 500

@auth.route('/verify-token', methods=['GET'])
@token_required
def verify_token():
    try:
        # token_required decorator zaten token'ı doğruluyor
        # Eğer bu noktaya kadar geldiyse token geçerlidir
        
        # token verilerini al
        user_data = request.user
        
        return jsonify({
            'valid': True,
            'user': user_data
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
        
@auth.route('/refresh-token', methods=['POST'])
def refresh_access_token():
    try:
        data = request.get_json()
        if not data or 'refresh_token' not in data:
            return jsonify({'error': 'Refresh token eksik'}), 400
            
        refresh_token = data['refresh_token']
        
        # Refresh token'ı çöz
        payload = decode_token(refresh_token)
        
        # Hata durumlarını kontrol et
        if 'error' in payload:
            return jsonify({'error': payload['error']}), 401
            
        # Refresh token tipini kontrol et
        if payload.get('token_type') != 'refresh':
            return jsonify({'error': 'Geçersiz token tipi, refresh token bekleniyordu'}), 401
        
        # Kullanıcı ID'sini al
        user_id = payload.get('user_id')
        
        if not user_id:
            return jsonify({'error': 'Kullanıcı ID bulunamadı'}), 400
            
        # Kullanıcı bilgilerini veritabanından al
        user = db.users.find_one({"_id": ObjectId(user_id)})
        
        if not user:
            return jsonify({'error': 'Kullanıcı bulunamadı'}), 404
            
        # ObjectId'yi string'e dönüştür
        user['_id'] = str(user['_id'])
        
        # Yeni access token oluştur
        access_token = generate_token(user, token_type="access")
        
        return jsonify({
            'message': 'Token yenilendi',
            'access_token': access_token
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth.route('/logout', methods=['POST'])
def logout():
    try:
        data = request.get_json()
        if not data or 'refresh_token' not in data:
            return jsonify({'message': 'Çıkış yapıldı'}), 200
            
        refresh_token = data['refresh_token']
        
        # Refresh token'ı çöz
        payload = decode_token(refresh_token)
        
        # Token ID varsa geçersiz kıl
        if 'jti' in payload:
            invalidate_refresh_token(payload['jti'])
        
        return jsonify({'message': 'Başarıyla çıkış yapıldı'}), 200
        
    except Exception as e:
        print(f"Logout hatası: {e}")
        # Hata durumunda bile başarılı dönsün (çıkış işlemi kritik değil)
        return jsonify({'message': 'Çıkış yapıldı'}), 200

@auth.route('/change-password', methods=['POST'])
@token_required
def change_password():
    try:
        data = request.get_json()
        if not data or 'current_password' not in data or 'new_password' not in data:
            return jsonify({'error': 'Eksik alanlar: mevcut şifre ve yeni şifre gerekli'}), 400
            
        user_id = request.user.get('user_id')
        
        # Kullanıcıyı bul
        user = db.users.find_one({"_id": ObjectId(user_id)})
        if not user:
            return jsonify({'error': 'Kullanıcı bulunamadı'}), 404
            
        # Mevcut şifreyi kontrol et
        if user['sifre'] != data['current_password']:
            return jsonify({'error': 'Mevcut şifre yanlış'}), 401
            
        # Şifreyi güncelle
        db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"sifre": data['new_password']}}
        )
        
        return jsonify({'message': 'Şifre başarıyla değiştirildi'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth.route('/users', methods=['GET'])
@token_required
def get_all_users():
    try:
        # Admin kontrolü yap
        if not request.user or request.user.get('role') != ROLE_ADMIN:
            return jsonify({'error': 'Bu işlem için admin yetkisi gereklidir'}), 403
            
        # Tüm kullanıcıları getir
        users = list(db.users.find({}, {'sifre': 0}))  # Şifreleri hariç tut
        
        # ObjectId'leri string'e dönüştür
        for user in users:
            user['_id'] = str(user['_id'])
            
        return jsonify({'users': users}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth.route('/user/add', methods=['POST'])
@token_required
def add_user():
    try:
        # Admin kontrolü yap
        if not request.user or request.user.get('role') != ROLE_ADMIN:
            return jsonify({'error': 'Bu işlem için admin yetkisi gereklidir'}), 403
            
        # Gelen veriyi al
        data = request.get_json()
        
        if not data or 'mail' not in data or 'sifre' not in data or 'role' not in data:
            return jsonify({'error': 'Eksik bilgi. mail, sifre ve role alanları zorunludur.'}), 400
            
        # Kullanıcı zaten var mı kontrol et
        existing_user = db.users.find_one({"mail": data['mail']})
        if existing_user:
            return jsonify({'error': 'Bu e-posta adresi zaten kullanılıyor.'}), 409
            
        # Öğrenci için öğrenci numarası kontrolü
        if data['role'] == 'student' and 'ogrno' not in data:
            return jsonify({'error': 'Öğrenci kullanıcılar için öğrenci numarası zorunludur.'}), 400
            
        # Yeni kullanıcı objesi
        new_user = {
            "mail": data['mail'],
            "sifre": data['sifre'],
            "ad": data.get('ad', ''),
            "soyad": data.get('soyad', ''),
            "role": data['role'],
            "telno": data.get('telno', '')
        }
        
        # Öğrenci ise öğrenci numarasını ekle
        if data['role'] == 'student' and 'ogrno' in data:
            new_user['ogrno'] = data['ogrno']
            
        # Veritabanına ekle
        result = db.users.insert_one(new_user)
        
        if result.acknowledged:
            # Şifreyi yanıtta gönderme
            new_user.pop('sifre', None)
            new_user['_id'] = str(result.inserted_id)
            
            return jsonify({
                'message': 'Kullanıcı başarıyla eklendi',
                'user': new_user
            }), 201
        else:
            return jsonify({'error': 'Kullanıcı eklenirken bir hata oluştu'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth.route('/user/update/<user_id>', methods=['PUT'])
@token_required
def update_user(user_id):
    try:
        # Admin kontrolü yap
        if not request.user or request.user.get('role') != ROLE_ADMIN:
            return jsonify({'error': 'Bu işlem için admin yetkisi gereklidir'}), 403
            
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'Güncellenecek veri bulunamadı'}), 400
            
        # Güncellenecek kullanıcı mevcut mu kontrol et
        existing_user = db.users.find_one({"_id": ObjectId(user_id)})
        if not existing_user:
            return jsonify({'error': 'Kullanıcı bulunamadı'}), 404
            
        # Güncellenecek alanları belirle
        update_data = {}
        
        # Şifre güncellemesi varsa
        if 'sifre' in data:
            update_data['sifre'] = data['sifre']
            
        # Diğer alanlar
        for field in ['ad', 'soyad', 'telno', 'role']:
            if field in data:
                update_data[field] = data[field]
                
        # Öğrenci numarası güncelleme
        if data.get('role') == 'student' and 'ogrno' in data:
            update_data['ogrno'] = data['ogrno']
            
        # Güncellenecek veri var mı kontrol et
        if not update_data:
            return jsonify({'message': 'Güncellenecek veri bulunamadı'}), 400
            
        # Veritabanında güncelle
        result = db.users.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": update_data}
        )
        
        if result.modified_count > 0:
            # Güncellenmiş kullanıcıyı getir
            updated_user = db.users.find_one({"_id": ObjectId(user_id)}, {'sifre': 0})
            updated_user['_id'] = str(updated_user['_id'])
            
            return jsonify({
                'message': 'Kullanıcı başarıyla güncellendi',
                'user': updated_user
            }), 200
        else:
            return jsonify({'message': 'Hiçbir değişiklik yapılmadı'}), 200
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth.route('/user/delete/<user_id>', methods=['DELETE'])
@token_required
def delete_user(user_id):
    try:
        # Admin kontrolü yap
        if not request.user or request.user.get('role') != ROLE_ADMIN:
            return jsonify({'error': 'Bu işlem için admin yetkisi gereklidir'}), 403
            
        # Silinecek kullanıcı mevcut mu kontrol et
        existing_user = db.users.find_one({"_id": ObjectId(user_id)})
        if not existing_user:
            return jsonify({'error': 'Kullanıcı bulunamadı'}), 404
            
        # Kullanıcıyı sil
        result = db.users.delete_one({"_id": ObjectId(user_id)})
        
        if result.deleted_count > 0:
            # Öğrenci kullanıcısı ise, yüz verilerini de sil
            if existing_user.get('role') == 'student' and 'ogrno' in existing_user:
                try:
                    # Öğrencinin yüz verilerini temizle
                    db.ogrenciler.delete_one({"ogrenci_id": existing_user['ogrno']})
                    
                    # Yoklama kayıtlarından öğrenciyi çıkar (bu işlem opsiyonel)
                    db.attendance.update_many(
                        {"tumOgrenciler": existing_user['ogrno']},
                        {"$pull": {"tumOgrenciler": existing_user['ogrno'], "katilanlar": existing_user['ogrno']}}
                    )
                except Exception as e:
                    print(f"Öğrenci verileri silinirken hata: {str(e)}")
            
            return jsonify({'message': 'Kullanıcı başarıyla silindi'}), 200
        else:
            return jsonify({'error': 'Kullanıcı silinirken bir hata oluştu'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500