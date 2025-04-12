/**
 * Test script for Contact Form Firebase Cloud Functions
 * This script simulates the behavior of the Contact Form Cloud Functions locally
 */

const admin = require('firebase-admin');
const {
  getFirestore,
  Timestamp,
  FieldValue,
} = require('firebase-admin/firestore');

// Initialize Firebase Admin with a service account (for local testing)
try {
  admin.initializeApp({
    projectId: 'digby-dolphins',
  });
  console.log('Firebase Admin initialized successfully');
} catch (error) {
  if (error.code === 'app/duplicate-app') {
    console.log('Firebase Admin already initialized');
  } else {
    console.error('Error initializing Firebase Admin:', error);
  }
}

// Get Firestore instance
const db = getFirestore(undefined, 'digby-dolphins');

// Collection references
const settingsCollection = 'settings';
const contactSubmissionsCollection = 'contactSubmissions';

// Create a mock for the Firebase Functions
const mockRequest = (data) => ({
  data,
  auth: { uid: 'test-user-id' },
});

// Import the contact form functions module
const contactFormModule = require('./contactForm');

// Create wrapper functions that simulate the Firebase Functions environment
const submitContactForm = async (data) => {
  // Call the actual function with our mock request
  return await contactFormModule.submitContactForm.run(mockRequest(data));
};

const updateContactFormSettings = async (data) => {
  // Call the actual function with our mock request
  return await contactFormModule.updateContactFormSettings.run(
    mockRequest(data)
  );
};

/**
 * Test function to get contact form settings
 */
async function testGetContactFormSettings() {
  try {
    console.log('Testing getContactFormSettings...');

    // Call the function
    const result = await updateContactFormSettings({
      operation: 'get',
    });

    console.log('Contact form settings retrieved successfully:');
    console.log(JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error('Error getting contact form settings:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Test function to add a contact form mapping
 */
async function testAddContactFormMapping() {
  try {
    console.log('Testing adding a contact form mapping...');

    // Call the function
    const result = await updateContactFormSettings({
      operation: 'add',
      subject: 'Test Subject',
      email: 'test@digbydolphins.org',
    });

    console.log('Contact form mapping added successfully:');
    console.log(JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error('Error adding contact form mapping:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Test function to remove a contact form mapping
 */
async function testRemoveContactFormMapping() {
  try {
    console.log('Testing removing a contact form mapping...');

    // Call the function
    const result = await updateContactFormSettings({
      operation: 'remove',
      subject: 'Test Subject',
    });

    console.log('Contact form mapping removed successfully:');
    console.log(JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error('Error removing contact form mapping:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Test function to submit a contact form
 */
async function testSubmitContactForm() {
  try {
    console.log('Testing submitContactForm...');

    // Call the function
    const result = await submitContactForm({
      name: 'Test User',
      email: 'test@example.com',
      subject: 'Test Subject',
      message: 'This is a test message from the test script.',
    });

    console.log('Contact form submitted successfully:');
    console.log(JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error('Error submitting contact form:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Run the test functions
 */
async function runTests() {
  try {
    console.log('=== Testing Contact Form Cloud Functions ===');

    // Test getting contact form settings
    console.log('\n--- Testing getContactFormSettings ---');
    await testGetContactFormSettings();

    // Test adding a contact form mapping
    console.log('\n--- Testing addContactFormMapping ---');
    await testAddContactFormMapping();

    // Test getting contact form settings again to verify the addition
    console.log('\n--- Testing getContactFormSettings after addition ---');
    await testGetContactFormSettings();

    // Test removing a contact form mapping
    console.log('\n--- Testing removeContactFormMapping ---');
    await testRemoveContactFormMapping();

    // Test getting contact form settings again to verify the removal
    console.log('\n--- Testing getContactFormSettings after removal ---');
    await testGetContactFormSettings();

    // Test submitting a contact form
    console.log('\n--- Testing submitContactForm ---');
    await testSubmitContactForm();

    console.log('\n=== Tests completed successfully ===');
  } catch (error) {
    console.error('Error running tests:', error);
  } finally {
    // Exit the process
    process.exit(0);
  }
}

// Run the tests
runTests();
