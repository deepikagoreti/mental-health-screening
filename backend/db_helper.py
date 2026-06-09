import os
import sqlite3
import pymysql
from pymysql.cursors import DictCursor
from config import Config

# Helper to check if MySQL is configured
def is_mysql_configured():
    # If explicitly enabled, or if host/dbname are defined
    return (os.environ.get('USE_MYSQL') == 'true' or 
            (os.environ.get('DB_HOST') and os.environ.get('DB_NAME')))

# Create MySQL database if it doesn't exist
def create_mysql_db_if_not_exists():
    try:
        # Connect to MySQL server without selecting a database
        conn = pymysql.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            port=int(Config.MYSQL_PORT)
        )
        with conn.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {Config.MYSQL_DB}")
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Warning: Failed to auto-create MySQL database. Details: {e}")

# Get Connection object
def get_db_connection():
    if is_mysql_configured():
        create_mysql_db_if_not_exists()
        return pymysql.connect(
            host=Config.MYSQL_HOST,
            user=Config.MYSQL_USER,
            password=Config.MYSQL_PASSWORD,
            database=Config.MYSQL_DB,
            port=int(Config.MYSQL_PORT),
            cursorclass=DictCursor
        )
    else:
        # Local SQLite relative to the file's directory
        db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "mhsp.db")
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row # Return dictionary-like rows
        # Enable foreign key support
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

# Execute Write query (INSERT, UPDATE, DELETE)
def execute_write(query, params=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        # SQLite uses '?' as placeholder, PyMySQL uses '%s'.
        # We replace '?' with '%s' dynamically if connecting to MySQL
        if is_mysql_configured():
            query = query.replace('?', '%s')
            
        cursor.execute(query, params or ())
        conn.commit()
        
        # Get last inserted ID
        last_id = cursor.lastrowid
        return last_id
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        cursor.close()
        conn.close()

# Execute Read query (SELECT)
def execute_read(query, params=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        if is_mysql_configured():
            query = query.replace('?', '%s')
            
        cursor.execute(query, params or ())
        
        # Fetch rows
        if is_mysql_configured():
            results = cursor.fetchall() # Returns list of dicts directly
        else:
            rows = cursor.fetchall()
            # Convert SQLite row objects to standard dicts
            results = [dict(row) for row in rows]
            
        return results
    finally:
        cursor.close()
        conn.close()

# Initialize Database Schema
def init_db():
    if is_mysql_configured():
        print("Initializing MySQL Schema...")
        create_mysql_db_if_not_exists()
        
        queries = [
            """
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(80) UNIQUE NOT NULL,
                email VARCHAR(120) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(20) DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB;
            """,
            """
            CREATE TABLE IF NOT EXISTS screening_results (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NULL,
                stress_score INT NOT NULL,
                anxiety_score INT NOT NULL,
                risk_category VARCHAR(50) NOT NULL,
                feedback TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
            """,
            """
            CREATE TABLE IF NOT EXISTS journal_entries (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                entry_text TEXT NOT NULL,
                sentiment_score DOUBLE NOT NULL,
                sentiment_label VARCHAR(50) NOT NULL,
                key_themes VARCHAR(255) NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
            """,
            """
            CREATE TABLE IF NOT EXISTS login_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB;
            """
        ]
        
        conn = get_db_connection()
        cursor = conn.cursor()
        try:
            for q in queries:
                cursor.execute(q)
            conn.commit()
            
            # Try database migration (in case db was created previously without role column)
            try:
                cursor.execute("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'")
                conn.commit()
                print("MySQL database migrated (role column verified).")
            except Exception:
                pass # Already exists
                
            print("MySQL tables initialized successfully.")
        except Exception as e:
            conn.rollback()
            print(f"Error initializing MySQL tables: {e}")
            raise e
        finally:
            cursor.close()
            conn.close()
    else:
        print("Initializing SQLite Schema...")
        queries = [
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS screening_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NULL,
                stress_score INTEGER NOT NULL,
                anxiety_score INTEGER NOT NULL,
                risk_category TEXT NOT NULL,
                feedback TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS journal_entries (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                entry_text TEXT NOT NULL,
                sentiment_score REAL NOT NULL,
                sentiment_label TEXT NOT NULL,
                key_themes TEXT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """,
            """
            CREATE TABLE IF NOT EXISTS login_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            """
        ]
        
        conn = get_db_connection()
        try:
            for q in queries:
                conn.execute(q)
            conn.commit()
            
            # Try database migration
            try:
                conn.execute("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'")
                conn.commit()
                print("SQLite database migrated (role column verified).")
            except Exception:
                pass # Already exists
                
            print("SQLite tables initialized successfully.")
        except Exception as e:
            conn.rollback()
            print(f"Error initializing SQLite tables: {e}")
            raise e
        finally:
            conn.close()
