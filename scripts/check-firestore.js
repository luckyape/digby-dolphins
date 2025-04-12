// check-firestore.js - Check if Firestore is accessible
// Usage: node check-firestore.js

const admin = require('firebase-admin');
const path = require('path');

// Path to your service account key file
const serviceAccountPath = path.join(__dirname, 'service-account-key.json');

try {
  // Initialize Firebase Admin SDK
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
    projectId: 'digby-dolphins',
  });
  console.log(
    'Firebase Admin initialized successfully for project: digby-dolphins'
  );

  // Function to check Firestore access
  async function checkFirestoreAccess() {
    try {
      // Get Firestore instance
      // Initialize Firestore with the correct database ID
      const projectId = 'digby-dolphins';
      const databaseId = 'digby-dolphins';

      const db = admin.firestore();

      // Configure Firestore to use the non-default database
      const firestoreSettings = {
        databaseId: databaseId,
      };
      db.settings(firestoreSettings);

      console.log(`Using Firestore database: ${projectId} (${databaseId})`);
      console.log('Firestore instance created');

      // Try to list collections
      console.log('Attempting to list collections...');
      const collections = await db.listCollections();
      const collectionIds = [];

      for (const collection of collections) {
        collectionIds.push(collection.id);
      }

      if (collectionIds.length > 0) {
        console.log('✅ Successfully accessed Firestore. Found collections:');
        collectionIds.forEach((id) => console.log(`  - ${id}`));
      } else {
        console.log(
          '✅ Successfully accessed Firestore, but no collections found.'
        );
        console.log('This is normal for a new database.');
      }

      // Try to create a test document
      console.log('\nAttempting to create a test document...');
      const testRef = db.collection('_test_access').doc('test_doc');
      await testRef.set({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        message: 'Test document to verify Firestore access',
      });
      console.log('✅ Successfully created test document');

      // Try to read the test document
      console.log('\nAttempting to read the test document...');
      const docSnapshot = await testRef.get();
      if (docSnapshot.exists) {
        console.log('✅ Successfully read test document');
      } else {
        console.log(
          '❌ Test document not found, but write appeared to succeed'
        );
      }

      // Delete the test document
      console.log('\nCleaning up test document...');
      await testRef.delete();
      console.log('✅ Successfully deleted test document');

      console.log('\n✅ All Firestore operations completed successfully!');
      console.log('Your service account has proper access to Firestore.');
    } catch (error) {
      console.error('\n❌ Error accessing Firestore:', error);
      console.log('\nThis may be because:');
      console.log('  1. The Firestore database has not been created yet');
      console.log('  2. The service account does not have Firestore access');
      console.log('  3. The Firestore API is not enabled');
      console.log('\nTo fix this:');
      console.log(
        '  1. Go to https://console.firebase.google.com/project/digby-dolphins/firestore'
      );
      console.log('  2. Make sure the database is created');
      console.log(
        '  3. Check that your service account has the proper permissions'
      );
      console.log('  4. Enable the Firestore API in the Google Cloud Console');
    }
  }

  // Run the check
  checkFirestoreAccess()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
} catch (error) {
  console.error('Error initializing Firebase Admin:', error.message);
  console.log(
    '\nMake sure you have placed your service account key file at:',
    serviceAccountPath
  );
  process.exit(1);
}
