#!/usr/bin/env node

/**
 * DreamKart Interactive Console Client
 * 
 * A user-friendly console application for managing DreamKart operations
 * 
 * Prerequisites:
 * - Node.js installed
 * - Run: npm install axios readline-sync chalk
 * - Your DreamKart backend server running on http://localhost:5000
 * 
 * Usage: node dreamkart-client.js
 */

const axios = require('axios');
const readline = require('readline');

// Color functions for console output (replacing chalk for compatibility)
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  blue: (text) => `\x1b[34m${text}\x1b[0m`,
  magenta: (text) => `\x1b[35m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  gray: (text) => `\x1b[90m${text}\x1b[0m`,
  bold: (text) => `\x1b[1m${text}\x1b[0m`
};

// Configuration
const CONFIG = {
  BASE_URL: 'http://localhost:5000',
  TIMEOUT: 10000
};

// Global state
const STATE = {
  platformAdminJWT: '',
  tenantAdminJWT: '',
  customerJWT: '',
  tenantId: '',
  tenantDbName: '',
  currentUser: null,
  currentRole: null
};

// Create readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// HTTP client
const httpClient = axios.create({
  timeout: CONFIG.TIMEOUT,
  validateStatus: () => true
});

// Utility functions
const log = {
  info: (message) => console.log(colors.blue('ℹ️  ' + message)),
  success: (message) => console.log(colors.green('✅ ' + message)),
  error: (message) => console.log(colors.red('❌ ' + message)),
  warning: (message) => console.log(colors.yellow('⚠️  ' + message)),
  header: (message) => console.log(colors.bold(colors.magenta('\n=== ' + message + ' ==='))),
  divider: () => console.log(colors.gray('-'.repeat(50)))
};

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(colors.cyan('❓ ' + prompt + ': '), resolve);
  });
};

const questionPassword = (prompt) => {
  return new Promise((resolve) => {
    process.stdout.write(colors.cyan('❓ ' + prompt + ': '));
    process.stdin.setRawMode(true);
    process.stdin.resume();
    
    let password = '';
    process.stdin.on('data', function(char) {
      char = char.toString();
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004':
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write('\n');
          resolve(password);
          break;
        case '\u0003':
          process.exit();
          break;
        case '\u007f': // backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.write('\b \b');
          }
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    });
  });
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// API call wrapper
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

    log.info(`Making ${method.toUpperCase()} request to ${url}`);
    const response = await httpClient(config);
    
    if (response.status >= 400) {
      log.error(`API Error: ${response.status} - ${JSON.stringify(response.data, null, 2)}`);
      throw new Error(`API call failed: ${response.status}`);
    }

    return response.data;
  } catch (error) {
    log.error(`API call failed: ${error.message}`);
    throw error;
  }
};

// Helper functions
const getAuthHeaders = (jwt, tenantId = null) => {
  const headers = { Authorization: `Bearer ${jwt}` };
  if (tenantId) {
    headers['X-Tenant-ID'] = tenantId;
  }
  return headers;
};

const showCurrentState = () => {
  log.header('Current Session State');
  console.log(colors.gray(`Current User: ${STATE.currentUser || 'None'}`));
  console.log(colors.gray(`Current Role: ${STATE.currentRole || 'None'}`));
  console.log(colors.gray(`Tenant DB: ${STATE.tenantDbName || 'None'}`));
  console.log(colors.gray(`Platform Admin JWT: ${STATE.platformAdminJWT ? '✓ Set' : '✗ Not set'}`));
  console.log(colors.gray(`Tenant Admin JWT: ${STATE.tenantAdminJWT ? '✓ Set' : '✗ Not set'}`));
  console.log(colors.gray(`Customer JWT: ${STATE.customerJWT ? '✓ Set' : '✗ Not set'}`));
  log.divider();
};

// Authentication functions
const platformAdminAuth = async () => {
  log.header('Platform Admin Authentication');
  
  const choice = await question('1) Register new admin 2) Login existing admin');
  
  const email = await question('Email');
  const password = await questionPassword('Password');
  
  if (choice === '1') {
    const response = await apiCall('POST', '/api/platform/auth/register', { email, password });
    log.success('Platform Admin registered successfully');
  } else {
    const response = await apiCall('POST', '/api/platform/auth/login', { email, password });
    if (!response.token) {
      throw new Error('Login failed - no token received');
    }
    STATE.platformAdminJWT = response.token;
    STATE.currentUser = email;
    STATE.currentRole = 'Platform Admin';
    log.success('Platform Admin login successful');
  }
};

const tenantAdminAuth = async () => {
  log.header('Tenant Admin Authentication');
  
  if (!STATE.tenantDbName) {
    log.error('No tenant selected. Please create or select a tenant first.');
    return;
  }
  
  const email = await question('Email');
  const password = await questionPassword('Password');
  
  const response = await apiCall('POST', '/api/tenant/auth/login', {
    email, password
  }, { 'X-Tenant-ID': STATE.tenantDbName });

  if (!response.token) {
    throw new Error('Tenant admin login failed');
  }

  STATE.tenantAdminJWT = response.token;
  STATE.currentUser = email;
  STATE.currentRole = 'Tenant Admin';
  log.success('Tenant Admin login successful');
};

const customerAuth = async () => {
  log.header('Customer Authentication');
  
  if (!STATE.tenantDbName) {
    log.error('No tenant selected. Please create or select a tenant first.');
    return;
  }
  
  const choice = await question('1) Register new customer 2) Login existing customer');
  
  const email = await question('Email');
  const password = await questionPassword('Password');
  
  if (choice === '1') {
    const firstName = await question('First Name');
    const lastName = await question('Last Name');
    
    const response = await apiCall('POST', '/api/customer/auth/register', {
      email, password, firstName, lastName
    }, { 'X-Tenant-ID': STATE.tenantDbName });
    
    log.success('Customer registered successfully');
  } else {
    const response = await apiCall('POST', '/api/customer/auth/login', {
      email, password
    }, { 'X-Tenant-ID': STATE.tenantDbName });

    if (!response.token) {
      throw new Error('Customer login failed');
    }

    STATE.customerJWT = response.token;
    STATE.currentUser = email;
    STATE.currentRole = 'Customer';
    log.success('Customer login successful');
  }
};

// Tenant management
const createTenant = async () => {
  log.header('Create New Tenant');
  
  if (!STATE.platformAdminJWT) {
    log.error('Platform admin authentication required');
    return;
  }
  
  const name = await question('Tenant Name');
  const slug = await question('Tenant Slug');
  const description = await question('Description');
  const email = await question('Contact Email');
  const adminEmail = await question('Initial Admin Email');
  const adminPassword = await questionPassword('Initial Admin Password');
  const adminName = await question('Initial Admin Name');
  
  const response = await apiCall('POST', '/api/platform/tenants/register', {
    name, slug, description, email,
    plan: 'free',
    initialTenantUserEmail: adminEmail,
    initialTenantUserPassword: adminPassword,
    initialTenantUserName: adminName
  }, getAuthHeaders(STATE.platformAdminJWT));

  if (!response.tenant?._id) {
    throw new Error('Tenant creation failed');
  }

  STATE.tenantId = response.tenant._id;
  STATE.tenantDbName = response.tenant.databaseName.replace(/^db_/, '');
  
  log.success(`Tenant created: ${name} (DB: ${STATE.tenantDbName})`);
};

const selectTenant = async () => {
  log.header('Select Tenant');
  const tenantDb = await question('Enter tenant database name');
  STATE.tenantDbName = tenantDb;
  log.success(`Selected tenant: ${tenantDb}`);
};

// Product management
const createCategory = async () => {
  log.header('Create Product Category');
  
  if (!STATE.tenantAdminJWT) {
    log.error('Tenant admin authentication required');
    return;
  }
  
  const name = await question('Category Name');
  const slug = await question('Category Slug');
  const description = await question('Description');
  
  const response = await apiCall('POST', '/api/tenant/categories', {
    name, slug, description
  }, getAuthHeaders(STATE.tenantAdminJWT, STATE.tenantDbName));

  if (!response.category) {
    throw new Error('Category creation failed');
  }

  log.success(`Category created: ${name} (ID: ${response.category._id})`);
};

const createProduct = async () => {
  log.header('Create Product');
  
  if (!STATE.tenantAdminJWT) {
    log.error('Tenant admin authentication required');
    return;
  }
  
  const sku = await question('Product SKU');
  const name = await question('Product Name');
  const price = parseFloat(await question('Price'));
  const stock = parseInt(await question('Stock Quantity'));
  const categoryId = await question('Category ID');
  const description = await question('Description');
  const imageUrl = await question('Image URL (optional)') || 'https://via.placeholder.com/300';
  
  const response = await apiCall('POST', '/api/tenant/products', {
    sku, name, price, stock, description,
    category: categoryId,
    image: [imageUrl]
  }, getAuthHeaders(STATE.tenantAdminJWT, STATE.tenantDbName));

  if (!response.product) {
    throw new Error('Product creation failed');
  }

  log.success(`Product created: ${name} (ID: ${response.product._id})`);
};

const viewProducts = async () => {
  log.header('View Products');
  
  if (!STATE.tenantDbName) {
    log.error('No tenant selected');
    return;
  }
  
  const response = await apiCall('GET', '/api/tenant/products', null, 
    { 'X-Tenant-ID': STATE.tenantDbName });

  if (response.products && response.products.length > 0) {
    response.products.forEach(product => {
      console.log(colors.yellow(`${product.name} (${product.sku})`));
      console.log(`  ID: ${product._id}`);
      console.log(`  Price: ${product.price}`);
      console.log(`  Stock: ${product.stock}`);
      console.log(`  Description: ${product.description}`);
      log.divider();
    });
  } else {
    log.warning('No products found');
  }
};

// Shopping functions
const addToCart = async () => {
  log.header('Add Product to Cart');
  
  if (!STATE.customerJWT) {
    log.error('Customer authentication required');
    return;
  }
  
  const productId = await question('Product ID');
  const quantity = parseInt(await question('Quantity'));
  
  const response = await apiCall('POST', '/api/customer/cart/items', {
    productId, quantity
  }, getAuthHeaders(STATE.customerJWT, STATE.tenantDbName));

  log.success('Product added to cart');
};

const viewCart = async () => {
  log.header('View Cart');
  
  if (!STATE.customerJWT) {
    log.error('Customer authentication required');
    return;
  }
  
  const response = await apiCall('GET', '/api/customer/cart', null,
    getAuthHeaders(STATE.customerJWT, STATE.tenantDbName));

  if (response.cart && response.cart.items.length > 0) {
    console.log(colors.yellow('Cart Contents:'));
    response.cart.items.forEach(item => {
      console.log(`  ${item.product.name} x${item.quantity} - ${item.product.price * item.quantity}`);
    });
    console.log(colors.green(`Total: ${response.cart.total}`));
  } else {
    log.warning('Cart is empty');
  }
};

const placeOrder = async () => {
  log.header('Place Order');
  
  if (!STATE.customerJWT) {
    log.error('Customer authentication required');
    return;
  }
  
  console.log(colors.yellow('Enter shipping address:'));
  const street = await question('Street');
  const city = await question('City');
  const state = await question('State');
  const zipCode = await question('ZIP Code');
  const country = await question('Country');
  const phone = await question('Contact Phone');
  
  const response = await apiCall('POST', '/api/customer/orders', {
    shippingAddress: { street, city, state, zipCode, country },
    contactPhone: phone
  }, getAuthHeaders(STATE.customerJWT, STATE.tenantDbName));

  if (!response.order) {
    throw new Error('Order placement failed');
  }

  log.success(`Order placed successfully! Order ID: ${response.order._id}`);
  console.log(colors.gray(JSON.stringify(response.order, null, 2)));
};

// Menu system
const showMainMenu = () => {
  log.header('DreamKart Console Client');
  showCurrentState();
  
  console.log(colors.yellow('Authentication:'));
  console.log('1)  Platform Admin Auth');
  console.log('2)  Tenant Admin Auth');
  console.log('3)  Customer Auth');
  
  console.log(colors.yellow('\nTenant Management:'));
  console.log('4)  Create Tenant');
  console.log('5)  Select Tenant');
  
  console.log(colors.yellow('\nProduct Management:'));
  console.log('6)  Create Category');
  console.log('7)  Create Product');
  console.log('8)  View Products');
  
  console.log(colors.yellow('\nShopping:'));
  console.log('9)  Add to Cart');
  console.log('10) View Cart');
  console.log('11) Place Order');
  
  console.log(colors.yellow('\nUtilities:'));
  console.log('12) Show Current State');
  console.log('13) Clear Session');
  console.log('0)  Exit');
  
  log.divider();
};

const clearSession = () => {
  STATE.platformAdminJWT = '';
  STATE.tenantAdminJWT = '';
  STATE.customerJWT = '';
  STATE.tenantId = '';
  STATE.tenantDbName = '';
  STATE.currentUser = null;
  STATE.currentRole = null;
  log.success('Session cleared');
};

const handleMenuChoice = async (choice) => {
  try {
    switch (choice) {
      case '1': await platformAdminAuth(); break;
      case '2': await tenantAdminAuth(); break;
      case '3': await customerAuth(); break;
      case '4': await createTenant(); break;
      case '5': await selectTenant(); break;
      case '6': await createCategory(); break;
      case '7': await createProduct(); break;
      case '8': await viewProducts(); break;
      case '9': await addToCart(); break;
      case '10': await viewCart(); break;
      case '11': await placeOrder(); break;
      case '12': showCurrentState(); break;
      case '13': clearSession(); break;
      case '0': 
        log.success('Goodbye!');
        rl.close();
        process.exit(0);
      default:
        log.warning('Invalid choice. Please try again.');
    }
  } catch (error) {
    log.error(`Operation failed: ${error.message}`);
  }
  
  await sleep(1000);
};

// Main application loop
const runApp = async () => {
  console.clear();
  log.success('Welcome to DreamKart Console Client!');
  log.info('Make sure your DreamKart backend is running on http://localhost:5000');
  
  while (true) {
    showMainMenu();
    const choice = await question('Select an option');
    console.clear();
    await handleMenuChoice(choice);
  }
};

// Start the application
runApp().catch(error => {
  log.error(`Application error: ${error.message}`);
  process.exit(1);
});