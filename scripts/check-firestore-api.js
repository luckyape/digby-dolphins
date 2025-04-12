// check-firestore-api.js - Check if the Firestore API is enabled
// Usage: node check-firestore-api.js

const { GoogleAuth } = require('google-auth-library');
const { ServiceUsageClient } = require('@google-cloud/service-usage');
const path = require('path');

// Path to your service account key file
const serviceAccountPath = path.join(__dirname, 'service-account-key.json');

async function checkFirestoreApi() {
  try {
    // Load the service account key
    const serviceAccount = require(serviceAccountPath);
    const projectId = serviceAccount.project_id;
    
    console.log(`Checking Firestore API status for project: ${projectId}`);
    
    // Create a Google Auth client
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    // Create a Service Usage client
    const serviceUsageClient = new ServiceUsageClient({ auth });
    
    // The Firestore API service name
    const firestoreApiName = 'firestore.googleapis.com';
    
    // Check if the Firestore API is enabled
    const [response] = await serviceUsageClient.getService({
      name: `projects/${projectId}/services/${firestoreApiName}`
    });
    
    if (response.state === 'ENABLED') {
      console.log(`✅ The Firestore API (${firestoreApiName}) is ENABLED for project ${projectId}`);
    } else {
      console.log(`❌ The Firestore API (${firestoreApiName}) is NOT ENABLED for project ${projectId}`);
      console.log('\nTo enable the Firestore API:');
      console.log(`1. Go to: https://console.cloud.google.com/apis/library/firestore.googleapis.com?project=${projectId}`);
      console.log('2. Click "Enable"');
    }
    
    // Also check the Cloud Firestore API (older name)
    const cloudFirestoreApiName = 'firestore.googleapis.com';
    
    try {
      const [cloudFirestoreResponse] = await serviceUsageClient.getService({
        name: `projects/${projectId}/services/${cloudFirestoreApiName}`
      });
      
      if (cloudFirestoreResponse.state === 'ENABLED') {
        console.log(`✅ The Cloud Firestore API (${cloudFirestoreApiName}) is ENABLED for project ${projectId}`);
      } else {
        console.log(`❌ The Cloud Firestore API (${cloudFirestoreApiName}) is NOT ENABLED for project ${projectId}`);
        console.log('\nTo enable the Cloud Firestore API:');
        console.log(`1. Go to: https://console.cloud.google.com/apis/library/firestore.googleapis.com?project=${projectId}`);
        console.log('2. Click "Enable"');
      }
    } catch (error) {
      console.log(`Note: Could not check Cloud Firestore API status: ${error.message}`);
    }
    
  } catch (error) {
    console.error('Error checking Firestore API status:', error);
    console.log('\nThis may be because:');
    console.log('1. Your service account does not have permission to check API status');
    console.log('2. The service account key file is invalid or corrupted');
    console.log('\nTo fix this:');
    console.log('1. Make sure your service account has the "Service Usage Admin" role');
    console.log('2. Generate a new service account key if needed');
  }
}

// Install required dependencies if not already installed
try {
  require('google-auth-library');
  require('@google-cloud/service-usage');
  
  // Run the check
  checkFirestoreApi().catch(console.error);
} catch (error) {
  console.error('Missing dependencies. Please install required packages:');
  console.log('\nnpm install google-auth-library @google-cloud/service-usage');
  process.exit(1);
}
