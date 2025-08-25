// Simple shop demo JavaScript - Updated to load from Supabase

// Supabase configuration - UPDATE THESE WITH YOUR ACTUAL SUPABASE CREDENTIALS
const SUPABASE_URL = 'https://kvdmiwmxswiqqokjotsy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt2ZG1pd214c3dpcXFva2pvdHN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU2OTY5MDksImV4cCI6MjA3MTI3MjkwOX0.yUlQtEWG8WU9LtNbi0fZB8MkP1htfYePwVBHFp0OIIo';

// Initialize Supabase client
const supabase = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

// Products will be loaded from Supabase instead of dummy data
let PRODUCTS = [];

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

let cart = {}; // { productId: qty }

function loadCart(){
  try{ cart = JSON.parse(localStorage.getItem('shop_cart')) || {}; }
  catch(e){ cart = {}; }
}
function saveCart(){
  localStorage.setItem('shop_cart', JSON.stringify(cart));
}

function formatPrice(n){ return n.toFixed(2); }

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
    renderProducts();
  } catch (error) {
    console.error('Error loading products:', error);
    if ($products) {
      $products.innerHTML = '<p>No products available at the moment.</p>';
    }
  }
}

function renderProducts(filter=''){
  if (!$products) return;
  
  if (PRODUCTS.length === 0) {
    $products.innerHTML = '<p>No products available. Please check back later!</p>';
    return;
  }
  
  $products.innerHTML = '';
  const q = filter.trim().toLowerCase();
  const list = PRODUCTS.filter(p => !q || p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
  
  if (list.length === 0) {
    $products.innerHTML = '<p>No products found matching your search.</p>';
    return;
  }
  
  for(const p of list){
    const card = document.createElement('article');
    card.className = 'product';
    card.innerHTML = `
      <img src="${p.image_url}" alt="${p.name}" loading="lazy" />
      <h4>${p.name}</h4>
      <p>${p.description}</p>
      <div class="price-row">
        <div class="price">$${formatPrice(p.price)}</div>
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
        <div style="color:#666;font-size:.9rem">$${formatPrice(prod.price)} × ${qty}</div>
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
  if ($overlay) $overlay.addEventListener('click', closeCart);

  if ($checkout) {
    $checkout.addEventListener('click', ()=>{
      if(Object.keys(cart).length === 0){ 
        alert('Cart is empty'); 
        return; 
      }
      alert('Demo checkout — no payments integrated. Thank you!');
      cart = {}; 
      saveCart(); 
      updateCartCount(); 
      renderCart(); 
      closeCart();
    });
  }

  if ($search) {
    $search.addEventListener('input', (e)=> { 
      if (PRODUCTS.length > 0) {
        renderProducts(e.target.value); 
      }
    });
  }

  if ($logoutBtn) {
    $logoutBtn.addEventListener('click', async () => {
      if (supabase) {
        await supabase.auth.signOut();
      }
      localStorage.clear();
      window.location.href = 'login.html';
    });
  }

  // Initialize
  loadCart();
  await loadProducts();
  updateCartCount();
  renderCart();
});