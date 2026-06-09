/* ==========================================================================
   MINDEASE JOURNAL CONTROLLER
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initJournalController();
    fetchJournalHistory();
});

function initJournalController() {
    const journalInput = document.getElementById('journal-input');
    const submitBtn = document.getElementById('btn-journal-submit');
    const clearBtn = document.getElementById('btn-journal-clear');
    const dateLabel = document.getElementById('journal-current-date');
    
    const analysisIdle = document.getElementById('journal-analysis-idle');
    const analysisActive = document.getElementById('journal-analysis-active');
    
    dateLabel.textContent = new Date().toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'});
    
    clearBtn.addEventListener('click', () => {
        journalInput.value = '';
    });
    
    submitBtn.addEventListener('click', async () => {
        const text = journalInput.value.trim();
        if (!text) {
            showToast("Please write down some thoughts before analyzing.", "info");
            return;
        }
        
        // Retrieve current session via fetch check
        let isUserLoggedIn = false;
        try {
            const authCheck = await fetch(API.authMe);
            const authData = await authCheck.json();
            isUserLoggedIn = authData.logged_in;
        } catch (err) {
            console.warn("Could not reach authMe API. Processing journal offline.");
        }
        
        if (!isUserLoggedIn && !state.isOffline) {
            showToast("Processing journal offline (not logged in).", "info");
            const offlineRes = mockApiHandler(API.submitJournal, { body: JSON.stringify({ entry_text: text }) });
            renderJournalAnalysis(offlineRes.entry);
            return;
        }
        
        try {
            const data = await apiRequest(API.submitJournal, {
                method: 'POST',
                body: JSON.stringify({ entry_text: text })
            });
            
            showToast("Journal entry analyzed and logged!", "success");
            journalInput.value = '';
            renderJournalAnalysis(data.entry);
            fetchJournalHistory();
        } catch (error) {
            showToast(error.message, "error");
        }
    });
    
    function renderJournalAnalysis(entry) {
        analysisIdle.classList.add('hidden');
        analysisActive.classList.remove('hidden');
        
        document.getElementById('journal-results-sentiment').textContent = entry.sentiment_label;
        
        // Sentiment bar mapping from score [-1.0 to 1.0] to percentage [0% to 100%]
        const percent = ((entry.sentiment_score + 1) / 2) * 100;
        const fillBar = document.getElementById('journal-results-sentiment-bar');
        fillBar.style.width = `${percent}%`;
        
        // Colors for sentiment
        if (entry.sentiment_score < -0.2) {
            fillBar.style.backgroundColor = 'var(--color-red)';
            document.getElementById('journal-results-sentiment').style.color = 'var(--color-red)';
        } else if (entry.sentiment_score > 0.2) {
            fillBar.style.backgroundColor = 'var(--color-purple)';
            document.getElementById('journal-results-sentiment').style.color = 'var(--color-purple)';
        } else {
            fillBar.style.backgroundColor = 'var(--secondary)';
            document.getElementById('journal-results-sentiment').style.color = 'var(--secondary)';
        }
        
        // Themes
        const themeBox = document.getElementById('journal-results-themes');
        themeBox.innerHTML = '';
        if (entry.key_themes && entry.key_themes.length > 0) {
            entry.key_themes.forEach(theme => {
                const tag = document.createElement('span');
                tag.className = 'theme-tag';
                tag.textContent = theme;
                themeBox.appendChild(tag);
            });
        } else {
            themeBox.innerHTML = '<span class="muted-text">General Reflection</span>';
        }
        
        // Advice
        document.getElementById('journal-results-guidance').textContent = entry.advice || "No guidelines available.";
    }
}

// Fetch and render historical journal entries
async function fetchJournalHistory() {
    try {
        const history = await apiRequest(API.journalHistory);
        state.journalEntries = history;
        
        const historyContainer = document.getElementById('journal-history-entries');
        if (!historyContainer) return;
        
        historyContainer.innerHTML = '';
        
        if (history.length === 0) {
            historyContainer.innerHTML = '<p class="muted-text">No past entries recorded.</p>';
            return;
        }
        
        history.forEach(entry => {
            const el = document.createElement('div');
            el.className = 'journal-history-item';
            
            const dateStr = new Date(entry.created_at).toLocaleDateString(undefined, {year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'});
            
            const themesTagsStr = (entry.key_themes && entry.key_themes.length > 0) 
                ? entry.key_themes.map(t => `<span class="theme-tag" style="margin-top: 4px;">${t}</span>`).join(' ')
                : '<span class="theme-tag" style="margin-top: 4px;">reflection</span>';
                
            el.innerHTML = `
                <div class="history-item-header">
                    <span class="history-item-date">${dateStr}</span>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        ${themesTagsStr}
                        <span class="history-item-sentiment-tag">${entry.sentiment_label}</span>
                    </div>
                </div>
                <div class="history-item-body">${entry.entry_text}</div>
            `;
            historyContainer.appendChild(el);
        });
    } catch (e) {
        console.error("Error loading journal history:", e);
    }
}
