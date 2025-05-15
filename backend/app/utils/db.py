from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB bağlantısı
def get_db():
    try:
        connection_string = os.getenv('MONGO_URI')
        client = MongoClient(connection_string)
        db = client['yoklama_sitemi']
        print("Veritabanına başarıyla bağlanıldı.")
        return db
    except Exception as e:
        print(f"MongoDB bağlantı hatası: {e}")
        raise e
