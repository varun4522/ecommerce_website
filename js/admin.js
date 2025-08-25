// Admin panel functionality with Supabase integration

// Supabase configuration - UPDATE THESE WITH YOUR ACTUAL SUPABASE CREDENTIALS
const SUPABASE_URL = 'https://kvdmiwmxswiqqokjotsy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2ZG1pd214c3dpcXFva2pvdHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2OTY5MDksImV4cCI6MjA3MTI3MjkwOX0.yUlQtEWG8WU9LtNbi0fZB8MkP1htfYePwVBHFp0OIIo';

// Initialize Supabase client
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// DOM elements
const $tabProducts = document.getElementById('tab-products');
const $tabUsers = document.getElementById('tab-users');
const $tabOrders = document.getElementById('tab-orders');
const $productsPanel = document.getElementById('products-panel');
const $usersPanel = document.getElementById('users-panel');
const $ordersPanel = document.getElementById('orders-panel');
const $productsList = document.getElementById('products-list');
const $usersList = document.getElementById('users-list');
const $ordersList = document.getElementById('orders-list');
const $addProductBtn = document.getElementById('add-product-btn');
const $productModal = document.getElementById('product-modal');
const $modalOverlay = document.getElementById('modal-overlay');
const $closeModal = document.getElementById('close-modal');
const $productForm = document.getElementById('product-form');
const $logoutBtn = document.getElementById('logout-btn');
const $adminWelcome = document.getElementById('admin-welcome');

// Image upload elements
const $productImageFile = document.getElementById('product-image-file');
const $imagePreview = document.getElementById('image-preview');
const $productImageUrl = document.getElementById('product-image');

let currentUser = null;
let products = [];
let users = [];
let orders = [];

// Authentication check
async function checkAdminAuth() {
  if (!supabase) {
    alert('Supabase not configured. Please update credentials in js/admin.js');
    window.location.href = 'login.html';
    return;
  }
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      window.location.href = 'login.html';
      return;
    }
    
    // Check if user has admin role
    const userRole = session.user.user_metadata?.role;
    if (userRole !== 'admin') {
      alert('Access denied. Admin privileges required.');
      window.location.href = 'inside.html'; // Changed from shop.html to inside.html
      return;
    }
    
    currentUser = session.user;
    $adminWelcome.textContent = `Welcome, Admin ${currentUser.user_metadata?.full_name || currentUser.email}`;
  } catch (error) {
    console.error('Auth check error:', error);
    window.location.href = 'login.html';
  }
}

// Tab switching
function switchTab(activeTab) {
  // Remove active class from all tabs
  document.querySelectorAll('.admin-tab-btn').forEach(tab => {
    tab.classList.remove('active');
  });
  
  // Hide all panels
  document.querySelectorAll('.admin-panel').forEach(panel => {
    panel.classList.add('hidden');
  });
  
  // Show active tab and panel
  activeTab.classList.add('active');
  
  if (activeTab === $tabProducts) {
    $productsPanel.classList.remove('hidden');
    loadProducts();
  } else if (activeTab === $tabUsers) {
    $usersPanel.classList.remove('hidden');
    loadUsers();
  } else if (activeTab === $tabOrders) {
    $ordersPanel.classList.remove('hidden');
    loadOrders();
  }
}

// Products management
async function loadProducts() {
  if (!supabase) {
    $productsList.innerHTML = '<p>Supabase not configured</p>';
    return;
  }
  
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    products = data || [];
    renderProducts();
  } catch (error) {
    console.error('Error loading products:', error);
    $productsList.innerHTML = '<p>Error loading products. Make sure the "products" table exists in Supabase.</p>';
  }
}

function renderProducts() {
  $productsList.innerHTML = '';
  
  if (products.length === 0) {
    $productsList.innerHTML = '<p>No products found. Add some products to get started.</p>';
    return;
  }
  
  for (const product of products) {
    const item = document.createElement('div');
    item.className = 'admin-item';
    item.innerHTML = `
      <div class="admin-item-header">
        <div>
          <h4>${product.name}</h4>
          <p>${product.description}</p>
          <p><strong>Price: $${product.price}</strong></p>
        </div>
        <img src="${product.image_url}" alt="${product.name}" style="width:80px;height:80px;object-fit:cover;border-radius:6px;" />
      </div>
      <div class="admin-actions">
        <button class="btn btn-small edit-product" data-id="${product.id}">Edit</button>
        <button class="btn btn-small btn-danger delete-product" data-id="${product.id}">Delete</button>
      </div>
    `;
    $productsList.appendChild(item);
  }
}

async function addProduct(productData) {
  if (!supabase) return;
  
  try {
    // Get current user session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      alert('You must be logged in to add products');
      return;
    }
    
    // Add the user ID to the product data
    const productWithUser = {
      ...productData,
      created_by: session.user.id,
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('products')
      .insert([productWithUser]);
    
    if (error) throw error;
    
    loadProducts();
    closeModal();
  } catch (error) {
    console.error('Error adding product:', error);
    
    // Check for specific policy errors
    if (error.message.includes('infinite recursion') || error.message.includes('user_profiles')) {
      alert('Database configuration issue. Please contact administrator to fix RLS policies.');
    } else if (error.message.includes('permission denied')) {
      alert('Permission denied. Make sure you have admin privileges.');
    } else {
      alert('Error adding product: ' + error.message);
    }
  }
}

async function deleteProduct(productId) {
  if (!supabase) return;
  
  if (!confirm('Are you sure you want to delete this product?')) return;
  
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);
    
    if (error) throw error;
    
    loadProducts();
  } catch (error) {
    console.error('Error deleting product:', error);
    alert('Error deleting product: ' + error.message);
  }
}

// Users management
async function loadUsers() {
  if (!supabase) {
    $usersList.innerHTML = '<p>Supabase not configured</p>';
    return;
  }
  
  try {
    // Note: This requires Row Level Security (RLS) policies to be set up properly
    const { data, error } = await supabase.auth.admin.listUsers();
    
    if (error) throw error;
    
    users = data.users || [];
    renderUsers();
  } catch (error) {
    console.error('Error loading users:', error);
    $usersList.innerHTML = '<p>Cannot load users. This requires admin privileges and proper RLS setup.</p>';
  }
}

function renderUsers() {
  $usersList.innerHTML = '';
  
  if (users.length === 0) {
    $usersList.innerHTML = '<p>No users found.</p>';
    return;
  }
  
  for (const user of users) {
    const item = document.createElement('div');
    item.className = 'admin-item user-item';
    item.innerHTML = `
      <div class="user-info">
        <h4>${user.user_metadata?.full_name || 'No name'}</h4>
        <p>Email: ${user.email}</p>
        <p>Role: ${user.user_metadata?.role || 'user'}</p>
        <p>Created: ${new Date(user.created_at).toLocaleDateString()}</p>
      </div>
      <div class="admin-actions">
        <button class="btn btn-small btn-danger">Block User</button>
      </div>
    `;
    $usersList.appendChild(item);
  }
}

// Orders management
async function loadOrders() {
  if (!supabase) {
    $ordersList.innerHTML = '<p>Supabase not configured</p>';
    return;
  }
  
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    orders = data || [];
    renderOrders();
  } catch (error) {
    console.error('Error loading orders:', error);
    $ordersList.innerHTML = '<p>Error loading orders. Make sure the "orders" table exists in Supabase.</p>';
  }
}

function renderOrders() {
  $ordersList.innerHTML = '';
  
  if (orders.length === 0) {
    $ordersList.innerHTML = '<p>No orders found.</p>';
    return;
  }
  
  for (const order of orders) {
    const item = document.createElement('div');
    item.className = 'admin-item order-item';
    const itemsText = Array.isArray(order.items) 
      ? order.items.map(item => `${item.product_name} (${item.quantity})`).join(', ')
      : 'No items';
    
    item.innerHTML = `
      <div>
        <h4>Order #${order.id.slice(-8)}</h4>
        <p>Customer: ${order.user_email}</p>
        <p>Items: ${itemsText}</p>
        <p>Total: $${order.total?.toFixed(2) || '0.00'}</p>
        <p>Date: ${new Date(order.created_at).toLocaleDateString()}</p>
        <span class="order-status ${order.status}">${order.status}</span>
      </div>
      <div class="admin-actions">
        <button class="btn btn-small update-order" data-id="${order.id}" data-status="completed">Mark Completed</button>
        <button class="btn btn-small btn-danger update-order" data-id="${order.id}" data-status="cancelled">Cancel</button>
      </div>
    `;
    $ordersList.appendChild(item);
  }
}

async function updateOrderStatus(orderId, status) {
  if (!supabase) return;
  
  try {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);
    
    if (error) throw error;
    
    loadOrders();
  } catch (error) {
    console.error('Error updating order:', error);
    alert('Error updating order: ' + error.message);
  }
}

// Modal functions
function openModal() {
  $productModal.classList.add('active');
  $modalOverlay.classList.add('active');
}

function closeModal() {
  $productModal.classList.remove('active');
  $modalOverlay.classList.remove('active');
  $productForm.reset();
  // Clear image preview
  $imagePreview.style.display = 'none';
  $imagePreview.src = '';
}

// Event listeners
$tabProducts.addEventListener('click', () => switchTab($tabProducts));
$tabUsers.addEventListener('click', () => switchTab($tabUsers));
$tabOrders.addEventListener('click', () => switchTab($tabOrders));

$addProductBtn.addEventListener('click', openModal);
$closeModal.addEventListener('click', closeModal);
$modalOverlay.addEventListener('click', closeModal);

// Image file upload and preview functionality
$productImageFile.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) {
    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file.');
      e.target.value = '';
      return;
    }
    
    // Check file size (limit to 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB.');
      e.target.value = '';
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      $imagePreview.src = event.target.result;
      $imagePreview.style.display = 'block';
      // Clear the URL input when file is selected
      $productImageUrl.value = '';
    };
    reader.readAsDataURL(file);
  } else {
    $imagePreview.style.display = 'none';
  }
});

// Clear preview when URL input changes
$productImageUrl.addEventListener('input', () => {
  if ($productImageUrl.value) {
    $productImageFile.value = '';
    $imagePreview.style.display = 'none';
  }
});

$productForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  let imageUrl = document.getElementById('product-image').value;
  
  // If a file is selected, convert it to base64 data URL
  const fileInput = document.getElementById('product-image-file');
  if (fileInput.files[0]) {
    const file = fileInput.files[0];
    const reader = new FileReader();
    
    reader.onload = (event) => {
      imageUrl = event.target.result; // This will be a data URL
      
      const productData = {
        name: document.getElementById('product-name').value,
        description: document.getElementById('product-desc').value,
        price: parseFloat(document.getElementById('product-price').value),
        image_url: imageUrl
      };
      addProduct(productData);
    };
    
    reader.readAsDataURL(file);
  } else if (imageUrl) {
    // Use the URL provided
    const productData = {
      name: document.getElementById('product-name').value,
      description: document.getElementById('product-desc').value,
      price: parseFloat(document.getElementById('product-price').value),
      image_url: imageUrl
    };
    addProduct(productData);
  } else {
    alert('Please provide either an image URL or upload an image file.');
  }
});

// Delegate event listeners for dynamic content
document.addEventListener('click', (e) => {
  if (e.target.matches('.delete-product')) {
    const productId = e.target.dataset.id;
    deleteProduct(productId);
  }
  
  if (e.target.matches('.update-order')) {
    const orderId = e.target.dataset.id;
    const status = e.target.dataset.status;
    updateOrderStatus(orderId, status);
  }
});

$logoutBtn.addEventListener('click', async () => {
  if (supabase) {
    await supabase.auth.signOut();
  }
  localStorage.clear();
  window.location.href = 'login.html';
});

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await checkAdminAuth();
  switchTab($tabProducts);
});
