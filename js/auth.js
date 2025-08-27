// Supabase Authentication with Login, Register, and Admin functionality

// Supabase configuration - UPDATE THESE WITH YOUR ACTUAL SUPABASE CREDENTIALS
const SUPABASE_URL = 'https://kvdmiwmxswiqqokjotsy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2ZG1pd214c3dpcXFva2pvdHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2OTY5MDksImV4cCI6MjA3MTI3MjkwOX0.yUlQtEWG8WU9LtNbi0fZB8MkP1htfYePwVBHFp0OIIo';
const ADMIN_ACCESS_CODE = 'ADMIN123'; // Change this to a secure code

// Initialize Supabase client
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// DOM elements
const $loginForm = document.getElementById('login-form');
const $registerForm = document.getElementById('register-form');
const $adminForm = document.getElementById('admin-form');
const $tabLogin = document.getElementById('tab-login');
const $tabRegister = document.getElementById('tab-register');
const $tabAdmin = document.getElementById('tab-admin');
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
  } else if (activeTab === $tabAdmin) {
    $adminForm.classList.remove('hidden');
    document.querySelector('.auth-subtitle').textContent = 'Admin access only';
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
  
  // Check if using email or phone registration
  const isPhoneRegister = document.getElementById('reg-phone-fields').style.display !== 'none';
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
  
  let email = null, phoneNumber = null;
  
  if (isPhoneRegister) {
    // Phone registration
    const countryCode = document.getElementById('reg-country-code').value;
    const phone = document.getElementById('register-phone').value;
    phoneNumber = countryCode + phone;
    
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
  } else {
    // Email registration
    email = document.getElementById('register-email').value;
    
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
      if (isPhoneRegister) {
        showMessage('Registration successful! You can now login with your phone number.', 'success');
      } else {
        showMessage('Registration successful! You can now login with your email.', 'success');
      }
      
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
    if (error.message.includes('duplicate key value')) {
      if (error.message.includes('user_profiles_email_key')) {
        showMessage('Email already exists. Please use a different email.', 'error');
      } else if (error.message.includes('user_profiles_phone_key')) {
        showMessage('Phone number already exists. Please use a different phone number.', 'error');
      } else {
        showMessage('Account already exists with this information.', 'error');
      }
    } else if (error.message.includes('Could not find the function')) {
      showMessage('Registration service unavailable. Please contact support.', 'error');
    } else if (error.message.includes('already exists')) {
      showMessage('User already exists with this email or phone number', 'error');
    } else {
      showMessage('Registration failed: ' + (error.message || 'Unknown error'), 'error');
    }
  } finally {
    setLoading($submitBtn, false);
  }
}

// Admin login functionality with custom authentication
async function handleAdminLogin(e) {
  e.preventDefault();
  if (!supabase) {
    showMessage('Supabase not configured', 'error');
    return;
  }
  
  const $submitBtn = e.target.querySelector('button[type="submit"]');
  setLoading($submitBtn, true);
  
  const email = document.getElementById('admin-email').value;
  const password = document.getElementById('admin-password').value;
  const adminCode = document.getElementById('admin-code').value;
  
  // Validate admin code
  if (adminCode !== ADMIN_ACCESS_CODE) {
    showMessage('Invalid admin access code', 'error');
    setLoading($submitBtn, false);
    return;
  }
  
  if (!email.trim()) {
    showMessage('Please enter admin email', 'error');
    setLoading($submitBtn, false);
    return;
  }
  
  if (!password.trim()) {
    showMessage('Please enter admin password', 'error');
    setLoading($submitBtn, false);
    return;
  }
  
  try {
    // Use special admin creation function that creates admin users dynamically
    console.log('Attempting admin creation/authentication for:', email);
    const { data, error } = await supabase.rpc('create_admin_with_code', {
      p_email: email,
      p_password: password,
      p_admin_code: adminCode
    });
    
    console.log('Admin creation response:', { data, error });
    
    if (error) {
      console.error('Admin creation error:', error);
      throw error;
    }
    
    // Check if admin creation/authentication was successful
    if (data && data.is_authenticated) {
      console.log('Admin authenticated successfully:', data);
      
      // Store admin session in localStorage
      const adminSession = {
        user_id: data.user_id,
        email: data.email,
        phone: data.phone,
        full_name: data.full_name,
        role: data.role,
        login_time: new Date().toISOString(),
        is_admin: true
      };
      
      localStorage.setItem('user_session', JSON.stringify(adminSession));
      
      showMessage(`${data.message} Redirecting to admin panel...`, 'success');
      
      setTimeout(() => {
        window.location.href = 'admin.html';
      }, 2000);
      
    } else {
      showMessage(data.message || 'Admin creation failed', 'error');
    }
    
  } catch (error) {
    showMessage('Admin login failed: ' + (error.message || 'Unknown error'), 'error');
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
  
  // Register form toggles
  const $regEmailToggle = document.getElementById('reg-email-toggle');
  const $regPhoneToggle = document.getElementById('reg-phone-toggle');
  const $regEmailFields = document.getElementById('reg-email-fields');
  const $regPhoneFields = document.getElementById('reg-phone-fields');
  
  if ($regEmailToggle && $regPhoneToggle && $regEmailFields && $regPhoneFields) {
    $regEmailToggle.addEventListener('click', () => {
      $regEmailToggle.classList.add('active');
      $regPhoneToggle.classList.remove('active');
      $regEmailFields.style.display = 'block';
      $regPhoneFields.style.display = 'none';
      
      // Update required fields
      document.getElementById('register-email').required = true;
      document.getElementById('register-phone').required = false;
    });
    
    $regPhoneToggle.addEventListener('click', () => {
      $regPhoneToggle.classList.add('active');
      $regEmailToggle.classList.remove('active');
      $regPhoneFields.style.display = 'block';
      $regEmailFields.style.display = 'none';
      
      // Update required fields
      document.getElementById('register-email').required = false;
      document.getElementById('register-phone').required = true;
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
  
  // Add event listeners
  if ($tabLogin) $tabLogin.addEventListener('click', () => switchTab($tabLogin));
  if ($tabRegister) $tabRegister.addEventListener('click', () => switchTab($tabRegister));
  if ($tabAdmin) $tabAdmin.addEventListener('click', () => switchTab($tabAdmin));

  if ($loginForm) $loginForm.addEventListener('submit', handleLogin);
  if ($registerForm) $registerForm.addEventListener('submit', handleRegister);
  if ($adminForm) $adminForm.addEventListener('submit', handleAdminLogin);
  
  if (!supabase) {
    showMessage('⚠️ Supabase configuration needed. Please update SUPABASE_URL and SUPABASE_ANON_KEY in js/auth.js', 'error');
  }
});

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
