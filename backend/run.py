from app import create_app
import os
from dotenv import load_dotenv

# .env dosyasını yükle
load_dotenv()

app = create_app()

if __name__ == '__main__':
    # Ortam değişkenlerinden port ve debug modunu al
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() in ('true', '1', 't')
    
    # Fix: Student face cache'i yükle
    from app.routes.face_attendance import load_student_faces
    load_student_faces()
    
    print(f"Sunucu başlatılıyor: http://localhost:{port}")
    print(f"Debug modu: {'Açık' if debug else 'Kapalı'}")
    
    app.run(debug=debug, host='0.0.0.0', port=port)