/* ==========================================================================
   MINDEASE LOGIN & REGISTER FORM CLIENT
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const loginTab = document.getElementById('tab-login-trigger');
    const registerTab = document.getElementById('tab-register-trigger');
    const loginForm = document.getElementById('form-login');
    const registerForm = document.getElementById('form-register');
    
    const onboardingCard = document.getElementById('card-onboarding');
    const authFormCard = document.getElementById('card-auth-form');
    const btnGetStarted = document.getElementById('btn-get-started');
    const linkGoLogin = document.getElementById('link-go-login');
    const btnBackOnboarding = document.getElementById('btn-back-onboarding');

    // Onboarding toggles
    if (btnGetStarted) {
        btnGetStarted.addEventListener('click', () => {
            onboardingCard.classList.add('hidden');
            authFormCard.classList.remove('hidden');
            
            // Default to Register view
            registerTab.click();
        });
    }

    if (linkGoLogin) {
        linkGoLogin.addEventListener('click', () => {
            onboardingCard.classList.add('hidden');
            authFormCard.classList.remove('hidden');
            
            // Default to Login view
            loginTab.click();
        });
    }

    if (btnBackOnboarding) {
        btnBackOnboarding.addEventListener('click', () => {
            authFormCard.classList.add('hidden');
            onboardingCard.classList.remove('hidden');
        });
    }
    
    // Toggle active tab views
    loginTab.addEventListener('click', () => {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        loginForm.classList.add('active-form');
        registerForm.classList.remove('active-form');
    });
    
    registerTab.addEventListener('click', () => {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        registerForm.classList.add('active-form');
        loginForm.classList.remove('active-form');
    });
    
    // Submit Login API
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const errBox = document.getElementById('login-error');
        
        errBox.classList.add('hidden');
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Login credentials failed.");
            }
            
            showGlobalToast("Welcome to MindHaven!", "success");
            setTimeout(() => {
                if (data.user.role === 'admin') {
                    window.location.href = '/admin';
                } else {
                    window.location.href = '/dashboard';
                }
            }, 800);
            
        } catch (error) {
            errBox.textContent = error.message;
            errBox.classList.remove('hidden');
        }
    });

    // Submit Register API
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const role = document.getElementById('register-role-admin').checked ? 'admin' : 'user';
        const errBox = document.getElementById('register-error');
        const successBox = document.getElementById('register-success');
        
        errBox.classList.add('hidden');
        successBox.classList.add('hidden');
        
        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, role })
            });
            
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Account registration failed.");
            }
            
            successBox.classList.remove('hidden');
            
            // Auto login after registration
            setTimeout(async () => {
                const autoLoginRes = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                if (autoLoginRes.ok) {
                    if (role === 'admin') {
                        window.location.href = '/admin';
                    } else {
                        window.location.href = '/dashboard';
                    }
                }
            }, 1000);
            
        } catch (error) {
            errBox.textContent = error.message;
            errBox.classList.remove('hidden');
        }
    });
});
