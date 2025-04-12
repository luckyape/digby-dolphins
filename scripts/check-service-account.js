// check-service-account.js - Check service account permissions
// Usage: node check-service-account.js

const { GoogleAuth } = require('google-auth-library');
const { IAMClient, TestIamPermissionsRequest } = require('@google-cloud/iam');
const path = require('path');

// Path to your service account key file
const serviceAccountPath = path.join(__dirname, 'service-account-key.json');

async function checkServiceAccountPermissions() {
  try {
    // Load the service account key
    const serviceAccount = require(serviceAccountPath);
    const projectId = serviceAccount.project_id;
    const serviceAccountEmail = serviceAccount.client_email;
    
    console.log(`Checking permissions for service account: ${serviceAccountEmail}`);
    console.log(`Project ID: ${projectId}`);
    
    // Create a Google Auth client
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    // Create an IAM client
    const iamClient = new IAMClient({ auth });
    
    // Firestore permissions to check
    const firestorePermissions = [
      'firestore.documents.list',
      'firestore.documents.get',
      'firestore.documents.create',
      'firestore.documents.update',
      'firestore.documents.delete'
    ];
    
    // Test permissions
    const request = {
      resource: `projects/${projectId}`,
      permissions: firestorePermissions,
    };
    
    const [response] = await iamClient.testIamPermissions(request);
    
    console.log('\nFirestore permissions:');
    
    if (!response.permissions || response.permissions.length === 0) {
      console.log('❌ The service account has NO Firestore permissions');
      console.log('\nTo fix this:');
      console.log(`1. Go to: https://console.cloud.google.com/iam-admin/iam?project=${projectId}`);
      console.log(`2. Find the service account: ${serviceAccountEmail}`);
      console.log('3. Add the "Firebase Admin" role or "Cloud Firestore Admin" role');
    } else {
      console.log('✅ The service account has the following Firestore permissions:');
      response.permissions.forEach(permission => {
        console.log(`  - ${permission}`);
      });
      
      // Check for missing permissions
      const missingPermissions = firestorePermissions.filter(
        permission => !response.permissions.includes(permission)
      );
      
      if (missingPermissions.length > 0) {
        console.log('\n⚠️ The service account is missing these Firestore permissions:');
        missingPermissions.forEach(permission => {
          console.log(`  - ${permission}`);
        });
        console.log('\nTo fix this:');
        console.log(`1. Go to: https://console.cloud.google.com/iam-admin/iam?project=${projectId}`);
        console.log(`2. Find the service account: ${serviceAccountEmail}`);
        console.log('3. Add the "Firebase Admin" role or "Cloud Firestore Admin" role');
      }
    }
    
  } catch (error) {
    console.error('Error checking service account permissions:', error);
    console.log('\nThis may be because:');
    console.log('1. Your service account does not have permission to check IAM permissions');
    console.log('2. The service account key file is invalid or corrupted');
    console.log('\nTo fix this:');
    console.log('1. Make sure your service account has the necessary IAM roles');
    console.log('2. Generate a new service account key if needed');
  }
}

// Install required dependencies if not already installed
try {
  require('google-auth-library');
  require('@google-cloud/iam');
  
  // Run the check
  checkServiceAccountPermissions().catch(console.error);
} catch (error) {
  console.error('Missing dependencies. Please install required packages:');
  console.log('\nnpm install google-auth-library @google-cloud/iam');
  process.exit(1);
}
