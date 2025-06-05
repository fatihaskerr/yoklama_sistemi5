from flask import Flask
from flask_cors import CORS
import os
from .routes.auth import auth
from .routes.courses import courses
from .routes.attendance import attendance_routes # Yeni blueprint'i dahil et
from app.routes.veri_topla import veri_topla
from .routes.face_attendance import face_attendance
from .routes.student_data import student_data


def create_app():
    app = Flask(__name__)
    
    # CORS yapılandırması
    origins = os.getenv('CORS_ALLOW_ORIGINS', 'http://localhost:3000,http://localhost:5173').split(',')
    methods = os.getenv('CORS_ALLOW_METHODS', 'GET,POST,PUT,DELETE').split(',')
    headers = os.getenv('CORS_ALLOW_HEADERS', 'Content-Type,Authorization').split(',')
    
    CORS(app, resources={r"/api/*": {"origins": origins, "methods": methods, "allowed_headers": headers}})
    
    # Blueprint'leri kaydet
    app.register_blueprint(auth, url_prefix='/api/auth')
    app.register_blueprint(courses, url_prefix='/api/courses')
    app.register_blueprint(attendance_routes, url_prefix='/api/attendance')
    app.register_blueprint(veri_topla, url_prefix='/api/student')  # Yeni blueprint'i kaydet
    app.register_blueprint(face_attendance, url_prefix='/api/face-attendance')
    app.register_blueprint(student_data, url_prefix='/api/student')

    return app
