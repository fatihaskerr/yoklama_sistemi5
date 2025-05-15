import jwt
import datetime
import os
import uuid
from functools import wraps
from flask import request, jsonify
from dotenv import load_dotenv

load_dotenv()

# JWT_SECRET_KEY olmadığında bir varsayılan anahtar oluştur (güvenli değil, sadece geliştirme için)
JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'yoklama_sistemi_gizli_anahtar')
JWT_ACCESS_TOKEN_EXPIRES = 24  # Saat cinsinden
JWT_REFRESH_TOKEN_EXPIRES = 7  # Gün cinsinden

# Rol sabitleri
ROLE_ADMIN = 'admin'
ROLE_TEACHER = 'teacher'
ROLE_STUDENT = 'student'

# Aktif refresh token'ları tutmak için (gerçek sistemde veritabanında saklanmalı)
active_refresh_tokens = {}

def generate_token(user_data, token_type="access"):
    """
    Kullanıcı verilerine göre JWT token oluşturur
    """
    # Token türüne göre süre belirle
    if token_type == "access":
        expires_delta = datetime.timedelta(hours=JWT_ACCESS_TOKEN_EXPIRES)
    elif token_type == "refresh":
        expires_delta = datetime.timedelta(days=JWT_REFRESH_TOKEN_EXPIRES)
    else:
        raise ValueError("Invalid token type")
    
    expires_at = datetime.datetime.utcnow() + expires_delta
    
    # Rol standardizasyonu
    role = user_data.get('role', '')
    if role == 'ogretmen':
        role = ROLE_TEACHER
    elif role == 'ogrenci':
        role = ROLE_STUDENT
    
    payload = {
        'exp': expires_at,
        'iat': datetime.datetime.utcnow(),
        'sub': user_data['mail'] if 'mail' in user_data else user_data.get('ogrno', ''),
        'role': role,
        'user_id': str(user_data.get('_id', '')),
        'token_type': token_type
    }
    
    # Refresh token için benzersiz ID ekle
    if token_type == "refresh":
        token_id = str(uuid.uuid4())
        payload['jti'] = token_id
        # Aktif refresh token'ı kaydet
        active_refresh_tokens[token_id] = {
            'user_id': str(user_data.get('_id', '')),
            'expires_at': expires_at
        }
    
    return jwt.encode(
        payload,
        JWT_SECRET_KEY,
        algorithm='HS256'
    )

def decode_token(token):
    """
    JWT token'ı çözer
    """
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'])
        
        # Refresh token için geçerlilik kontrolü
        if payload.get('token_type') == 'refresh' and 'jti' in payload:
            token_id = payload['jti']
            if token_id not in active_refresh_tokens:
                return {'error': 'Geçersiz refresh token'}
            
            # Süre kontrolü veritabanından da yapılabilir
            if active_refresh_tokens[token_id]['user_id'] != payload['user_id']:
                return {'error': 'Token kullanıcı eşleşmiyor'}
        
        return payload
    except jwt.ExpiredSignatureError:
        return {'error': 'Token süresi dolmuş'}
    except jwt.InvalidTokenError:
        return {'error': 'Geçersiz token'}

def token_required(f):
    """
    API endpointlerini korumak için decorator
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Auth header'dan token al
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'message': 'Token formatı geçersiz'}), 401
                
        if not token:
            return jsonify({'message': 'Token bulunamadı'}), 401
            
        try:
            payload = decode_token(token)
            if 'error' in payload:
                return jsonify({'message': payload['error']}), 401
                
            # Refresh token kontrolü
            if payload.get('token_type') == 'refresh':
                return jsonify({'message': 'Bu işlem için access token gerekli'}), 403
                
            # İsteğe kullanıcı bilgilerini ekle
            request.user = payload
            
        except Exception as e:
            return jsonify({'message': f'Token doğrulama hatası: {str(e)}'}), 401
            
        return f(*args, **kwargs)
    
    return decorated

def admin_required(f):
    """
    Sadece admin rolündeki kullanıcılara izin verir
    """
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        if not request.user or request.user.get('role') != ROLE_ADMIN:
            return jsonify({'message': 'Bu işlem için admin yetkisi gereklidir'}), 403
            
        return f(*args, **kwargs)
    
    return decorated

def teacher_required(f):
    """
    Sadece öğretmen rolündeki kullanıcılara izin verir
    """
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        user_role = request.user.get('role', '')
        if not request.user or (user_role != ROLE_TEACHER and user_role != 'ogretmen'):
            return jsonify({'message': 'Bu işlem için öğretmen yetkisi gereklidir'}), 403
            
        return f(*args, **kwargs)
    
    return decorated

def student_required(f):
    """
    Sadece öğrenci rolündeki kullanıcılara izin verir
    """
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        user_role = request.user.get('role', '')
        if not request.user or (user_role != ROLE_STUDENT and user_role != 'ogrenci'):
            return jsonify({'message': 'Bu işlem için öğrenci yetkisi gereklidir'}), 403
            
        return f(*args, **kwargs)
    
    return decorated

def invalidate_refresh_token(token_id):
    """
    Belirli bir refresh token'ı geçersiz kılar
    """
    if token_id in active_refresh_tokens:
        del active_refresh_tokens[token_id]
        return True
    return False

def clean_expired_tokens():
    """
    Süresi dolmuş refresh token'ları temizler
    """
    now = datetime.datetime.utcnow()
    expired_tokens = [
        token_id for token_id, data in active_refresh_tokens.items()
        if data['expires_at'] < now
    ]
    
    for token_id in expired_tokens:
        del active_refresh_tokens[token_id]
    
    return len(expired_tokens) 