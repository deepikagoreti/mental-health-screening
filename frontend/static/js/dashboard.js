/* ==========================================================================
   MINDEASE DASHBOARD CONTROLLER (dashboard.js)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // Wait a brief moment to ensure auth session loads and verifies active user
    setTimeout(() => {
        fetchScreeningHistory();
    }, 150);
});

// Fetch screening results and animate dashboard dials
async function fetchScreeningHistory() {
    try {
        const response = await fetch('/api/screening/history');
        if (!response.ok) return;
        
        const history = await response.json();
        
        const stressFill = document.getElementById('dial-stress-fill');
        const anxietyFill = document.getElementById('dial-anxiety-fill');
        const stressScoreText = document.getElementById('text-stress-score');
        const anxietyScoreText = document.getElementById('text-anxiety-score');
        const stressLabel = document.getElementById('text-stress-label');
        const anxietyLabel = document.getElementById('text-anxiety-label');
        
        const insightsEmpty = document.getElementById('dashboard-insights-empty');
        const insightsActive = document.getElementById('dashboard-insights-active');
        
        const latest = history[0];
        
        if (latest) {
            // Animate Dials
            const stressOffset = 125.6 - (latest.stress_score / 21) * 125.6;
            const anxietyOffset = 125.6 - (latest.anxiety_score / 21) * 125.6;
            
            stressFill.style.strokeDashoffset = stressOffset;
            anxietyFill.style.strokeDashoffset = anxietyOffset;
            
            stressScoreText.textContent = latest.stress_score;
            anxietyScoreText.textContent = latest.anxiety_score;
            
            const labelSevere = typeof getTranslation === 'function' ? getTranslation('label-severe') : "Severe";
            const labelModerate = typeof getTranslation === 'function' ? getTranslation('label-moderate') : "Moderate";
            const labelMild = typeof getTranslation === 'function' ? getTranslation('label-mild') : "Mild";
            stressLabel.textContent = latest.stress_score >= 14 ? labelSevere : latest.stress_score >= 8 ? labelModerate : labelMild;
            anxietyLabel.textContent = latest.anxiety_score >= 14 ? labelSevere : latest.anxiety_score >= 8 ? labelModerate : labelMild;
            
            // Set dial glows
            setDialGlowColor(stressFill, latest.stress_score);
            setDialGlowColor(anxietyFill, latest.anxiety_score);
            
            // Toggle Insights
            insightsEmpty.classList.add('hidden');
            insightsActive.classList.remove('hidden');
            
            let displayCategory = latest.risk_category;
            let displayFeedback = latest.feedback;
            if (typeof getTranslation === 'function') {
                if (latest.risk_category === "Low Risk (Mild/Normal)") {
                    displayCategory = getTranslation('risk-low');
                    displayFeedback = getTranslation('feedback-low');
                } else if (latest.risk_category === "Moderate Risk") {
                    displayCategory = getTranslation('risk-mod');
                    displayFeedback = getTranslation('feedback-mod');
                } else if (latest.risk_category === "High Risk (Severe)") {
                    displayCategory = getTranslation('risk-high');
                    displayFeedback = getTranslation('feedback-high');
                }
            }
            document.getElementById('insight-status-badge').textContent = displayCategory;
            document.getElementById('insight-description-text').textContent = displayFeedback;
            renderRecommendations(latest.risk_category);
        } else {
            // Reset Dials
            stressFill.style.strokeDashoffset = 125.6;
            anxietyFill.style.strokeDashoffset = 125.6;
            stressFill.style.filter = 'none';
            anxietyFill.style.filter = 'none';
            stressScoreText.textContent = "--";
            anxietyScoreText.textContent = "--";
            const noAssLabel = typeof getTranslation === 'function' ? getTranslation('label-no-assessment') : "No assessment";
            stressLabel.textContent = noAssLabel;
            anxietyLabel.textContent = noAssLabel;
            
            insightsEmpty.classList.remove('hidden');
            insightsActive.classList.add('hidden');
        }
        
        renderHistoryList(history);
    } catch (e) {
        console.error("Failed to load screening dials:", e);
    }
}

function setDialGlowColor(element, score) {
    if (score >= 14) {
        element.style.filter = 'drop-shadow(0px 6px 12px rgba(234, 88, 12, 0.45))';
    } else if (score >= 8) {
        element.style.filter = 'drop-shadow(0px 6px 12px rgba(116, 91, 155, 0.35))';
    } else {
        element.style.filter = 'drop-shadow(0px 6px 12px rgba(167, 139, 250, 0.3))';
    }
}

function renderHistoryList(history) {
    const list = document.getElementById('dashboard-history-list');
    list.innerHTML = '';
    
    if (history.length === 0) {
        const emptyText = typeof getTranslation === 'function' ? getTranslation('history-empty-text') : "No screening history available.";
        list.innerHTML = `<div class="empty-state flex-grow align-center justify-center"><p class="muted-text">${emptyText}</p></div>`;
        return;
    }
    
    history.slice(0, 5).forEach(item => {
        const el = document.createElement('div');
        el.className = 'history-item';
        el.onclick = () => window.location.href = '/screening';
        
        const dateStr = new Date(item.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'});
        let displayCat = item.risk_category;
        if (typeof getTranslation === 'function') {
            if (item.risk_category === "Low Risk (Mild/Normal)") displayCat = getTranslation('risk-low');
            else if (item.risk_category === "Moderate Risk") displayCat = getTranslation('risk-mod');
            else if (item.risk_category === "High Risk (Severe)") displayCat = getTranslation('risk-high');
        }
        el.innerHTML = `
            <div class="history-item-info">
                <h4>${displayCat}</h4>
                <span>${dateStr}</span>
            </div>
            <div class="history-item-score" title="Stress / Anxiety">${item.stress_score}/${item.anxiety_score}</div>
        `;
        list.appendChild(el);
    });
}

function renderRecommendations(category) {
    const list = document.getElementById('dashboard-insights-recommendations');
    if (!list) return;
    list.innerHTML = '';
    
    const catLower = (category || '').toLowerCase();
    const isHigh = catLower.includes('high') || catLower.includes('severe');
    const isMod = catLower.includes('moderate');
    
    if (isHigh) {
        list.innerHTML = `
            <li><a href="/resources"><i data-lucide="phone"></i> Urgent Help & Helplines</a></li>
            <li><a href="/breathing"><i data-lucide="wind"></i> 4-7-8 Breathing (Panic Relief)</a></li>
        `;
    } else if (isMod) {
        list.innerHTML = `
            <li><a href="/breathing"><i data-lucide="wind"></i> 4-7-8 Deep Breathing Exercise</a></li>
            <li><a href="/resources"><i data-lucide="headphones"></i> Ambient Nature Soundscapes</a></li>
        `;
    } else {
        list.innerHTML = `
            <li><a href="/breathing"><i data-lucide="wind"></i> Daily Breathing Practice</a></li>
            <li><a href="/resources"><i data-lucide="headphones"></i> Relaxing Soundscapes</a></li>
        `;
    }
    
    if (window.lucide) {
        lucide.createIcons();
    }
}


