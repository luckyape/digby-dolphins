/**
 * Test script for Firebase Cloud Functions
 * This script simulates the behavior of the Cloud Functions locally
 */

const admin = require('firebase-admin');
const {
  getFirestore,
  Timestamp,
  FieldValue,
} = require('firebase-admin/firestore');

// Initialize Firebase Admin with a service account (for local testing)
try {
  admin.initializeApp({
    projectId: 'digby-dolphins',
  });
  console.log('Firebase Admin initialized successfully');
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
}

// Get Firestore instance
const db = getFirestore();

// Collection references
const articlesCollection = 'articles';
const categoriesCollection = 'categories';
const archivesCollection = 'archives';

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

/**
 * Test function to create a new article
 */
async function testCreateArticle() {
  try {
    // Sample article data
    const article = {
      title: 'Test Article from Cloud Function',
      date: 'April 6, 2024',
      excerpt: 'This is a test article created by the Cloud Function.',
      content:
        'This is the full content of the test article. It was created automatically by the Cloud Function to test the API.',
      category: 'Test Category',
      author: 'Cloud Function',
    };

    // Add timestamps
    const now = Timestamp.now();
    const newArticle = {
      ...article,
      createdAt: now,
      updatedAt: now,
    };

    // Add the article to Firestore
    const docRef = await db.collection(articlesCollection).add(newArticle);

    console.log('Article created successfully with ID:', docRef.id);
    console.log('Article data:', {
      id: docRef.id,
      ...newArticle,
    });

    return {
      success: true,
      id: docRef.id,
      article: {
        id: docRef.id,
        ...newArticle,
      },
    };
  } catch (error) {
    console.error('Error creating article:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Test function to get all articles
 */
async function testGetArticles() {
  try {
    // Get all articles
    const snapshot = await db
      .collection(articlesCollection)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    // Process results
    const articles = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log('Retrieved articles:', articles.length);
    articles.forEach((article, index) => {
      console.log(`Article ${index + 1}:`, article.title);
    });

    return {
      success: true,
      articles,
      total: articles.length,
    };
  } catch (error) {
    console.error('Error getting articles:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Run the test functions
 */
async function runTests() {
  try {
    console.log('=== Testing Cloud Functions ===');

    // Test creating an article
    console.log('\n--- Testing createArticle ---');
    await testCreateArticle();

    // Test getting articles
    console.log('\n--- Testing getArticles ---');
    await testGetArticles();

    console.log('\n=== Tests completed successfully ===');
  } catch (error) {
    console.error('Error running tests:', error);
  } finally {
    // Exit the process
    process.exit(0);
  }
}

// Run the tests
runTests();
