#!/usr/bin/env node

/**
 * DreamKart Full End-to-End API Test Script (Node.js)
 * 
 * This script automates the complete flow from platform user creation
 * to order placement, ensuring all components work together.
 * 
 * Prerequisites:
 * - Node.js installed
 * - Run: npm install axios
 * - Your DreamKart backend server running on http://localhost:5000
 * 
 * Usage: node test-dreamkart-api.js
 */

const axios = require('axios');

// Configuration
const CONFIG = {
  BASE_URL: 'http://localhost:5000',
  PLATFORM_ADMIN_EMAIL: `keqing_admin_${Date.now()}@example.com`,
  PLATFORM_ADMIN_PASSWORD: 'supersecurepassword123',
  TENANT_NAME: `KeqingTestingShop_${Date.now()}`,
  TENANT_SLUG: `keqingtestslug${Date.now()}`,
  TENANT_DESCRIPTION: "A test shop for Keqing's beloved GPUs!",
  CUSTOMER_EMAIL: `customer_keqing_${Date.now()}@example.com`,
  CUSTOMER_PASSWORD: 'customerpassword123',
  CUSTOMER_FIRSTNAME: 'Keqing',
  CUSTOMER_LASTNAME: 'Lover',
  SHIPPING_ADDRESS: {
    street: 'Electro Street',
    city: 'Liyue Harbor',
    state: 'Liyue',
    zipCode: '67890',
    country: 'Teyvat'
  },
  CONTACT_PHONE: '+9876543210'
};

// Products configuration
const PRODUCTS = {
  GPU1: {
    sku: `GPU-RTX-4090-${Date.now()}`,
    name: 'Super RTX 4090 GPU',
    price: 1599.99,
    stock: 10,
    description: 'The ultimate gaming GPU for max performance!'
  },
  GPU2: {
    sku: `GPU-RX-7900XTX-${Date.now()}`,
    name: 'Awesome RX 7900 XTX GPU',
    price: 999.99,
    stock: 15,
    description: 'Powerful AMD GPU for enthusiast builders!'
  }
};

// Global state
const STATE = {
  platformAdminJWT: '',
  tenantAdminJWT: '', // Add this line
  tenantId: '',
  tenantDbName: '',
  categoryId: '',
  gpu1ProductId: '',
  gpu2ProductId: '',
  customerJWT: '',
  orderId: ''
};

// HTTP client with better error handling
const httpClient = axios.create({
  timeout: 10000,
  validateStatus: () => true // Don't throw on HTTP error status
});

// Utility functions
const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '🚨' : type === 'success' ? '✅' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
};

const logError = (message) => log(message, 'error');
const logSuccess = (message) => log(message, 'success');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// API call wrapper with error handling
const apiCall = async (method, url, data = null, headers = {}) => {
  try {
    const config = {
      method,
      url: `${CONFIG.BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await httpClient(config);
    
    log(`${method.toUpperCase()} ${url} - Status: ${response.status}`);
    
    if (response.status >= 400) {
      logError(`API Error: ${response.status} - ${JSON.stringify(response.data)}`);
      throw new Error(`API call failed: ${response.status}`);
    }

    return response.data;
  } catch (error) {
    logError(`API call failed: ${error.message}`);
    throw error;
  }
};

// Helper to get authorization headers
const getAuthHeaders = (jwt, tenantId = null) => {
  const headers = { Authorization: `Bearer ${jwt}` };
  if (tenantId) {
    headers['X-Tenant-ID'] = tenantId;
  }
  return headers;
};

// Test functions
const registerPlatformAdmin = async () => {
  log('--- 1. Registering Platform Admin ---');
  
  const response = await apiCall('POST', '/api/platform/auth/register', {
    email: CONFIG.PLATFORM_ADMIN_EMAIL,
    password: CONFIG.PLATFORM_ADMIN_PASSWORD
  });

  if (response.message !== "Platform user registered successfully! Welcome to Dreamkart! 😊") {
    throw new Error('Platform admin registration failed');
  }

  logSuccess('Platform Admin registered successfully');
};

const loginPlatformAdmin = async () => {
  log('--- 2. Logging in as Platform Admin ---');
  
  const response = await apiCall('POST', '/api/platform/auth/login', {
    email: CONFIG.PLATFORM_ADMIN_EMAIL,
    password: CONFIG.PLATFORM_ADMIN_PASSWORD
  });

  if (!response.token) {
    throw new Error('Platform admin login failed - no token received');
  }

  STATE.platformAdminJWT = response.token;
  logSuccess('Platform Admin login successful');
};

const createTenant = async () => {
  log('--- 3. Creating New Tenant ---');
  
  const response = await apiCall('POST', '/api/platform/tenants/register', {
    name: CONFIG.TENANT_NAME,
    email: CONFIG.PLATFORM_ADMIN_EMAIL, // Add this line - tenant contact email
    slug: CONFIG.TENANT_SLUG,
    description: CONFIG.TENANT_DESCRIPTION,
    plan: 'free', // Optional: specify the plan
    initialTenantUserEmail: CONFIG.PLATFORM_ADMIN_EMAIL,
    initialTenantUserPassword: CONFIG.PLATFORM_ADMIN_PASSWORD,
    initialTenantUserName: 'Main Admin'
  }, getAuthHeaders(STATE.platformAdminJWT));

  if (!response.tenant?._id || !response.tenant?.databaseName) {
    throw new Error('Tenant creation failed - missing required fields');
  }

  STATE.tenantId = response.tenant._id;
  STATE.tenantDbName = response.tenant.databaseName.replace(/^db_/, '');
  
  logSuccess(`Tenant created: ID=${STATE.tenantId}, DB=${STATE.tenantDbName}`);
};


// Add this new function after createTenant
const loginAsTenantAdmin = async () => {
  log('--- 3.5. Logging in as Tenant Admin ---');
  
  const response = await apiCall('POST', '/api/tenant/auth/login', {
    email: CONFIG.PLATFORM_ADMIN_EMAIL,
    password: CONFIG.PLATFORM_ADMIN_PASSWORD
  }, { 'X-Tenant-ID': STATE.tenantDbName });

  if (!response.token) {
    throw new Error('Tenant admin login failed - no token received');
  }

  STATE.tenantAdminJWT = response.token;
  logSuccess('Tenant Admin login successful');
};

// Update the createCategory function
const createCategory = async () => {
  log('--- 4. Creating Product Category ---');
  
  const response = await apiCall('POST', '/api/tenant/categories', {
    name: 'Graphics Cards',
    slug: 'graphics-cards',
    description: 'Powerful GPUs for all your rendering needs.'
  }, getAuthHeaders(STATE.tenantAdminJWT, STATE.tenantDbName)); // Use tenantAdminJWT instead

  if (!response.category) {
    throw new Error('Category creation failed');
  }

  STATE.categoryId = response.category._id;
  logSuccess(`Category created: ${STATE.categoryId}`);
};

// Update the createProducts function
const createProducts = async () => {
  log('--- 5. Creating GPU Products ---');

  // Create GPU 1
  const gpu1Response = await apiCall('POST', '/api/tenant/products', {
    sku: PRODUCTS.GPU1.sku,
    name: PRODUCTS.GPU1.name,
    price: PRODUCTS.GPU1.price,
    stock: PRODUCTS.GPU1.stock,
    image: ['https://example.com/gpu1.jpg'],
    category: STATE.categoryId,
    description: PRODUCTS.GPU1.description
  }, getAuthHeaders(STATE.tenantAdminJWT, STATE.tenantDbName)); // Use tenantAdminJWT instead

  console.log(gpu1Response)
  if (!gpu1Response.product._id) {
    throw new Error('GPU 1 creation failed');
  }
  STATE.gpu1ProductId = gpu1Response.product._id;

  // Create GPU 2
  const gpu2Response = await apiCall('POST', '/api/tenant/products', {
    sku: PRODUCTS.GPU2.sku,
    name: PRODUCTS.GPU2.name,
    price: PRODUCTS.GPU2.price,
    stock: PRODUCTS.GPU2.stock,
    image: ['https://example.com/gpu2.jpg'],
    category: STATE.categoryId,
    description: PRODUCTS.GPU2.description
  }, getAuthHeaders(STATE.tenantAdminJWT, STATE.tenantDbName)); // Use tenantAdminJWT instead

  if (!gpu2Response.product._id) {
    throw new Error('GPU 2 creation failed');
  }
  STATE.gpu2ProductId = gpu2Response.product._id;

  logSuccess(`Products created: GPU1=${STATE.gpu1ProductId}, GPU2=${STATE.gpu2ProductId}`);
};

const registerCustomer = async () => {
  log('--- 6. Registering Customer ---');
  
  const response = await apiCall('POST', '/api/customer/auth/register', {
    email: CONFIG.CUSTOMER_EMAIL,
    password: CONFIG.CUSTOMER_PASSWORD,
    firstName: CONFIG.CUSTOMER_FIRSTNAME,
    lastName: CONFIG.CUSTOMER_LASTNAME
  }, { 'X-Tenant-ID': STATE.tenantDbName });

    console.log(response)

  if (!response.token) {
    throw new Error('Customer registration failed');
  }

  logSuccess('Customer registered successfully');
};

const loginCustomer = async () => {
  log('--- 7. Logging in as Customer ---');
  
  const response = await apiCall('POST', '/api/customer/auth/login', {
    email: CONFIG.CUSTOMER_EMAIL,
    password: CONFIG.CUSTOMER_PASSWORD
  }, { 'X-Tenant-ID': STATE.tenantDbName });

  console.log(response)

  if (!response.token) {
    throw new Error('Customer login failed - no token received');
  }

  STATE.customerJWT = response.token;
  logSuccess('Customer login successful');
};


const addProductsToCart = async () => {
  log('--- 8. Adding Products to Cart ---');

  // Add GPU 1 (quantity: 2)
  console.log(STATE.gpu1ProductId, 2)
  const cart1Response = await apiCall('POST', '/api/customer/cart/items', {
    productId: STATE.gpu1ProductId,
    quantity: 2
  }, getAuthHeaders(STATE.customerJWT, STATE.tenantDbName));

  console.log(cart1Response)

  // ✨ CORRECTED THIS LINE! ✨
  if (cart1Response.message !== "Cart updated successfully! 🎉" ) {
    throw new Error('Failed to add GPU 1 to cart');
  }

  // Add GPU 2 (quantity: 2)
  const cart2Response = await apiCall('POST', '/api/customer/cart/items', {
    productId: STATE.gpu2ProductId,
    quantity: 2
  }, getAuthHeaders(STATE.customerJWT, STATE.tenantDbName));

  console.log(cart2Response)

  if (cart2Response.message !== "Cart updated successfully! 🎉") { // This one was already correct for the expected message!
    throw new Error('Failed to add GPU 2 to cart');
  }

  logSuccess('Products added to cart successfully');
};

const placeOrder = async () => {
  log('--- 9. Placing Order ---');
  
  const response = await apiCall('POST', '/api/customer/orders', {
    shippingAddress: CONFIG.SHIPPING_ADDRESS,
    contactPhone: CONFIG.CONTACT_PHONE
  }, getAuthHeaders(STATE.customerJWT, STATE.tenantDbName));

  if (!response.order?._id) {
    throw new Error('Order placement failed');
  }

  STATE.orderId = response.order._id;
  logSuccess(`Order placed successfully: ${STATE.orderId}`);
  
  // Display order summary
  console.log('\n--- Order Summary ---');
  console.log(JSON.stringify(response.order, null, 2));
};

// Update the main test runner
const runTests = async () => {
  console.log('🚀 Starting DreamKart Full End-to-End API Tests...\n');
  
  try {
    await registerPlatformAdmin();
    await sleep(500);
    
    await loginPlatformAdmin();
    await sleep(500);
    
    await createTenant();
    await sleep(500);
    
    await loginAsTenantAdmin(); // Add this line
    await sleep(500);
    
    await createCategory();
    await sleep(500);
    
    await createProducts();
    await sleep(500);
    
    await registerCustomer();
    await sleep(500);
    
    await loginCustomer();
    await sleep(500);
    
    await addProductsToCart();
    await sleep(500);
    
    await placeOrder();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n--- Test Results Summary ---');
    console.log(`Tenant DB: ${STATE.tenantDbName}`);
    console.log(`GPU 1 ID: ${STATE.gpu1ProductId}`);
    console.log(`GPU 2 ID: ${STATE.gpu2ProductId}`);
    console.log(`Order ID: ${STATE.orderId}`);
    
  } catch (error) {
    logError(`Test failed: ${error.message}`);
    console.log('\n--- Debug Information ---');
    console.log('Current State:', JSON.stringify(STATE, null, 2));
    process.exit(1);
  }
};

runTests()