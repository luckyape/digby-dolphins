/**
 * Cloud Functions for handling contact form submissions
 */

const { onCall } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const { getFirestore } = require('firebase-admin/firestore');

// Get Firestore instance
const db = getFirestore(undefined, 'digby-dolphins');

// Collection references
const contactSubmissionsCollection = 'contactSubmissions';
const settingsCollection = 'settings';

/**
 * Cloud Function to handle contact form submissions
 * Stores the submission in Firestore and maps the subject to the appropriate email
 */
exports.submitContactForm = onCall(
  {
    cors: true,
    region: 'us-central1',
    memory: '256MiB',
  },
  async (request) => {
    try {
      // Validate required fields
      const { name, email, subject, message } = request.data;

      if (!name || !email || !subject || !message) {
        throw new Error('Missing required fields');
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }

      // Get the subject to email mapping from Firestore
      const settingsDoc = await db
        .collection(settingsCollection)
        .doc('contactFormSettings')
        .get();

      if (!settingsDoc.exists) {
        logger.warn('Contact form settings not found, using default mapping');
      }

      const settings = settingsDoc.exists ? settingsDoc.data() : {};
      const subjectToEmailMap = settings.subjectToEmailMap || {
        'Registration Information': 'registration@digbydolphins.org',
        'Practice/Meet Schedule': 'coach@digbydolphins.org',
        Volunteering: 'volunteer@digbydolphins.org',
        'Coaching Staff': 'president@digbydolphins.org',
        Other: 'info@digbydolphins.org',
      };

      // Get the mapped email address for this subject
      const targetEmail =
        subjectToEmailMap[subject] || 'info@digbydolphins.org';

      // Create a new document in the contactSubmissions collection
      const submissionRef = await db
        .collection(contactSubmissionsCollection)
        .add({
          name,
          email,
          subject,
          message,
          targetEmail,
          timestamp: new Date(),
          status: 'new',
        });

      // Return success response with the document ID
      return {
        success: true,
        message: 'Thank you for your message! We will get back to you soon.',
        id: submissionRef.id,
      };
    } catch (error) {
      logger.error('Error submitting contact form:', error);

      // Return error response
      return {
        success: false,
        error:
          error.message || 'An error occurred while submitting your message',
      };
    }
  }
);

/**
 * Function to get all contact submissions (for admin use)
 * Can be filtered by status
 */
exports.getContactSubmissions = onCall(
  {
    cors: true,
    region: 'us-central1',
    memory: '256MiB',
  },
  async (request) => {
    try {
      // Check if user is authenticated
      if (!request.auth) {
        throw new Error(
          'User must be authenticated to access contact submissions'
        );
      }

      // Build query
      let query = db.collection(contactSubmissionsCollection);

      // Filter by status if provided
      if (request.data && request.data.status) {
        query = query.where('status', '==', request.data.status);
      }

      // Order by timestamp (newest first)
      query = query.orderBy('timestamp', 'desc');

      // Execute query
      const snapshot = await query.get();

      // Format results
      const submissions = [];
      snapshot.forEach((doc) => {
        submissions.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp
            ? doc.data().timestamp.toDate()
            : null,
        });
      });

      return {
        success: true,
        submissions,
      };
    } catch (error) {
      logger.error('Error getting contact submissions:', error);

      return {
        success: false,
        error:
          error.message ||
          'An error occurred while retrieving contact submissions',
      };
    }
  }
);

/**
 * Function to update the status of a contact submission
 */
exports.updateSubmissionStatus = onCall(
  {
    cors: true,
    region: 'us-central1',
    memory: '256MiB',
  },
  async (request) => {
    try {
      // Check if user is authenticated
      if (!request.auth) {
        throw new Error(
          'User must be authenticated to update submission status'
        );
      }

      // Validate required fields
      const { submissionId, status } = request.data;
      if (!submissionId || !status) {
        throw new Error('Missing required fields');
      }

      // Validate status value
      const validStatuses = ['new', 'read', 'responded'];
      if (!validStatuses.includes(status)) {
        throw new Error('Invalid status value');
      }

      // Update the document
      await db
        .collection(contactSubmissionsCollection)
        .doc(submissionId)
        .update({
          status,
          updatedAt: new Date(),
        });

      return {
        success: true,
        message: 'Submission status updated successfully',
      };
    } catch (error) {
      logger.error('Error updating submission status:', error);

      return {
        success: false,
        error:
          error.message || 'An error occurred while updating submission status',
      };
    }
  }
);

/**
 * Function to get the current contact form settings
 * This function can be called by the OpenAI API to get the current subject to email mapping
 */
exports.getContactFormSettings = onCall(
  {
    cors: true,
    region: 'us-central1',
    memory: '256MiB',
  },
  async () => {
    try {
      // Get the settings document
      const settingsDoc = await db
        .collection(settingsCollection)
        .doc('contactFormSettings')
        .get();

      if (!settingsDoc.exists) {
        // Return default mapping if settings don't exist
        return {
          success: true,
          settings: {
            subjectToEmailMap: {
              'Registration Information': 'registration@digbydolphins.org',
              'Practice/Meet Schedule': 'coach@digbydolphins.org',
              Volunteering: 'volunteer@digbydolphins.org',
              'Coaching Staff': 'president@digbydolphins.org',
              Other: 'info@digbydolphins.org',
            },
          },
        };
      }

      // Return the settings
      return {
        success: true,
        settings: settingsDoc.data(),
      };
    } catch (error) {
      logger.error('Error getting contact form settings:', error);

      return {
        success: false,
        error:
          error.message ||
          'An error occurred while retrieving contact form settings',
      };
    }
  }
);

/**
 * Function to update the contact form settings
 * This function can be called by the OpenAI API to update the subject to email mapping
 * It supports three operations:
 * - add: Add a new subject-email mapping or update an existing one
 * - remove: Remove a subject-email mapping
 * - get: Get the current subject-email mapping
 */
exports.updateContactFormSettings = onCall(
  {
    cors: true,
    region: 'us-central1',
    memory: '256MiB',
  },
  async (request) => {
    try {
      // Validate the request data
      const { operation, subject, email } = request.data;

      // Validate operation
      const validOperations = ['add', 'remove', 'get'];
      if (!operation || !validOperations.includes(operation)) {
        throw new Error(
          `Invalid operation. Must be one of: ${validOperations.join(', ')}`
        );
      }

      // Email validation regex (defined outside switch statement)
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      // Get the current settings
      const settingsDoc = await db
        .collection(settingsCollection)
        .doc('contactFormSettings')
        .get();

      // Initialize with default or existing mapping
      let subjectToEmailMap = {};
      if (settingsDoc.exists) {
        subjectToEmailMap = settingsDoc.data().subjectToEmailMap || {};
      } else {
        // Default mapping if document doesn't exist
        subjectToEmailMap = {
          'Registration Information': 'registration@digbydolphins.org',
          'Practice/Meet Schedule': 'coach@digbydolphins.org',
          Volunteering: 'volunteer@digbydolphins.org',
          'Coaching Staff': 'president@digbydolphins.org',
          Other: 'info@digbydolphins.org',
        };
      }

      // Handle the operation
      switch (operation) {
        case 'get':
          // Just return the current mapping
          return {
            success: true,
            settings: {
              subjectToEmailMap,
            },
          };

        case 'add':
          // Validate subject and email
          if (!subject || typeof subject !== 'string') {
            throw new Error('Subject is required and must be a string');
          }

          if (!email || typeof email !== 'string') {
            throw new Error('Email is required and must be a string');
          }

          // Validate email format
          if (!emailRegex.test(email)) {
            throw new Error(`Invalid email format: ${email}`);
          }

          // Add or update the mapping
          subjectToEmailMap[subject] = email;

          // Update the settings document
          await db
            .collection(settingsCollection)
            .doc('contactFormSettings')
            .set(
              {
                subjectToEmailMap,
                updatedAt: new Date(),
              },
              { merge: true }
            );

          return {
            success: true,
            message: `Subject '${subject}' mapped to '${email}' successfully`,
            settings: {
              subjectToEmailMap,
            },
          };

        case 'remove':
          // Validate subject
          if (!subject || typeof subject !== 'string') {
            throw new Error('Subject is required and must be a string');
          }

          // Check if the subject exists
          if (!subjectToEmailMap[subject]) {
            return {
              success: false,
              error: `Subject '${subject}' not found in the mapping`,
            };
          }

          // Remove the mapping
          delete subjectToEmailMap[subject];

          // Update the settings document
          await db
            .collection(settingsCollection)
            .doc('contactFormSettings')
            .set(
              {
                subjectToEmailMap,
                updatedAt: new Date(),
              },
              { merge: true }
            );

          return {
            success: true,
            message: `Subject '${subject}' removed successfully`,
            settings: {
              subjectToEmailMap,
            },
          };
      }
    } catch (error) {
      logger.error('Error updating contact form settings:', error);

      return {
        success: false,
        error:
          error.message ||
          'An error occurred while updating contact form settings',
      };
    }
  }
);
