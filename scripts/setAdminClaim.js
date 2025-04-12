// setAdminClaim.js - Set admin role claim for a Firebase user
// Usage: node setAdminClaim.js <uid>

const admin = require('firebase-admin');

const path = require('path');

// Path to your service account key file
// Replace this with the actual path to your downloaded service account key
const serviceAccountPath = path.join(__dirname, 'service-account-key.json');

try {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
    projectId: 'digby-dolphins',
  });
  console.log(
    'Firebase Admin initialized successfully for project: digby-dolphins'
  );
} catch (error) {
  console.error('Error initializing Firebase Admin:', error.message);
  console.log(
    '\nMake sure you have placed your service account key file at:',
    serviceAccountPath
  );
  console.log(
    '\nIf you need to use a different path, update the serviceAccountPath variable in this script.'
  );
  process.exit(1);
}

// Get UID from command line arguments
const uid = process.argv[2];

if (!uid) {
  console.error('Error: No UID provided');
  console.log('Usage: node setAdminClaim.js <uid>');
  process.exit(1);
}

// Set custom claim and update Firestore
async function setAdminRoleAndUpdateFirestore() {
  try {
    // Get the user record first
    const userRecord = await admin.auth().getUser(uid);
    console.log(`Retrieved user: ${userRecord.email}`);

    // Set custom claims for admin role
    await admin.auth().setCustomUserClaims(uid, { role: 'admin' });
    console.log(`✅ Admin role claim set for user ${uid}`);

    try {
      // Get Firestore instance with explicit database name
      const projectId = 'digby-dolphins';
      const databaseId = 'digby-dolphins';

      // Initialize Firestore with explicit database ID
      const db = admin.firestore();

      // Configure Firestore to use the non-default database
      const firestoreSettings = {
        databaseId: databaseId,
      };
      db.settings(firestoreSettings);

      // Log the database we're using
      console.log(`Using Firestore database: ${projectId} (${databaseId})`);

      // Log the collections we're accessing
      console.log(`Accessing collection: 'users' with document ID: '${uid}'`);

      // Check if user already exists in Firestore
      const userDoc = await db.collection('users').doc(uid).get();

      if (userDoc.exists) {
        // Update existing user document
        await db.collection('users').doc(uid).update({
          role: 'admin',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✅ Updated existing user document in Firestore`);
      } else {
        // Create new user document
        await db
          .collection('users')
          .doc(uid)
          .set({
            uid: uid,
            email: userRecord.email,
            displayName:
              userRecord.displayName || userRecord.email.split('@')[0],
            role: 'admin',
            photoURL: userRecord.photoURL || null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        console.log(`✅ Created new user document in Firestore`);
      }
    } catch (firestoreError) {
      console.warn('⚠️ Warning: Could not update Firestore database');
      console.warn('This may be because:');
      console.warn('  - The Firestore database has not been created yet');
      console.warn('  - The service account does not have Firestore access');
      console.warn('  - The Firestore API is not enabled');
      console.warn('\nError details:', firestoreError.message);
      console.warn('\nYou may need to:');
      console.warn(
        '  1. Create the Firestore database in the Firebase Console'
      );
      console.warn('  2. Enable the Firestore API in the Google Cloud Console');
      console.warn(
        '  3. Ensure your service account has the proper permissions'
      );
      console.warn(
        '\nThe admin claim was still set successfully in Firebase Authentication.'
      );
    }

    // Get the updated user record to verify
    const updatedUserRecord = await admin.auth().getUser(uid);
    console.log('User details:');
    console.log(`  Email: ${updatedUserRecord.email}`);
    console.log(
      `  Display name: ${updatedUserRecord.displayName || 'Not set'}`
    );
    console.log(
      `  Custom claims: ${JSON.stringify(updatedUserRecord.customClaims)}`
    );

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the function
setAdminRoleAndUpdateFirestore();
