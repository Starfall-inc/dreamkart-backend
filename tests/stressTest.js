#!/usr/bin/env node

/**
 * DreamKart Stress Testing Suite
 * 
 * Comprehensive stress testing with performance metrics and configurable difficulty
 * 
 * Prerequisites:
 * - Node.js installed
 * - Run: npm install axios
 * - Your DreamKart backend server running on http://localhost:5000
 * 
 * Usage: 
 * - node stress-test.js --level=light
 * - node stress-test.js --level=medium 
 * - node stress-test.js --level=heavy
 * - node stress-test.js --level=extreme
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

// Stress test configurations
const STRESS_LEVELS = {
  light: {
    name: 'Light Load',
    concurrent: 2,
    iterations: 5,
    delay: 1000,
    description: 'Basic functionality test with minimal load'
  },
  medium: {
    name: 'Medium Load', 
    concurrent: 5,
    iterations: 10,
    delay: 500,
    description: 'Moderate load testing for typical usage'
  },
  heavy: {
    name: 'Heavy Load',
    concurrent: 10,
    iterations: 20,
    delay: 100,
    description: 'High load testing for peak usage scenarios'
  },
  extreme: {
    name: 'Extreme Load',
    concurrent: 20,
    iterations: 50,
    delay: 0,
    description: 'Maximum stress testing - may overwhelm the system'
  }
};

// Configuration
const CONFIG = {
  BASE_URL: 'http://localhost:5000',
  PLATFORM_ADMIN_EMAIL: `stress_admin_${Date.now()}@example.com`,
  PLATFORM_ADMIN_PASSWORD: 'supersecurepassword123',
  TENANT_NAME: `StressTestShop_${Date.now()}`,
  TENANT_SLUG: `stresstestslug${Date.now()}`,
  TENANT_DESCRIPTION: "Stress testing shop",
  CUSTOMER_BASE_EMAIL: `stress_customer_${Date.now()}`,
  CUSTOMER_PASSWORD: 'customerpassword123',
  SHIPPING_ADDRESS: {
    street: 'Test Street',
    city: 'Test City',
    state: 'Test State',
    zipCode: '12345',
    country: 'Test Country'
  },
  CONTACT_PHONE: '+1234567890'
};

// Products configuration
const PRODUCTS = {
  GPU1: {
    sku: `GPU-RTX-4090-${Date.now()}`,
    name: 'Stress Test RTX 4090 GPU',
    price: 1599.99,
    stock: 1000,
    description: 'GPU for stress testing'
  },
  GPU2: {
    sku: `GPU-RX-7900XTX-${Date.now()}`,
    name: 'Stress Test RX 7900 XTX GPU',
    price: 999.99,
    stock: 1000,
    description: 'Another GPU for stress testing'
  }
};

// Global state for stress testing
const STRESS_STATE = {
  platformAdminJWT: '',
  tenantAdminJWT: '',
  tenantId: '',
  tenantDbName: '',
  categoryId: '',
  gpu1ProductId: '',
  gpu2ProductId: '',
  testResults: [],
  metrics: {
    totalTests: 0,
    successfulTests: 0,
    failedTests: 0,
    totalDuration: 0,
    averageResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    operationMetrics: {}
  }
};

// HTTP client
const httpClient = axios.create({
  timeout: 30000,
  validateStatus: () => true
});

// Utility functions
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

const log = (message, type = 'info') => {
  const timestamp = new Date().toISOString();
  const prefix = type === 'error' ? '🚨' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
};

const logError = (message) => log(colors.red(message), 'error');
const logSuccess = (message) => log(colors.green(message), 'success');
const logWarning = (message) => log(colors.yellow(message), 'warning');
const logInfo = (message) => log(colors.blue(message), 'info');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Performance tracking wrapper
const trackOperation = async (operationName, operation) => {
  const startTime = performance.now();
  let success = false;
  let error = null;
  
  try {
    const result = await operation();
    success = true;
    return result;
  } catch (err) {
    error = err;
    throw err;
  } finally {
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Update metrics
    STRESS_STATE.metrics.totalTests++;
    if (success) {
      STRESS_STATE.metrics.successfulTests++;
    } else {
      STRESS_STATE.metrics.failedTests++;
    }
    
    STRESS_STATE.metrics.totalDuration += duration;
    STRESS_STATE.metrics.minResponseTime = Math.min(STRESS_STATE.metrics.minResponseTime, duration);
    STRESS_STATE.metrics.maxResponseTime = Math.max(STRESS_STATE.metrics.maxResponseTime, duration);
    
    // Track operation-specific metrics
    if (!STRESS_STATE.metrics.operationMetrics[operationName]) {
      STRESS_STATE.metrics.operationMetrics[operationName] = {
        count: 0,
        totalTime: 0,
        successes: 0,
        failures: 0,
        avgTime: 0,
        minTime: Infinity,
        maxTime: 0
      };
    }
    
    const opMetrics = STRESS_STATE.metrics.operationMetrics[operationName];
    opMetrics.count++;
    opMetrics.totalTime += duration;
    opMetrics.avgTime = opMetrics.totalTime / opMetrics.count;
    opMetrics.minTime = Math.min(opMetrics.minTime, duration);
    opMetrics.maxTime = Math.max(opMetrics.maxTime, duration);
    
    if (success) {
      opMetrics.successes++;
    } else {
      opMetrics.failures++;
    }
    
    // Log operation result
    const status = success ? colors.green('✓') : colors.red('✗');
    const durationStr = colors.cyan(`${duration.toFixed(2)}ms`);
    console.log(`${status} ${operationName} - ${durationStr}${error ? ` - ${colors.red(error.message)}` : ''}`);
  }
};

// API call wrapper with metrics
const apiCall = async (method, url, data = null, headers = {}) => {
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
  
  if (response.status >= 400) {
    throw new Error(`API Error: ${response.status} - ${JSON.stringify(response.data)}`);
  }

  return response.data;
};

// Helper functions
const getAuthHeaders = (jwt, tenantId = null) => {
  const headers = { Authorization: `Bearer ${jwt}` };
  if (tenantId) {
    headers['X-Tenant-ID'] = tenantId;
  }
  return headers;
};

// Setup functions (run once)
const setupPlatformAdmin = async () => {
  await trackOperation('Platform Admin Registration', async () => {
    const response = await apiCall('POST', '/api/platform/auth/register', {
      email: CONFIG.PLATFORM_ADMIN_EMAIL,
      password: CONFIG.PLATFORM_ADMIN_PASSWORD
    });
    
    if (response.message !== "Platform user registered successfully! Welcome to Dreamkart! 😊") {
      throw new Error('Platform admin registration failed');
    }
  });

  await trackOperation('Platform Admin Login', async () => {
    const response = await apiCall('POST', '/api/platform/auth/login', {
      email: CONFIG.PLATFORM_ADMIN_EMAIL,
      password: CONFIG.PLATFORM_ADMIN_PASSWORD
    });

    if (!response.token) {
      throw new Error('Platform admin login failed');
    }

    STRESS_STATE.platformAdminJWT = response.token;
  });
};

const setupTenant = async () => {
  await trackOperation('Tenant Creation', async () => {
    const response = await apiCall('POST', '/api/platform/tenants/register', {
      name: CONFIG.TENANT_NAME,
      email: CONFIG.PLATFORM_ADMIN_EMAIL,
      slug: CONFIG.TENANT_SLUG,
      description: CONFIG.TENANT_DESCRIPTION,
      plan: 'free',
      initialTenantUserEmail: CONFIG.PLATFORM_ADMIN_EMAIL,
      initialTenantUserPassword: CONFIG.PLATFORM_ADMIN_PASSWORD,
      initialTenantUserName: 'Stress Test Admin'
    }, getAuthHeaders(STRESS_STATE.platformAdminJWT));

    if (!response.tenant?._id || !response.tenant?.databaseName) {
      throw new Error('Tenant creation failed');
    }

    STRESS_STATE.tenantId = response.tenant._id;
    STRESS_STATE.tenantDbName = response.tenant.databaseName.replace(/^db_/, '');
  });

  await trackOperation('Tenant Admin Login', async () => {
    const response = await apiCall('POST', '/api/tenant/auth/login', {
      email: CONFIG.PLATFORM_ADMIN_EMAIL,
      password: CONFIG.PLATFORM_ADMIN_PASSWORD
    }, { 'X-Tenant-ID': STRESS_STATE.tenantDbName });

    if (!response.token) {
      throw new Error('Tenant admin login failed');
    }

    STRESS_STATE.tenantAdminJWT = response.token;
  });
};

const setupProducts = async () => {
  await trackOperation('Category Creation', async () => {
    const response = await apiCall('POST', '/api/tenant/categories', {
      name: 'Stress Test Graphics Cards',
      slug: 'stress-test-graphics-cards',
      description: 'GPUs for stress testing'
    }, getAuthHeaders(STRESS_STATE.tenantAdminJWT, STRESS_STATE.tenantDbName));

    if (!response.category) {
      throw new Error('Category creation failed');
    }

    STRESS_STATE.categoryId = response.category._id;
  });

  await trackOperation('Product 1 Creation', async () => {
    const response = await apiCall('POST', '/api/tenant/products', {
      sku: PRODUCTS.GPU1.sku,
      name: PRODUCTS.GPU1.name,
      price: PRODUCTS.GPU1.price,
      stock: PRODUCTS.GPU1.stock,
      image: ['https://via.placeholder.com/300'],
      category: STRESS_STATE.categoryId,
      description: PRODUCTS.GPU1.description
    }, getAuthHeaders(STRESS_STATE.tenantAdminJWT, STRESS_STATE.tenantDbName));

    if (!response.product._id) {
      throw new Error('GPU 1 creation failed');
    }
    STRESS_STATE.gpu1ProductId = response.product._id;
  });

  await trackOperation('Product 2 Creation', async () => {
    const response = await apiCall('POST', '/api/tenant/products', {
      sku: PRODUCTS.GPU2.sku,
      name: PRODUCTS.GPU2.name,
      price: PRODUCTS.GPU2.price,
      stock: PRODUCTS.GPU2.stock,
      image: ['https://via.placeholder.com/300'],
      category: STRESS_STATE.categoryId,
      description: PRODUCTS.GPU2.description
    }, getAuthHeaders(STRESS_STATE.tenantAdminJWT, STRESS_STATE.tenantDbName));

    if (!response.product._id) {
      throw new Error('GPU 2 creation failed');
    }
    STRESS_STATE.gpu2ProductId = response.product._id;
  });
};

// Individual test operations
const runCustomerRegistration = async (customerIndex) => {
  const customerEmail = `${CONFIG.CUSTOMER_BASE_EMAIL}_${customerIndex}@example.com`;
  
  await trackOperation(`Customer Registration #${customerIndex}`, async () => {
    const response = await apiCall('POST', '/api/customer/auth/register', {
      email: customerEmail,
      password: CONFIG.CUSTOMER_PASSWORD,
      firstName: `Customer${customerIndex}`,
      lastName: 'StressTest'
    }, { 'X-Tenant-ID': STRESS_STATE.tenantDbName });

    if (!response.token) {
      throw new Error('Customer registration failed');
    }
    
    return { email: customerEmail, token: response.token };
  });
};

const runCustomerLogin = async (customerIndex) => {
  const customerEmail = `${CONFIG.CUSTOMER_BASE_EMAIL}_${customerIndex}@example.com`;
  
  return await trackOperation(`Customer Login #${customerIndex}`, async () => {
    const response = await apiCall('POST', '/api/customer/auth/login', {
      email: customerEmail,
      password: CONFIG.CUSTOMER_PASSWORD
    }, { 'X-Tenant-ID': STRESS_STATE.tenantDbName });

    if (!response.token) {
      throw new Error('Customer login failed');
    }

    return response.token;
  });
};

const runAddToCart = async (customerToken, customerIndex) => {
  await trackOperation(`Add to Cart GPU1 #${customerIndex}`, async () => {
    const response = await apiCall('POST', '/api/customer/cart/items', {
      productId: STRESS_STATE.gpu1ProductId,
      quantity: Math.floor(Math.random() * 3) + 1 // Random quantity 1-3
    }, getAuthHeaders(customerToken, STRESS_STATE.tenantDbName));

    if (response.message !== "Cart updated successfully! 🎉") {
      throw new Error('Failed to add GPU 1 to cart');
    }
  });

  await trackOperation(`Add to Cart GPU2 #${customerIndex}`, async () => {
    const response = await apiCall('POST', '/api/customer/cart/items', {
      productId: STRESS_STATE.gpu2ProductId,
      quantity: Math.floor(Math.random() * 2) + 1 // Random quantity 1-2
    }, getAuthHeaders(customerToken, STRESS_STATE.tenantDbName));

    if (response.message !== "Cart updated successfully! 🎉") {
      throw new Error('Failed to add GPU 2 to cart');
    }
  });
};

// Single test iteration
const runSingleTest = async (testIndex) => {
  logInfo(`Starting test iteration ${testIndex + 1}`);
  
  try {
    // Register customer
    await runCustomerRegistration(testIndex);
    
    // Login customer
    const customerToken = await runCustomerLogin(testIndex);
    
    // Add products to cart
    await runAddToCart(customerToken, testIndex);
    
    logSuccess(`Test iteration ${testIndex + 1} completed successfully`);
    return { success: true, testIndex };
  } catch (error) {
    logError(`Test iteration ${testIndex + 1} failed: ${error.message}`);
    return { success: false, testIndex, error: error.message };
  }
};

// Concurrent test runner
const runConcurrentTests = async (concurrent, totalIterations, delay) => {
  const results = [];
  let completedTests = 0;
  
  // Create batches of concurrent tests
  for (let i = 0; i < totalIterations; i += concurrent) {
    const batchSize = Math.min(concurrent, totalIterations - i);
    const batch = [];
    
    // Create batch of promises
    for (let j = 0; j < batchSize; j++) {
      const testIndex = i + j;
      batch.push(runSingleTest(testIndex));
    }
    
    // Wait for current batch to complete
    const batchResults = await Promise.allSettled(batch);
    
    batchResults.forEach((result, index) => {
      completedTests++;
      const testIndex = i + index;
      
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        results.push({ 
          success: false, 
          testIndex, 
          error: result.reason?.message || 'Unknown error' 
        });
      }
      
      // Progress indicator
      const progress = ((completedTests / totalIterations) * 100).toFixed(1);
      process.stdout.write(`\r${colors.cyan(`Progress: ${progress}% (${completedTests}/${totalIterations})`)}     `);
    });
    
    // Delay between batches
    if (delay > 0 && i + concurrent < totalIterations) {
      await sleep(delay);
    }
  }
  
  console.log(''); // New line after progress indicator
  return results;
};

// Results analysis and reporting
const generateReport = (level, results, startTime, endTime) => {
  const totalDuration = endTime - startTime;
  STRESS_STATE.metrics.averageResponseTime = STRESS_STATE.metrics.totalDuration / STRESS_STATE.metrics.totalTests;
  
  console.log('\n' + colors.bold(colors.magenta('='.repeat(60))));
  console.log(colors.bold(colors.magenta('            STRESS TEST RESULTS REPORT')));
  console.log(colors.bold(colors.magenta('='.repeat(60))));
  
  // Test configuration
  console.log('\n' + colors.yellow('📊 Test Configuration:'));
  console.log(`   Level: ${colors.cyan(level.name)}`);
  console.log(`   Description: ${level.description}`);
  console.log(`   Concurrent Users: ${colors.cyan(level.concurrent)}`);
  console.log(`   Total Iterations: ${colors.cyan(level.iterations)}`);
  console.log(`   Delay Between Batches: ${colors.cyan(level.delay)}ms`);
  
  // Overall results
  console.log('\n' + colors.yellow('🎯 Overall Results:'));
  console.log(`   Total Test Duration: ${colors.cyan((totalDuration / 1000).toFixed(2))}s`);
  console.log(`   Total Operations: ${colors.cyan(STRESS_STATE.metrics.totalTests)}`);
  console.log(`   Successful Operations: ${colors.green(STRESS_STATE.metrics.successfulTests)}`);
  console.log(`   Failed Operations: ${colors.red(STRESS_STATE.metrics.failedTests)}`);
  console.log(`   Success Rate: ${colors.green((STRESS_STATE.metrics.successfulTests / STRESS_STATE.metrics.totalTests * 100).toFixed(2))}%`);
  
  // Performance metrics
  console.log('\n' + colors.yellow('⚡ Performance Metrics:'));
  console.log(`   Average Response Time: ${colors.cyan(STRESS_STATE.metrics.averageResponseTime.toFixed(2))}ms`);
  console.log(`   Minimum Response Time: ${colors.green(STRESS_STATE.metrics.minResponseTime.toFixed(2))}ms`);
  console.log(`   Maximum Response Time: ${colors.red(STRESS_STATE.metrics.maxResponseTime.toFixed(2))}ms`);
  console.log(`   Operations per Second: ${colors.cyan((STRESS_STATE.metrics.totalTests / (totalDuration / 1000)).toFixed(2))}`);
  
  // Operation breakdown
  console.log('\n' + colors.yellow('🔍 Operation Breakdown:'));
  Object.entries(STRESS_STATE.metrics.operationMetrics).forEach(([operation, metrics]) => {
    const successRate = (metrics.successes / metrics.count * 100).toFixed(1);
    console.log(`   ${operation}:`);
    console.log(`     Count: ${metrics.count}, Success Rate: ${successRate}%`);
    console.log(`     Avg: ${metrics.avgTime.toFixed(2)}ms, Min: ${metrics.minTime.toFixed(2)}ms, Max: ${metrics.maxTime.toFixed(2)}ms`);
  });
  
  // Error analysis
  const errorCounts = {};
  results.filter(r => !r.success).forEach(r => {
    errorCounts[r.error] = (errorCounts[r.error] || 0) + 1;
  });
  
  if (Object.keys(errorCounts).length > 0) {
    console.log('\n' + colors.yellow('❌ Error Analysis:'));
    Object.entries(errorCounts).forEach(([error, count]) => {
      console.log(`   ${colors.red(error)}: ${count} occurrences`);
    });
  }
  
  console.log('\n' + colors.bold(colors.magenta('='.repeat(60))));
};

// Main stress test runner
const runStressTest = async (levelName = 'medium') => {
  const level = STRESS_LEVELS[levelName];
  if (!level) {
    logError(`Invalid stress level: ${levelName}. Available levels: ${Object.keys(STRESS_LEVELS).join(', ')}`);
    process.exit(1);
  }
  
  console.log(colors.bold(colors.blue('🚀 Starting DreamKart Stress Test Suite\n')));
  console.log(`${colors.yellow('Test Level:')} ${colors.cyan(level.name)}`);
  console.log(`${colors.yellow('Description:')} ${level.description}`);
  console.log(`${colors.yellow('Configuration:')} ${level.concurrent} concurrent, ${level.iterations} iterations, ${level.delay}ms delay\n`);
  
  const overallStartTime = performance.now();
  
  try {
    // Setup phase
    logInfo('Setting up test environment...');
    await setupPlatformAdmin();
    await setupTenant();
    await setupProducts();
    logSuccess('Test environment setup complete');
    
    // Stress testing phase
    logInfo(`Starting ${level.name} stress test...`);
    const testStartTime = performance.now();
    
    const results = await runConcurrentTests(level.concurrent, level.iterations, level.delay);
    
    const testEndTime = performance.now();
    
    // Generate report
    generateReport(level, results, testStartTime, testEndTime);
    
    const overallEndTime = performance.now();
    const totalTime = (overallEndTime - overallStartTime) / 1000;
    
    logSuccess(`Stress test completed in ${totalTime.toFixed(2)} seconds`);
    
  } catch (error) {
    logError(`Stress test failed: ${error.message}`);
    console.log('\n--- Debug Information ---');
    console.log('Current State:', JSON.stringify(STRESS_STATE, null, 2));
    process.exit(1);
  }
};

// Command line argument parsing
const args = process.argv.slice(2);
const levelArg = args.find(arg => arg.startsWith('--level='));
const level = levelArg ? levelArg.split('=')[1] : 'extreme';

// Start stress testing
runStressTest(level);