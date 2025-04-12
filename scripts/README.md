# Admin Scripts for Digby Dolphins

This folder contains administrative scripts for managing the Digby Dolphins Firebase project.

## Available Scripts

### Admin User Management

1. `adminSetClaim.js` - Set admin role for a hardcoded user ID
2. `setAdminClaim.js` - Set admin role for a user ID provided as a command-line argument

### Firestore Troubleshooting

3. `check-firestore.js` - Test Firestore database access
4. `check-firestore-api.js` - Check if the Firestore API is enabled
5. `check-service-account.js` - Check service account permissions
6. `check-firestore-database-id.js` - Check Firestore database ID
7. `create-firestore-database.js` - Create Firestore database if it doesn't exist

## Setting Admin Claims

There are two scripts for setting admin role claims for users in Firebase Authentication and adding them to the Firestore users collection:

1. `adminSetClaim.js` - Edit the script to set a hardcoded UID
2. `setAdminClaim.js` - Pass the UID as a command-line argument

Both scripts will:

1. Set the `role: 'admin'` custom claim in Firebase Authentication
2. Add or update the user in the Firestore `users` collection with the admin role

### Prerequisites

1. Install dependencies:

   ```
   npm install
   ```

2. Get a Firebase Service Account Key:

   - Go to the Firebase Console: https://console.firebase.google.com/project/digby-dolphins/settings/serviceaccounts/adminsdk
   - Click "Generate new private key"
   - Save the JSON file as `service-account-key.json` in the `scripts` folder

   > **Important**: Never commit this file to version control. It contains sensitive credentials.

3. Set up Firestore Database (if you want to update user records in Firestore):

   - Go to the Firebase Console: https://console.firebase.google.com/project/digby-dolphins/firestore
   - Click "Create database" if you haven't already
   - Choose a location and start in production mode
   - The scripts will still work without Firestore, but will only update Firebase Authentication

   > **Note**: The scripts are configured specifically for the 'digby-dolphins' Firebase project with a non-default Firestore database ID 'digby-dolphins'. If you're using a different project or database ID, update both the `projectId` and `databaseId` in the scripts, and make sure to use the `db.settings({ databaseId: databaseId })` configuration.

### Usage

#### Option 1: Using adminSetClaim.js

1. Edit `adminSetClaim.js` and replace `YOUR_ADMIN_UID_HERE` with the Firebase Auth UID of the user you want to make an admin.

2. Run the script:

   ```
   node adminSetClaim.js
   ```

#### Option 2: Using setAdminClaim.js

1. Run the script with the UID as an argument:

   ```
   node setAdminClaim.js <uid>
   ```

   Or use the npm script:

   ```
   npm run set-admin -- <uid>
   ```

   Replace `<uid>` with the Firebase Auth UID of the user you want to make an admin.

2. Verify the output confirms the claim was set successfully.

## Testing Firestore Access

If you're having issues with Firestore access, you can use the `check-firestore.js` script to diagnose the problem:

```
node check-firestore.js
```

This script will:

1. Try to list all collections in your Firestore database
2. Create a test document in a `_test_access` collection
3. Read the test document back
4. Delete the test document

If any of these operations fail, the script will provide detailed error information to help you troubleshoot the issue.

### Checking Firestore API Status

To check if the Firestore API is enabled for your project:

```
node check-firestore-api.js
```

You'll need to install additional dependencies first:

```
npm install google-auth-library @google-cloud/service-usage
```

This script will check if the Firestore API is enabled in the Google Cloud Console and provide instructions to enable it if needed.

### Checking Service Account Permissions

To check if your service account has the necessary permissions to access Firestore:

```
node check-service-account.js
```

You'll need to install additional dependencies first:

```
npm install google-auth-library @google-cloud/iam
```

This script will check if your service account has the required Firestore permissions and provide instructions to add the necessary roles if needed.

### Checking Firestore Database ID

To check the ID of your Firestore database:

```
node check-firestore-database-id.js
```

You'll need to install additional dependencies first:

```
npm install google-auth-library @google-cloud/firestore
```

This script will list all Firestore databases in your project and check if the 'digby-dolphins' database exists.

### Creating Firestore Database

If the Firestore database doesn't exist yet, you can create it using this script:

```
node create-firestore-database.js
```

You'll need to install additional dependencies first:

```
npm install google-auth-library @google-cloud/firestore
```

This script will attempt to create a Firestore database with ID 'digby-dolphins' in Native mode in the us-central1 region. If the database already exists, it will let you know.

### Notes

- The user must already exist in Firebase Authentication before running this script.
- You can find a user's UID in the Firebase Console under Authentication > Users.
- After setting the claim, the user may need to sign out and sign back in for the new permissions to take effect.
