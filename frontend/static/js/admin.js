/* ==========================================================================
   MINDEASE ADMINISTRATOR CONTROL PANEL CONTROLLER
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    fetchAdminStats();
});

async function fetchAdminStats() {
    try {
        const stats = await apiRequest('/api/admin/stats');
        
        // Render stats indicators
        document.getElementById('admin-stat-students').textContent = stats.total_students;
        document.getElementById('admin-stat-screenings').textContent = stats.total_screenings;
        const journalStat = document.getElementById('admin-stat-journals');
        if (journalStat) journalStat.textContent = stats.total_journals;
        
        // Render Stress Risk Distribution
        const distContainer = document.getElementById('admin-risk-distribution-container');
        if (distContainer) {
            distContainer.innerHTML = '';
            const total = stats.total_screenings || 1;
            const categories = [
                { key: "Low Risk (Mild/Normal)", color: "var(--primary)" },
                { key: "Moderate Risk", color: "var(--secondary)" },
                { key: "High Risk (Severe)", color: "var(--color-red)" }
            ];
            
            categories.forEach(cat => {
                const count = stats.risk_distribution[cat.key] || 0;
                const percent = Math.round((count / total) * 100);
                
                let displayCat = cat.key;
                if (typeof getTranslation === 'function') {
                    if (cat.key === "Low Risk (Mild/Normal)") displayCat = getTranslation('risk-low');
                    else if (cat.key === "Moderate Risk") displayCat = getTranslation('risk-mod');
                    else if (cat.key === "High Risk (Severe)") displayCat = getTranslation('risk-high');
                }
                
                const item = document.createElement('div');
                item.className = 'admin-dist-bar-item';
                item.innerHTML = `
                    <div class="admin-dist-bar-header">
                        <span>${displayCat}</span>
                        <span>${percent}% (${count} logs)</span>
                    </div>
                    <div class="admin-dist-bar-wrapper">
                        <div class="admin-dist-bar-fill" style="width: ${percent}%; background-color: ${cat.color};"></div>
                    </div>
                `;
                distContainer.appendChild(item);
            });
        }
        
        // Render Top Themes
        const themesContainer = document.getElementById('admin-top-themes-container');
        if (themesContainer) {
            themesContainer.innerHTML = '';
            
            const themes = Object.entries(stats.top_themes || {}).sort((a, b) => b[1] - a[1]).slice(0, 5);
            if (themes.length === 0) {
                themesContainer.innerHTML = '<p class="muted-text">No theme records logged yet.</p>';
            } else {
                const maxMentions = Math.max(...themes.map(t => t[1]), 1);
                themes.forEach(([name, count]) => {
                    const percent = Math.round((count / maxMentions) * 100);
                    const item = document.createElement('div');
                    item.className = 'admin-dist-bar-item';
                    item.innerHTML = `
                        <div class="admin-dist-bar-header">
                            <span style="text-transform: capitalize;">${name}</span>
                            <span>${count} mentions</span>
                        </div>
                        <div class="admin-dist-bar-wrapper">
                            <div class="admin-dist-bar-fill" style="width: ${percent}%; background-color: var(--secondary);"></div>
                        </div>
                    `;
                    themesContainer.appendChild(item);
                });
            }
        }
        
        // Render Alert logs
        const alertBody = document.getElementById('admin-alerts-tbody');
        if (alertBody) {
            alertBody.innerHTML = '';
            
            if (!stats.alerts || stats.alerts.length === 0) {
                alertBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;" class="muted-text">No high risk student alerts recorded.</td></tr>';
            } else {
                stats.alerts.forEach(alert => {
                    const tr = document.createElement('tr');
                    tr.className = alert.risk_category.includes('Severe') ? 'row-high-risk' : '';
                    
                    const dateStr = new Date(alert.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute:'2-digit'});
                    
                    let displayCat = alert.risk_category;
                    if (typeof getTranslation === 'function') {
                        if (alert.risk_category === "Low Risk (Mild/Normal)") displayCat = getTranslation('risk-low');
                        else if (alert.risk_category === "Moderate Risk") displayCat = getTranslation('risk-mod');
                        else if (alert.risk_category === "High Risk (Severe)") displayCat = getTranslation('risk-high');
                    }
                    
                    const subject = encodeURIComponent("Counseling Support Outreach");
                    const body = encodeURIComponent(`Hello ${alert.username},\n\nWe noticed you have been under high levels of stress recently. The student counseling center is here to support you.`);
                    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(alert.email)}&su=${subject}&body=${body}`;
                    
                    tr.innerHTML = `
                        <td style="padding:12px;">${dateStr}</td>
                        <td style="padding:12px; font-weight:600;">${alert.username}</td>
                        <td style="padding:12px;"><a href="${gmailUrl}" target="_blank" style="color: var(--primary);">${alert.email}</a></td>
                        <td style="padding:12px; text-align:center; font-weight:700;">${alert.stress_score}/${alert.anxiety_score}</td>
                        <td style="padding:12px;"><span class="badge-risk severe">${displayCat}</span></td>
                        <td style="padding:12px;"><a href="${gmailUrl}" target="_blank" class="btn btn-outline" style="padding:6px 12px; font-size:0.8rem; border-radius:8px;"><i data-lucide="mail" style="width:12px; height:12px; margin-right:4px;"></i> Mail Outreach</a></td>
                    `;
                    alertBody.appendChild(tr);
                });
            }
        }
        
        // Render Registered Users logs
        const userBody = document.getElementById('admin-users-tbody');
        if (userBody) {
            userBody.innerHTML = '';
            
            if (!stats.users || stats.users.length === 0) {
                userBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:20px;" class="muted-text">No registered users found.</td></tr>';
            } else {
                stats.users.forEach(u => {
                    const tr = document.createElement('tr');
                    
                    const regDate = new Date(u.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute:'2-digit'});
                    const lastLogin = u.last_login 
                        ? new Date(u.last_login).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute:'2-digit'})
                        : '<em class="muted-text">Never</em>';
                    
                    const roleBadge = u.role === 'admin' 
                        ? '<span class="badge-risk" style="background-color: var(--secondary); color: white; border: none; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem;">Admin</span>'
                        : '<span class="badge-risk" style="background-color: var(--primary); color: white; border: none; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem;">Student</span>';
                    
                    tr.innerHTML = `
                        <td style="padding:12px; font-weight:600;">${u.id}</td>
                        <td style="padding:12px; font-weight:600;">${u.username}</td>
                        <td style="padding:12px;"><a href="mailto:${u.email}" style="color: var(--primary);">${u.email}</a></td>
                        <td style="padding:12px;">${roleBadge}</td>
                        <td style="padding:12px;">${regDate}</td>
                        <td style="padding:12px;">${lastLogin}</td>
                    `;
                    userBody.appendChild(tr);
                });
            }
        }
        
        if (window.lucide) {
            lucide.createIcons();
        }
    } catch (e) {
        showToast(e.message, "error");
    }
}
