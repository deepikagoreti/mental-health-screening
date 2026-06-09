from flask import Flask, request, jsonify, session, send_from_directory, render_template
from flask_cors import CORS
from config import Config
import db_helper
import auth_helper
import nlp_utils
import os
from datetime import datetime, timezone

def format_datetime_tz(val):
    if not val:
        return val
    if isinstance(val, str):
        # Convert "2026-06-04 18:02:19" to "2026-06-04T18:02:19Z"
        val = val.replace(' ', 'T')
        if not val.endswith('Z') and '+' not in val and '-' not in val[10:]:
            val += 'Z'
        return val
    elif isinstance(val, datetime):
        if val.tzinfo is None:
            val = val.replace(tzinfo=timezone.utc)
        return val.isoformat()
    return val

app = Flask(
    __name__,
    static_folder='../frontend/static',
    template_folder='../frontend/templates'
)
app.config.from_object(Config)

# Enable CORS for development flexibility
CORS(app, supports_credentials=True)

# Disable browser caching for development
@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '-1'
    return response

# Initialize database schema tables on startup
db_helper.init_db()

# Helper decorator to check authentication
def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({"error": "Unauthorized. Please log in."}), 401
        return f(*args, **kwargs)
    return decorated_function

# ----------------- Page Template Routing -----------------

@app.route('/')
@app.route('/login')
def serve_login():
    return render_template('login.html')

@app.route('/dashboard')
def serve_dashboard():
    return render_template('dashboard.html')

@app.route('/screening')
def serve_screening():
    return render_template('screening.html')

@app.route('/breathing')
def serve_breathing():
    return render_template('breathing.html')

@app.route('/journal')
def serve_journal():
    return render_template('journal.html')

@app.route('/resources')
def serve_resources():
    return render_template('resources.html')

@app.route('/admin')
def serve_admin():
    return render_template('admin.html')

# ----------------- Auth API Endpoints -----------------

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    role = data.get('role', 'user').strip()
    
    if role not in ['user', 'admin']:
        role = 'user'
        
    if not username or not email or not password:
        return jsonify({"error": "Username, email, and password are required."}), 400
        
    try:
        # Check if username or email already exists
        existing = db_helper.execute_read(
            "SELECT id FROM users WHERE username = ? OR email = ?",
            (username, email)
        )
        if existing:
            return jsonify({"error": "Username or Email already registered."}), 409
            
        hashed_pw = auth_helper.hash_password(password)
        
        # Insert user
        new_user_id = db_helper.execute_write(
            "INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)",
            (username, email, hashed_pw, role)
        )
        
        user_dict = {
            "id": new_user_id,
            "username": username,
            "email": email,
            "role": role,
            "created_at": None
        }
        return jsonify({"message": "Registration successful! You can now log in.", "user": user_dict}), 201
    except Exception as e:
        return jsonify({"error": f"Server database error: {str(e)}"}), 500

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username_or_email = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not username_or_email or not password:
        return jsonify({"error": "Username/email and password are required."}), 400
        
    try:
        # Search by username or email
        users = db_helper.execute_read(
            "SELECT * FROM users WHERE username = ? OR email = ?",
            (username_or_email, username_or_email)
        )
        
        if users:
            user = users[0]
            if auth_helper.verify_password(password, user['password_hash']):
                session['user_id'] = user['id']
                session['username'] = user['username']
                session['role'] = user['role']
                
                # Log successful login to history
                try:
                    db_helper.execute_write(
                        "INSERT INTO login_history (user_id) VALUES (?)",
                        (user['id'],)
                    )
                except Exception as ex:
                    print("Warning: login history recording failed:", ex)
                
                user_dict = {
                    "id": user['id'],
                    "username": user['username'],
                    "email": user['email'],
                    "role": user['role']
                }
                return jsonify({"message": "Login successful!", "user": user_dict}), 200
                
        return jsonify({"error": "Invalid username/email or password."}), 401
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.pop('user_id', None)
    session.pop('username', None)
    session.pop('role', None)
    return jsonify({"message": "Logged out successfully!"}), 200

@app.route('/api/auth/me', methods=['GET'])
def get_current_user():
    if 'user_id' in session:
        try:
            users = db_helper.execute_read(
                "SELECT id, username, email, role, created_at FROM users WHERE id = ?",
                (session['user_id'],)
            )
            if users:
                user = users[0]
                user['created_at'] = format_datetime_tz(user.get('created_at'))
                return jsonify({"logged_in": True, "user": user}), 200
        except Exception as e:
            print("Session user retrieval error:", e)
            
    return jsonify({"logged_in": False}), 200

# ----------------- Admin API Endpoints -----------------

@app.route('/api/admin/stats', methods=['GET'])
@login_required
def get_admin_stats():
    # Verify administrator role
    user_id = session['user_id']
    user_role = session.get('role')
    
    # Secure fallback database check for role
    if not user_role or user_role != 'admin':
        users = db_helper.execute_read("SELECT role FROM users WHERE id = ?", (user_id,))
        if not users or users[0]['role'] != 'admin':
            return jsonify({"error": "Forbidden. Administrator role required."}), 403
            
    try:
        # 1. Total Metrics
        total_students_res = db_helper.execute_read("SELECT COUNT(*) as count FROM users WHERE role = 'user'")
        total_students = total_students_res[0]['count'] if total_students_res else 0
        
        total_screenings_res = db_helper.execute_read("SELECT COUNT(*) as count FROM screening_results")
        total_screenings = total_screenings_res[0]['count'] if total_screenings_res else 0
        
        total_journals_res = db_helper.execute_read("SELECT COUNT(*) as count FROM journal_entries")
        total_journals = total_journals_res[0]['count'] if total_journals_res else 0
        
        # 2. Risk levels distribution
        risk_res = db_helper.execute_read("SELECT risk_category, COUNT(*) as count FROM screening_results GROUP BY risk_category")
        risk_dist = {}
        for row in risk_res:
            risk_dist[row['risk_category']] = row['count']
            
        # Ensure default keys exist
        for key in ["Low Risk (Mild/Normal)", "Moderate Risk", "High Risk (Severe)"]:
            if key not in risk_dist:
                risk_dist[key] = 0
                
        # 3. Journal theme frequency aggregation
        themes_res = db_helper.execute_read("SELECT key_themes FROM journal_entries WHERE key_themes IS NOT NULL AND key_themes != ''")
        theme_counts = {}
        for row in themes_res:
            themes = [t.strip() for t in row['key_themes'].split(',') if t.strip()]
            for theme in themes:
                theme_counts[theme] = theme_counts.get(theme, 0) + 1
                
        # 4. Severe risk alerts table
        alerts = db_helper.execute_read(
            """
            SELECT sr.id, sr.stress_score, sr.anxiety_score, sr.risk_category, sr.feedback, sr.created_at, u.username, u.email
            FROM screening_results sr
            LEFT JOIN users u ON sr.user_id = u.id
            WHERE sr.risk_category LIKE '%High%' OR sr.risk_category LIKE '%Severe%'
            ORDER BY sr.created_at DESC
            """
        )
        
        # Format Alert Datetime
        for alert in alerts:
            alert['created_at'] = format_datetime_tz(alert.get('created_at'))
            if not alert.get('username'):
                alert['username'] = "Anonymous"
                alert['email'] = "anonymous@student.edu"
                
        # 5. List of registered users with their last login date
        users_list = db_helper.execute_read(
            """
            SELECT u.id, u.username, u.email, u.role, u.created_at, MAX(lh.login_time) as last_login
            FROM users u
            LEFT JOIN login_history lh ON u.id = lh.user_id
            GROUP BY u.id
            ORDER BY u.created_at DESC
            """
        )
        for u_item in users_list:
            u_item['created_at'] = format_datetime_tz(u_item.get('created_at'))
            u_item['last_login'] = format_datetime_tz(u_item.get('last_login'))
                
        return jsonify({
            "total_students": total_students,
            "total_screenings": total_screenings,
            "total_journals": total_journals,
            "risk_distribution": risk_dist,
            "top_themes": theme_counts,
            "alerts": alerts,
            "users": users_list
        }), 200
        
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve admin stats: {str(e)}"}), 500

# ----------------- Screening API Endpoints -----------------

@app.route('/api/screening/submit', methods=['POST'])
def submit_screening():
    """
    Submits standard quiz results. Supports logged-in or anonymous entries.
    """
    data = request.get_json() or {}
    stress_score = data.get('stress_score')
    anxiety_score = data.get('anxiety_score')
    risk_category = data.get('risk_category')
    feedback = data.get('feedback')
    
    if stress_score is None or anxiety_score is None or not risk_category or not feedback:
        return jsonify({"error": "Missing required screening fields."}), 400
        
    user_id = session.get('user_id') # Will be None if anonymous
    
    try:
        new_result_id = db_helper.execute_write(
            "INSERT INTO screening_results (user_id, stress_score, anxiety_score, risk_category, feedback) VALUES (?, ?, ?, ?, ?)",
            (user_id, int(stress_score), int(anxiety_score), risk_category, feedback)
        )
        
        result_dict = {
            "id": new_result_id,
            "user_id": user_id,
            "stress_score": stress_score,
            "anxiety_score": anxiety_score,
            "risk_category": risk_category,
            "feedback": feedback,
            "created_at": format_datetime_tz(datetime.now(timezone.utc))
        }
        return jsonify({"message": "Screening saved successfully!", "result": result_dict}), 201
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500

@app.route('/api/screening/chat', methods=['POST'])
def submit_chat_screening():
    """
    Analyzes chat history log and computes stress/anxiety indices.
    """
    data = request.get_json() or {}
    dialogue = data.get('dialogue', [])
    
    if not dialogue:
        return jsonify({"error": "No chat logs provided for analysis."}), 400
        
    stress, anxiety, category, feedback = nlp_utils.analyze_conversational_screening(dialogue)
    user_id = session.get('user_id')
    
    try:
        new_result_id = db_helper.execute_write(
            "INSERT INTO screening_results (user_id, stress_score, anxiety_score, risk_category, feedback) VALUES (?, ?, ?, ?, ?)",
            (user_id, stress, anxiety, category, feedback)
        )
        
        result_dict = {
            "id": new_result_id,
            "user_id": user_id,
            "stress_score": stress,
            "anxiety_score": anxiety,
            "risk_category": category,
            "feedback": feedback,
            "created_at": format_datetime_tz(datetime.now(timezone.utc))
        }
        return jsonify({
            "message": "Chat screening processed successfully!",
            "result": result_dict
        }), 201
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500

@app.route('/api/screening/history', methods=['GET'])
@login_required
def get_screening_history():
    user_id = session['user_id']
    try:
        results = db_helper.execute_read(
            "SELECT * FROM screening_results WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,)
        )
        # Format dates
        for r in results:
            r['created_at'] = format_datetime_tz(r.get('created_at'))
        return jsonify(results), 200
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500

# ----------------- Journal API Endpoints -----------------

@app.route('/api/journal/submit', methods=['POST'])
@login_required
def submit_journal():
    data = request.get_json() or {}
    entry_text = data.get('entry_text', '').strip()
    
    if not entry_text:
        return jsonify({"error": "Journal entry cannot be empty."}), 400
        
    user_id = session['user_id']
    analysis = nlp_utils.analyze_sentiment(entry_text)
    
    try:
        new_entry_id = db_helper.execute_write(
            "INSERT INTO journal_entries (user_id, entry_text, sentiment_score, sentiment_label, key_themes) VALUES (?, ?, ?, ?, ?)",
            (user_id, entry_text, analysis['sentiment_score'], analysis['sentiment_label'], analysis['key_themes'])
        )
        
        entry_dict = {
            "id": new_entry_id,
            "user_id": user_id,
            "entry_text": entry_text,
            "sentiment_score": analysis['sentiment_score'],
            "sentiment_label": analysis['sentiment_label'],
            "key_themes": analysis['key_themes'].split(', ') if analysis['key_themes'] else [],
            "created_at": format_datetime_tz(datetime.now(timezone.utc)),
            "advice": analysis['response_feedback']
        }
        return jsonify({"message": "Journal saved and analyzed!", "entry": entry_dict}), 201
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500

@app.route('/api/journal/history', methods=['GET'])
@login_required
def get_journal_history():
    user_id = session['user_id']
    try:
        entries = db_helper.execute_read(
            "SELECT * FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC",
            (user_id,)
        )
        # Format list and date formats
        formatted = []
        for e in entries:
            formatted.append({
                "id": e['id'],
                "user_id": e['user_id'],
                "entry_text": e['entry_text'],
                "sentiment_score": e['sentiment_score'],
                "sentiment_label": e['sentiment_label'],
                "key_themes": e['key_themes'].split(', ') if e['key_themes'] else [],
                "created_at": format_datetime_tz(e.get('created_at'))
            })
        return jsonify(formatted), 200
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500


if __name__ == '__main__':
    # Default to localhost:5000 for standard testing
    app.run(host='0.0.0.0', port=5000, debug=True)
