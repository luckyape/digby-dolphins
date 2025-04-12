/**
 * Cloud Functions for managing swimmer best times and goal times
 */

const { onCall } = require('firebase-functions/v2/https');
const { getFirestore } = require('firebase-admin/firestore');
const logger = require('firebase-functions/logger');

// Get Firestore instance
const db = getFirestore(undefined, 'digby-dolphins');

/**
 * Add or update a swimmer's best time for an event (Admin only)
 */
const addBestTime = async (data, context) => {
  try {
    // Ensure user is authenticated
    if (!context.auth) {
      throw new Error('Authentication required');
    }

    // Get the user's role from Firestore
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    if (userData.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const { eventName, stroke, distance, time, date, userId } = data;

    if (!eventName || !stroke || !distance || !time || !userId) {
      throw new Error('Missing required fields');
    }

    // Create a unique ID for this event
    const eventId = `${stroke}_${distance}`;

    // Create the best time record
    const bestTimeData = {
      eventName,
      stroke,
      distance,
      time: parseFloat(time),
      date: date || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add to Firestore
    await db
      .collection('users')
      .doc(userId)
      .collection('bestTimes')
      .doc(eventId)
      .set(bestTimeData, { merge: true });

    return {
      success: true,
      message: 'Best time saved successfully',
      bestTime: {
        id: eventId,
        ...bestTimeData,
      },
    };
  } catch (error) {
    logger.error('Error adding best time:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Set a goal time for a swimmer
 */
const setGoalTime = async (data, context) => {
  try {
    // Ensure user is authenticated
    if (!context.auth) {
      throw new Error('Authentication required');
    }

    const { eventName, stroke, distance, goalTime } = data;

    if (!eventName || !stroke || !distance || !goalTime) {
      throw new Error('Missing required fields');
    }

    const userId = context.auth.uid;

    // Create a unique ID for this event
    const eventId = `${stroke}_${distance}`;

    // Create the goal time record
    const goalTimeData = {
      goalTime: parseFloat(goalTime),
      updatedAt: new Date().toISOString(),
    };

    // Add to Firestore
    await db
      .collection('users')
      .doc(userId)
      .collection('bestTimes')
      .doc(eventId)
      .set(goalTimeData, { merge: true });

    return {
      success: true,
      message: 'Goal time set successfully',
      goalTime: goalTimeData,
    };
  } catch (error) {
    logger.error('Error setting goal time:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get all best times and goals for a swimmer
 */
const getBestTimes = async (data, context) => {
  try {
    // Ensure user is authenticated
    if (!context.auth) {
      throw new Error('Authentication required');
    }

    const userId = context.auth.uid;

    // Get all best times for this user
    const bestTimesSnapshot = await db
      .collection('users')
      .doc(userId)
      .collection('bestTimes')
      .get();

    const bestTimes = [];
    bestTimesSnapshot.forEach((doc) => {
      bestTimes.push({
        id: doc.id,
        ...doc.data(),
      });
    });

    return {
      success: true,
      bestTimes,
    };
  } catch (error) {
    logger.error('Error getting best times:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get a specific best time record
 */
const getBestTime = async (data, context) => {
  try {
    // Ensure user is authenticated
    if (!context.auth) {
      throw new Error('Authentication required');
    }

    const { eventId } = data;

    if (!eventId) {
      throw new Error('Event ID is required');
    }

    const userId = context.auth.uid;

    // Get the specific best time
    const bestTimeDoc = await db
      .collection('users')
      .doc(userId)
      .collection('bestTimes')
      .doc(eventId)
      .get();

    if (!bestTimeDoc.exists) {
      return {
        success: false,
        error: 'Best time not found',
      };
    }

    return {
      success: true,
      bestTime: {
        id: bestTimeDoc.id,
        ...bestTimeDoc.data(),
      },
    };
  } catch (error) {
    logger.error('Error getting best time:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Import multiple best times for multiple swimmers (Admin only)
 */
const importBestTimes = async (data, context) => {
  try {
    // Ensure user is authenticated
    if (!context.auth) {
      throw new Error('Authentication required');
    }

    // Get the user's role from Firestore
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!userDoc.exists) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    if (userData.role !== 'admin') {
      throw new Error('Admin access required');
    }

    const { bestTimes } = data;

    if (!bestTimes || !Array.isArray(bestTimes) || bestTimes.length === 0) {
      throw new Error('No best times provided');
    }

    // Batch write to Firestore
    const batch = db.batch();
    const results = [];

    for (const record of bestTimes) {
      const { userId, eventName, stroke, distance, time, date } = record;

      if (!userId || !eventName || !stroke || !distance || !time) {
        logger.warn('Skipping record with missing fields:', record);
        continue;
      }

      // Create a unique ID for this event
      const eventId = `${stroke}_${distance}`;

      // Create the best time record
      const bestTimeData = {
        eventName,
        stroke,
        distance,
        time: parseFloat(time),
        date: date || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add to batch
      const docRef = db
        .collection('users')
        .doc(userId)
        .collection('bestTimes')
        .doc(eventId);
      batch.set(docRef, bestTimeData, { merge: true });

      results.push({
        userId,
        eventId,
        ...bestTimeData,
      });
    }

    // Commit the batch
    await batch.commit();

    return {
      success: true,
      message: `${results.length} best times imported successfully`,
      results,
    };
  } catch (error) {
    logger.error('Error importing best times:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Export the functions
exports.addBestTime = onCall(
  { cors: true, region: 'us-central1' },
  addBestTime
);
exports.setGoalTime = onCall(
  { cors: true, region: 'us-central1' },
  setGoalTime
);
exports.getBestTimes = onCall(
  { cors: true, region: 'us-central1' },
  getBestTimes
);
exports.getBestTime = onCall(
  { cors: true, region: 'us-central1' },
  getBestTime
);
exports.importBestTimes = onCall(
  { cors: true, region: 'us-central1' },
  importBestTimes
);
