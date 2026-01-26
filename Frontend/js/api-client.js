// API Client - Configure with your backend URL
const API_CONFIG = {
  baseURL: 'http://localhost:5000', // Update this to your backend URL
  timeout: 10000
};

// Store authentication token
let authToken = localStorage.getItem('authToken') || null;

async function apiCall(endpoint, method = 'GET', body = null, headers = {}) {
  const url = `${API_CONFIG.baseURL}${endpoint}`;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };

  if (authToken) {
    defaultHeaders['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers: defaultHeaders,
      body: body ? JSON.stringify(body) : null,
      timeout: API_CONFIG.timeout
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
      throw new Error(error.message || `API Error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API call failed: ${endpoint}`, error);
    throw error;
  }
}

// Auth endpoints
async function login(email, password) {
  const response = await apiCall('/auth/login', 'POST', { email, password });
  authToken = response.token;
  localStorage.setItem('authToken', authToken);
  return response;
}

async function signup(email, password, name) {
  const response = await apiCall('/auth/signup', 'POST', { email, password, name });
  authToken = response.token;
  localStorage.setItem('authToken', authToken);
  return response;
}

async function verifyEmail(email, otp) {
  return apiCall('/auth/verify-email', 'POST', { email, otp });
}

async function forgotPassword(email) {
  return apiCall('/auth/forgot-password', 'POST', { email });
}

async function resetPassword(email, otp, newPassword) {
  return apiCall('/auth/reset-password', 'POST', { email, otp, password: newPassword });
}

async function logout() {
  authToken = null;
  localStorage.removeItem('authToken');
}

// User endpoints
async function getCurrentUser() {
  return apiCall('/auth/profile');
}

async function updateUser(userData) {
  return apiCall('/auth/profile', 'PUT', userData);
}

// Skills endpoints
async function getTeachingSkills() {
  return apiCall('/skills/user?type=TEACH');
}

async function getLearningSkills() {
  return apiCall('/skills/user?type=LEARN');
}

async function addSkill(skillName, skillType) {
  const type = skillType.toUpperCase() === 'TEACH' ? 'TEACH' : 'LEARN';
  return apiCall('/skills', 'POST', { name: skillName, type });
}

// Session endpoints - NOTE: These routes not yet implemented in backend
async function getUpcomingSessions() {
  console.warn('getUpcomingSessions: Not yet implemented in backend');
  return apiCall('/sessions/upcoming').catch(() => []);
}

async function getCurrentSession() {
  console.warn('getCurrentSession: Not yet implemented in backend');
  return apiCall('/sessions/current').catch(() => null);
}

async function completeSession(sessionId, ratingData) {
  console.warn('completeSession: Not yet implemented in backend');
  return apiCall(`/sessions/${sessionId}/complete`, 'POST', ratingData).catch(() => null);
}

// Matching endpoints - NOTE: These routes not yet implemented in backend
async function getMatches() {
  console.warn('getMatches: Not yet implemented in backend');
  return apiCall('/matches').catch(() => []);
}

// Availability endpoints - NOTE: These routes not yet implemented in backend
async function getAvailability() {
  console.warn('getAvailability: Not yet implemented in backend');
  return apiCall('/availability').catch(() => null);
}

async function updateAvailability(availabilityData) {
  console.warn('updateAvailability: Not yet implemented in backend');
  return apiCall('/availability', 'PUT', availabilityData).catch(() => null);
}

// Credits endpoints
async function getCreditBalance() {
  return apiCall('/credits/balance');
}

async function getCreditHistory() {
  return apiCall('/credits/history');
}

// TODO: Uncomment when ready to switch from dummy data to real API
/*
// Helper to switch from dummy data to API data
async function loadDashboardData() {
  try {
    const user = await getCurrentUser();
    const sessions = await getUpcomingSessions();
    
    // Use API data instead of dummy data
    return {
      user,
      sessions,
      // ... other data
    };
  } catch (error) {
    console.error('Failed to load dashboard:', error);
    // Fallback to dummy data if API fails
    return null;
  }
}
*/
