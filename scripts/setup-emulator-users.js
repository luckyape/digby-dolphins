const admin = require('firebase-admin');
const serviceAccount = require('../service-account-key.json');

// Initialize Firebase Admin with emulator configuration
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'digby-dolphins',
  databaseURL: 'http://localhost:9000?ns=digby-dolphins',
});

// Check if running in emulator
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST;
if (!EMULATOR_HOST) {
  console.warn(
    '⚠️ WARNING: This script is intended to be run with the Firebase emulators.'
  );
  console.warn(
    'Make sure you have set the FIRESTORE_EMULATOR_HOST environment variable.'
  );
  console.warn(
    'Example: FIRESTORE_EMULATOR_HOST=localhost:8080 node scripts/setup-emulator-users.js'
  );
  process.exit(1);
}

// Function to create a user and set their role
async function createUserWithRole(email, password, displayName, role) {
  try {
    // Create the user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName,
      emailVerified: true,
    });

    console.log(`✅ Created user: ${userRecord.uid} (${email})`);

    // Set custom claims (role)
    await admin.auth().setCustomUserClaims(userRecord.uid, { role });
    console.log(`✅ Set role '${role}' for user ${userRecord.uid}`);

    // Add user to Firestore
    const db = admin.firestore();
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      displayName,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(
      `✅ Added user ${userRecord.uid} to Firestore users collection`
    );

    return userRecord;
  } catch (error) {
    console.error(`❌ Error creating user ${email}:`, error);
    return null;
  }
}

// Main function to set up users
async function setupUsers() {
  try {
    console.log('🔧 Setting up users in Firebase Auth emulator...');

    // Define users to create
    const users = [
      {
        email: 'admin@digbydolphins.org',
        password: 'password123',
        displayName: 'Admin User',
        role: 'admin',
      },
      {
        email: 'coach@digbydolphins.org',
        password: 'password123',
        displayName: 'Coach User',
        role: 'admin',
      },
      {
        email: 'athlete@digbydolphins.org',
        password: 'password123',
        displayName: 'Athlete User',
        role: 'athlete',
      },
      {
        email: 'parent@digbydolphins.org',
        password: 'password123',
        displayName: 'Parent User',
        role: 'supporter',
      },
      {
        email: 'graham@luckyape.com',
        password: 'password123',
        displayName: 'Graham',
        role: 'admin',
      },
    ];

    // Create each user
    for (const user of users) {
      await createUserWithRole(
        user.email,
        user.password,
        user.displayName,
        user.role
      );
    }

    console.log('✅ User setup complete!');
  } catch (error) {
    console.error('❌ Error setting up users:', error);
  } finally {
    // Exit the process
    process.exit(0);
  }
}

// Run the main function
setupUsers();
