// Simple shop demo JavaScript - Updated to load from Supabase

// Supabase configuration - UPDATE THESE WITH YOUR ACTUAL SUPABASE CREDENTIALS
const SUPABASE_URL = 'https://kvdmiwmxswiqqokjotsy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2ZG1pd214c3dpcXFva2pvdHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2OTY5MDksImV4cCI6MjA3MTI3MjkwOX0.yUlQtEWG8WU9LtNbi0fZB8MkP1htfYePwVBHFp0OIIo';

// Initialize Supabase client
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Display user name in welcome section
function displayUserName() {
  const userNameElement = document.getElementById('userName');
  if (userNameElement) {
    // Check for user from localStorage
    const userEmail = localStorage.getItem('userEmail');
    const userProfile = localStorage.getItem('userProfile');
    
    let displayName = 'Friend'; // Default name
    
    if (userEmail) {
      // Extract name from email (before @)
      displayName = userEmail.split('@')[0];
      displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
    } else if (userProfile) {
      try {
        const profile = JSON.parse(userProfile);
        displayName = profile.name || profile.email?.split('@')[0] || 'Friend';
      } catch (e) {
        console.log('Could not parse user profile');
      }
    }
    
    userNameElement.textContent = displayName;
    
    // Add a nice animation effect
    userNameElement.style.opacity = '0';
    setTimeout(() => {
      userNameElement.style.transition = 'opacity 0.5s ease-in-out';
      userNameElement.style.opacity = '1';
    }, 500);
  }
}

// Products will be loaded from Supabase instead of dummy data
let PRODUCTS = [];
let filteredProducts = [];

// Filter DOM elements
const $categoryFilter = document.getElementById('category-filter');
const $priceMin = document.getElementById('price-min');
const $priceMax = document.getElementById('price-max');
const $sortBy = document.getElementById('sort-by');
const $applyFilters = document.getElementById('apply-filters');
const $clearFilters = document.getElementById('clear-filters');
const $productsCount = document.getElementById('products-count');

const $products = document.getElementById('products');
const $cartToggle = document.getElementById('cart-toggle');
const $cart = document.getElementById('cart');
const $overlay = document.getElementById('overlay');
const $cartCount = document.getElementById('cart-count');
const $cartItems = document.getElementById('cart-items');
const $cartTotal = document.getElementById('cart-total');
const $closeCart = document.getElementById('close-cart');
const $checkout = document.getElementById('checkout');
const $search = document.getElementById('search');
const $logoutBtn = document.getElementById('logout-btn');

// Settings elements
const $settingsToggle = document.getElementById('settings-toggle');
const $settings = document.getElementById('settings');
const $closeSettings = document.getElementById('close-settings');
const $viewOrdersBtn = document.getElementById('view-orders-btn');
const $clearCartBtn = document.getElementById('clear-cart-btn');
const $clearHistoryBtn = document.getElementById('clear-history-btn');
const $ordersModal = document.getElementById('orders-history-modal');
const $closeOrdersModal = document.getElementById('close-orders-modal');
const $ordersHistoryContent = document.getElementById('orders-history-content');
const $userEmail = document.getElementById('user-email');

let cart = {}; // { productId: qty }

// Debounce function for price inputs
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function loadCart(){
  try{ cart = JSON.parse(localStorage.getItem('shop_cart')) || {}; }
  catch(e){ cart = {}; }
}
function saveCart(){
  localStorage.setItem('shop_cart', JSON.stringify(cart));
}

// Currency conversion and formatting
const USD_TO_INR_RATE = 1; // 1 USD = 1 INR conversion rate
function formatPrice(priceInUSD) { 
  const priceInINR = priceInUSD * USD_TO_INR_RATE;
  return priceInINR.toFixed(2); 
}

// Load products from Supabase
async function loadProducts() {
  if ($products) {
    $products.innerHTML = '<p>Loading products...</p>';
  }
  
  if (!supabase) {
    if ($products) {
      $products.innerHTML = '<p>Unable to load products. Please try again later.</p>';
    }
    return;
  }
  
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    PRODUCTS = data || [];
    filteredProducts = [...PRODUCTS];
    renderProducts();
    updateProductsCount();
  } catch (error) {
    console.error('Error loading products:', error);
    if ($products) {
      $products.innerHTML = '<p>No products available at the moment.</p>';
    }
  }
}

// Filter functions
function applyFilters() {
  const category = $categoryFilter ? $categoryFilter.value : '';
  const minPrice = $priceMin ? parseFloat($priceMin.value) || 0 : 0;
  const maxPrice = $priceMax ? parseFloat($priceMax.value) || Infinity : Infinity;
  const sortBy = $sortBy ? $sortBy.value : 'name';
  const searchQuery = $search ? $search.value.trim().toLowerCase() : '';

  // Filter products
  filteredProducts = PRODUCTS.filter(product => {
    const categoryMatch = !category || product.category === category;
    const priceMatch = product.price >= minPrice && product.price <= maxPrice;
    const searchMatch = !searchQuery || 
      product.name.toLowerCase().includes(searchQuery) || 
      product.description.toLowerCase().includes(searchQuery);
    return categoryMatch && priceMatch && searchMatch;
  });

  // Sort products
  sortProducts(filteredProducts, sortBy);

  // Update display
  renderProducts();
  updateProductsCount();
}

function sortProducts(products, sortBy) {
  switch (sortBy) {
    case 'name':
      products.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name-desc':
      products.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'price':
      products.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      products.sort((a, b) => b.price - a.price);
      break;
    case 'newest':
      products.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      break;
    default:
      break;
  }
}

function clearFilters() {
  if ($categoryFilter) $categoryFilter.value = '';
  if ($priceMin) $priceMin.value = '';
  if ($priceMax) $priceMax.value = '';
  if ($sortBy) $sortBy.value = 'name';
  if ($search) $search.value = '';
  
  filteredProducts = [...PRODUCTS];
  renderProducts();
  updateProductsCount();
}

function updateProductsCount() {
  if ($productsCount) {
    $productsCount.textContent = filteredProducts.length;
  }
}

function renderProducts(){
  if (!$products) return;
  
  if (filteredProducts.length === 0) {
    $products.innerHTML = '<p>No products found matching your criteria.</p>';
    return;
  }
  
  $products.innerHTML = '';
  
  for(const p of filteredProducts){
    const card = document.createElement('article');
    card.className = 'product';
    
    // Handle missing image_url
    const imageUrl = p.image_url || 'https://via.placeholder.com/300x200?text=No+Image';
    
    card.innerHTML = `
      <img src="${imageUrl}" alt="${p.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image'" />
      <h4>${p.name}</h4>
      <p>${p.description || 'No description available.'}</p>
      ${p.category ? `<div style="font-size:0.8rem;color:var(--muted);margin:0.25rem 0;">Category: ${p.category}</div>` : ''}
      ${p.stock_quantity !== undefined ? `<div style="font-size:0.8rem;color:var(--muted);">Stock: ${p.stock_quantity}</div>` : ''}
      <div class="price-row">
        <div class="price">₹${formatPrice(p.price)}</div>
        <button class="btn add" data-id="${p.id}">Add to cart</button>
      </div>
    `;
    $products.appendChild(card);
  }
}

function updateCartCount(){
  if ($cartCount) {
    const count = Object.values(cart).reduce((s,n)=>s+n,0);
    $cartCount.textContent = count;
  }
}

function renderCart(){
  if (!$cartItems || !$cartTotal) return;
  
  $cartItems.innerHTML = '';
  const ids = Object.keys(cart);
  if(ids.length === 0){
    $cartItems.innerHTML = '<div style="color:#666;padding:1rem">Cart is empty</div>';
    $cartTotal.textContent = '0.00';
    return;
  }
  let total = 0;
  for(const id of ids){
    const qty = cart[id];
    const prod = PRODUCTS.find(p=>p.id==id);
    if(!prod) continue;
    total += prod.price * qty;
    const item = document.createElement('div');
    item.className = 'cart-item';
    item.innerHTML = `
      <img src="${prod.image_url}" alt="${prod.name}" />
      <div style="flex:1">
        <div style="font-weight:600">${prod.name}</div>
        <div style="color:#666;font-size:.9rem">₹${formatPrice(prod.price)} × ${qty}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:.25rem;align-items:flex-end">
        <button class="btn small increase" data-id="${id}">+</button>
        <button class="btn small decrease" data-id="${id}">-</button>
        <button class="btn small remove" data-id="${id}">Remove</button>
      </div>
    `;
    $cartItems.appendChild(item);
  }
  $cartTotal.textContent = formatPrice(total);
}

function addToCart(id, qty=1){
  cart[id] = (cart[id]||0) + qty;
  if(cart[id] <= 0) delete cart[id];
  saveCart();
  updateCartCount();
  renderCart();
}

function removeFromCart(id){
  delete cart[id];
  saveCart();
  updateCartCount();
  renderCart();
}

function changeQty(id, delta){
  cart[id] = (cart[id]||0) + delta;
  if(cart[id] <= 0) delete cart[id];
  saveCart();
  updateCartCount();
  renderCart();
}

function openCart(){ 
  if ($cart && $overlay) {
    $cart.classList.add('open'); 
    $overlay.classList.add('visible'); 
  }
}

function closeCart(){ 
  if ($cart && $overlay) {
    $cart.classList.remove('open'); 
    $overlay.classList.remove('visible'); 
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async () => {
  // Display user name in welcome section
  displayUserName();
  
  // Add event listeners
  document.addEventListener('click', (e)=>{
    if(e.target.matches('.add')){
      const id = e.target.dataset.id; 
      addToCart(id,1);
    }
    if(e.target.matches('.increase')){
      const id = e.target.dataset.id; 
      changeQty(id,1);
    }
    if(e.target.matches('.decrease')){
      const id = e.target.dataset.id; 
      changeQty(id,-1);
    }
    if(e.target.matches('.remove')){
      const id = e.target.dataset.id; 
      removeFromCart(id);
    }
  });

  if ($cartToggle) $cartToggle.addEventListener('click', openCart);
  if ($closeCart) $closeCart.addEventListener('click', closeCart);
  if ($overlay) $overlay.addEventListener('click', () => {
    closeCart();
    closeSettings();
  });

  if ($checkout) {
    $checkout.addEventListener('click', startCheckoutProcess);
  }

  // Settings event listeners
  if ($settingsToggle) $settingsToggle.addEventListener('click', openSettings);
  if ($closeSettings) $closeSettings.addEventListener('click', closeSettings);
  if ($viewOrdersBtn) $viewOrdersBtn.addEventListener('click', showOrdersHistory);
  if ($clearCartBtn) $clearCartBtn.addEventListener('click', clearCartConfirm);
  if ($clearHistoryBtn) $clearHistoryBtn.addEventListener('click', clearSearchHistory);
  if ($closeOrdersModal) $closeOrdersModal.addEventListener('click', closeOrdersModal);

  if ($search) {
    $search.addEventListener('input', debounce(() => { 
      if (PRODUCTS.length > 0) {
        applyFilters(); 
      }
    }, 300));
  }

  // Filter event listeners
  if ($applyFilters) {
    $applyFilters.addEventListener('click', applyFilters);
  }

  if ($clearFilters) {
    $clearFilters.addEventListener('click', clearFilters);
  }

  if ($categoryFilter) {
    $categoryFilter.addEventListener('change', applyFilters);
  }

  if ($sortBy) {
    $sortBy.addEventListener('change', applyFilters);
  }

  if ($priceMin) {
    $priceMin.addEventListener('input', debounce(applyFilters, 500));
  }

  if ($priceMax) {
    $priceMax.addEventListener('input', debounce(applyFilters, 500));
  }

  if ($logoutBtn) {
    $logoutBtn.addEventListener('click', async () => {
      if (confirm('👋 Are you sure you want to logout?')) {
        // Close settings panel first
        closeSettings();
        
        if (supabase) {
          await supabase.auth.signOut();
        }
        localStorage.clear();
        window.location.href = 'login.html';
      }
    });
  }

  // Initialize
  loadCart();
  await loadProducts();
  updateCartCount();
  renderCart();
  
  // Test Supabase connection
  testSupabaseConnection();
});

// Test Supabase connection
async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  if (!supabase) {
    console.error('❌ Supabase client not initialized');
    return;
  }
  
  try {
    // Test with a simple query to products table
    const { data, error } = await supabase
      .from('products')
      .select('id')
      .limit(1);
      
    if (error) {
      console.error('❌ Supabase connection test failed:', error);
    } else {
      console.log('✅ Supabase connection working:', data);
    }
  } catch (error) {
    console.error('❌ Supabase connection error:', error);
  }
}

// =============================================
// SETTINGS FUNCTIONALITY
// =============================================

// Open settings panel
function openSettings() {
  if ($settings) {
    $settings.classList.add('active');
    if ($overlay) {
      $overlay.classList.add('visible');
    }
    
    // Update user email display
    updateUserInfo();
  }
}

// Close settings panel
function closeSettings() {
  if ($settings) {
    $settings.classList.remove('active');
    if ($overlay) {
      $overlay.classList.remove('visible');
    }
  }
}

// Update user information display
function updateUserInfo() {
  if ($userEmail) {
    const userEmail = localStorage.getItem('userEmail') || 'guest@toonworld.com';
    $userEmail.textContent = `📧 ${userEmail}`;
  }
}

// Show orders history modal
async function showOrdersHistory() {
  if ($ordersModal) {
    $ordersModal.classList.add('active');
    await loadUserOrders();
  }
}

// Close orders modal
function closeOrdersModal() {
  if ($ordersModal) {
    $ordersModal.classList.remove('active');
  }
}

// Load user's order history
async function loadUserOrders() {
  if (!$ordersHistoryContent) return;
  
  // Show loading state
  $ordersHistoryContent.innerHTML = `
    <div class="loading-orders">
      <div class="loading-spinner-small"></div>
      <p>Loading your orders...</p>
    </div>
  `;
  
  try {
    const userEmail = localStorage.getItem('userEmail') || 'guest@toonworld.com';
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_email', userEmail)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error loading user orders:', error);
      $ordersHistoryContent.innerHTML = `
        <div class="no-orders-message">
          <div class="no-orders-icon">❌</div>
          <h4>Error Loading Orders</h4>
          <p>Unable to load your order history. Please try again later.</p>
        </div>
      `;
      return;
    }
    
    if (!data || data.length === 0) {
      $ordersHistoryContent.innerHTML = `
        <div class="no-orders-message">
          <div class="no-orders-icon">📦</div>
          <h4>No Orders Yet</h4>
          <p>You haven't placed any orders yet. Start shopping to see your order history here!</p>
        </div>
      `;
      return;
    }
    
    // Render orders
    $ordersHistoryContent.innerHTML = data.map(order => {
      const orderDate = new Date(order.created_at).toLocaleDateString();
      const orderTime = new Date(order.created_at).toLocaleTimeString();
      const statusBadge = getOrderStatusBadge(order.order_status);
      const itemsCount = order.order_items?.length || 0;
      
      return `
        <div class="order-history-item">
          <div class="order-history-header">
            <div class="order-history-info">
              <h4>🛍️ Order #${order.order_number}</h4>
              <p>📅 ${orderDate} at ${orderTime}</p>
              <p>📍 ${order.shipping_address?.city}, ${order.shipping_address?.state}</p>
            </div>
            <div class="order-history-status">
              <div class="order-history-total">₹${(order.total_amount || 0).toFixed(2)}</div>
              ${statusBadge}
            </div>
          </div>
          
          <div class="order-history-items">
            <h5>📦 Items (${itemsCount}):</h5>
            ${renderOrderHistoryItems(order.order_items)}
          </div>
        </div>
      `;
    }).join('');
    
  } catch (error) {
    console.error('❌ Error loading orders:', error);
    $ordersHistoryContent.innerHTML = `
      <div class="no-orders-message">
        <div class="no-orders-icon">❌</div>
        <h4>Connection Error</h4>
        <p>Unable to connect to the server. Please check your internet connection.</p>
      </div>
    `;
  }
}

// Render order history items
function renderOrderHistoryItems(items) {
  if (!items || items.length === 0) {
    return '<p>No items found</p>';
  }
  
  return items.map(item => `
    <div class="order-history-item-detail">
      <span>${item.name || 'Unknown Item'}</span>
      <span>Qty: ${item.quantity || 1}</span>
      <span>₹${(item.total || 0).toFixed(2)}</span>
    </div>
  `).join('');
}

// Get order status badge (reuse from admin)
function getOrderStatusBadge(status) {
  const badges = {
    pending: '<span class="status-badge status-pending">⏳ Pending</span>',
    confirmed: '<span class="status-badge status-confirmed">✅ Confirmed</span>',
    shipped: '<span class="status-badge status-shipped">🚚 Shipped</span>',
    delivered: '<span class="status-badge status-delivered">📦 Delivered</span>',
    cancelled: '<span class="status-badge status-cancelled">❌ Cancelled</span>'
  };
  return badges[status] || badges.pending;
}

// Clear cart with confirmation
function clearCartConfirm() {
  if (Object.keys(cart).length === 0) {
    alert('🛒 Your cart is already empty!');
    return;
  }
  
  if (confirm('🗑️ Are you sure you want to clear your cart? This action cannot be undone.')) {
    cart = {};
    saveCart();
    updateCartCount();
    renderCart();
    alert('✅ Cart cleared successfully!');
    closeSettings();
  }
}

// Clear search history
function clearSearchHistory() {
  if (confirm('🧹 Clear your search history? This will reset your search preferences.')) {
    // Clear any stored search history if implemented
    localStorage.removeItem('searchHistory');
    alert('✅ Search history cleared!');
  }
}

// =============================================
// CHECKOUT FUNCTIONALITY
// =============================================

let checkoutData = {
  address: {},
  orderItems: [],
  total: 0
};

// Start the checkout process
function startCheckoutProcess() {
  if (Object.keys(cart).length === 0) {
    alert('🛒 Your cart is empty! Add some cartoon characters first.');
    return;
  }
  
  // Prepare order items
  checkoutData.orderItems = Object.keys(cart).map(id => {
    const product = PRODUCTS.find(p => p.id == id);
    const quantity = cart[id];
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: quantity,
      image: product.image_url,
      total: product.price * quantity
    };
  });
  
  checkoutData.total = Object.keys(cart).reduce((sum, id) => {
    const product = PRODUCTS.find(p => p.id == id);
    return sum + (product.price * cart[id]);
  }, 0);
  
  // Close cart and show address modal
  closeCart();
  showAddressModal();
}

// Show address form modal
function showAddressModal() {
  const modal = document.getElementById('checkout-address-modal');
  modal.classList.add('active');
  
  // Focus on first input
  setTimeout(() => {
    document.getElementById('first-name').focus();
  }, 300);
}

// Show confirmation modal
function showConfirmationModal() {
  const modal = document.getElementById('checkout-confirmation-modal');
  modal.classList.add('active');
  
  // Populate address display
  const addressDiv = document.getElementById('confirmed-address');
  const addr = checkoutData.address;
  addressDiv.innerHTML = `
    <p><strong>📧 ${addr.firstName} ${addr.lastName}</strong></p>
    <p>📱 ${addr.phoneNumber}</p>
    <p>🏠 ${addr.address1}</p>
    ${addr.address2 ? `<p>🏢 ${addr.address2}</p>` : ''}
    <p>🏙️ ${addr.city}, ${addr.state} ${addr.zipCode}</p>
    <p>🌍 ${addr.country}</p>
  `;
  
  // Populate order items
  const orderItemsDiv = document.getElementById('order-items');
  orderItemsDiv.innerHTML = checkoutData.orderItems.map(item => `
    <div class="order-item">
      <div class="order-item-info">
        <img src="${item.image}" alt="${item.name}" class="order-item-image" onerror="this.src='data:image/svg+xml,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"50\\" height=\\"50\\" viewBox=\\"0 0 50 50\\"><rect width=\\"50\\" height=\\"50\\" fill=\\"%23f0f0f0\\"/><text x=\\"25\\" y=\\"30\\" text-anchor=\\"middle\\" fill=\\"%23999\\" font-size=\\"20\\">🎭</text></svg>'">
        <div class="order-item-details">
          <h5>${item.name}</h5>
          <p>Quantity: ${item.quantity}</p>
        </div>
      </div>
      <div class="order-item-price">₹${item.total.toFixed(2)}</div>
    </div>
  `).join('');
  
  // Update totals
  const subtotal = checkoutData.total;
  const shipping = 75;
  const finalTotal = subtotal + shipping;
  
  document.getElementById('order-subtotal').textContent = subtotal.toFixed(2);
  document.getElementById('shipping-cost').textContent = shipping.toFixed(2);
  document.getElementById('order-final-total').textContent = finalTotal.toFixed(2);
}

// Show success modal
function showSuccessModal() {
  const modal = document.getElementById('order-success-modal');
  modal.classList.add('active');
  
  // Use stored order number from Supabase save
  const orderNumber = checkoutData.orderNumber || 'TW' + Date.now().toString().slice(-6);
  document.getElementById('order-number').textContent = orderNumber;
  
  // Clear cart
  cart = {};
  saveCart();
  updateCartCount();
  renderCart();
}

// Close modal function
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  modal.classList.remove('active');
}

// Close all modals
function closeAllModals() {
  document.querySelectorAll('.checkout-modal').forEach(modal => {
    modal.classList.remove('active');
  });
}

// Initialize checkout event listeners
function initCheckoutListeners() {
  // Address form submission
  const addressForm = document.getElementById('address-form');
  if (addressForm) {
    addressForm.addEventListener('submit', (e) => {
      e.preventDefault();
      
      // Collect form data
      const formData = new FormData(addressForm);
      checkoutData.address = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        phoneNumber: formData.get('phoneNumber'),
        address1: formData.get('address1'),
        address2: formData.get('address2'),
        city: formData.get('city'),
        state: formData.get('state'),
        zipCode: formData.get('zipCode'),
        country: formData.get('country')
      };
      
      // Validate required fields
      const requiredFields = ['firstName', 'lastName', 'phoneNumber', 'address1', 'city', 'state', 'zipCode'];
      const missingFields = requiredFields.filter(field => !checkoutData.address[field]);
      
      if (missingFields.length > 0) {
        alert('❌ Please fill in all required fields: ' + missingFields.join(', '));
        return;
      }
      
      // Close address modal and show confirmation
      closeModal('checkout-address-modal');
      setTimeout(() => showConfirmationModal(), 300);
    });
  }
  
  // Place order button
  const placeOrderBtn = document.getElementById('place-order-btn');
  if (placeOrderBtn) {
    placeOrderBtn.addEventListener('click', async () => {
      // Show loading state
      placeOrderBtn.innerHTML = '🔄 Processing Order...';
      placeOrderBtn.disabled = true;
      
      try {
        // Save order to Supabase
        await saveOrderToSupabase();
        
        // Close confirmation modal and show success
        closeModal('checkout-confirmation-modal');
        setTimeout(() => showSuccessModal(), 300);
      } catch (error) {
        console.error('❌ Error placing order:', error);
        
        // Show specific error message
        let errorMessage = '❌ Error placing order. Please try again.';
        if (error.message.includes('Database error')) {
          errorMessage = '❌ Database connection issue. Please check your internet and try again.';
        } else if (error.message.includes('incomplete')) {
          errorMessage = '❌ Order information is incomplete. Please refresh and try again.';
        } else if (error.message.includes('not available')) {
          errorMessage = '❌ Service temporarily unavailable. Please try again in a moment.';
        }
        
        alert(errorMessage);
        console.error('💡 Error details for debugging:', error.message);
        
        // Reset button state
        placeOrderBtn.innerHTML = '🎉 Place Order';
        placeOrderBtn.disabled = false;
      }
    });
  }
  
  // Continue shopping button
  const continueShoppingBtn = document.getElementById('continue-shopping-btn');
  if (continueShoppingBtn) {
    continueShoppingBtn.addEventListener('click', () => {
      closeAllModals();
    });
  }
  
  // Close modal buttons
  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.checkout-modal');
      if (modal) {
        modal.classList.remove('active');
      }
    });
  });
  
  // Close on overlay click
  document.querySelectorAll('.checkout-modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('active');
      }
    });
  });
}

// Save order to Supabase
async function saveOrderToSupabase() {
  console.log('🔄 Starting order save process...');
  
  if (!supabase) {
    console.error('❌ Supabase client not initialized');
    throw new Error('Database connection not available');
  }

  // Validate required data
  if (!checkoutData.address || !checkoutData.orderItems || checkoutData.orderItems.length === 0) {
    console.error('❌ Missing required order data');
    throw new Error('Order data is incomplete');
  }

  // Generate order number
  const orderNumber = 'TW' + Date.now().toString().slice(-6);
  
  // Calculate totals
  const subtotal = parseFloat(checkoutData.total) || 0;
  const shipping = 75;
  const finalTotal = subtotal + shipping;
  
  // Prepare order data (remove created_at to let database auto-generate)
  const orderData = {
    order_number: orderNumber,
    customer_name: `${checkoutData.address.firstName} ${checkoutData.address.lastName}`,
    customer_phone: checkoutData.address.phoneNumber,
    customer_email: localStorage.getItem('userEmail') || 'guest@toonworld.com',
    shipping_address: {
      address1: checkoutData.address.address1,
      address2: checkoutData.address.address2 || '',
      city: checkoutData.address.city,
      state: checkoutData.address.state,
      zipCode: checkoutData.address.zipCode,
      country: checkoutData.address.country
    },
    order_items: checkoutData.orderItems,
    subtotal: subtotal,
    shipping_cost: shipping,
    total_amount: finalTotal,
    payment_method: 'COD',
    order_status: 'pending'
  };

  console.log('💾 Saving order to Supabase:', orderData);

  try {
    // Save to Supabase
    const { data, error } = await supabase
      .from('orders')
      .insert([orderData])
      .select();

    if (error) {
      console.error('❌ Supabase error details:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error details:', error.details);
      console.error('❌ Error hint:', error.hint);
      throw new Error('Database error: ' + error.message);
    }

    if (!data || data.length === 0) {
      console.error('❌ No data returned from insert');
      throw new Error('Order was not saved properly');
    }

    console.log('✅ Order saved successfully:', data);
    
    // Store order number for success display
    checkoutData.orderNumber = orderNumber;
    
    return data;
    
  } catch (dbError) {
    console.error('❌ Database operation failed:', dbError);
    throw new Error('Failed to save order: ' + dbError.message);
  }
}

// Form validation helpers
function validatePhoneNumber(phone) {
  const phoneRegex = /^[\+]?[0-9\s\-\(\)]+$/;
  return phoneRegex.test(phone) && phone.length >= 10;
}

function validateZipCode(zip) {
  const zipRegex = /^[0-9]{6}$/; // Indian PIN code format
  return zipRegex.test(zip);
}

// Initialize checkout when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  initCheckoutListeners();
  testOrdersTable();
});

// Test if orders table exists and is accessible
async function testOrdersTable() {
  console.log('🔍 Testing orders table access...');
  
  if (!supabase) {
    console.error('❌ Supabase client not initialized for orders test');
    return;
  }
  
  try {
    // Test with a simple query to orders table
    const { data, error } = await supabase
      .from('orders')
      .select('id')
      .limit(1);
      
    if (error) {
      console.error('❌ Orders table test failed:', error);
      console.error('💡 Make sure the orders table exists in Supabase');
      console.error('💡 Run the create_orders_table.sql script in Supabase SQL Editor');
    } else {
      console.log('✅ Orders table accessible:', data);
    }
  } catch (error) {
    console.error('❌ Orders table connection error:', error);
  }
}