import os

class Config:
    # Flask configuration
    SECRET_KEY = os.environ.get('SECRET_KEY', 'mindhaven-secret-key-1293847')
    
    # Database configuration
    # By default, falls back to local SQLite 'mhsp.db' in the project directory
    MYSQL_USER = os.environ.get('DB_USER', 'root')
    MYSQL_PASSWORD = os.environ.get('DB_PASSWORD', '')
    MYSQL_HOST = os.environ.get('DB_HOST', 'localhost')
    MYSQL_PORT = os.environ.get('DB_PORT', '3306')
    MYSQL_DB = os.environ.get('DB_NAME', 'mhsp_db')
    
    # If DB_USER is provided and DB_PASSWORD or custom host, build MySQL URI, otherwise use SQLite
    # You can also set DATABASE_URL environment variable directly for production/custom setups
    if os.environ.get('DATABASE_URL'):
        SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL')
    elif os.environ.get('USE_MYSQL') == 'true' or (os.environ.get('DB_HOST') and os.environ.get('DB_NAME')):
        SQLALCHEMY_DATABASE_URI = f"mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DB}"
    else:
        SQLALCHEMY_DATABASE_URI = "sqlite:///mhsp.db"
        
    SQLALCHEMY_TRACK_MODIFICATIONS = False
