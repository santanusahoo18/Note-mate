const BASE_URL = window.location.origin;

document.addEventListener('DOMContentLoaded', () => {
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toast-text');
  const toastIcon = document.getElementById('toast-icon');

  // Toggle Auth Form Tabs
  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
  });

  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
  });

  // 1. Submit Registration Form
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value;
    
    if (password.length < 6) {
      showToast('Password must be at least 6 characters.', 'danger');
      return;
    }
    
    try {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const text = await res.text();
      let data = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.warn("Invalid JSON response from register API:", text);
        }
      }
      
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      
      showToast('Registration successful! You can now log in.', 'success');
      tabLogin.click();
      document.getElementById('login-username').value = username;
      document.getElementById('login-password').value = '';
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  // 2. Submit Login Form
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const text = await res.text();
      let data = {};
      if (text) {
        try {
          data = JSON.parse(text);
        } catch (e) {
          console.warn("Invalid JSON response from login API:", text);
        }
      }
      
      if (!res.ok) throw new Error(data.error || 'Login failed');
      
      // Save credentials session keys locally
      localStorage.setItem('notes_user', data.username);
      localStorage.setItem('notes_role', data.role);
      
      showToast('Login successful! Access granted.', 'success');
      
      // Redirect to main entrance portal
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 800);
    } catch (err) {
      showToast(err.message, 'danger');
    }
  });

  // Initialize Google Sign-In SDK
  try {
    if (typeof google !== 'undefined') {
      google.accounts.id.initialize({
        client_id: "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com", // Placeholder to be replaced by developer
        callback: handleGoogleCredentialResponse,
        auto_select: false
      });
      google.accounts.id.renderButton(
        document.getElementById("google-signin-btn"),
        { theme: "outline", size: "large", width: "100%", shape: "rectangular", text: "signin_with" }
      );
    }
  } catch (err) {
    console.error("Google Sign-In initialization failed:", err);
  }

  async function handleGoogleCredentialResponse(response) {
    try {
      // Decode JWT token payload client-side
      const token = response.credential;
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));

      const profile = JSON.parse(jsonPayload);
      
      // Save details to localStorage
      localStorage.setItem('notes_user', profile.name);
      localStorage.setItem('notes_role', 'student'); // Default to student role
      localStorage.setItem('notes_email', profile.email);
      localStorage.setItem('notes_avatar', profile.picture);

      showToast(`Welcome, ${profile.name}! Login successful.`, 'success');
      
      // Log event to backend
      fetch(`${BASE_URL}/api/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: profile.name, action: 'google_login', target: 'Google Authentication Portal' })
      }).catch(e => console.error("Logging google sign-in failed:", e));

      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
    } catch (err) {
      console.error("Failed to process Google Credential:", err);
      showToast("Google Authentication failed.", "danger");
    }
  }

  // Toast alert builder
  let toastTimeout;
  function showToast(message, type = 'danger') {
    toastText.textContent = message;
    toast.className = `toast show toast-${type}`;
    
    // Choose appropriate SVG icon path
    if (type === 'success') {
      toastIcon.innerHTML = `<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>`;
    } else if (type === 'danger') {
      toastIcon.innerHTML = `<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>`;
    } else {
      toastIcon.innerHTML = `<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>`;
    }

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 4000);
  }
});
