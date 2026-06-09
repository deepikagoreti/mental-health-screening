/* ==========================================================================
   MINDEASE SCREENING CONTROLLER
   ========================================================================== */

// Assessment Standard Quiz questions
const QUIZ_QUESTIONS = [
    { text: "Feeling nervous, anxious, or on edge?", type: "anxiety" },
    { text: "Not being able to stop or control worrying?", type: "anxiety" },
    { text: "Trouble relaxing or sitting still?", type: "anxiety" },
    { text: "Becoming easily annoyed or irritable?", type: "anxiety" },
    { text: "Feeling afraid, as if something awful might happen?", type: "anxiety" },
    { text: "Little interest or pleasure in doing things?", type: "stress" },
    { text: "Feeling down, depressed, or hopeless?", type: "stress" },
    { text: "Trouble falling or staying asleep, or sleeping too much?", type: "stress" },
    { text: "Feeling tired or having little energy?", type: "stress" },
    { text: "Poor appetite or overeating?", type: "stress" }
];

// Initial Chat messages for Conversational Assessment
const INITIAL_CHAT_DIALOGUE = [
    { sender: 'bot', text: "Hello! I am Aria, your mental wellness assistant. I am here to help screen your stress and anxiety levels in a relaxed, friendly conversation." },
    { sender: 'bot', text: "To start, how have you been feeling over the last couple of weeks? Have you been feeling unusually tense, rushed, or worried?" }
];

// Conversational bot scripted follow-up questions
const BOT_FOLLOW_UPS = [
    "I understand. How has your sleep been lately? Are you having trouble resting or feeling constantly tired?",
    "School and academics can be very demanding. Are you feeling overwhelmed by homework, upcoming exams, or deadlines?",
    "How are you managing to balance your social life and personal relationships? Do you feel supported by friends and family, or lonely?",
    "Thank you for sharing that with me. I have analyzed our discussion. Would you like me to process your assessment and display your screening scores?"
];

document.addEventListener('DOMContentLoaded', () => {
    initScreeningController();
});

function initScreeningController() {
    let currentQuizIndex = 0;
    let quizAnswers = [];
    let chatDialogue = [];
    let currentChatIndex = 0;
    
    const selectorScreen = document.getElementById('screening-selector');
    const quizContainer = document.getElementById('screening-quiz-container');
    const chatContainer = document.getElementById('screening-chat-container');
    const resultsContainer = document.getElementById('screening-results-container');
    
    // Trigger standard quiz
    document.getElementById('btn-start-standard').addEventListener('click', () => {
        selectorScreen.classList.add('hidden');
        quizContainer.classList.remove('hidden');
        resultsContainer.classList.add('hidden');
        startQuiz();
    });
    
    // Cancel Quiz
    document.getElementById('btn-cancel-quiz').addEventListener('click', () => {
        quizContainer.classList.add('hidden');
        selectorScreen.classList.remove('hidden');
    });
    
    // Trigger chat screener
    document.getElementById('btn-start-chat-screen').addEventListener('click', () => {
        selectorScreen.classList.add('hidden');
        chatContainer.classList.remove('hidden');
        resultsContainer.classList.add('hidden');
        startChatScreen();
    });
    
    // Exit Chat
    document.getElementById('btn-exit-chat').addEventListener('click', () => {
        chatContainer.classList.add('hidden');
        selectorScreen.classList.remove('hidden');
    });

    // Quiz Options Click
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const score = parseInt(btn.getAttribute('data-score'));
            quizAnswers.push(score);
            
            currentQuizIndex++;
            if (currentQuizIndex < QUIZ_QUESTIONS.length) {
                renderQuizQuestion();
            } else {
                processQuizResults();
            }
        });
    });

    // Standard Quiz Logic
    function startQuiz() {
        currentQuizIndex = 0;
        quizAnswers = [];
        renderQuizQuestion();
    }
    
    function renderQuizQuestion() {
        const qKey = `q${currentQuizIndex + 1}`;
        const questionText = typeof getTranslation === 'function' ? getTranslation(qKey) : question.text;
        
        let qNumText = `Question ${currentQuizIndex + 1} of ${QUIZ_QUESTIONS.length}`;
        if (typeof getTranslation === 'function') {
            qNumText = getTranslation('quiz-q-num-label')
                .replace('{num}', currentQuizIndex + 1)
                .replace('{total}', QUIZ_QUESTIONS.length);
        }
        document.getElementById('quiz-q-num').textContent = qNumText;
        document.getElementById('quiz-q-text').textContent = questionText;
        
        // Progress Fill
        const percent = ((currentQuizIndex + 1) / QUIZ_QUESTIONS.length) * 100;
        document.getElementById('quiz-progress-fill').style.width = `${percent}%`;
    }
    
    async function processQuizResults() {
        // Calculate GAD-7 and PHQ-9 proxies
        let anxietyScore = 0;
        let stressScore = 0;
        
        QUIZ_QUESTIONS.forEach((q, idx) => {
            const ans = quizAnswers[idx];
            if (q.type === 'anxiety') anxietyScore += ans;
            else stressScore += ans;
        });
        
        // Scale values to fit clinical maximums (out of 21)
        const scaleFactor = 21 / 15;
        const finalAnxiety = Math.round(anxietyScore * scaleFactor);
        const finalStress = Math.round(stressScore * scaleFactor);
        const average = (finalAnxiety + finalStress) / 2;
        
        let riskCategory = "Low Risk (Mild/Normal)";
        let feedback = "Your screening score is low. Maintain a healthy lifestyle, stay active, and connect with loved ones.";
        
        if (average >= 14) {
            riskCategory = "High Risk (Severe)";
            feedback = "Severe stress and anxiety symptoms detected. We strongly suggest seeking counseling or dialing a campus helpline immediately.";
        } else if (average >= 8) {
            riskCategory = "Moderate Risk";
            feedback = "Moderate indicators detected. Practice deep breathing, balance workloads, and establish regular study routines.";
        }
        
        // Submit via API
        try {
            const response = await apiRequest(API.submitScreening, {
                method: 'POST',
                body: JSON.stringify({
                    stress_score: finalStress,
                    anxiety_score: finalAnxiety,
                    risk_category: riskCategory,
                    feedback: feedback
                })
            });
            
            showResultsScreen(response.result);
        } catch (error) {
            console.error("Quiz submission error:", error);
            showToast("Failed to save results.", "error");
        }
    }

    // Conversational Chat Screener Logic
    function startChatScreen() {
        chatDialogue = [];
        let text1 = "Hello! I am Aria, your mental wellness assistant. I am here to help screen your stress and anxiety levels in a relaxed, friendly conversation.";
        let text2 = "To start, how have you been feeling over the last couple of weeks? Have you been feeling unusually tense, rushed, or worried?";
        if (typeof getTranslation === 'function') {
            text1 = getTranslation('chat-init-1');
            text2 = getTranslation('chat-init-2');
        }
        chatDialogue.push({ sender: 'bot', text: text1 });
        chatDialogue.push({ sender: 'bot', text: text2 });
        currentChatIndex = 0;
        
        const chatWindow = document.getElementById('chat-messages');
        chatWindow.innerHTML = '';
        
        // Load initial system messages
        chatDialogue.forEach(msg => appendChatBubble(msg.sender, msg.text));
        
        // Event Listeners for send
        const sendBtn = document.getElementById('btn-chat-send');
        const userInput = document.getElementById('chat-user-input');
        
        // Remove previous listeners (cloning node removes them)
        const oldSend = sendBtn.cloneNode(true);
        sendBtn.parentNode.replaceChild(oldSend, sendBtn);
        
        const oldInput = userInput.cloneNode(true);
        userInput.parentNode.replaceChild(oldInput, userInput);
        
        document.getElementById('btn-chat-send').addEventListener('click', handleChatSend);
        document.getElementById('chat-user-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleChatSend();
        });
    }

    function appendChatBubble(sender, text) {
        const chatWindow = document.getElementById('chat-messages');
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${sender}`;
        bubble.textContent = text;
        chatWindow.appendChild(bubble);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }
    
    function showTypingIndicator() {
        const chatWindow = document.getElementById('chat-messages');
        const indicator = document.createElement('div');
        indicator.className = 'chat-bubble bot typing';
        indicator.id = 'chat-typing-indicator';
        indicator.innerHTML = '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
        chatWindow.appendChild(indicator);
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }
    
    function removeTypingIndicator() {
        const indicator = document.getElementById('chat-typing-indicator');
        if (indicator) indicator.remove();
    }
    
    async function handleChatSend() {
        const inputEl = document.getElementById('chat-user-input');
        const userText = inputEl.value.trim();
        if (!userText) return;
        
        inputEl.value = '';
        appendChatBubble('user', userText);
        chatDialogue.push({ sender: 'user', text: userText });
        
        // Wait and response
        showTypingIndicator();
        setTimeout(async () => {
            removeTypingIndicator();
            
            if (currentChatIndex < BOT_FOLLOW_UPS.length) {
                let nextQuestion = BOT_FOLLOW_UPS[currentChatIndex];
                if (typeof getTranslation === 'function') {
                    nextQuestion = getTranslation(`chat-follow-${currentChatIndex + 1}`);
                }
                appendChatBubble('bot', nextQuestion);
                chatDialogue.push({ sender: 'bot', text: nextQuestion });
                currentChatIndex++;
                
                // If it is the last confirmation dialog question
                if (currentChatIndex === BOT_FOLLOW_UPS.length) {
                    let optPrompt = "Please click Send or hit Enter to analyze your summary now.";
                    if (typeof getTranslation === 'function') {
                        optPrompt = getTranslation('chat-follow-confirm');
                    }
                    appendChatBubble('bot', optPrompt);
                }
            } else {
                // Done chatting, submit analysis
                chatContainer.classList.add('hidden');
                showTypingIndicator();
                
                try {
                    const response = await apiRequest(API.submitChatScreening, {
                        method: 'POST',
                        body: JSON.stringify({ dialogue: chatDialogue })
                    });
                    
                    removeTypingIndicator();
                    showResultsScreen(response.result);
                } catch (error) {
                    removeTypingIndicator();
                    console.error("Chat assessment error:", error);
                    showToast("Failed to analyze chatbot logs.", "error");
                }
            }
        }, 1200);
    }
    
    function showResultsScreen(result) {
        quizContainer.classList.add('hidden');
        chatContainer.classList.add('hidden');
        resultsContainer.classList.remove('hidden');
        
        let displayCategory = result.risk_category;
        let displayFeedback = result.feedback;
        if (typeof getTranslation === 'function') {
            if (result.risk_category === "Low Risk (Mild/Normal)") {
                displayCategory = getTranslation('risk-low');
                displayFeedback = getTranslation('feedback-low');
            } else if (result.risk_category === "Moderate Risk") {
                displayCategory = getTranslation('risk-mod');
                displayFeedback = getTranslation('feedback-mod');
            } else if (result.risk_category === "High Risk (Severe)") {
                displayCategory = getTranslation('risk-high');
                displayFeedback = getTranslation('feedback-high');
            }
        }
        
        document.getElementById('results-date-stamp').textContent = `Calculated on: ${new Date(result.created_at || Date.now()).toLocaleDateString()}`;
        document.getElementById('results-stress-score').textContent = Math.round(result.stress_score);
        document.getElementById('results-anxiety-score').textContent = Math.round(result.anxiety_score);
        document.getElementById('results-category-title').textContent = displayCategory;
        document.getElementById('results-feedback-desc').textContent = displayFeedback;
        
        // Update styling of circles depending on score
        const scoreColorEl = document.getElementById('results-category-color');
        const scoreColorAnxEl = document.getElementById('results-category-color-anx');
        
        // Reset classes
        scoreColorEl.className = 'score-circle-inner';
        scoreColorAnxEl.className = 'score-circle-inner';
        
        if (result.stress_score >= 14 || result.anxiety_score >= 14) {
            scoreColorEl.style.backgroundColor = 'var(--color-red)';
            scoreColorAnxEl.style.backgroundColor = 'var(--color-red)';
        } else if (result.stress_score >= 8 || result.anxiety_score >= 8) {
            scoreColorEl.style.backgroundColor = 'var(--secondary)';
            scoreColorAnxEl.style.backgroundColor = 'var(--secondary)';
        } else {
            scoreColorEl.style.backgroundColor = 'var(--primary)';
            scoreColorAnxEl.style.backgroundColor = 'var(--primary)';
        }
    }
}
