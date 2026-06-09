/* ==========================================================================
   MINDEASE RESOURCE SOUND PLAYER CONTROLLER (WEB AUDIO SYNTHESIZER)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    initResourceController();
});

function initResourceController() {
    let audioCtx = null;
    let soundSource = null;
    let soundInterval = null;
    
    const playStatus = document.getElementById('sound-player-status');
    const stopBtn = document.getElementById('btn-sound-stop');
    const soundName = document.getElementById('playing-sound-name');
    
    document.querySelectorAll('.sound-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const soundType = btn.getAttribute('data-sound');
            playAmbientSound(soundType);
        });
    });
    
    stopBtn.addEventListener('click', stopAmbientSound);
    
    function initAudioContext() {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }
    
    function playAmbientSound(type) {
        stopAmbientSound();
        initAudioContext();
        
        playStatus.classList.remove('hidden');
        
        if (type === 'rain') {
            soundName.textContent = 'Playing Soothing Rain';
            playRainSynth();
        } else if (type === 'waves') {
            soundName.textContent = 'Playing Ocean Waves';
            playWavesSynth();
        } else if (type === 'forest') {
            soundName.textContent = 'Playing Forest Birds';
            playForestSynth();
        } else if (type === 'whitenoise') {
            soundName.textContent = 'Playing Warm Brown Noise';
            playBrownNoise();
        }
    }
    
    function stopAmbientSound() {
        if (soundSource) {
            try { soundSource.stop(); } catch(e) {}
            soundSource = null;
        }
        if (soundInterval) {
            clearInterval(soundInterval);
            soundInterval = null;
        }
        playStatus.classList.add('hidden');
    }
    
    // Synthesize White/Brown Noise buffer
    function createNoiseBuffer(color = 'white') {
        const bufferSize = 2 * audioCtx.sampleRate;
        const noiseBuffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            if (color === 'brown') {
                // Brown filter approximation
                output[i] = (lastOut + (0.02 * white)) / 1.02;
                lastOut = output[i];
                output[i] *= 3.5; // Gain boost
            } else {
                output[i] = white;
            }
        }
        return noiseBuffer;
    }
    
    function playBrownNoise() {
        const noiseBuffer = createNoiseBuffer('brown');
        soundSource = audioCtx.createBufferSource();
        soundSource.buffer = noiseBuffer;
        soundSource.loop = true;
        
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
        
        soundSource.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        soundSource.start();
    }
    
    function playRainSynth() {
        const noiseBuffer = createNoiseBuffer('white');
        soundSource = audioCtx.createBufferSource();
        soundSource.buffer = noiseBuffer;
        soundSource.loop = true;
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, audioCtx.currentTime);
        
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime);
        
        soundSource.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        soundSource.start();
    }
    
    function playWavesSynth() {
        const noiseBuffer = createNoiseBuffer('brown');
        soundSource = audioCtx.createBufferSource();
        soundSource.buffer = noiseBuffer;
        soundSource.loop = true;
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(550, audioCtx.currentTime); // slightly brighter waves
        
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(0.12, audioCtx.currentTime); // increased base gain from 0.02
        
        // Modulate gain using an oscillator to simulate wave swelling
        const lfo = audioCtx.createOscillator();
        lfo.frequency.setValueAtTime(0.15, audioCtx.currentTime); // ~6.6 seconds period
        
        const lfoGain = audioCtx.createGain();
        lfoGain.gain.setValueAtTime(0.08, audioCtx.currentTime); // increased LFO gain from 0.05
        
        lfo.connect(lfoGain);
        lfoGain.connect(gainNode.gain);
        
        soundSource.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        lfo.start();
        soundSource.start();
    }
    
    function playForestSynth() {
        // rustle background waves
        playWavesSynth();
        
        soundInterval = setInterval(() => {
            playBirdChime();
        }, 3000 + Math.random() * 4000);
    }
    
    function playBirdChime() {
        if (!audioCtx || audioCtx.state === 'suspended') return;
        
        const now = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        
        osc.type = 'sine';
        const baseFreq = 800 + Math.random() * 600;
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, now + 0.15);
        osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.2, now + 0.3);
        
        gain.gain.setValueAtTime(0.0, now);
        gain.gain.linearRampToValueAtTime(0.10, now + 0.05); // increased chime gain from 0.015 to 0.10
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35); // adjusted decay minimum
        
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        osc.start(now);
        osc.stop(now + 0.4);
    }
}
