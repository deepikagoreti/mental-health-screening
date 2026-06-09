import re

# Lexicons for word categorization
LEXICONS = {
    'academic_stress': [
        'exam', 'test', 'study', 'studies', 'grade', 'marks', 'score', 'assignment', 
        'homework', 'deadline', 'syllabus', 'professor', 'teacher', 'college', 'school',
        'burnout', 'project', 'lecture', 'fail', 'pressure', 'rank'
    ],
    'anxiety': [
        'anxious', 'anxiety', 'panic', 'worry', 'worried', 'scared', 'fear', 'frightened', 
        'nervous', 'shaking', 'sweat', 'breathless', 'dread', 'tense', 'overthink', 'heartbeat',
        'chest', 'tremble', 'uneasy', 'terrified'
    ],
    'depression_sadness': [
        'sad', 'depressed', 'depression', 'lonely', 'alone', 'cry', 'crying', 'hopeless', 
        'worthless', 'empty', 'miserable', 'grief', 'unhappy', 'low', 'down', 'give up', 
        'darkness', 'isolated', 'hurt'
    ],
    'physical_fatigue': [
        'tired', 'exhausted', 'sleep', 'insomnia', 'fatigue', 'awake', 'nightmare', 
        'headache', 'dizzy', 'weak', 'drain', 'drained', 'sleepy', 'restless'
    ],
    'social_relationship': [
        'friend', 'friends', 'relationship', 'breakup', 'fight', 'argument', 'parents', 
        'family', 'loneliness', 'isolated', 'bully', 'peer', 'social', 'misunderstood'
    ],
    'positive_calm': [
        'happy', 'calm', 'peaceful', 'relax', 'relaxed', 'good', 'great', 'content', 
        'joy', 'excited', 'optimistic', 'hopeful', 'grateful', 'proud', 'accomplished',
        'confident', 'better', 'healed', 'energized', 'laugh', 'smile'
    ]
}

COPING_ADVICE = {
    'academic_stress': (
        "It seems you are feeling a lot of academic pressure. Try to break your study hours into smaller "
        "chunks (e.g., 25 minutes of studying followed by a 5-minute break using the Pomodoro Technique). "
        "Remember, your grades do not define your self-worth. Reach out to your tutor or study groups for guidance."
    ),
    'anxiety': (
        "I noticed indicators of anxiety or panic in your entry. When you feel overwhelmed, try the 5-4-3-2-1 "
        "grounding method: name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you "
        "can taste. You can also try our Guided Breathing exercise to calm your heart rate."
    ),
    'depression_sadness': (
        "It feels like you are carrying a heavy emotional load. Please remember you don't have to go through "
        "this alone. Try to write down one tiny thing you are grateful for today, even if it is just a warm cup "
        "of tea. If these feelings persist, talking to a counselor or trusted friend can help lighten the weight."
    ),
    'physical_fatigue': (
        "Your body might be signaling physical exhaustion or poor sleep. Try to establish a 'screen-free' routine "
        "30 minutes before bed. Keep your room cool and dark. Avoid caffeine late in the day, and let yourself rest "
        "without guilt."
    ),
    'social_relationship': (
        "Relationship issues or loneliness can be very painful. Try to connect with someone in a low-stakes setting, "
        "like joining a hobby club or talking to an old friend. If parent or peer pressure is heavy, setting soft boundaries "
        "and seeking counselor guidance is a healthy step."
    ),
    'general_negative': (
        "It sounds like you're going through a challenging phase right now. Be gentle with yourself. "
        "Self-care is not selfish; it is essential. Try taking a short walk outside or engaging in a hobby you enjoy."
    ),
    'positive': (
        "It is wonderful to hear that you are feeling positive and centered! Continue nurturing this state by "
        "journaling, exercising, and celebrating small victories. Share this positive energy with those around you!"
    )
}

def analyze_sentiment(text):
    """
    Analyzes text for emotional sentiment, flags stress/anxiety levels, detects key themes,
    and returns supportive feedback.
    """
    if not text or len(text.strip()) == 0:
        return {
            'sentiment_score': 0.0,
            'sentiment_label': 'Neutral',
            'key_themes': '',
            'response_feedback': "Write a journal entry to get feedback."
        }
        
    text_lower = text.lower()
    
    # Calculate keyword counts
    counts = {}
    total_negative = 0
    total_positive = 0
    
    for category, keywords in LEXICONS.items():
        count = 0
        for word in keywords:
            # Match word with boundary checks
            matches = len(re.findall(r'\b' + re.escape(word) + r'\w*\b', text_lower))
            count += matches
        counts[category] = count
        if category == 'positive_calm':
            total_positive += count
        else:
            total_negative += count
            
    # Calculate sentiment score between -1.0 and 1.0
    total_words = total_positive + total_negative
    if total_words > 0:
        sentiment_score = (total_positive - total_negative) / total_words
    else:
        sentiment_score = 0.0
        
    # Detect themes based on category match counts
    active_themes = []
    for category, count in counts.items():
        if category != 'positive_calm' and count > 0:
            active_themes.append(category.replace('_', ' '))
            
    # Fallback to general themes if none matches
    if not active_themes:
        if total_positive > 0:
            active_themes.append('positive reflection')
        else:
            active_themes.append('general reflection')
            
    key_themes = ", ".join(active_themes[:3]) # Limit to top 3 themes
    
    # Determine sentiment label and pick advice
    # Highest negative category determines advice
    highest_neg_cat = None
    highest_count = 0
    for cat, count in counts.items():
        if cat != 'positive_calm' and count > highest_count:
            highest_count = count
            highest_neg_cat = cat
            
    if sentiment_score < -0.2:
        if highest_neg_cat == 'anxiety':
            sentiment_label = 'Anxiety'
            advice = COPING_ADVICE['anxiety']
        elif highest_neg_cat == 'academic_stress':
            sentiment_label = 'Academic Stress'
            advice = COPING_ADVICE['academic_stress']
        elif highest_neg_cat == 'physical_fatigue':
            sentiment_label = 'Exhaustion'
            advice = COPING_ADVICE['physical_fatigue']
        elif highest_neg_cat == 'depression_sadness':
            sentiment_label = 'Sadness'
            advice = COPING_ADVICE['depression_sadness']
        elif highest_neg_cat == 'social_relationship':
            sentiment_label = 'Relationship Stress'
            advice = COPING_ADVICE['social_relationship']
        else:
            sentiment_label = 'Stress'
            advice = COPING_ADVICE['general_negative']
    elif sentiment_score > 0.2:
        sentiment_label = 'Calm / Positive'
        advice = COPING_ADVICE['positive']
    else:
        sentiment_label = 'Neutral'
        advice = "Your entry reflects a balanced mood. Keeping a regular mood journal helps maintain mental self-awareness. Keep it up!"
        
    return {
        'sentiment_score': round(float(sentiment_score), 2),
        'sentiment_label': sentiment_label,
        'key_themes': key_themes,
        'response_feedback': advice
    }

def analyze_conversational_screening(dialogue_history):
    """
    Analyzes a chatbot chat history to calculate an approximate stress & anxiety level
    similar to GAD-7 & PHQ-9 scales.
    Returns: (stress_score [0-21], anxiety_score [0-21], risk_category, feedback)
    """
    # Merge all user responses in dialogue
    user_text = " ".join([turn.get('text', '') for turn in dialogue_history if turn.get('sender') == 'user'])
    text_lower = user_text.lower()
    
    # Keywords linked to levels of severity
    mild_keywords = ['sometimes', 'a little', 'occasionally', 'bit', 'slightly', 'few times', 'busy']
    moderate_keywords = ['often', 'stress', 'hard', 'tired', 'difficult', 'worry', 'scared', 'bad', 'sleep', 'fail']
    severe_keywords = ['always', 'everyday', 'constantly', 'cannot cope', 'panic', 'shaking', 'depressed', 'lonely', 'hopeless', 'overwhelmed', 'terrible', 'worst']
    
    # Simple count scoring
    score_mild = sum(1 for w in mild_keywords if w in text_lower)
    score_mod = sum(2 for w in moderate_keywords if w in text_lower)
    score_sev = sum(3 for w in severe_keywords if w in text_lower)
    
    # Sum proxies
    base_score = score_mild + score_mod + score_sev
    
    # Map to clinical-like range (0 to 21 for GAD-7 or PHQ-9 proxies)
    # Clamp scores
    anxiety_score = min(max(base_score // 2, 1), 21)
    stress_score = min(max((base_score * 3) // 5, 1), 21)
    
    # Override if user explicitly typed certain phrases or length is very short
    if not user_text.strip():
        anxiety_score = 0
        stress_score = 0
        
    avg_score = (anxiety_score + stress_score) / 2
    
    if avg_score >= 15:
        category = "High Risk (Severe)"
        feedback = (
            "Based on our conversation, you appear to be experiencing high levels of stress and anxiety. "
            "We strongly recommend speaking to a professional campus counselor or calling a student helpline. "
            "Please don't carry this alone—support is available and can help you navigate this time."
        )
    elif avg_score >= 8:
        category = "Moderate Risk"
        feedback = (
            "Our dialogue indicates you are dealing with moderate stress and anxiety. It might be helpful to "
            "practice stress-management techniques such as deep breathing exercises "
            "and establishing regular sleep and study schedules. Consider talking to a friend or mentor."
        )
    else:
        category = "Low Risk (Mild/Normal)"
        feedback = (
            "Your stress and anxiety levels appear to be in a mild or normal range. This is great! "
            "To maintain your mental wellness, continue balancing your academic work with hobbies, "
            "staying physically active, and getting enough sleep."
        )
        
    return int(stress_score), int(anxiety_score), category, feedback
