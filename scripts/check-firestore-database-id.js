// check-firestore-database-id.js - Check Firestore database ID
// Usage: node check-firestore-database-id.js

const { GoogleAuth } = require('google-auth-library');
const { FirestoreAdminClient } = require('@google-cloud/firestore').v1;
const path = require('path');

// Path to your service account key file
const serviceAccountPath = path.join(__dirname, 'service-account-key.json');

async function checkFirestoreDatabaseId() {
  try {
    // Load the service account key
    const serviceAccount = require(serviceAccountPath);
    const projectId = serviceAccount.project_id;
    
    console.log(`Checking Firestore databases for project: ${projectId}`);
    
    // Create a Google Auth client
    const auth = new GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    // Create a Firestore Admin client
    const firestoreAdminClient = new FirestoreAdminClient({ auth });
    
    // List all databases
    const [databases] = await firestoreAdminClient.listDatabases({
      parent: `projects/${projectId}`
    });
    
    if (databases && databases.length > 0) {
      console.log(`\n✅ Found ${databases.length} Firestore database(s):`);
      
      databases.forEach((database, index) => {
        // Extract database ID from the name
        // Format: projects/{project}/databases/{database}
        const databaseId = database.name.split('/').pop();
        
        console.log(`\nDatabase ${index + 1}:`);
        console.log(`  Name: ${database.name}`);
        console.log(`  ID: ${databaseId}`);
        console.log(`  Location: ${database.locationId}`);
        console.log(`  Type: ${database.type}`);
        console.log(`  Version: ${database.versionRetentionPeriod}`);
        
        // Check if this is the database we're looking for
        if (databaseId === 'digby-dolphins') {
          console.log(`\n✅ Found the 'digby-dolphins' database!`);
          console.log(`\nTo use this database in your scripts, make sure to set:`);
          console.log(`const databaseId = 'digby-dolphins';`);
        }
      });
      
      // Check if we didn't find the digby-dolphins database
      const foundDigbyDolphins = databases.some(db => db.name.endsWith('/digby-dolphins'));
      if (!foundDigbyDolphins) {
        console.log(`\n⚠️ The 'digby-dolphins' database was not found.`);
        console.log(`You may need to create it using the create-firestore-database.js script.`);
      }
    } else {
      console.log(`\n❌ No Firestore databases found for project ${projectId}`);
      console.log(`You may need to create a database using the create-firestore-database.js script.`);
    }
    
  } catch (error) {
    console.error('Error checking Firestore database ID:', error);
    console.log('\nThis may be because:');
    console.log('1. Your service account does not have permission to list Firestore databases');
    console.log('2. The Firestore API is not enabled');
    console.log('\nTo fix this:');
    console.log('1. Make sure your service account has the "Firebase Admin" role');
    console.log('2. Enable the Firestore API in the Google Cloud Console');
  }
}

// Install required dependencies if not already installed
try {
  require('google-auth-library');
  require('@google-cloud/firestore');
  
  // Run the function
  checkFirestoreDatabaseId().catch(console.error);
} catch (error) {
  console.error('Missing dependencies. Please install required packages:');
  console.log('\nnpm install google-auth-library @google-cloud/firestore');
  process.exit(1);
}
