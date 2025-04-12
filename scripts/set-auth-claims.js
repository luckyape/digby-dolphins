const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

// Initialize Firebase Admin with emulator configuration
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'digby-dolphins',
  databaseURL: 'http://localhost:9000?ns=digby-dolphins',
});

// Check if running in emulator
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST;
if (!EMULATOR_HOST) {
  console.warn('⚠️ WARNING: This script is intended to be run with the Firebase emulators.');
  console.warn('Make sure you have set the FIRESTORE_EMULATOR_HOST environment variable.');
  console.warn('Example: FIRESTORE_EMULATOR_HOST=localhost:8080 node scripts/set-auth-claims.js');
  process.exit(1);
}

// Function to set custom claims (roles) for a user
async function setUserRole(uid, role) {
  try {
    // Set custom claims
    await admin.auth().setCustomUserClaims(uid, { role });
    console.log(`✅ Successfully set role '${role}' for user ${uid}`);
    
    // Get the updated user
    const userRecord = await admin.auth().getUser(uid);
    console.log('User record:', userRecord.toJSON());
    
    return true;
  } catch (error) {
    console.error(`❌ Error setting role for user ${uid}:`, error);
    return false;
  }
}

// Main function to set roles for users
async function setRoles() {
  try {
    // Get command line arguments
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
      console.log('Usage: node set-auth-claims.js <uid> <role>');
      console.log('Example: node set-auth-claims.js user123 admin');
      console.log('Available roles: admin, athlete, supporter');
      return;
    }
    
    if (args.length < 2) {
      console.error('❌ Error: Please provide both a user ID and a role.');
      console.log('Usage: node set-auth-claims.js <uid> <role>');
      return;
    }
    
    const uid = args[0];
    const role = args[1];
    
    // Validate role
    const validRoles = ['admin', 'athlete', 'supporter'];
    if (!validRoles.includes(role)) {
      console.error(`❌ Error: Invalid role '${role}'. Valid roles are: ${validRoles.join(', ')}`);
      return;
    }
    
    // Set the role
    await setUserRole(uid, role);
    
    // Also add the user to the users collection in Firestore
    const db = admin.firestore();
    await db.collection('users').doc(uid).set({
      uid,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    
    console.log(`✅ Added user ${uid} to Firestore users collection with role '${role}'`);
    
  } catch (error) {
    console.error('❌ Error setting roles:', error);
  } finally {
    // Exit the process
    process.exit(0);
  }
}

// Run the main function
setRoles();
