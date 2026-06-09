/* ==========================================================================
   MINDEASE SHARED AUTH & ROLE ACCESS CONTROLLER
   ========================================================================== */

const API = {
    authMe: '/api/auth/me',
    login: '/api/auth/login',
    register: '/api/auth/register',
    logout: '/api/auth/logout',
    submitScreening: '/api/screening/submit',
    submitChatScreening: '/api/screening/chat',
    screeningHistory: '/api/screening/history',
    submitJournal: '/api/journal/submit',
    journalHistory: '/api/journal/history'
};

const state = {
    user: null,
    screeningHistory: [],
    journalEntries: [],
    isOffline: false
};

// Global alert toast alias
function showToast(message, type = 'info') {
    showGlobalToast(message, type);
}

// Mock Handler mimicking Flask API routes in local browser database
function mockApiHandler(url, options) {
    const data = options.body ? JSON.parse(options.body) : null;
    
    if (url === API.authMe) {
        const storedUser = localStorage.getItem('mock_user');
        return storedUser ? { logged_in: true, user: JSON.parse(storedUser) } : { logged_in: false };
    }
    
    if (url === API.login) {
        const username = data.username;
        const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
        const user = users.find(u => u.username === username || u.email === username);
        if (user) {
            localStorage.setItem('mock_user', JSON.stringify(user));
            return { message: "Mock Login Successful", user };
        }
        throw new Error("Invalid username or password in local offline database.");
    }
    
    if (url === API.register) {
        const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
        const userExists = users.some(u => u.username === data.username || u.email === data.email);
        if (userExists) throw new Error("Mock Username or Email already exists.");
        
        const newUser = { id: Date.now(), username: data.username, email: data.email, role: data.role || 'user', created_at: new Date().toISOString() };
        users.push(newUser);
        localStorage.setItem('mock_users', JSON.stringify(users));
        return { message: "Mock Registration Successful", user: newUser };
    }
    
    if (url === API.logout) {
        localStorage.removeItem('mock_user');
        return { message: "Mock Logged out" };
    }
    
    // Screening results
    if (url === API.submitScreening || url === API.submitChatScreening) {
        const results = JSON.parse(localStorage.getItem('mock_screening') || '[]');
        let finalData;
        if (url === API.submitChatScreening) {
            const userDialogue = data.dialogue.filter(d => d.sender === 'user').map(d => d.text).join(' ').toLowerCase();
            let score = Math.min(Math.max(Math.floor(userDialogue.split(' ').length / 5), 2), 21);
            if (userDialogue.includes('stress') || userDialogue.includes('exams') || userDialogue.includes('tired')) score += 5;
            if (userDialogue.includes('anxious') || userDialogue.includes('panic') || userDialogue.includes('scared')) score += 5;
            score = Math.min(score, 21);
            
            const cat = score >= 14 ? "High Risk (Severe)" : score >= 8 ? "Moderate Risk" : "Low Risk (Mild/Normal)";
            const feedback = score >= 14 ? "Severe indicators. Please call Tele-MANAS or contact a counselor immediately." :
                             score >= 8 ? "Moderate indicators. We suggest practicing daily breathing and establishing healthy sleep routines." :
                             "Healthy wellness levels detected. Keep it up!";
            
            finalData = {
                id: Date.now(),
                user_id: 1,
                stress_score: score,
                anxiety_score: Math.max(score - 2, 0),
                risk_category: cat,
                feedback: feedback,
                created_at: new Date().toISOString()
            };
        } else {
            finalData = {
                id: Date.now(),
                user_id: 1,
                stress_score: data.stress_score,
                anxiety_score: data.anxiety_score,
                risk_category: data.risk_category,
                feedback: data.feedback,
                created_at: new Date().toISOString()
            };
        }
        results.push(finalData);
        localStorage.setItem('mock_screening', JSON.stringify(results));
        return { message: "Screening saved offline", result: finalData };
    }
    
    if (url === API.screeningHistory) {
        return JSON.parse(localStorage.getItem('mock_screening') || '[]');
    }
    
    // Journal Entries
    if (url === API.submitJournal) {
        const text = data.entry_text.toLowerCase();
        let score = 0.0;
        let label = 'Neutral';
        let advice = "Your entry reflects a balanced mood. Keep journaling regularly.";
        let themes = [];
        
        if (text.includes('exam') || text.includes('study') || text.includes('deadline')) {
            themes.push('academic stress');
            score -= 0.4;
            advice = "Academics can be tough. Break down tasks and try the Pomodoro technique.";
        }
        if (text.includes('anxious') || text.includes('panic') || text.includes('worry') || text.includes('scared')) {
            themes.push('anxiety');
            score -= 0.5;
            advice = "I noticed anxiety signals. Try practicing our 4-7-8 breathing breathing method.";
        }
        if (text.includes('happy') || text.includes('good') || text.includes('calm') || text.includes('relax')) {
            themes.push('positive reflection');
            score += 0.6;
            advice = "Wonderful! Continue celebrating tiny victories and keeping a positive focus.";
        }
        
        if (score < -0.2) label = themes[0] ? themes[0].toUpperCase() : 'STRESS';
        else if (score > 0.2) label = 'POSITIVE';
        
        const newEntry = {
            id: Date.now(),
            entry_text: data.entry_text,
            sentiment_score: score,
            sentiment_label: label,
            key_themes: themes,
            created_at: new Date().toISOString(),
            advice: advice
        };
        
        const entries = JSON.parse(localStorage.getItem('mock_journal') || '[]');
        entries.push(newEntry);
        localStorage.setItem('mock_journal', JSON.stringify(entries));
        return { message: "Journal saved offline", entry: newEntry };
    }
    
    if (url === API.journalHistory) {
        return JSON.parse(localStorage.getItem('mock_journal') || '[]');
    }
    
    if (url === '/api/admin/stats') {
        const users = JSON.parse(localStorage.getItem('mock_users') || '[]');
        const screenings = JSON.parse(localStorage.getItem('mock_screening') || '[]');
        const journals = JSON.parse(localStorage.getItem('mock_journal') || '[]');
        
        const riskDist = {
            "Low Risk (Mild/Normal)": 0,
            "Moderate Risk": 0,
            "High Risk (Severe)": 0
        };
        screenings.forEach(s => {
            riskDist[s.risk_category] = (riskDist[s.risk_category] || 0) + 1;
        });
        
        const themes = {};
        journals.forEach(j => {
            if (j.key_themes) {
                j.key_themes.forEach(t => {
                    themes[t] = (themes[t] || 0) + 1;
                });
            }
        });
        
        const alerts = screenings.filter(s => s.risk_category.includes('High') || s.risk_category.includes('Severe')).map(s => {
            return {
                id: s.id,
                username: "Mock Student",
                email: "mockstudent@school.edu",
                stress_score: s.stress_score,
                anxiety_score: s.anxiety_score,
                risk_category: s.risk_category,
                created_at: s.created_at
            };
        });
        
        return {
            total_students: users.filter(u => u.role !== 'admin').length,
            total_screenings: screenings.length,
            total_journals: journals.length,
            risk_distribution: riskDist,
            top_themes: themes,
            alerts: alerts
        };
    }
    
    return {};
}

async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || `HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.warn(`API Request to ${url} failed. Fallback to LocalStorage fallback system:`, error.message);
        state.isOffline = true;
        return mockApiHandler(url, options);
    }
}

// Define page authorization requirements
// Key: path pathname, Value: required role (null means anyone, 'user'/'admin' means specific)
const PAGE_AUTH_RULES = {
    '/dashboard': 'user',
    '/screening': 'user',
    '/breathing': 'user',
    '/resources': 'user',
    '/admin': 'admin'
};

document.addEventListener('DOMContentLoaded', async () => {
    // Render general Lucide icons
    if (window.lucide) {
        lucide.createIcons();
    }

    // Initialize Theme (Dark/Light)
    initSharedTheme();

    // Initialize Language (English/Hindi/Telugu)
    initSharedLanguage();

    // Check session
    await checkUserSession();
});

// Language Initialization Handler
function initSharedLanguage() {
    if (typeof getActiveLanguage === 'function' && typeof translatePage === 'function') {
        const lang = getActiveLanguage();
        translatePage(lang);
        
        const langSelector = document.getElementById('lang-selector');
        if (langSelector) {
            langSelector.value = lang;
            langSelector.addEventListener('change', (e) => {
                setActiveLanguage(e.target.value);
            });
        }
    }
}

// Theme Toggle Handler
function initSharedTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggleIcons(savedTheme);
    
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) {
        themeBtn.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeToggleIcons(newTheme);
        });
    }
}

function updateThemeToggleIcons(theme) {
    const sunIcon = document.getElementById('sun-icon');
    const moonIcon = document.getElementById('moon-icon');
    if (!sunIcon || !moonIcon) return;
    
    if (theme === 'dark') {
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    } else {
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
    }
}

// Session Checker & Role Protector
async function checkUserSession() {
    const pathname = window.location.pathname;
    if (pathname === '/journal') {
        window.location.href = '/dashboard';
        return;
    }
    try {
        const response = await fetch(API.authMe);
        const data = await response.json();
        
        const requiredRole = PAGE_AUTH_RULES[pathname];
        
        if (data.logged_in) {
            const user = data.user;
            updateNavbarUI(user);
            
            // Redirect rules for logged in users
            if (pathname === '/login') {
                // If logged in, don't let them stay on login page
                if (user.role === 'admin') {
                    window.location.href = '/admin';
                } else {
                    window.location.href = '/dashboard';
                }
                return;
            }
            
            // If they are on a page that requires a different role
            if (requiredRole && user.role !== requiredRole) {
                // Student trying to open Admin
                if (user.role === 'user' && requiredRole === 'admin') {
                    window.location.href = '/dashboard';
                }
                // Admin trying to open Student pages
                else if (user.role === 'admin' && requiredRole === 'user') {
                    window.location.href = '/admin';
                }
            }
        } else {
            updateNavbarUI(null);
            
            // Redirect to login if page is protected
            if (requiredRole) {
                window.location.href = '/login';
            }
        }
    } catch (error) {
        console.error("Session check failed:", error);
    }
}

// Update Navbar tags, greetings, and roles visibility
function updateNavbarUI(user) {
    const authBtn = document.getElementById('btn-auth-trigger');
    const profileSection = document.getElementById('logged-in-profile');
    const usernameLabel = document.getElementById('profile-username');
    
    const adminNavBtn = document.getElementById('btn-nav-admin');
    const screeningNavBtn = document.getElementById('btn-nav-screening');
    const breathingNavBtn = document.getElementById('btn-nav-breathing');
    const journalNavBtn = document.getElementById('btn-nav-journal');
    const resourcesNavBtn = document.getElementById('btn-nav-resources');
    const dashboardNavBtn = document.querySelector('#main-nav button[onclick*="dashboard"]') || document.querySelector('#main-nav button[onclick*="admin"]');
    
    const pathname = window.location.pathname;
    
    if (user) {
        if (authBtn) authBtn.classList.add('hidden');
        if (profileSection) profileSection.classList.remove('hidden');
        if (usernameLabel) usernameLabel.textContent = user.username;
        
        // Toggle tab elements based on role
        if (user.role === 'admin') {
            if (adminNavBtn) adminNavBtn.classList.add('hidden'); // Hide redundant admin panel button
            if (dashboardNavBtn) {
                dashboardNavBtn.setAttribute('onclick', "window.location.href='/admin'");
                if (pathname === '/admin') {
                    dashboardNavBtn.classList.add('active');
                }
            }
            if (screeningNavBtn) screeningNavBtn.classList.add('hidden');
            if (breathingNavBtn) breathingNavBtn.classList.add('hidden');
            if (journalNavBtn) journalNavBtn.classList.add('hidden');
            if (resourcesNavBtn) resourcesNavBtn.classList.add('hidden');
        } else {
            if (adminNavBtn) adminNavBtn.classList.add('hidden');
            if (dashboardNavBtn) {
                dashboardNavBtn.setAttribute('onclick', "window.location.href='/dashboard'");
            }
            if (screeningNavBtn) screeningNavBtn.classList.remove('hidden');
            if (breathingNavBtn) breathingNavBtn.classList.remove('hidden');
            if (journalNavBtn) journalNavBtn.classList.add('hidden'); // Hide Mood Journal for student
            if (resourcesNavBtn) resourcesNavBtn.classList.remove('hidden');
        }
    } else {
        if (authBtn) authBtn.classList.remove('hidden');
        if (profileSection) profileSection.classList.add('hidden');
        
        if (adminNavBtn) adminNavBtn.classList.add('hidden');
        if (dashboardNavBtn) {
            dashboardNavBtn.setAttribute('onclick', "window.location.href='/dashboard'");
        }
        if (screeningNavBtn) screeningNavBtn.classList.remove('hidden');
        if (breathingNavBtn) breathingNavBtn.classList.remove('hidden');
        if (journalNavBtn) journalNavBtn.classList.add('hidden'); // Hide Mood Journal for anonymous users too
        if (resourcesNavBtn) resourcesNavBtn.classList.remove('hidden');
    }
    
    // Add Logout listener
    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
        // Clone to remove previous listeners and add clean logout trigger
        const newLogout = logoutBtn.cloneNode(true);
        logoutBtn.parentNode.replaceChild(newLogout, logoutBtn);
        newLogout.addEventListener('click', handleLogout);
    }
}

async function handleLogout() {
    try {
        const response = await fetch(API.logout, { method: 'POST' });
        if (response.ok) {
            window.location.href = '/login';
        }
    } catch (e) {
        console.error("Logout failed:", e);
    }
}

// Global alert utility
function showGlobalToast(message, type = 'info') {
    const toast = document.getElementById('toast-alert');
    const toastMsg = document.getElementById('toast-message');
    const toastIcon = document.getElementById('toast-icon');
    if (!toast || !toastMsg || !toastIcon) return;
    
    toastMsg.textContent = message;
    
    if (type === 'success') {
        toastIcon.setAttribute('data-lucide', 'check-circle-2');
        toastIcon.style.stroke = 'var(--color-purple)';
    } else if (type === 'error') {
        toastIcon.setAttribute('data-lucide', 'alert-circle');
        toastIcon.style.stroke = 'var(--color-red)';
    } else {
        toastIcon.setAttribute('data-lucide', 'info');
        toastIcon.style.stroke = 'var(--primary)';
    }
    
    if (window.lucide) {
        lucide.createIcons();
    }
    
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 4000);
}
