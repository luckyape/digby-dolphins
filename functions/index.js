/**
 * Cloud Functions for managing news articles, events, and user invitations in Firestore
 * These functions can be called by the OpenAI API to manage content and by the application
 * to handle user invitations and registration
 */

const { onRequest, onCall } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { initializeApp } = require('firebase-admin/app');
const {
  getFirestore,
  Timestamp,
  FieldValue,
} = require('firebase-admin/firestore');
const logger = require('firebase-functions/logger');
const { marked } = require('marked');

// Initialize Firebase Admin
initializeApp();

// Get Firestore instance
const db = getFirestore(undefined, 'digby-dolphins');

// Collection references
const articlesCollection = 'articles';
const categoriesCollection = 'categories';
const archivesCollection = 'archives';
const settingsCollection = 'settings';
const eventsCollection = 'events';
const eventCategoriesCollection = 'eventCategories';
const invitationsCollection = 'invitations';
const usersCollection = 'users';

/**
 * Helper function to format date for archive name
 * @param {Date} date - The date to format
 * @returns {string} Formatted date string (e.g., "April 2023")
 */
const formatDateForArchive = (date) => {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
};
const handleFunctionCall = async (props, functionName, args) => {
  logger.info(`Handling function call: ${functionName}`, args);

  switch (functionName) {
    case 'search_articles':
      // Call the searchArticles function directly
      return await searchArticles({ data: args });

    case 'create_article': {
      // Format current date as "April 7, 2025"
      const now = new Date();
      const months = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      const formattedDate = `${
        months[now.getMonth()]
      } ${now.getDate()}, ${now.getFullYear()}`;

      // Add formatted date to article data
      const articleData = { ...args, date: formattedDate };

      // Call the createArticle function with the updated data
      return await createArticle({ data: articleData });
    }
    case 'update_article':
      // Call the updateArticle function directly
      return await updateArticle({ data: args });

    case 'delete_article':
      // Call the deleteArticle function directly
      return await deleteArticle({ data: args });

    case 'get_article':
      // Call the getArticle function directly
      return await getArticle({ data: args });

    case 'manage_contact_form_settings':
      // Call the updateContactFormSettings function directly
      return await contactFormFunctions.updateContactFormSettings(args);

    // Event management functions
    case 'create_event':
      // Call the createEvent function
      return await createEvent({ data: args });

    case 'update_event':
      // Call the updateEvent function
      return await updateEvent({ data: args });

    case 'delete_event':
      // Call the deleteEvent function
      return await deleteEvent({ data: args });

    case 'get_event':
      // Call the getEvent function
      return await getEvent({ data: args });

    case 'search_events':
      // Call the searchEvents function
      return await searchEvents({ data: args });

    case 'get_event_categories':
      // Call the getEventCategories function
      return await getEventCategories();

    // Best Times functions
    case 'add_best_time':
      // Call the addBestTime function
      return await bestTimesFunctions.addBestTime({ data: args });

    case 'set_goal_time':
      // Call the setGoalTime function
      return await bestTimesFunctions.setGoalTime({ data: args });

    case 'get_best_times':
      // Call the getBestTimes function
      return await bestTimesFunctions.getBestTimes({ data: args });

    case 'get_best_time':
      // Call the getBestTime function
      return await bestTimesFunctions.getBestTime({ data: args });

    case 'import_best_times':
      // Call the importBestTimes function
      return await bestTimesFunctions.importBestTimes({ data: args });

    default:
      logger.error(`Unknown function: ${functionName}`);
      throw new Error('Unknown function: ' + functionName);
  }
};
const openAIFetch = async (url, method, body, props) => {
  // Get OpenAI API key from environment variables
  // For emulator, use the key from .env.local if available
  let apiKey = process.env.OPENAI_API_KEY || props.OPENAI_API_KEY;

  // If running in emulator, log that we're using environment variables
  if (process.env.FUNCTIONS_EMULATOR) {
    logger.info(
      'Running in emulator, using environment variables for API keys'
    );
  }

  if (!apiKey) {
    logger.error('OpenAI API key not found');
    throw new Error('OpenAI API key not configured');
  }

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'OpenAI-Beta': 'assistants=v2',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  return fetch(url, options);
};

/**
 * Cloud Function to handle OpenAI chat interactions for kids
 * This function manages the conversation with OpenAI's Assistant API using a kid-friendly assistant
 * @param {Object} request - The request object from the client
 * @returns {Object} The response with message and threadId
 */
exports.handleOpenAI = onCall(
  {
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 300,
  },
  async (request) => {
    try {
      const { userMessage, gardenId, ownerId, threadId } = request.data;
      if (!userMessage)
        throw new Error('Missing required parameter: userMessage');

      const props = {
        ...process.env,
        threadId,
      };

      const thread = threadId ? { id: threadId } : await createThread(props);

      await sendUserMessage(thread.id, userMessage, props);
      const run = await startRun(
        thread.id,
        props,
        'asst_idLxeRLnvZqO7POZbxSQeeP6'
      );

      const resultMessage = await pollRunWithTools(thread.id, run.id, props);
      logger.info('Chat interaction completed successfully');

      return {
        message: resultMessage,
        threadId: thread.id,
      };
    } catch (error) {
      logger.error('Error in handleOpenAI function:', error);
      throw new Error(error.message || 'Internal Server Error');
    }
  }
);

/**
 * Helper function to update category count
 * @param {string} categoryName - The category name
 * @param {number} increment - The amount to increment (positive or negative)
 */
const updateCategoryCount = async (categoryName, increment) => {
  try {
    // Get all categories
    const snapshot = await db.collection(categoriesCollection).get();
    const categories = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Find the category
    const category = categories.find((cat) => cat.name === categoryName);

    if (category) {
      // Update existing category
      await db
        .collection(categoriesCollection)
        .doc(category.id)
        .update({
          count: category.count + increment,
        });
    } else if (increment > 0) {
      // Create new category if incrementing
      await db.collection(categoriesCollection).add({
        name: categoryName,
        count: increment,
      });
    }
  } catch (error) {
    logger.error('Error updating category count:', error);
    throw error;
  }
};

/**
 * Helper function to update archive count
 * @param {string} archiveName - The archive name
 * @param {number} increment - The amount to increment (positive or negative)
 */
const updateArchiveCount = async (archiveName, increment) => {
  try {
    // Get all archives
    const snapshot = await db.collection(archivesCollection).get();
    const archives = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Find the archive
    const archive = archives.find((arch) => arch.name === archiveName);

    if (archive) {
      // Update existing archive
      await db
        .collection(archivesCollection)
        .doc(archive.id)
        .update({
          count: archive.count + increment,
        });
    } else if (increment > 0) {
      // Create new archive if incrementing
      await db.collection(archivesCollection).add({
        name: archiveName,
        count: increment,
      });
    }
  } catch (error) {
    logger.error('Error updating archive count:', error);
    throw error;
  }
};

/**
 * Cloud Function to create a new article
 * This function can be called by the OpenAI API to create a new article
 */
const createArticle = async (request) => {
  try {
    const article = request.data;

    // Validate required fields
    if (
      !article.title ||
      !article.content ||
      !article.category ||
      !article.author
    ) {
      throw new Error('Missing required fields');
    }

    // Convert markdown to HTML if content contains markdown
    let processedContent = article.content;
    if (
      (processedContent && processedContent.includes('```')) ||
      processedContent.includes('#') ||
      processedContent.includes('*') ||
      processedContent.includes('- ') ||
      processedContent.includes('1. ')
    ) {
      try {
        processedContent = marked(processedContent);
        logger.info('Converted markdown to HTML');
      } catch (markdownError) {
        logger.warn('Failed to convert markdown to HTML:', markdownError);
        // Continue with original content if conversion fails
      }
    }

    // Add timestamps
    const now = Timestamp.now();
    const newArticle = {
      ...article,
      content: processedContent, // Use the processed content
      createdAt: now,
      updatedAt: now,
    };

    // Add the article to Firestore
    const docRef = await db.collection(articlesCollection).add(newArticle);

    // Update category count
    await updateCategoryCount(article.category, 1);

    // Update archive count
    const archiveName = formatDateForArchive(now.toDate());
    await updateArchiveCount(archiveName, 1);

    // Return the new article with its ID
    return {
      success: true,
      id: docRef.id,
      article: {
        id: docRef.id,
        ...newArticle,
      },
    };
  } catch (error) {
    logger.error('Error creating article:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};
exports.createArticle = onCall(
  {
    cors: true,
    region: 'us-central1',
    memory: '256MiB',
  },
  createArticle
);

/**
 * Cloud Function to update an existing article
 * This function can be called by the OpenAI API to update an article
 */
const updateArticle = async (request) => {
  try {
    const { id, article } = request.data;

    // Validate required fields
    if (!id || !article) {
      throw new Error('Missing required fields');
    }

    // Get the existing article
    const docRef = db.collection(articlesCollection).doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new Error('Article not found');
    }

    const existingArticle = docSnap.data();

    // Convert markdown to HTML if content contains markdown
    let processedContent = article.content;
    if (
      processedContent &&
      (processedContent.includes('```') ||
        processedContent.includes('#') ||
        processedContent.includes('*') ||
        processedContent.includes('- ') ||
        processedContent.includes('1. '))
    ) {
      try {
        processedContent = marked(processedContent);
        logger.info('Converted markdown to HTML');
      } catch (markdownError) {
        logger.warn('Failed to convert markdown to HTML:', markdownError);
        // Continue with original content if conversion fails
      }
    }

    // Update timestamps
    const now = Timestamp.now();
    const updatedArticle = {
      ...article,
      content: processedContent, // Use the processed content
      updatedAt: now,
      createdAt: existingArticle.createdAt, // Preserve original creation time
    };

    // Check if category has changed
    if (existingArticle.category !== article.category) {
      // Decrement old category count
      await updateCategoryCount(existingArticle.category, -1);

      // Increment new category count
      await updateCategoryCount(article.category, 1);
    }

    // Update the article in Firestore
    await docRef.update(updatedArticle);

    // Return the updated article
    return {
      success: true,
      article: {
        id,
        ...updatedArticle,
      },
    };
  } catch (error) {
    logger.error('Error updating article:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};
exports.updateArticle = onCall(
  {
    cors: true,
    region: 'us-central1',
    memory: '256MiB',
  },
  updateArticle
);

/**
 * Cloud Function to delete an article
 * This function can be called by the OpenAI API to delete an article
 */
const deleteArticle = async (request) => {
  try {
    const { id } = request.data;

    // Validate required fields
    if (!id) {
      throw new Error('Missing article ID');
    }

    // Get the existing article
    const docRef = db.collection(articlesCollection).doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new Error('Article not found');
    }

    const existingArticle = docSnap.data();

    // Decrement category count
    await updateCategoryCount(existingArticle.category, -1);

    // Decrement archive count
    const archiveName = formatDateForArchive(
      existingArticle.createdAt.toDate()
    );
    await updateArchiveCount(archiveName, -1);

    // Delete the article from Firestore
    await docRef.delete();

    return {
      success: true,
      message: 'Article deleted successfully',
    };
  } catch (error) {
    logger.error('Error deleting article:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};
exports.deleteArticle = onCall(
  {
    cors: true,
    region: 'us-central1',
    memory: '256MiB',
  },
  deleteArticle
);

/**
 * Cloud Function to get an article by ID
 * This function can be called by the OpenAI API to retrieve a specific article
 */

const getArticle = async (request) => {
  try {
    const { id } = request.data;

    // Validate required fields
    if (!id) {
      throw new Error('Missing article ID');
    }

    // Get the article from Firestore
    const docRef = db.collection(articlesCollection).doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new Error('Article not found');
    }

    // Return the article
    return {
      success: true,
      article: {
        id: docSnap.id,
        ...docSnap.data(),
      },
    };
  } catch (error) {
    logger.error('Error getting article:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};
exports.getArticle = onCall(
  {
    cors: true,
    region: 'us-central1',
    memory: '256MiB',
  },
  getArticle
);

/**
 * Cloud Function to search for articles
 * This function can be called by the OpenAI API to search for articles
 */
const searchArticles = async (request) => {
  try {
    const { query, category, limit = 10 } = request.data;

    let articlesQuery = db.collection(articlesCollection);

    // Apply filters
    if (category) {
      articlesQuery = articlesQuery.where('category', '==', category);
    }

    // Order by creation date (newest first)
    articlesQuery = articlesQuery.orderBy('createdAt', 'desc').limit(limit);

    // Execute the query
    const snapshot = await articlesQuery.get();

    // Process results
    const articles = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // If there's a search query, filter results client-side
    // (Firestore doesn't support full-text search natively)
    let filteredArticles = articles;
    if (query && query.trim() !== '') {
      const searchTerms = query.toLowerCase().split(' ');
      filteredArticles = articles.filter((article) => {
        const titleMatch = searchTerms.some((term) =>
          article.title.toLowerCase().includes(term)
        );
        const contentMatch = searchTerms.some((term) =>
          article.content.toLowerCase().includes(term)
        );
        const excerptMatch = article.excerpt
          ? searchTerms.some((term) =>
              article.excerpt.toLowerCase().includes(term)
            )
          : false;

        return titleMatch || contentMatch || excerptMatch;
      });
    }

    return {
      success: true,
      articles: filteredArticles,
      total: filteredArticles.length,
    };
  } catch (error) {
    logger.error('Error searching articles:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};
exports.searchArticles = onCall(
  {
    cors: true,
    region: 'us-central1',
    memory: '256MiB',
  },
  searchArticles
);

/**
 * Cloud Function to get all categories
 * This function can be called by the OpenAI API to get all categories
 */
exports.getCategories = onCall(
  {
    cors: true,
    region: 'us-central1',
    memory: '256MiB',
  },
  async () => {
    try {
      const snapshot = await db.collection(categoriesCollection).get();
      const categories = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        success: true,
        categories,
      };
    } catch (error) {
      logger.error('Error getting categories:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
);

/**
 * Cloud Function to get all archives
 * This function can be called by the OpenAI API to get all archives
 */
exports.getArchives = onCall(
  {
    cors: true,
    region: 'us-central1',
    memory: '256MiB',
  },
  async () => {
    try {
      const snapshot = await db.collection(archivesCollection).get();
      const archives = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        success: true,
        archives,
      };
    } catch (error) {
      logger.error('Error getting archives:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }
);

/**
 * HTTP endpoint to test the API
 * This function can be called to verify the API is working
 */
exports.newsApiStatus = onRequest(
  {
    cors: true,
    region: 'us-central1',
    memory: '256MiB',
  },
  async (req, res) => {
    try {
      // Get counts from Firestore
      const articlesSnapshot = await db.collection(articlesCollection).get();
      const categoriesSnapshot = await db
        .collection(categoriesCollection)
        .get();
      const archivesSnapshot = await db.collection(archivesCollection).get();
      const eventsSnapshot = await db.collection(eventsCollection).get();
      const eventCategoriesSnapshot = await db
        .collection(eventCategoriesCollection)
        .get();

      // Return status and counts
      res.status(200).json({
        status: 'online',
        timestamp: new Date().toISOString(),
        counts: {
          articles: articlesSnapshot.size,
          categories: categoriesSnapshot.size,
          archives: archivesSnapshot.size,
          events: eventsSnapshot.size,
          eventCategories: eventCategoriesSnapshot.size,
        },
        endpoints: [
          // Article endpoints
          'createArticle',
          'updateArticle',
          'deleteArticle',
          'getArticle',
          'searchArticles',
          'getCategories',
          'getArchives',
          // Event endpoints
          'createEvent',
          'updateEvent',
          'deleteEvent',
          'getEvent',
          'searchEvents',
          'getEventCategories',
          // Best Times endpoints
          'addBestTime',
          'setGoalTime',
          'getBestTimes',
          'getBestTime',
          'importBestTimes',
        ],
        message:
          'API is operational. Use Firebase callable functions to interact with the News and Events API.',
      });
    } catch (error) {
      logger.error('Error in API status check:', error);
      res.status(500).json({
        status: 'error',
        error: error.message,
      });
    }
  }
);
// Import address normalization function
const addressFunctions = require('./addressNormalization');

// Import invitation functions
const invitationFunctions = require('./invitations');

// Import contact form functions
const contactFormFunctions = require('./contactForm');

// Import best times functions
const bestTimesFunctions = require('./src/bestTimes');

// Export invitation functions
exports.sendInvitations = invitationFunctions.sendInvitations;
exports.resendInvitation = invitationFunctions.resendInvitation;
exports.deleteInvitation = invitationFunctions.deleteInvitation;
exports.getInvitations = invitationFunctions.getInvitations;
exports.verifyInvitation = invitationFunctions.verifyInvitation;
exports.acceptInvitation = invitationFunctions.acceptInvitation;

// Export address normalization function
exports.normalizeAddress = addressFunctions.normalizeAddress;

// Export contact form functions
exports.submitContactForm = contactFormFunctions.submitContactForm;
exports.getContactSubmissions = contactFormFunctions.getContactSubmissions;
exports.updateSubmissionStatus = contactFormFunctions.updateSubmissionStatus;
exports.updateContactFormSettings =
  contactFormFunctions.updateContactFormSettings;

// Export best times functions
exports.addBestTime = bestTimesFunctions.addBestTime;
exports.setGoalTime = bestTimesFunctions.setGoalTime;
exports.getBestTimes = bestTimesFunctions.getBestTimes;
exports.getBestTime = bestTimesFunctions.getBestTime;
exports.importBestTimes = bestTimesFunctions.importBestTimes;

// Export Next.js server function
exports.nextjsServer = require('./nextjs-server').nextjs;

/**
 * Cloud Function to create a new event
 * This function can be called by the OpenAI API to create a new event
 */
const createEvent = async (request) => {
  try {
    const event = request.data;

    // Validate required fields
    if (
      !event.title ||
      !event.description ||
      !event.startDate ||
      !event.location ||
      !event.category
    ) {
      throw new Error('Missing required fields');
    }

    // Add timestamps
    const now = Timestamp.now();

    // Convert date strings to Firestore Timestamps
    const firestoreData = {
      ...event,
      startDate: Timestamp.fromDate(new Date(event.startDate)),
      endDate: event.endDate
        ? Timestamp.fromDate(new Date(event.endDate))
        : null,
      recurringEndDate: event.recurringEndDate
        ? Timestamp.fromDate(new Date(event.recurringEndDate))
        : null,
      registrationDeadline: event.registrationDeadline
        ? Timestamp.fromDate(new Date(event.registrationDeadline))
        : null,
      createdAt: now,
      updatedAt: now,
    };

    // Add the event to Firestore
    const docRef = await db.collection(eventsCollection).add(firestoreData);

    // Update event category count
    await updateEventCategoryCount(event.category);

    // Return the new event with its ID
    return {
      success: true,
      id: docRef.id,
      event: {
        id: docRef.id,
        ...event,
      },
    };
  } catch (error) {
    logger.error('Error creating event:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};
exports.createEvent = onCall(
  {
    cors: true,
    region: 'us-central1',
    memory: '256MiB',
  },
  createEvent
);

/**
 * Cloud Function to update an existing event
 * This function can be called by the OpenAI API to update an event
 */
const updateEvent = async (request) => {
  try {
    const { id, event } = request.data;

    // Validate required fields
    if (!id || !event) {
      throw new Error('Missing required fields');
    }

    // Get the existing event
    const docRef = db.collection(eventsCollection).doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new Error('Event not found');
    }

    const existingEvent = docSnap.data();
    const oldCategory = existingEvent.category;
    const newCategory = event.category;

    // Update timestamps
    const now = Timestamp.now();

    // Convert date strings to Firestore Timestamps
    const firestoreData = {
      ...event,
      startDate: Timestamp.fromDate(new Date(event.startDate)),
      endDate: event.endDate
        ? Timestamp.fromDate(new Date(event.endDate))
        : null,
      recurringEndDate: event.recurringEndDate
        ? Timestamp.fromDate(new Date(event.recurringEndDate))
        : null,
      registrationDeadline: event.registrationDeadline
        ? Timestamp.fromDate(new Date(event.registrationDeadline))
        : null,
      updatedAt: now,
      createdAt: existingEvent.createdAt, // Preserve original creation time
    };

    // Update the event in Firestore
    await docRef.update(firestoreData);

    // Update event category counts if category changed
    if (oldCategory !== newCategory) {
      await updateEventCategoryCount(oldCategory, -1);
      await updateEventCategoryCount(newCategory, 1);
    }

    // Return the updated event
    return {
      success: true,
      event: {
        id,
        ...event,
      },
    };
  } catch (error) {
    logger.error('Error updating event:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};
exports.updateEvent = onCall(
  {
    cors: true,
    region: 'us-central1',
    memory: '256MiB',
  },
  updateEvent
);

/**
 * Cloud Function to delete an event
 * This function can be called by the OpenAI API to delete an event
 */
const deleteEvent = async (request) => {
  try {
    const { id } = request.data;

    // Validate required fields
    if (!id) {
      throw new Error('Missing event ID');
    }

    // Get the existing event
    const docRef = db.collection(eventsCollection).doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new Error('Event not found');
    }

    const existingEvent = docSnap.data();

    // Decrement category count
    await updateEventCategoryCount(existingEvent.category, -1);

    // Delete the event from Firestore
    await docRef.delete();

    return {
      success: true,
      message: 'Event deleted successfully',
    };
  } catch (error) {
    logger.error('Error deleting event:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};
exports.deleteEvent = onCall(
  {
    cors: true,
    region: 'us-central1',
    memory: '256MiB',
  },
  deleteEvent
);

/**
 * Cloud Function to get an event by ID
 * This function can be called by the OpenAI API to retrieve a specific event
 */
const getEvent = async (request) => {
  try {
    const { id } = request.data;

    // Validate required fields
    if (!id) {
      throw new Error('Missing event ID');
    }

    // Get the event from Firestore
    const docRef = db.collection(eventsCollection).doc(id);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new Error('Event not found');
    }

    const data = docSnap.data();

    // Convert Firestore Timestamps to ISO strings
    const event = {
      id: docSnap.id,
      ...data,
      startDate: data.startDate ? data.startDate.toDate().toISOString() : null,
      endDate: data.endDate ? data.endDate.toDate().toISOString() : null,
      recurringEndDate: data.recurringEndDate
        ? data.recurringEndDate.toDate().toISOString()
        : null,
      registrationDeadline: data.registrationDeadline
        ? data.registrationDeadline.toDate().toISOString()
        : null,
      createdAt: data.createdAt ? data.createdAt.toDate().toISOString() : null,
      updatedAt: data.updatedAt ? data.updatedAt.toDate().toISOString() : null,
    };

    // Return the event
    return {
      success: true,
      event,
    };
  } catch (error) {
    logger.error('Error getting event:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};
exports.getEvent = onCall(
  {
    cors: true,
    region: 'us-central1',
    memory: '256MiB',
  },
  getEvent
);

/**
 * Cloud Function to search for events
 * This function can be called by the OpenAI API to search for events
 */
const searchEvents = async (request) => {
  try {
    const { query, category, startDate, endDate, limit = 10 } = request.data;

    let eventsQuery = db.collection(eventsCollection);

    // Apply filters
    if (category) {
      eventsQuery = eventsQuery.where('category', '==', category);
    }

    // Apply date range filters
    if (startDate) {
      const startDateObj = new Date(startDate);
      startDateObj.setHours(0, 0, 0, 0);
      eventsQuery = eventsQuery.where(
        'startDate',
        '>=',
        Timestamp.fromDate(startDateObj)
      );
    }

    if (endDate) {
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);
      eventsQuery = eventsQuery.where(
        'startDate',
        '<=',
        Timestamp.fromDate(endDateObj)
      );
    }

    // Order by start date (ascending)
    eventsQuery = eventsQuery.orderBy('startDate', 'asc').limit(limit);

    // Execute the query
    const snapshot = await eventsQuery.get();

    // Process results
    let events = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startDate: data.startDate
          ? data.startDate.toDate().toISOString()
          : null,
        endDate: data.endDate ? data.endDate.toDate().toISOString() : null,
        recurringEndDate: data.recurringEndDate
          ? data.recurringEndDate.toDate().toISOString()
          : null,
        registrationDeadline: data.registrationDeadline
          ? data.registrationDeadline.toDate().toISOString()
          : null,
        createdAt: data.createdAt
          ? data.createdAt.toDate().toISOString()
          : null,
        updatedAt: data.updatedAt
          ? data.updatedAt.toDate().toISOString()
          : null,
      };
    });

    // If there's a search query, filter results client-side
    if (query && query.trim() !== '') {
      const searchTerms = query.toLowerCase().split(' ');
      events = events.filter((event) => {
        const titleMatch = searchTerms.some((term) =>
          event.title.toLowerCase().includes(term)
        );
        const descriptionMatch = searchTerms.some((term) =>
          event.description.toLowerCase().includes(term)
        );
        const locationMatch = searchTerms.some((term) =>
          event.location.toLowerCase().includes(term)
        );
        const organizerMatch = event.organizer
          ? searchTerms.some((term) =>
              event.organizer.toLowerCase().includes(term)
            )
          : false;

        return (
          titleMatch || descriptionMatch || locationMatch || organizerMatch
        );
      });
    }

    return {
      success: true,
      events,
      total: events.length,
    };
  } catch (error) {
    logger.error('Error searching events:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};
exports.searchEvents = onCall(
  {
    cors: true,
    region: 'us-central1',
    memory: '256MiB',
  },
  searchEvents
);

/**
 * Cloud Function to get all event categories
 * This function can be called by the OpenAI API to get all event categories
 */
const getEventCategories = async () => {
  try {
    const snapshot = await db.collection(eventCategoriesCollection).get();
    const categories = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return {
      success: true,
      categories,
    };
  } catch (error) {
    logger.error('Error getting event categories:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};
exports.getEventCategories = onCall(
  {
    cors: true,
    region: 'us-central1',
    memory: '256MiB',
  },
  getEventCategories
);

/**
 * Helper function to update event category count
 * @param {string} categoryName - The category name
 * @param {number} increment - The amount to increment (positive or negative)
 */
const updateEventCategoryCount = async (categoryName, increment = 1) => {
  try {
    // Get all categories
    const snapshot = await db
      .collection(eventCategoriesCollection)
      .where('name', '==', categoryName)
      .get();

    if (snapshot.empty) {
      // Category doesn't exist, create it
      if (increment > 0) {
        await db.collection(eventCategoriesCollection).add({
          name: categoryName,
          count: increment,
        });
      }
    } else {
      // Category exists, update count
      const categoryDoc = snapshot.docs[0];
      const currentCount = categoryDoc.data().count || 0;
      const newCount = Math.max(0, currentCount + increment); // Ensure count is not negative

      await db
        .collection(eventCategoriesCollection)
        .doc(categoryDoc.id)
        .update({
          count: newCount,
        });
    }
  } catch (error) {
    logger.error('Error updating event category count:', error);
    throw error;
  }
};

async function pollRunWithTools(threadId, runId, props) {
  while (true) {
    const response = await openAIFetch(
      `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
      'GET',
      null,
      props
    );
    if (!response.ok) throw new Error(await parseError(response));

    const data = await response.json();

    if (data.status === 'requires_action' && data.required_action) {
      const toolCalls =
        data.required_action.submit_tool_outputs.tool_calls || [];

      logger.info(`Processing ${toolCalls.length} tool calls`);

      const toolOutputs = await Promise.all(
        toolCalls.map(async (toolCall) => {
          const {
            id: toolCallId,
            function: { name, arguments: argsString },
          } = toolCall;

          try {
            const functionArgs = JSON.parse(argsString);
            const functionResult = await handleFunctionCall(
              props,
              name,
              functionArgs
            );

            return {
              tool_call_id: toolCallId,
              output: JSON.stringify(functionResult),
            };
          } catch (error) {
            logger.error(`Error processing tool call ${name}:`, error);
            return {
              tool_call_id: toolCallId,
              output: JSON.stringify({ error: error.message }),
            };
          }
        })
      );

      const toolResponse = await openAIFetch(
        `https://api.openai.com/v1/threads/${threadId}/runs/${runId}/submit_tool_outputs`,
        'POST',
        { tool_outputs: toolOutputs },
        props
      );

      if (!toolResponse.ok) throw new Error(await parseError(toolResponse));

      logger.info('Tool outputs submitted successfully');
      await new Promise((resolve) => setTimeout(resolve, 1000));
      continue;
    } else if (data.status === 'completed') {
      const messagesRes = await openAIFetch(
        `https://api.openai.com/v1/threads/${threadId}/messages`,
        'GET',
        null,
        props
      );
      if (!messagesRes.ok) throw new Error(await parseError(messagesRes));

      const messages = await messagesRes.json();
      const msg = messages.data.find((m) => m.role === 'assistant');
      return (
        msg?.content?.[0]?.text?.value ||
        'Completed, no assistant message found.'
      );
    } else if (data.status === 'failed') {
      throw new Error(data.last_error?.message || 'Run failed');
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function createThread(props) {
  const response = await openAIFetch(
    'https://api.openai.com/v1/threads',
    'POST',
    {},
    props
  );
  if (!response.ok) throw new Error(await parseError(response));
  return await response.json();
}

async function sendUserMessage(threadId, content, props) {
  const response = await openAIFetch(
    `https://api.openai.com/v1/threads/${threadId}/messages`,
    'POST',
    { role: 'user', content },
    props
  );
  if (!response.ok) throw new Error(await parseError(response));
}

async function startRun(threadId, props, assistantId) {
  const response = await openAIFetch(
    `https://api.openai.com/v1/threads/${threadId}/runs`,
    'POST',
    { assistant_id: assistantId },
    props
  );
  if (!response.ok) throw new Error(await parseError(response));
  return await response.json();
}

async function parseError(response) {
  try {
    const json = await response.json();
    return json.error?.message || 'Unknown error';
  } catch {
    return `Non-JSON error: ${await response.text()}`;
  }
}
// Function to generate and save splash content
const generateSplashContent = async () => {
  try {
    logger.info('Generating daily splash content...');

    // Get the threadId from the settings/splash document
    let threadId = null;
    try {
      const splashSettingsDoc = await db
        .collection('settings')
        .doc('splash')
        .get();
      if (splashSettingsDoc.exists) {
        const splashSettings = splashSettingsDoc.data();
        threadId = splashSettings.threadId;
        logger.info(`Found existing threadId: ${threadId}`);
      } else {
        logger.info(
          'No splash settings document found, will create a new thread'
        );
      }
    } catch (settingsError) {
      logger.warn('Error fetching splash settings:', settingsError);
      // Continue without threadId, a new one will be created
    }

    const result = await openAISplash({
      data: {
        userMessage: 'Generate Today Motivation & Fun Swim Fact.',
        structured: true,
        threadId: threadId, // Pass the threadId if it exists
      },
    });

    // If we got a new threadId back, save it to settings
    if (result.threadId && result.threadId !== threadId) {
      logger.info(`Saving new threadId: ${result.threadId}`);
      await db.collection('settings').doc('splash').set(
        {
          threadId: result.threadId,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    }

    const { structured } = result;

    if (!structured?.motivation || !structured?.funFact) {
      throw new Error('Missing content in structured response.');
    }

    const today = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
    const docRef = db.collection('splashContent').doc(today);

    await docRef.set({
      date: today,
      motivation: structured.motivation,
      swimFunFact: structured.funFact,
      generatedBy: 'assistant:splash',
      triggerConfetti: structured.triggerConfetti || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info('Daily splash content generated and saved successfully');
    return {
      status: 'success',
      content: {
        motivation: structured.motivation,
        swimFunFact: structured.funFact,
      },
    };
  } catch (error) {
    logger.error('Error generating splash content:', error);
    throw error;
  }
};

// Schedule the splash content generation to run daily at 00:01
exports.scheduledSplashContent = onSchedule(
  {
    schedule: '1 0 * * *', // Cron expression for 00:01 every day
    timeZone: 'America/New_York', // Adjust to your preferred timezone
    retryCount: 3, // Retry up to 3 times if it fails
    memory: '256MiB',
    region: 'us-central1',
  },
  async (event) => {
    try {
      logger.info('Running scheduled splash content generation', {
        scheduledTime: event.scheduleTime,
      });

      const result = await generateSplashContent();
      logger.info('Scheduled splash content generation completed successfully');
      return result;
    } catch (error) {
      logger.error('Scheduled splash content generation failed:', error);
      throw error;
    }
  }
);

// Keep the HTTP endpoint for manual triggering and testing
exports.getSplashContent = onRequest(async (req, res) => {
  try {
    const result = await generateSplashContent();
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error in getSplashContent function:', error);
    res.status(500).json({
      status: 'error',
      error: error.message,
    });
  }
});

const openAISplash = async (request) => {
  try {
    const { userMessage, threadId, structured = true } = request.data;

    if (!userMessage)
      throw new Error('Missing required parameter: userMessage');

    const props = {
      ...process.env,
      gardenId: 'kids',
      ownerId: 'athlete',
    };

    let thread;

    if (threadId) {
      thread = { id: threadId };
    } else {
      thread = await createThread(props);

      // Save new thread ID to Firestore
      await db.collection('settings').doc('splash').set(
        {
          threadId: thread.id,
          updatedAt: new Date(),
        },
        { merge: true }
      );
    }

    await sendUserMessage(thread.id, userMessage, props);
    const run = await startRun(thread.id, props);
    const resultMessage = await pollRunCompletion(thread.id, run.id, props);

    let jsonPayload = null;
    if (structured) {
      try {
        jsonPayload = JSON.parse(resultMessage);
      } catch {
        logger.warn(
          'Structured response requested, but response is not valid JSON'
        );
      }
    }

    return {
      message: jsonPayload?.message || resultMessage,
      structured: jsonPayload,
      triggerConfetti: jsonPayload?.triggerConfetti,
      threadId: thread.id,
    };
  } catch (error) {
    logger.error('Error in openAISplash function:', error);
    throw new Error(error.message || 'Internal Server Error');
  }
};
exports.handleKidsOpenAI = onCall(
  {
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 300,
  },
  openAISplash
);

async function createThread(props) {
  const response = await openAIFetch(
    'https://api.openai.com/v1/threads',
    'POST',
    {},
    props
  );
  if (!response.ok) throw new Error(await parseError(response));
  return await response.json();
}

async function sendUserMessage(threadId, content, props) {
  const response = await openAIFetch(
    `https://api.openai.com/v1/threads/${threadId}/messages`,
    'POST',
    { role: 'user', content },
    props
  );
  if (!response.ok) throw new Error(await parseError(response));
}

// async function startRun(threadId, props) {
//   const response = await openAIFetch(
//     `https://api.openai.com/v1/threads/${threadId}/runs`,
//     'POST',
//     {
//       assistant_id: 'asst_EIrVLE4TbOIYjdPtbNe2RGn9',
//     },
//     props
//   );
//   if (!response.ok) throw new Error(await parseError(response));
//   return await response.json();
// }

async function pollRunCompletion(threadId, runId, props) {
  while (true) {
    const response = await openAIFetch(
      `https://api.openai.com/v1/threads/${threadId}/runs/${runId}`,
      'GET',
      null,
      props
    );
    if (!response.ok) throw new Error(await parseError(response));

    const data = await response.json();
    if (data.status === 'completed') {
      const messagesRes = await openAIFetch(
        `https://api.openai.com/v1/threads/${threadId}/messages`,
        'GET',
        null,
        props
      );
      if (!messagesRes.ok) throw new Error(await parseError(messagesRes));

      const messages = await messagesRes.json();
      const msg = messages.data.find((m) => m.role === 'assistant');
      return (
        msg?.content?.[0]?.text?.value ||
        'Completed, no assistant message found.'
      );
    } else if (data.status === 'failed') {
      throw new Error(data.last_error?.message || 'Run failed');
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function parseError(response) {
  try {
    const json = await response.json();
    return json.error?.message || 'Unknown error';
  } catch {
    return `Non-JSON error: ${await response.text()}`;
  }
}
