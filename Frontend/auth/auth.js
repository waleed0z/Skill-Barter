// Load API client
const apiScript = document.createElement('script');
apiScript.src = '../js/api-client.js';
document.head.appendChild(apiScript);

// Handle Login Form
const loginForm = document.getElementById('loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = loginForm.querySelector('input[type="email"]').value;
    const password = loginForm.querySelector('input[type="password"]').value;
    
    try {
      const response = await login(email, password);
      console.log('Login successful:', response);
      // Redirect to dashboard
      window.location.href = '../dashboard/dashboard.html';
    } catch (error) {
      alert('Login failed: ' + error.message);
    }
  });
}

// Handle Signup Form
const signupForm = document.getElementById('signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = signupForm.querySelector('input[type="text"]').value;
    const email = signupForm.querySelector('input[type="email"]').value;
    const password = signupForm.querySelector('input[type="password"]').value;
    
    try {
      const response = await signup(email, password, name);
      console.log('Signup successful:', response);
      // Redirect to dashboard
      window.location.href = '../dashboard/dashboard.html';
    } catch (error) {
      alert('Signup failed: ' + error.message);
    }
  });
}

// Handle logout button across pages
document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.querySelector('.logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logout();
      window.location.href = '../auth/login.html';
    });
  }
});
