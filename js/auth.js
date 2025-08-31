// Supabase authentication with Login and Register functionality

// Supabase configuration - UPDATE THESE WITH YOUR ACTUAL SUPABASE CREDENTIALS
const SUPABASE_URL = 'https://kvdmiwmxswiqqokjotsy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2ZG1pd214c3dpcXFva2pvdHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2OTY5MDksImV4cCI6MjA3MTI3MjkwOX0.yUlQtEWG8WU9LtNbi0fZB8MkP1htfYePwVBHFp0OIIo';

// Initialize Supabase client
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// DOM elements
const $loginForm = document.getElementById('login-form');
const $registerForm = document.getElementById('register-form');
const $tabLogin = document.getElementById('tab-login');
const $tabRegister = document.getElementById('tab-register');
const $authMessage = document.getElementById('auth-message');

// Helper functions
function showMessage(text, type = 'info') {
  if ($authMessage) {
    $authMessage.textContent = text;
    $authMessage.className = `auth-message ${type}`;
    setTimeout(() => {
      $authMessage.className = 'auth-message';
    }, 5000);
  }
}

function setLoading(button, isLoading) {
  if (isLoading) {
    button.disabled = true;
    button.classList.add('loading');
  } else {
    button.disabled = false;
    button.classList.remove('loading');
  }
}

// Phone number validation
function validatePhoneNumber(phoneNumber) {
  // Remove all non-digit characters for validation
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // Check if phone number has reasonable length (7-15 digits)
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return false;
  }
  
  return true;
}

// Format phone number for display
function formatPhoneNumber(phoneNumber) {
  return phoneNumber.replace(/\D/g, '');
}

// Check if user is authenticated
function isUserAuthenticated() {
  const userSession = localStorage.getItem('user_session');
  if (!userSession) return false;
  
  try {
    const session = JSON.parse(userSession);
    // Check if session is expired (24 hours)
    const loginTime = new Date(session.login_time);
    const now = new Date();
    const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60);
    
    return hoursSinceLogin < 24; // Session valid for 24 hours
  } catch (error) {
    return false;
  }
}

// Get current user session
function getCurrentUser() {
  const userSession = localStorage.getItem('user_session');
  if (!userSession) return null;
  
  try {
    return JSON.parse(userSession);
  } catch (error) {
    return null;
  }
}

// Logout function
function logout() {
  localStorage.removeItem('user_session');
  window.location.href = 'login.html';
}

// Protect page (redirect to login if not authenticated)
function protectPage() {
  if (!isUserAuthenticated()) {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

// Protect admin page
function protectAdminPage() {
  const user = getCurrentUser();
  if (!user || !isUserAuthenticated() || user.role !== 'admin') {
    window.location.href = 'login.html';
    return false;
  }
  return true;
}

function switchTab(activeTab) {
  // Hide all forms
  document.querySelectorAll('.auth-form').forEach(form => {
    form.classList.add('hidden');
  });
  
  // Remove active class from all tabs
  document.querySelectorAll('.tab-btn').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Show active form and tab
  activeTab.classList.add('active');
  
  if (activeTab === $tabLogin) {
    $loginForm.classList.remove('hidden');
    document.querySelector('.auth-subtitle').textContent = 'Sign in to your account';
  } else if (activeTab === $tabRegister) {
    $registerForm.classList.remove('hidden');
    document.querySelector('.auth-subtitle').textContent = 'Create a new account';
  }
}

// Login functionality with custom user_profiles authentication
async function handleLogin(e) {
  e.preventDefault();
  if (!supabase) {
    showMessage('Supabase not configured', 'error');
    return;
  }
  
  const $submitBtn = e.target.querySelector('button[type="submit"]');
  setLoading($submitBtn, true);
  
  // Check if using email or phone
  const isPhoneLogin = document.getElementById('phone-login-fields').style.display !== 'none';
  const password = document.getElementById('login-password').value;
  
  let loginIdentifier;
  
  if (isPhoneLogin) {
    // Phone login
    const countryCode = document.getElementById('country-code').value;
    const phoneNumber = document.getElementById('login-phone').value;
    const fullPhone = countryCode + phoneNumber;
    
    // Validate phone number
    if (!phoneNumber.trim()) {
      showMessage('Please enter a phone number', 'error');
      setLoading($submitBtn, false);
      return;
    }
    
    if (!validatePhoneNumber(fullPhone)) {
      showMessage('Please enter a valid phone number', 'error');
      setLoading($submitBtn, false);
      return;
    }
    
    loginIdentifier = fullPhone;
  } else {
    // Email login
    const email = document.getElementById('login-email').value;
    
    if (!email.trim()) {
      showMessage('Please enter an email address', 'error');
      setLoading($submitBtn, false);
      return;
    }
    
    loginIdentifier = email;
  }
  
  if (!password.trim()) {
    showMessage('Please enter your password', 'error');
    setLoading($submitBtn, false);
    return;
  }
  
  // Special admin check for specific credentials (simplified check)
  const emailInput = document.getElementById('login-email').value;
  console.log('Debug - Email input value:', emailInput);
  console.log('Debug - Password value:', password);
  console.log('Debug - Email match:', emailInput === 'hellosgt@gmail.com');
  console.log('Debug - Password match:', password === 'prashant@241302296');
  
  // Check if admin credentials are entered in email field
  if (emailInput === 'hellosgt@gmail.com' && password === 'prashant@241302296') {
    console.log('Debug - Admin bypass triggered!');
    
    // Create admin session directly
    const adminSession = {
      user_id: 'admin-special',
      email: 'hellosgt@gmail.com',
      phone: null,
      full_name: 'Super Admin',
      role: 'admin',
      login_time: new Date().toISOString(),
      is_special_admin: true
    };
    
    // Store data in the format expected by admin.js
    localStorage.setItem('userData', JSON.stringify(adminSession));
    localStorage.setItem('isAdminBypass', 'true');
    localStorage.setItem('user_session', JSON.stringify(adminSession)); // Keep for backward compatibility
    
    console.log('Debug - Admin session stored, attempting redirect...');
    showMessage('Admin login successful! Redirecting to admin panel...', 'success');
    
    setLoading($submitBtn, false);
    
    // Multiple redirect methods to ensure it works
    console.log('Debug - Redirecting to admin.html now...');
    
    try {
      // Immediate redirect
      window.location.href = './admin.html';
      
    } catch (error) {
      console.error('Debug - Redirect error:', error);
      // Manual redirect as last resort
      showMessage('Redirect failed. <a href="./admin.html" style="color: white; text-decoration: underline;">Click here to go to Admin Panel</a>', 'info');
    }
    
    return;
  }
  
  // Continue with regular login logic
  console.log('Debug - Continuing with regular login logic...');
  
  try {
    // Use custom authentication function with explicit schema
    const { data, error } = await supabase.rpc('authenticate_user', {
      login_identifier: loginIdentifier,
      password: password
    });
    
    if (error) {
      console.error('Authentication RPC error:', error);
      throw new Error(error.message || 'Authentication function error');
    }
    
    // Check if we got valid data
    if (!data || !Array.isArray(data)) {
      throw new Error('Invalid response from authentication function');
    }
    
    // Check if authentication was successful
    if (data.length > 0 && data[0].is_authenticated) {
      const userData = data[0];
      
      // Store user session in localStorage
      const userSession = {
        user_id: userData.user_id,
        email: userData.email,
        phone: userData.phone,
        full_name: userData.full_name,
        role: userData.role,
        login_time: new Date().toISOString()
      };
      
      localStorage.setItem('user_session', JSON.stringify(userSession));
      
      showMessage('Login successful! Redirecting...', 'success');
      
      // Redirect based on user role
      setTimeout(() => {
        if (userData.role === 'admin') {
          window.location.href = 'admin.html';
        } else {
          window.location.href = 'inside.html';
        }
      }, 1500);
      
    } else {
      if (isPhoneLogin) {
        showMessage('Invalid phone number or password', 'error');
      } else {
        showMessage('Invalid email or password', 'error');
      }
    }
    
  } catch (error) {
    showMessage('Login failed: ' + (error.message || 'Unknown error'), 'error');
  } finally {
    setLoading($submitBtn, false);
  }
}

// Register functionality with custom user_profiles storage
async function handleRegister(e) {
  e.preventDefault();
  if (!supabase) {
    showMessage('Supabase not configured', 'error');
    return;
  }
  
  const $submitBtn = e.target.querySelector('button[type="submit"]');
  setLoading($submitBtn, true);
  
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm').value;
  const fullName = document.getElementById('register-name').value;
  
  // Validate passwords match
  if (password !== confirmPassword) {
    showMessage('Passwords do not match', 'error');
    setLoading($submitBtn, false);
    return;
  }
  
  // Validate password strength
  if (password.length < 6) {
    showMessage('Password must be at least 6 characters long', 'error');
    setLoading($submitBtn, false);
    return;
  }
  
  // Validate full name
  if (!fullName.trim()) {
    showMessage('Please enter your full name', 'error');
    setLoading($submitBtn, false);
    return;
  }
  
  // Get email and phone values
  const email = document.getElementById('register-email').value;
  const countryCode = document.getElementById('reg-country-code').value;
  const phone = document.getElementById('register-phone').value;
  const phoneNumber = countryCode + phone;
  
  // Validate email
  if (!email.trim()) {
    showMessage('Please enter an email address', 'error');
    setLoading($submitBtn, false);
    return;
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showMessage('Please enter a valid email address', 'error');
    setLoading($submitBtn, false);
    return;
  }
  
  // Validate phone number
  if (!phone.trim()) {
    showMessage('Please enter a phone number', 'error');
    setLoading($submitBtn, false);
    return;
  }
  
  if (!validatePhoneNumber(phoneNumber)) {
    showMessage('Please enter a valid phone number', 'error');
    setLoading($submitBtn, false);
    return;
  }
  
  try {
    // Use custom user creation function
    console.log('Attempting registration...');
    const { data, error } = await supabase.rpc('create_user_with_password', {
      p_email: email,
      p_phone: phoneNumber,
      p_full_name: fullName,
      p_password: password,
      p_role: 'user'
    });
    
    console.log('Registration response:', { data, error });
    
    if (error) {
      console.error('Registration RPC error:', error);
      if (error.message.includes('Could not find the function')) {
        throw new Error('Registration service is not properly set up. Please contact support.');
      }
      throw new Error(error.message || 'Registration function error');
    }
    
    // Check if we got valid data
    if (!data) {
      throw new Error('Invalid response from registration function');
    }
    
    // Check if user creation was successful
    if (data.success) {
      showMessage('Registration successful! You can now login with your email or phone number.', 'success');
      
      // Clear form fields
      document.getElementById('register-form').reset();
      
      // Switch to login tab after successful registration
      setTimeout(() => {
        switchTab($tabLogin);
      }, 3000);
    } else {
      const errorMessage = data && data[0] ? data[0].message : 'Registration failed';
      showMessage(errorMessage, 'error');
    }
    
  } catch (error) {
    console.error('Registration error:', error);
    
    // Handle specific error messages from the database function
    if (error.message.includes('User already exists') || error.message.includes('already exists')) {
      showMessage('An account with this email or phone number already exists. Please try logging in instead.', 'error');
      // Add a suggestion to switch to login tab
      setTimeout(() => {
        showMessage('💡 Tip: Click the Login tab to sign in with your existing account.', 'info');
      }, 3000);
    } else if (error.message.includes('duplicate key value')) {
      if (error.message.includes('user_profiles_email_key') || error.message.includes('email')) {
        showMessage('This email address is already registered. Please use a different email or try logging in.', 'error');
      } else if (error.message.includes('user_profiles_phone_key') || error.message.includes('phone')) {
        showMessage('This phone number is already registered. Please use a different phone number or try logging in.', 'error');
      } else {
        showMessage('An account with this information already exists. Please try different details or log in.', 'error');
      }
    } else if (error.message.includes('Could not find the function')) {
      showMessage('Registration service unavailable. Please contact support.', 'error');
    } else if (error.message.includes('violates unique constraint')) {
      showMessage('This email or phone number is already in use. Please try different details.', 'error');
    } else {
      showMessage('Registration failed: ' + (error.message || 'Unknown error'), 'error');
    }
  } finally {
    setLoading($submitBtn, false);
  }
}

// Phone/Email toggle functionality
function setupLoginToggles() {
  // Login form toggles
  const $emailToggle = document.getElementById('email-toggle');
  const $phoneToggle = document.getElementById('phone-toggle');
  const $emailFields = document.getElementById('email-login-fields');
  const $phoneFields = document.getElementById('phone-login-fields');
  
  if ($emailToggle && $phoneToggle && $emailFields && $phoneFields) {
    $emailToggle.addEventListener('click', () => {
      $emailToggle.classList.add('active');
      $phoneToggle.classList.remove('active');
      $emailFields.style.display = 'block';
      $phoneFields.style.display = 'none';
      
      // Update required fields
      document.getElementById('login-email').required = true;
      document.getElementById('login-phone').required = false;
    });
    
    $phoneToggle.addEventListener('click', () => {
      $phoneToggle.classList.add('active');
      $emailToggle.classList.remove('active');
      $phoneFields.style.display = 'block';
      $emailFields.style.display = 'none';
      
      // Update required fields
      document.getElementById('login-email').required = false;
      document.getElementById('login-phone').required = true;
    });
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  // Set default tab
  if ($tabLogin) {
    switchTab($tabLogin);
  }
  
  // Setup phone/email toggles
  setupLoginToggles();
  
  // Ensure email tab is active by default
  const $emailToggle = document.getElementById('email-toggle');
  const $phoneToggle = document.getElementById('phone-toggle');
  const $emailFields = document.getElementById('email-login-fields');
  const $phoneFields = document.getElementById('phone-login-fields');
  
  if ($emailToggle && $phoneToggle && $emailFields && $phoneFields) {
    // Set email as default
    $emailToggle.classList.add('active');
    $phoneToggle.classList.remove('active');
    $emailFields.style.display = 'block';
    $phoneFields.style.display = 'none';
    
    // Set required fields
    document.getElementById('login-email').required = true;
    document.getElementById('login-phone').required = false;
  }
  
  // Add event listeners
  if ($tabLogin) $tabLogin.addEventListener('click', () => switchTab($tabLogin));
  if ($tabRegister) $tabRegister.addEventListener('click', () => switchTab($tabRegister));

  if ($loginForm) $loginForm.addEventListener('submit', handleLogin);
  if ($registerForm) $registerForm.addEventListener('submit', handleRegister);
  
  if (!supabase) {
    showMessage('⚠️ Supabase configuration needed. Please update SUPABASE_URL and SUPABASE_ANON_KEY in js/auth.js', 'error');
  }
  
  // Setup password toggle functionality
  setupPasswordToggles();
});

// Password toggle functionality
function setupPasswordToggles() {
  const passwordToggles = document.querySelectorAll('.password-toggle');
  
  passwordToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      const targetId = toggle.getAttribute('data-target');
      const passwordInput = document.getElementById(targetId);
      const eyeIcon = toggle.querySelector('.eye-icon');
      
      if (passwordInput.type === 'password') {
        passwordInput.type = 'text';
        eyeIcon.textContent = '🙈'; // Closed eye when password is visible
        toggle.setAttribute('data-visible', 'true');
        toggle.setAttribute('aria-label', 'Hide password');
      } else {
        passwordInput.type = 'password';
        eyeIcon.textContent = '👁️'; // Open eye when password is hidden
        toggle.setAttribute('data-visible', 'false');
        toggle.setAttribute('aria-label', 'Show password');
      }
    });
    
    // Set initial state
    toggle.setAttribute('data-visible', 'false');
    toggle.setAttribute('aria-label', 'Show password');
  });
}

// Export for potential use in other files
window.authModule = {
  supabase,
  showMessage,
  isUserAuthenticated,
  getCurrentUser,
  logout,
  protectPage,
  protectAdminPage
};