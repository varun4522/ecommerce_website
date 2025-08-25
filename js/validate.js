// Validation script for ShopEasy
// Run this in browser console to check if everything is working

console.log('🔍 ShopEasy Validation Check');

// Check if Supabase is loaded
if (typeof window.supabase !== 'undefined') {
  console.log('✅ Supabase library loaded');
} else {
  console.log('❌ Supabase library NOT loaded');
}

// Check if required elements exist
const checks = [
  { id: 'products', page: 'inside.html' },
  { id: 'login-form', page: 'login.html' },
  { id: 'product-form', page: 'admin.html' },
  { id: 'cart', page: 'inside.html' }
];

checks.forEach(check => {
  const element = document.getElementById(check.id);
  if (element) {
    console.log(`✅ ${check.id} found on ${check.page}`);
  } else {
    console.log(`❌ ${check.id} NOT found (expected on ${check.page})`);
  }
});

// Check CSS files
const cssFiles = ['css/styles.css', 'css/auth.css', 'css/admin.css'];
const loadedStyles = Array.from(document.styleSheets).map(sheet => sheet.href);

cssFiles.forEach(file => {
  const isLoaded = loadedStyles.some(href => href && href.includes(file));
  if (isLoaded) {
    console.log(`✅ ${file} loaded`);
  } else {
    console.log(`❌ ${file} NOT loaded`);
  }
});

console.log('🏁 Validation complete! Check for any ❌ items above.');
