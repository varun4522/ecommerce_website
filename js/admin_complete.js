// Complete Admin panel functionality with product management
console.log('🚀 Complete admin.js loaded');

// Supabase configuration
const SUPABASE_URL = 'https://kvdmiwmxswiqqokjotsy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2ZG1pd214c3dpcXFva2pvdHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2OTY5MDksImV4cCI6MjA3MTI3MjkwOX0.yUlQtEWG8WU9LtNbi0fZB8MkP1htfYePwVBHFp0OIIo';

// Initialize Supabase client
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Currency conversion
const USD_TO_INR_RATE = 83; // Approximate conversion rate
function convertToINR(priceInUSD) {
  return (priceInUSD * USD_TO_INR_RATE).toFixed(2);
}

// DOM elements
let $tabProducts, $tabOrders;
let $productsPanel, $ordersPanel;
let $productsList, $ordersList;
let $addProductBtn, $productModal, $modalOverlay, $closeModal, $productForm;
let $logoutBtn, $debugBtn, $adminWelcome;

// Global variables
let currentUser = null;
let products = [];
let isEditMode = false;
let editingProductId = null;
let selectedImages = [];

// Convert image file to Base64
function convertImageToBase64(file) {
  return new Promise((resolve, reject) => {
    console.log('📸 Converting image to Base64...', file.name, `(${(file.size / 1024).toFixed(1)}KB)`);
    
    // Check file size (limit to 500KB for Base64)
    if (file.size > 500000) {
      reject(new Error('Image file is too large for Base64 encoding. Please use an image under 500KB or upload to Imgur and use the URL instead.'));
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve(e.target.result);
    };
    reader.onerror = (e) => {
      reject(new Error('Failed to read image file'));
    };
    reader.readAsDataURL(file);
  });
}

// Convert multiple images to Base64
async function convertMultipleImagesToBase64(files) {
  console.log('📸 Converting multiple images to Base64...', files.length, 'files');
  
  const results = [];
  const maxFiles = 4; // Limit to 4 images total
  const maxSize = 500000; // 500KB limit
  
  // Process up to 4 files
  const filesToProcess = Array.from(files).slice(0, maxFiles);
  
  for (let i = 0; i < filesToProcess.length; i++) {
    const file = filesToProcess[i];
    
    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        console.warn(`⚠️ Skipping non-image file: ${file.name}`);
        continue;
      }
      
      // Validate file size
      if (file.size > maxSize) {
        console.warn(`⚠️ Skipping large file: ${file.name} (${(file.size / 1024).toFixed(1)}KB > 500KB)`);
        results.push({
          success: false,
          fileName: file.name,
          error: `File too large (${(file.size / 1024).toFixed(1)}KB). Max size is 500KB.`,
          data: null
        });
        continue;
      }
      
      // Convert to Base64
      const base64Data = await convertImageToBase64(file);
      results.push({
        success: true,
        fileName: file.name,
        size: file.size,
        data: base64Data,
        error: null
      });
      
      console.log(`✅ Converted: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
      
    } catch (error) {
      console.error(`❌ Failed to convert ${file.name}:`, error);
      results.push({
        success: false,
        fileName: file.name,
        error: error.message,
        data: null
      });
    }
  }
  
  console.log(`📊 Conversion complete: ${results.filter(r => r.success).length}/${results.length} successful`);
  return results;
}

// Validate and format image uploads
function validateImageUploads(uploadResults) {
  const successful = uploadResults.filter(result => result.success);
  const failed = uploadResults.filter(result => !result.success);
  
  if (failed.length > 0) {
    console.warn('⚠️ Some images failed to upload:', failed);
    
    // Show warning about failed uploads
    const failedMessages = failed.map(f => `• ${f.fileName}: ${f.error}`).join('\n');
    const message = `Some images couldn't be processed:\n${failedMessages}\n\nContinue with ${successful.length} successful uploads?`;
    
    if (!confirm(message)) {
      throw new Error('Upload cancelled by user');
    }
  }
  
  return successful.map(result => result.data);
}

// Authentication check
async function checkAdminAuth() {
  console.log('=== CHECKING ADMIN AUTHENTICATION ===');

  try {
    const userData = localStorage.getItem('userData');
    const isAdminBypass = localStorage.getItem('isAdminBypass');

    console.log('Auth check - userData:', !!userData);
    console.log('Auth check - isAdminBypass:', isAdminBypass);

    if (isAdminBypass === 'true') {
      console.log('✅ Admin bypass detected!');
      currentUser = {
        email: 'hellosgt@gmail.com',
        role: 'admin',
        isAdminBypass: true,
        user_id: 'admin-special',
        full_name: 'Super Admin'
      };
      return true;
    }

    if (userData) {
      try {
        const user = JSON.parse(userData);
        if (user.role === 'admin') {
          console.log('✅ Regular admin user detected!');
          currentUser = user;
          return true;
        }
      } catch (e) {
        console.error('❌ Error parsing userData:', e);
      }
    }

    console.log('❌ No valid admin authentication found');
    return false;

  } catch (error) {
    console.error('❌ Auth check error:', error);
    return false;
  }
}

// Initialize DOM elements
function initializeDOMElements() {
  console.log('🔧 Initializing DOM elements...');
  
  $tabProducts = document.getElementById('tab-products');
  $tabOrders = document.getElementById('tab-orders');
  $productsPanel = document.getElementById('products-panel');
  $ordersPanel = document.getElementById('orders-panel');
  $productsList = document.getElementById('products-list');
  $ordersList = document.getElementById('orders-list');
  $addProductBtn = document.getElementById('add-product-btn');
  $productModal = document.getElementById('product-modal');
  $modalOverlay = document.getElementById('modal-overlay');
  $closeModal = document.getElementById('close-modal');
  $productForm = document.getElementById('product-form');
  $logoutBtn = document.getElementById('logout-btn');
  $debugBtn = document.getElementById('debug-btn');
  $adminWelcome = document.getElementById('admin-welcome');

  console.log('DOM elements initialized:', {
    addProductBtn: !!$addProductBtn,
    productModal: !!$productModal,
    productForm: !!$productForm,
    productsList: !!$productsList
  });
}

// Tab switching
function switchTab(activeTab) {
  console.log('🔄 Switching tab...');
  
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
  } else if (activeTab === $tabOrders) {
    $ordersPanel.classList.remove('hidden');
    loadOrders();
  }
}

// Load products
async function loadProducts() {
  console.log('📦 Loading products...');
  
  if (!$productsList) {
    console.error('❌ Products list element not found');
    return;
  }

  if (!supabase) {
    $productsList.innerHTML = '<p class="error">⚠️ Supabase not configured</p>';
    return;
  }
  
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error loading products:', error);
      throw error;
    }
    
    products = data || [];
    console.log('✅ Products loaded:', products.length);
    renderProducts();
    
  } catch (error) {
    console.error('❌ Error loading products:', error);
    $productsList.innerHTML = '<p class="error">❌ Error loading products: ' + error.message + '</p>';
  }
}

// Render products
function renderProducts() {
  console.log('🎨 Rendering products...');
  
  if (!$productsList) {
    console.error('❌ Products list element not found');
    return;
  }

  $productsList.innerHTML = '';
  
  if (products.length === 0) {
    $productsList.innerHTML = '<p class="info">📝 No products found. Add some products to get started.</p>';
    return;
  }
  
  products.forEach(product => {
    const item = document.createElement('div');
    item.className = 'admin-item';
    item.innerHTML = `
      <div class="admin-item-header">
        <div>
          <h4>${product.name}</h4>
          <p><strong>Category:</strong> ${product.category || 'Uncategorized'}</p>
          <p>${product.description}</p>
          <p><strong>Price: ₹${convertToINR(product.price)}</strong></p>
          <p><strong>Stock:</strong> ${product.stock_quantity || 0} units</p>
          ${product.image_url ? `<img src="${product.image_url}" alt="${product.name}" style="max-width: 100px; max-height: 100px; object-fit: cover; border-radius: 8px; margin-top: 10px;">` : ''}
          ${product.additional_images && product.additional_images.length > 0 ? 
            `<div style="margin-top: 10px;">
              <strong>Additional Images:</strong>
              <div style="display: flex; gap: 5px; margin-top: 5px;">
                ${product.additional_images.map(img => img ? `<img src="${img}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;">` : '').join('')}
              </div>
            </div>` : ''
          }
        </div>
        <div class="admin-item-actions">
          <button class="btn btn-warning btn-sm edit-btn" onclick="editProduct('${product.id}')">✏️ Edit</button>
          <button class="btn btn-danger btn-sm" onclick="deleteProduct('${product.id}')">🗑️ Delete</button>
        </div>
      </div>
    `;
    $productsList.appendChild(item);
  });
  
  console.log('✅ Products rendered');
}

// Add product function
async function addProduct(productData) {
  console.log('➕ Adding product:', productData);
  
  if (!supabase) {
    alert('❌ Supabase not configured');
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .insert([{
        name: productData.name,
        description: productData.description,
        category: productData.category,
        price: parseFloat(productData.price),
        stock_quantity: parseInt(productData.stock) || 0,
        image_url: productData.image_url || null,
        created_at: new Date().toISOString()
      }])
      .select();

    if (error) {
      console.error('❌ Error adding product:', error);
      throw error;
    }

    console.log('✅ Product added successfully:', data);
    
    // Reload products
    await loadProducts();
    
    // Reset form and close modal
    resetProductForm();
    closeModal();
    
    alert('✅ Product added successfully!');
    return true;

  } catch (error) {
    console.error('❌ Error adding product:', error);
    alert('❌ Error adding product: ' + error.message);
    return false;
  }
}

// Update existing product
async function updateProduct(productId, productData) {
  console.log('✏️ Updating product:', productId, productData);
  
  if (!supabase) {
    alert('❌ Supabase not configured');
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('products')
      .update({
        name: productData.name,
        description: productData.description,
        category: productData.category,
        price: productData.price,
        stock_quantity: productData.stock_quantity,
        image_url: productData.image_url || null,
        additional_images: productData.additional_images || [],
        updated_at: new Date().toISOString()
      })
      .eq('id', productId)
      .select();

    if (error) {
      console.error('❌ Error updating product:', error);
      throw error;
    }

    console.log('✅ Product updated successfully:', data);
    
    // Reload products
    await loadProducts();
    
    // Reset form and close modal
    resetProductForm();
    closeModal();
    
    alert('✅ Product updated successfully!');
    return true;

  } catch (error) {
    console.error('❌ Error updating product:', error);
    alert('❌ Error updating product: ' + error.message);
    return false;
  }
}

// Reset product form
function resetProductForm() {
  console.log('🔄 Resetting product form...');
  
  if ($productForm) {
    $productForm.reset();
  }
  
  // Clear image previews
  const imagePreviewsContainer = document.getElementById('image-previews');
  const imageFileInput = document.getElementById('product-image-file');
  
  if (imagePreviewsContainer) {
    imagePreviewsContainer.innerHTML = '';
  }
  
  if (imageFileInput) {
    imageFileInput.value = '';
  }
  
  // Reset edit mode
  isEditMode = false;
  editingProductId = null;
  selectedImages = [];
  
  // Update UI for add mode
  const submitBtn = document.getElementById('submit-btn');
  const cancelBtn = document.getElementById('cancel-edit-btn');
  const editIndicator = document.querySelector('.edit-indicator');
  
  if (submitBtn) {
    submitBtn.textContent = 'Add Product';
    submitBtn.className = 'btn btn-primary';
  }
  
  if (cancelBtn) {
    cancelBtn.style.display = 'none';
  }
  
  if (editIndicator) {
    editIndicator.remove();
  }
  
  console.log('✅ Product form reset');
}

// Edit product function
function editProduct(productId) {
  console.log('✏️ Editing product:', productId);
  
  const product = products.find(p => p.id === productId);
  if (!product) {
    alert('❌ Product not found');
    return;
  }
  
  // Set edit mode
  isEditMode = true;
  editingProductId = productId;
  
  // Fill form with existing data
  document.getElementById('product-name').value = product.name || '';
  document.getElementById('product-description').value = product.description || '';
  document.getElementById('product-category').value = product.category || '';
  document.getElementById('product-price').value = product.price || '';
  document.getElementById('product-stock').value = product.stock_quantity || '';
  document.getElementById('product-image').value = product.image_url || '';
  
  // Fill additional images if they exist
  const additionalImages = product.additional_images || [];
  for (let i = 0; i < 3; i++) {
    const input = document.getElementById(`additional-image-${i + 1}`);
    if (input) {
      input.value = additionalImages[i] || '';
    }
  }
  
  // Update UI for edit mode
  const submitBtn = document.getElementById('submit-btn');
  const cancelBtn = document.getElementById('cancel-edit-btn');
  
  if (submitBtn) {
    submitBtn.textContent = 'Update Product';
    submitBtn.className = 'btn btn-primary';
  }
  
  if (cancelBtn) {
    cancelBtn.style.display = 'inline-block';
  }
  
  // Add edit indicator
  const form = document.getElementById('product-form');
  if (form && !form.querySelector('.edit-indicator')) {
    const indicator = document.createElement('div');
    indicator.className = 'edit-indicator';
    indicator.textContent = `🔧 Editing: ${product.name}`;
    form.insertBefore(indicator, form.firstChild);
  }
  
  // Open modal
  openModal();
}

// Make functions globally accessible for inline onclick handlers
window.editProduct = editProduct;

// Delete product
async function deleteProduct(productId) {
  console.log('🗑️ Deleting product:', productId);
  
  if (!confirm('Are you sure you want to delete this product?')) {
    return;
  }

  if (!supabase) {
    alert('❌ Supabase not configured');
    return;
  }

  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      console.error('❌ Error deleting product:', error);
      throw error;
    }

    console.log('✅ Product deleted successfully');
    
    // Reload products
    await loadProducts();
    
    alert('✅ Product deleted successfully!');

  } catch (error) {
    console.error('❌ Error deleting product:', error);
    alert('❌ Error deleting product: ' + error.message);
  }
}

// Make deleteProduct globally accessible
window.deleteProduct = deleteProduct;

// =============================================
// ORDERS MANAGEMENT
// =============================================

let orders = [];

// Load orders from Supabase
async function loadOrders() {
  try {
    console.log('📦 Loading orders from Supabase...');
    
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error loading orders:', error);
      $ordersList.innerHTML = '<p class="error">❌ Error loading orders: ' + error.message + '</p>';
      return;
    }

    orders = data || [];
    console.log('✅ Orders loaded:', orders.length, 'orders');
    renderOrders();

  } catch (error) {
    console.error('❌ Unexpected error loading orders:', error);
    $ordersList.innerHTML = '<p class="error">❌ Unexpected error loading orders</p>';
  }
}

// Render orders in the admin panel
function renderOrders() {
  if (!$ordersList) {
    console.error('❌ Orders list element not found');
    return;
  }

  if (orders.length === 0) {
    $ordersList.innerHTML = '<p class="no-orders">📦 No orders yet. Orders will appear here when customers place them.</p>';
    return;
  }

  $ordersList.innerHTML = orders.map(order => {
    const orderDate = new Date(order.created_at).toLocaleString();
    const statusBadge = getOrderStatusBadge(order.order_status);
    const itemsCount = order.order_items?.length || 0;
    
    return `
      <div class="order-item" data-order-id="${order.id}">
        <div class="order-header">
          <div class="order-info">
            <h4>🛍️ Order #${order.order_number}</h4>
            <p class="order-date">📅 ${orderDate}</p>
            <p class="order-customer">👤 ${order.customer_name}</p>
            <p class="order-phone">📱 ${order.customer_phone}</p>
          </div>
          <div class="order-status">
            ${statusBadge}
            <p class="order-total">💰 ₹${order.total_amount?.toFixed(2) || '0.00'}</p>
          </div>
        </div>
        
        <div class="order-details">
          <div class="order-items">
            <h5>📦 Items (${itemsCount}):</h5>
            ${renderOrderItems(order.order_items)}
          </div>
          
          <div class="order-address">
            <h5>🏠 Shipping Address:</h5>
            <p>${order.shipping_address?.address1 || 'N/A'}</p>
            ${order.shipping_address?.address2 ? `<p>${order.shipping_address.address2}</p>` : ''}
            <p>${order.shipping_address?.city || ''}, ${order.shipping_address?.state || ''} ${order.shipping_address?.zipCode || ''}</p>
            <p>${order.shipping_address?.country || ''}</p>
          </div>
          
          <div class="order-payment">
            <h5>💳 Payment:</h5>
            <p>Method: ${order.payment_method || 'COD'}</p>
            <p>Subtotal: ₹${order.subtotal?.toFixed(2) || '0.00'}</p>
            <p>Shipping: ₹${order.shipping_cost?.toFixed(2) || '0.00'}</p>
            <p><strong>Total: ₹${order.total_amount?.toFixed(2) || '0.00'}</strong></p>
          </div>
        </div>
        
        <div class="order-actions">
          <select onchange="updateOrderStatus('${order.id}', this.value)" class="status-select">
            <option value="pending" ${order.order_status === 'pending' ? 'selected' : ''}>⏳ Pending</option>
            <option value="confirmed" ${order.order_status === 'confirmed' ? 'selected' : ''}>✅ Confirmed</option>
            <option value="shipped" ${order.order_status === 'shipped' ? 'selected' : ''}>🚚 Shipped</option>
            <option value="delivered" ${order.order_status === 'delivered' ? 'selected' : ''}>📦 Delivered</option>
            <option value="cancelled" ${order.order_status === 'cancelled' ? 'selected' : ''}>❌ Cancelled</option>
          </select>
          <button class="btn btn-danger btn-sm" onclick="deleteOrder('${order.id}')">🗑️ Delete</button>
        </div>
      </div>
    `;
  }).join('');
}

// Render order items
function renderOrderItems(items) {
  if (!items || items.length === 0) {
    return '<p>No items</p>';
  }
  
  return items.map(item => `
    <div class="order-item-detail">
      <span>${item.name || 'Unknown Item'}</span>
      <span>Qty: ${item.quantity || 1}</span>
      <span>₹${(item.total || 0).toFixed(2)}</span>
    </div>
  `).join('');
}

// Get order status badge
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

// Update order status
async function updateOrderStatus(orderId, newStatus) {
  try {
    console.log(`🔄 Updating order ${orderId} status to ${newStatus}`);
    
    const { error } = await supabase
      .from('orders')
      .update({ order_status: newStatus })
      .eq('id', orderId);

    if (error) {
      console.error('❌ Error updating order status:', error);
      alert('❌ Error updating order status: ' + error.message);
      return;
    }

    console.log('✅ Order status updated successfully');
    
    // Reload orders to reflect changes
    await loadOrders();
    
    alert('✅ Order status updated successfully!');

  } catch (error) {
    console.error('❌ Error updating order status:', error);
    alert('❌ Error updating order status: ' + error.message);
  }
}

// Delete order
async function deleteOrder(orderId) {
  if (!confirm('⚠️ Are you sure you want to delete this order? This action cannot be undone.')) {
    return;
  }

  try {
    console.log(`🗑️ Deleting order: ${orderId}`);
    
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', orderId);

    if (error) {
      console.error('❌ Error deleting order:', error);
      alert('❌ Error deleting order: ' + error.message);
      return;
    }

    console.log('✅ Order deleted successfully');
    
    // Reload orders
    await loadOrders();
    
    alert('✅ Order deleted successfully!');

  } catch (error) {
    console.error('❌ Error deleting order:', error);
    alert('❌ Error deleting order: ' + error.message);
  }
}

// Make order functions globally accessible
window.updateOrderStatus = updateOrderStatus;
window.deleteOrder = deleteOrder;

// Modal functions
function openModal() {
  console.log('📋 Opening add product modal...');
  console.log('Modal element:', $productModal);
  console.log('Modal overlay element:', $modalOverlay);
  
  if ($productModal) {
    $productModal.style.display = 'block';
    console.log('✅ Modal display set to block');
  } else {
    console.error('❌ Modal element not found!');
  }
  
  if ($modalOverlay) {
    $modalOverlay.style.display = 'block';
    console.log('✅ Modal overlay display set to block');
  } else {
    console.error('❌ Modal overlay element not found!');
  }
  
  console.log('📋 Modal should now be visible');
}

function closeModal() {
  console.log('❌ Closing modal...');
  if ($productModal) {
    $productModal.style.display = 'none';
  }
  if ($modalOverlay) {
    $modalOverlay.style.display = 'none';
  }
  
  // Reset form and clear image preview
  resetProductForm();
}

// Event listeners setup
function setupEventListeners() {
  console.log('🔗 Setting up event listeners...');

  // Tab buttons
  if ($tabProducts) {
    $tabProducts.addEventListener('click', () => switchTab($tabProducts));
  }
  if ($tabOrders) {
    $tabOrders.addEventListener('click', () => switchTab($tabOrders));
  }

  // Add product button
  if ($addProductBtn) {
    $addProductBtn.addEventListener('click', () => {
      console.log('🔥 Add Product button clicked!');
      openModal();
    });
    console.log('✅ Add product button event listener added');
  } else {
    console.error('❌ Add product button not found');
  }

  // Close modal button
  if ($closeModal) {
    $closeModal.addEventListener('click', closeModal);
  }

  // Modal overlay
  if ($modalOverlay) {
    $modalOverlay.addEventListener('click', closeModal);
  }

  // Product form
  if ($productForm) {
    $productForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      console.log('📝 Product form submitted');
      
      const formData = new FormData($productForm);
      const imageFiles = document.getElementById('product-image-file').files;
      
      let imageUrl = formData.get('image_url');
      let additionalImages = [
        formData.get('additional_image_1') || '',
        formData.get('additional_image_2') || '',
        formData.get('additional_image_3') || ''
      ].filter(url => url.trim() !== '');
      
      // If user selected files, convert them to Base64
      if (imageFiles.length > 0) {
        try {
          console.log('🔄 Converting multiple images to Base64...');
          const base64Images = await convertMultipleImagesToBase64(imageFiles);
          
          // Set primary image and additional images
          if (base64Images.length > 0) {
            imageUrl = base64Images[0];
            additionalImages = base64Images.slice(1);
          }
          
          console.log('✅ Multiple images converted to Base64');
        } catch (error) {
          console.error('❌ Error converting images:', error);
          alert('❌ Error processing images: ' + error.message);
          return;
        }
      }
      
      const productData = {
        name: formData.get('name'),
        description: formData.get('description'),
        category: formData.get('category'),
        price: parseFloat(formData.get('price')),
        stock_quantity: parseInt(formData.get('stock')),
        image_url: imageUrl,
        additional_images: additionalImages
      };
      
      console.log('📋 Product data:', productData);
      
      if (isEditMode && editingProductId) {
        await updateProduct(editingProductId, productData);
      } else {
        await addProduct(productData);
      }
    });
    console.log('✅ Product form event listener added');
  } else {
    console.error('❌ Product form not found');
  }

  // Image file input handling for multiple images
  const imageFileInput = document.getElementById('product-image-file');
  const imagePreviewsContainer = document.getElementById('image-previews');
  const imageUrlInput = document.getElementById('product-image');

  if (imageFileInput) {
    imageFileInput.addEventListener('change', (e) => {
      const files = e.target.files;
      if (files.length > 0) {
        console.log('📁 Image files selected:', files.length);
        
        // Clear previous previews
        imagePreviewsContainer.innerHTML = '';
        selectedImages = [];
        
        // Process each file
        Array.from(files).slice(0, 4).forEach((file, index) => {
          console.log(`📷 Processing image ${index + 1}:`, file.name);
          
          // Create preview container
          const previewItem = document.createElement('div');
          previewItem.className = 'image-preview-item';
          
          // Show preview
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = `Preview ${index + 1}`;
            
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-image';
            removeBtn.innerHTML = '×';
            removeBtn.type = 'button';
            removeBtn.onclick = () => {
              previewItem.remove();
              selectedImages[index] = null;
            };
            
            previewItem.appendChild(img);
            previewItem.appendChild(removeBtn);
            imagePreviewsContainer.appendChild(previewItem);
            
            selectedImages[index] = e.target.result;
          };
          reader.readAsDataURL(file);
        });
        
        // Clear URL input when files are selected
        if (files.length > 0) {
          imageUrlInput.value = '';
        }
      } else {
        imagePreviewsContainer.innerHTML = '';
        selectedImages = [];
      }
    });
  }

  // Cancel edit button
  const cancelEditBtn = document.getElementById('cancel-edit-btn');
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
      resetProductForm();
      closeModal();
    });
  }

  // Logout button
  if ($logoutBtn) {
    $logoutBtn.addEventListener('click', () => {
      localStorage.clear();
      window.location.href = 'login.html';
    });
  }

  console.log('✅ Event listeners setup complete');
}

// Main initialization
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 DOM loaded - starting admin initialization...');
  
  const loadingScreen = document.getElementById('loading-screen');
  const adminContent = document.getElementById('admin-content');
  
  // Show loading screen initially
  if (loadingScreen) {
    loadingScreen.style.display = 'flex';
  }
  if (adminContent) {
    adminContent.style.display = 'none';
  }

  // Quick failsafe
  setTimeout(() => {
    console.log('⏰ Failsafe: Ensuring admin content is visible');
    if (loadingScreen) loadingScreen.style.display = 'none';
    if (adminContent) adminContent.style.display = 'block';
  }, 1000);

  try {
    // Check authentication
    const isAuthenticated = await checkAdminAuth();
    console.log('🔐 Authentication result:', isAuthenticated);

    if (!isAuthenticated) {
      alert('❌ Authentication failed. Redirecting to login.');
      window.location.href = 'login.html';
      return;
    }

    // Hide loading, show content
    if (loadingScreen) loadingScreen.style.display = 'none';
    if (adminContent) adminContent.style.display = 'block';

    // Initialize everything
    initializeDOMElements();
    setupEventListeners();
    
    // Load initial data
    if ($tabProducts) {
      switchTab($tabProducts);
    }

    console.log('🎉 Admin panel initialization complete!');

  } catch (error) {
    console.error('❌ Initialization error:', error);
    alert('❌ Error loading admin panel: ' + error.message);
    window.location.href = 'login.html';
  }
});

// Global functions for debugging
window.forceShowAdmin = function() {
  const loadingScreen = document.getElementById('loading-screen');
  const adminContent = document.getElementById('admin-content');
  if (loadingScreen) loadingScreen.style.display = 'none';
  if (adminContent) adminContent.style.display = 'block';
};

window.testAddProduct = function() {
  console.log('🧪 Testing add product...');
  console.log('Current DOM elements:', {
    addProductBtn: !!$addProductBtn,
    productModal: !!$productModal,
    productForm: !!$productForm
  });
  openModal();
};

window.testModal = function() {
  console.log('🧪 Direct modal test...');
  const modal = document.getElementById('product-modal');
  const overlay = document.getElementById('modal-overlay');
  console.log('Direct modal test:', { modal: !!modal, overlay: !!overlay });
  if (modal) modal.style.display = 'block';
  if (overlay) overlay.style.display = 'block';
};

window.debugAuth = checkAdminAuth;
window.editProduct = editProduct;
window.deleteProduct = deleteProduct;
