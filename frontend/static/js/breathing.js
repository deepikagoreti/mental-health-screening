/* ==========================================================================
   MINDEASE GUIDED BREATHING CONTROLLER
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initBreathingController();
});

function initBreathingController() {
    let breathingInterval = null;
    let currentPhase = 'ready'; // ready, inhale, hold, exhale
    let timerCount = 0;
    
    const circle = document.getElementById('breathing-circle');
    const label = document.getElementById('breathing-state-label');
    const timer = document.getElementById('breathing-timer');
    const startBtn = document.getElementById('btn-breathing-start');
    const stopBtn = document.getElementById('btn-breathing-stop');
    
    startBtn.addEventListener('click', startBreathing);
    stopBtn.addEventListener('click', stopBreathing);
    
    function startBreathing() {
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        
        runBreathingCycle();
    }
    
    function stopBreathing() {
        clearInterval(breathingInterval);
        breathingInterval = null;
        
        startBtn.classList.remove('hidden');
        stopBtn.classList.add('hidden');
        
        // Reset styles
        circle.className = 'breathing-circle-outer';
        label.textContent = typeof getTranslation === 'function' ? getTranslation('breath-ready') : 'Ready';
        timer.textContent = '--';
        currentPhase = 'ready';
        
        // Remove active step styles
        document.querySelectorAll('.step-item').forEach(el => el.classList.remove('active-step'));
    }
    
    function runBreathingCycle() {
        const stepInhale = document.getElementById('breathing-step-1');
        const stepHold = document.getElementById('breathing-step-2');
        const stepExhale = document.getElementById('breathing-step-3');
        
        // Start phase Inhale (4s)
        triggerInhale();
        
        breathingInterval = setInterval(() => {
            timerCount--;
            timer.textContent = `${timerCount}s`;
            
            if (timerCount <= 0) {
                // Shift phases
                if (currentPhase === 'inhale') {
                    triggerHold();
                } else if (currentPhase === 'hold') {
                    triggerExhale();
                } else if (currentPhase === 'exhale') {
                    triggerInhale();
                }
            }
        }, 1000);
        
        function triggerInhale() {
            currentPhase = 'inhale';
            timerCount = 4;
            timer.textContent = `${timerCount}s`;
            label.textContent = typeof getTranslation === 'function' ? getTranslation('breath-inhale') : 'Inhale';
            
            circle.className = 'breathing-circle-outer breathing-inhale';
            
            stepInhale.classList.add('active-step');
            stepHold.classList.remove('active-step');
            stepExhale.classList.remove('active-step');
        }
        
        function triggerHold() {
            currentPhase = 'hold';
            timerCount = 7;
            timer.textContent = `${timerCount}s`;
            label.textContent = typeof getTranslation === 'function' ? getTranslation('breath-hold') : 'Hold';
            
            circle.className = 'breathing-circle-outer breathing-hold';
            
            stepInhale.classList.remove('active-step');
            stepHold.classList.add('active-step');
            stepExhale.classList.remove('active-step');
        }
        
        function triggerExhale() {
            currentPhase = 'exhale';
            timerCount = 8;
            timer.textContent = `${timerCount}s`;
            label.textContent = typeof getTranslation === 'function' ? getTranslation('breath-exhale') : 'Exhale';
            
            circle.className = 'breathing-circle-outer breathing-exhale';
            
            stepInhale.classList.remove('active-step');
            stepHold.classList.remove('active-step');
            stepExhale.classList.add('active-step');
        }
    }
}
