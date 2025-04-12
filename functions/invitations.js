const { onCall } = require('firebase-functions/v2/https');
const { logger } = require('firebase-functions');
const admin = require('firebase-admin');
const {
  getFirestore,
  Timestamp,
  FieldValue,
} = require('firebase-admin/firestore');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Get Firestore instance
const db = getFirestore();

// For development, we'll log emails instead of sending them
// In production, you would use a real SMTP service
let transporter;

// Check if we're in development or production
if (
  process.env.NODE_ENV === 'production' &&
  process.env.EMAIL_USER &&
  process.env.EMAIL_PASSWORD
) {
  // Use real email service in production
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
} else {
  // In development, just log the email content
  transporter = {
    sendMail: (mailOptions) => {
      logger.info('Email would be sent with the following details:');
      logger.info(`From: ${mailOptions.from}`);
      logger.info(`To: ${mailOptions.to}`);
      logger.info(`Subject: ${mailOptions.subject}`);
      logger.info('HTML content would be sent...');
      logger.info(
        `Invitation link: ${mailOptions.html.match(/href="([^"]+)"/)[1]}`
      );
      return Promise.resolve({ messageId: 'mock-email-id-' + Date.now() });
    },
  };
}

/**
 * Generate a secure invitation token
 */
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Send invitation emails to multiple recipients
 */
exports.sendInvitations = onCall(
  {
    enforceAppCheck: false,
    region: 'us-central1',
    memory: '256MiB',
  },
  async (request) => {
    const { emails, invitedBy } = request.data;

    // Verify the caller is authenticated and has admin role
    if (!request.auth) {
      throw new Error(
        'Unauthorized: You must be logged in to send invitations'
      );
    }

    try {
      // Check if user is admin using custom claims
      if (!request.auth.token.role || request.auth.token.role !== 'admin') {
        // Fallback to checking Firestore if custom claims are not set
        const userDoc = await db
          .collection('users')
          .doc(request.auth.uid)
          .get();
        if (!userDoc.exists || userDoc.data().role !== 'admin') {
          throw new Error('Unauthorized: Only admins can send invitations');
        }
      }

      // Validate inputs
      if (!emails || !Array.isArray(emails) || emails.length === 0) {
        throw new Error('Invalid input: emails must be a non-empty array');
      }

      const results = {
        success: [],
        failed: [],
      };

      // Process each email
      for (const email of emails) {
        try {
          // Check if user already exists
          const userSnapshot = await db
            .collection('users')
            .where('email', '==', email)
            .limit(1)
            .get();

          if (!userSnapshot.empty) {
            results.failed.push({ email, reason: 'User already exists' });
            continue;
          }

          // Check if invitation already exists
          const invitationSnapshot = await db
            .collection('invitations')
            .where('email', '==', email)
            .where('status', '==', 'pending')
            .limit(1)
            .get();

          if (!invitationSnapshot.empty) {
            results.failed.push({ email, reason: 'Invitation already sent' });
            continue;
          }

          // Generate token and expiration date (7 days from now)
          const token = generateToken();
          const expiresAt = Timestamp.fromDate(
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          );

          // Create invitation record
          const invitationRef = db.collection('invitations').doc();
          await invitationRef.set({
            id: invitationRef.id,
            email,
            token,
            status: 'pending',
            createdAt: FieldValue.serverTimestamp(),
            createdBy: invitedBy || request.auth.token.email,
            expiresAt,
          });

          // Generate invitation link
          const baseUrl =
            process.env.NODE_ENV === 'production'
              ? 'https://digbydolphins.com'
              : 'http://localhost:3334';

          const invitationLink = `${baseUrl}/register?token=${token}&email=${encodeURIComponent(
            email
          )}`;

          // Send email
          const mailOptions = {
            from: '"Digby Dolphins Swim Team" <noreply@digbydolphins.com>',
            to: email,
            subject: 'Invitation to join Digby Dolphins Swim Team',
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background-color: #f0f0f0; padding: 20px; text-align: center;">
                <img src="https://digbydolphins.com/dolphins-logo.png" alt="Digby Dolphins Logo" style="max-width: 150px;">
                <h1 style="color: #333;">You're Invited!</h1>
              </div>
              <div style="padding: 20px; border: 1px solid #ddd; background-color: #fff;">
                <p>Hello,</p>
                <p>You've been invited to join the Digby Dolphins Swim Team.</p>
                <p>Click the button below to create your account and access team resources:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${invitationLink}" style="background-color: #ffd700; color: #333; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                    Accept Invitation
                  </a>
                </div>
                <p style="font-size: 0.9em; color: #666;">This invitation will expire in 7 days.</p>
                <p style="font-size: 0.9em; color: #666;">If you didn't expect this invitation, please ignore this email.</p>
              </div>
              <div style="background-color: #333; color: #fff; padding: 15px; text-align: center; font-size: 0.8em;">
                <p>&copy; ${new Date().getFullYear()} Digby Dolphins Swim Team. All rights reserved.</p>
              </div>
            </div>
          `,
          };

          await transporter.sendMail(mailOptions);
          results.success.push(email);
          logger.info(`Invitation sent to ${email}`);
        } catch (err) {
          logger.error(`Error sending invitation to ${email}:`, err);
          results.failed.push({
            email,
            reason: err.message || 'Unknown error',
          });
        }
      }

      return results;
    } catch (err) {
      logger.error('Error in sendInvitations:', err);
      throw new Error(`Failed to send invitations: ${err.message}`);
    }
  }
);

/**
 * Resend an invitation email
 */
exports.resendInvitation = onCall(
  {
    enforceAppCheck: false,
    region: 'us-central1',
    memory: '256MiB',
  },
  async (request) => {
    const { invitationId } = request.data;

    // Verify the caller is authenticated and has admin role
    if (!request.auth) {
      throw new Error(
        'Unauthorized: You must be logged in to resend invitations'
      );
    }

    try {
      // Check if user is admin using custom claims
      if (!request.auth.token.role || request.auth.token.role !== 'admin') {
        // Fallback to checking Firestore if custom claims are not set
        const userDoc = await db
          .collection('users')
          .doc(request.auth.uid)
          .get();
        if (!userDoc.exists || userDoc.data().role !== 'admin') {
          throw new Error('Unauthorized: Only admins can resend invitations');
        }
      }

      // Get the invitation
      const invitationDoc = await db
        .collection('invitations')
        .doc(invitationId)
        .get();

      if (!invitationDoc.exists) {
        throw new Error('Invitation not found');
      }

      const invitation = invitationDoc.data();

      if (invitation.status !== 'pending') {
        throw new Error(
          'Cannot resend an invitation that has already been accepted'
        );
      }

      // Generate new token and update expiration date
      const token = generateToken();
      const expiresAt = Timestamp.fromDate(
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      );

      // Update invitation record
      await invitationDoc.ref.update({
        token,
        expiresAt,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Generate invitation link
      const baseUrl =
        process.env.NODE_ENV === 'production'
          ? 'https://digbydolphins.com'
          : 'http://localhost:3333';

      const invitationLink = `${baseUrl}/register?token=${token}&email=${encodeURIComponent(
        invitation.email
      )}`;

      // Send email
      const mailOptions = {
        from: '"Digby Dolphins Swim Team" <noreply@digbydolphins.com>',
        to: invitation.email,
        subject: 'Invitation to join Digby Dolphins Swim Team (Resent)',
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #f0f0f0; padding: 20px; text-align: center;">
            <img src="https://digbydolphins.com/dolphins-logo.png" alt="Digby Dolphins Logo" style="max-width: 150px;">
            <h1 style="color: #333;">You're Invited!</h1>
          </div>
          <div style="padding: 20px; border: 1px solid #ddd; background-color: #fff;">
            <p>Hello,</p>
            <p>This is a reminder that you've been invited to join the Digby Dolphins Swim Team.</p>
            <p>Click the button below to create your account and access team resources:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationLink}" style="background-color: #ffd700; color: #333; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            <p style="font-size: 0.9em; color: #666;">This invitation will expire in 7 days.</p>
            <p style="font-size: 0.9em; color: #666;">If you didn't expect this invitation, please ignore this email.</p>
          </div>
          <div style="background-color: #333; color: #fff; padding: 15px; text-align: center; font-size: 0.8em;">
            <p>&copy; ${new Date().getFullYear()} Digby Dolphins Swim Team. All rights reserved.</p>
          </div>
        </div>
      `,
      };

      await transporter.sendMail(mailOptions);
      logger.info(`Invitation resent to ${invitation.email}`);

      return { success: true };
    } catch (err) {
      logger.error('Error in resendInvitation:', err);
      throw new Error(`Failed to resend invitation: ${err.message}`);
    }
  }
);

/**
 * Delete an invitation
 */
exports.deleteInvitation = onCall(
  {
    enforceAppCheck: false,
    region: 'us-central1',
    memory: '256MiB',
  },
  async (request) => {
    const { invitationId } = request.data;

    // Verify the caller is authenticated and has admin role
    if (!request.auth) {
      throw new Error(
        'Unauthorized: You must be logged in to delete invitations'
      );
    }

    try {
      // Check if user is admin using custom claims
      if (!request.auth.token.role || request.auth.token.role !== 'admin') {
        // Fallback to checking Firestore if custom claims are not set
        const userDoc = await db
          .collection('users')
          .doc(request.auth.uid)
          .get();
        if (!userDoc.exists || userDoc.data().role !== 'admin') {
          throw new Error('Unauthorized: Only admins can delete invitations');
        }
      }

      // Delete the invitation
      await db.collection('invitations').doc(invitationId).delete();
      logger.info(`Invitation ${invitationId} deleted`);

      return { success: true };
    } catch (err) {
      logger.error('Error in deleteInvitation:', err);
      throw new Error(`Failed to delete invitation: ${err.message}`);
    }
  }
);

/**
 * Get all invitations
 */
exports.getInvitations = onCall(
  {
    enforceAppCheck: false,
    region: 'us-central1',
    memory: '256MiB',
  },
  async (request) => {
    // Verify the caller is authenticated and has admin role
    if (!request.auth) {
      throw new Error(
        'Unauthorized: You must be logged in to view invitations'
      );
    }

    try {
      // Check if user is admin using custom claims
      if (!request.auth.token.role || request.auth.token.role !== 'admin') {
        // Fallback to checking Firestore if custom claims are not set
        const userDoc = await db
          .collection('users')
          .doc(request.auth.uid)
          .get();
        if (!userDoc.exists || userDoc.data().role !== 'admin') {
          throw new Error('Unauthorized: Only admins can view invitations');
        }
      }

      // Get all invitations, ordered by creation date (newest first)
      const invitationsSnapshot = await db
        .collection('invitations')
        .orderBy('createdAt', 'desc')
        .get();

      const invitations = [];
      invitationsSnapshot.forEach((doc) => {
        invitations.push(doc.data());
      });

      return invitations;
    } catch (err) {
      logger.error('Error in getInvitations:', err);
      throw new Error(`Failed to get invitations: ${err.message}`);
    }
  }
);

/**
 * Verify an invitation token
 */
exports.verifyInvitation = onCall(
  {
    enforceAppCheck: false,
    region: 'us-central1',
    memory: '256MiB',
  },
  async (request) => {
    const { token, email } = request.data;

    if (!token || !email) {
      throw new Error('Invalid request: token and email are required');
    }

    try {
      // Find the invitation
      const invitationsSnapshot = await db
        .collection('invitations')
        .where('email', '==', email)
        .where('token', '==', token)
        .where('status', '==', 'pending')
        .limit(1)
        .get();

      if (invitationsSnapshot.empty) {
        throw new Error('Invalid or expired invitation');
      }

      const invitation = invitationsSnapshot.docs[0].data();

      // Check if invitation has expired
      const now = Timestamp.now();
      if (invitation.expiresAt.seconds < now.seconds) {
        throw new Error('Invitation has expired');
      }

      return {
        valid: true,
        invitation: {
          id: invitation.id,
          email: invitation.email,
          role: invitation.role || 'supporter', // Default to supporter if role is not specified
        },
      };
    } catch (err) {
      logger.error('Error in verifyInvitation:', err);
      return {
        valid: false,
        error: err.message,
      };
    }
  }
);

/**
 * Mark an invitation as accepted
 */
exports.acceptInvitation = onCall(
  {
    enforceAppCheck: false,
    region: 'us-central1',
    memory: '256MiB',
  },
  async (request) => {
    const { invitationId, userId } = request.data;

    if (!invitationId || !userId) {
      throw new Error('Invalid request: invitationId and userId are required');
    }

    try {
      // Get the invitation
      const invitationDoc = await db
        .collection('invitations')
        .doc(invitationId)
        .get();

      if (!invitationDoc.exists) {
        throw new Error('Invitation not found');
      }

      const invitation = invitationDoc.data();

      if (invitation.status !== 'pending') {
        throw new Error('Invitation has already been used');
      }

      // Check if invitation has expired
      const now = Timestamp.now();
      if (invitation.expiresAt.seconds < now.seconds) {
        throw new Error('Invitation has expired');
      }

      // Update invitation status
      await invitationDoc.ref.update({
        status: 'accepted',
        acceptedAt: FieldValue.serverTimestamp(),
        acceptedBy: userId,
      });

      logger.info(`Invitation ${invitationId} accepted by user ${userId}`);

      return { success: true };
    } catch (err) {
      logger.error('Error in acceptInvitation:', err);
      throw new Error(`Failed to accept invitation: ${err.message}`);
    }
  }
);
