// API Client - Configure with your backend URL
const API_CONFIG = {
  baseURL: 'http://localhost:5000/api', // Update this to your backend URL
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

async function logout() {
  authToken = null;
  localStorage.removeItem('authToken');
}

// User endpoints
async function getCurrentUser() {
  return apiCall('/users/me');
}

async function updateUser(userData) {
  return apiCall('/users/me', 'PUT', userData);
}

// Skills endpoints
async function getTeachingSkills() {
  return apiCall('/skills/teaching');
}

async function getLearningSkills() {
  return apiCall('/skills/learning');
}

async function addSkill(skillName, skillType) {
  return apiCall(`/skills/${skillType}`, 'POST', { name: skillName });
}

// Session endpoints
async function getUpcomingSessions() {
  return apiCall('/sessions/upcoming');
}

async function getCurrentSession() {
  return apiCall('/sessions/current');
}

async function completeSession(sessionId, ratingData) {
  return apiCall(`/sessions/${sessionId}/complete`, 'POST', ratingData);
}

// Matching endpoints
async function getMatches() {
  return apiCall('/matches');
}

// Availability endpoints
async function getAvailability() {
  return apiCall('/availability');
}

async function updateAvailability(availabilityData) {
  return apiCall('/availability', 'PUT', availabilityData);
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
