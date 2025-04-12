#!/usr/bin/env node

/**
 * Firebase Auth Admin Script for Emulator
 *
 * This script sets custom claims (roles) for users in the Firebase Auth emulator.
 * It can be used to set roles like 'admin', 'athlete', or 'supporter'.
 *
 * Usage:
 *   node adminSetAuthClaim.js <uid> <role>
 *
 * Example:
 *   node adminSetAuthClaim.js user123 admin
 */

const admin = require('firebase-admin');
const path = require('path');

// Check if running in emulator
if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
  console.log('⚠️ Setting FIREBASE_AUTH_EMULATOR_HOST to localhost:9099');
}

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
  console.log('⚠️ Setting FIRESTORE_EMULATOR_HOST to localhost:8080');
}

// Try to use the service account key file if it exists
let serviceAccountPath;
try {
  // First try the one in the script directory
  serviceAccountPath = path.join(__dirname, 'service-account-key.json');
  require(serviceAccountPath);
} catch (error) {
  try {
    // Then try the one in the root directory
    serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
    require(serviceAccountPath);
  } catch (error) {
    console.log(
      '⚠️ No service account key file found, using default emulator credentials'
    );
    // For emulator, we can use a dummy credential
    admin.initializeApp({
      projectId: 'digby-dolphins',
    });
    console.log(
      'Firebase Admin initialized for emulator with default credentials'
    );
  }
}

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(require(serviceAccountPath)),
      projectId: 'digby-dolphins',
    });
    console.log('Firebase Admin initialized with service account');
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error.message);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);

// Show help if requested
if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: node adminSetAuthClaim.js <uid> <role>');
  console.log('Example: node adminSetAuthClaim.js user123 admin');
  console.log('Available roles: admin, athlete, supporter');
  process.exit(0);
}

// Check if we have enough arguments
if (args.length < 2) {
  console.error('❌ Error: Please provide both a user ID and a role.');
  console.log('Usage: node adminSetAuthClaim.js <uid> <role>');
  console.log('Run with --help for more information.');
  process.exit(1);
}

const uid = args[0];
const role = args[1];

// Validate role
const validRoles = ['admin', 'athlete', 'supporter'];
if (!validRoles.includes(role)) {
  console.error(
    `❌ Error: Invalid role '${role}'. Valid roles are: ${validRoles.join(
      ', '
    )}`
  );
  process.exit(1);
}

// Main function to set user role
async function setUserRole() {
  try {
    // First, get the user to retrieve their information
    const userRecord = await admin.auth().getUser(uid);
    console.log(`Retrieved user: ${userRecord.email || uid}`);

    // Set custom claims for the specified role
    await admin.auth().setCustomUserClaims(uid, { role });
    console.log(`✅ Custom claims set for user ${uid}: role = '${role}'`);

    try {
      // Initialize Firestore
      const db = admin.firestore();

      // Check if user already exists in Firestore
      const userDoc = await db.collection('users').doc(uid).get();

      if (userDoc.exists) {
        // Update existing user document
        await db.collection('users').doc(uid).update({
          role,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✅ Updated existing user document in Firestore`);
      } else {
        // Create new user document
        await db
          .collection('users')
          .doc(uid)
          .set({
            uid,
            email: userRecord.email || null,
            displayName:
              userRecord.displayName ||
              (userRecord.email ? userRecord.email.split('@')[0] : uid),
            role,
            photoURL: userRecord.photoURL || null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        console.log(`✅ Created new user document in Firestore`);
      }
    } catch (firestoreError) {
      console.warn('⚠️ Warning: Could not update Firestore database');
      console.warn('Error details:', firestoreError.message);
      console.warn(
        'The admin claim was still set successfully in Firebase Authentication.'
      );
    }

    // Get the updated user record to verify
    const updatedUserRecord = await admin.auth().getUser(uid);
    console.log('\nUser details:');
    console.log(`  UID: ${updatedUserRecord.uid}`);
    console.log(`  Email: ${updatedUserRecord.email || 'Not set'}`);
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

// Run the main function
setUserRole();
