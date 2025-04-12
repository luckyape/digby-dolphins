// create-firestore-database.js - Create Firestore database if it doesn't exist
// Usage: node create-firestore-database.js

const { GoogleAuth } = require('google-auth-library');
const { FirestoreAdminClient } = require('@google-cloud/firestore').v1;
const path = require('path');

// Path to your service account key file
const serviceAccountPath = path.join(__dirname, 'service-account-key.json');

async function createFirestoreDatabase() {
  try {
    // Load the service account key
    const serviceAccount = require(serviceAccountPath);
    const projectId = serviceAccount.project_id;

    console.log(
      `Attempting to create Firestore database for project: ${projectId}`
    );

    // Create a Google Auth client
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    });

    // Create a Firestore Admin client
    const firestoreAdminClient = new FirestoreAdminClient({ auth });

    // Create the database
    const [operation] = await firestoreAdminClient.createDatabase({
      parent: `projects/${projectId}`,
      databaseId: 'digby-dolphins',
      database: {
        locationId: 'us-central1', // You can change this to your preferred location
        type: 'FIRESTORE_NATIVE',
      },
    });

    console.log('Database creation initiated. Waiting for completion...');

    // Wait for the operation to complete
    const [database] = await operation.promise();

    console.log(`✅ Firestore database created successfully: ${database.name}`);
    console.log(`Location: ${database.locationId}`);
    console.log(`Type: ${database.type}`);
  } catch (error) {
    if (error.code === 6) {
      // ALREADY_EXISTS
      console.log('✅ Firestore database already exists for this project');
    } else {
      console.error('Error creating Firestore database:', error);
      console.log('\nThis may be because:');
      console.log(
        '1. Your service account does not have permission to create a Firestore database'
      );
      console.log('2. The Firestore API is not enabled');
      console.log('3. There might be an issue with your project configuration');
      console.log('\nTo fix this:');
      console.log(
        '1. Make sure your service account has the "Firebase Admin" role'
      );
      console.log('2. Enable the Firestore API in the Google Cloud Console');
      console.log(
        '3. Try creating the database manually in the Firebase Console'
      );
    }
  }
}

// Install required dependencies if not already installed
try {
  require('google-auth-library');
  require('@google-cloud/firestore');

  // Run the function
  createFirestoreDatabase().catch(console.error);
} catch (error) {
  console.error('Missing dependencies. Please install required packages:');
  console.log('\nnpm install google-auth-library @google-cloud/firestore');
  process.exit(1);
}
