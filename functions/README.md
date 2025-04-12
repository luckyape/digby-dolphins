# Digby Dolphins News API Cloud Functions

This directory contains Firebase Cloud Functions that provide a complete API for managing news articles for the Digby Dolphins Swim Team website.

## Functions Overview

The API provides the following functions:

### Article Management

- **createArticle**: Create a new news article
- **updateArticle**: Update an existing article
- **deleteArticle**: Delete an article
- **getArticle**: Get a specific article by ID
- **searchArticles**: Search for articles with optional filtering

### Category and Archive Management

- **getCategories**: Get all categories
- **getArchives**: Get all archives

### Status Check

- **newsApiStatus**: HTTP endpoint to check the API status

## API Usage

These functions are designed to be called from the OpenAI API or any other authorized client. They use Firebase Callable Functions, which provide automatic authentication and validation.

### Example: Creating an Article

```javascript
// Client-side code
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const createArticle = httpsCallable(functions, 'createArticle');

// Call the function
createArticle({
  title: 'New Swim Meet Announced',
  date: 'April 15, 2024',
  excerpt: 'Join us for our upcoming swim meet on May 1st!',
  content: 'Full details about the swim meet...',
  category: 'Events',
  author: 'Coach Smith',
})
  .then((result) => {
    // Read result of the Cloud Function.
    const data = result.data;
    console.log('Article created:', data);
  })
  .catch((error) => {
    console.error('Error creating article:', error);
  });
```

### Example: Searching Articles

```javascript
// Client-side code
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const searchArticles = httpsCallable(functions, 'searchArticles');

// Call the function
searchArticles({
  query: 'swim meet',
  category: 'Events',
  limit: 10,
})
  .then((result) => {
    const data = result.data;
    console.log('Search results:', data.articles);
  })
  .catch((error) => {
    console.error('Error searching articles:', error);
  });
```

## Deployment

To deploy these functions to Firebase:

1. Ensure you have the Firebase CLI installed:

   ```
   npm install -g firebase-tools
   ```

2. Login to Firebase:

   ```
   firebase login
   ```

3. Deploy the functions:
   ```
   firebase deploy --only functions
   ```

**Note**: You need to be on the Blaze (pay-as-you-go) plan to deploy Cloud Functions.

## Local Testing

You can test these functions locally using the Firebase Emulator Suite:

```
firebase emulators:start --only functions
```

Or use the provided test script:

```
node test-functions.js
```

## Security

These functions use Firebase Authentication to ensure only authorized users can access them. Make sure to set up proper security rules in your Firebase project.

## Integration with OpenAI API

These functions are designed to be called by the OpenAI API to manage news content. The API can:

1. Create new articles based on user input
2. Update existing articles
3. Delete outdated articles
4. Search for specific articles
5. Retrieve categories and archives

This allows for a seamless integration between the OpenAI API and the Digby Dolphins website's news section.

### Setting up the OpenAI API Key

The chat functionality uses OpenAI's API. To use this feature, you need to set up an OpenAI API key:

1. Create an account on [OpenAI's platform](https://platform.openai.com/)
2. Generate an API key from the [API keys page](https://platform.openai.com/api-keys)
3. Add your API key to the `.env` file in the functions directory:

```
OPENAI_API_KEY=sk-your-api-key-here
```

**Important**: The API key should start with `sk-` (not `sk-proj-`). The project key (`sk-proj-`) is not valid for direct API calls.

### Troubleshooting OpenAI Integration

If you encounter errors like:

```
Error creating thread: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

This typically means:

1. Your API key is invalid or missing
2. You're using a project key instead of a secret key
3. There's an issue with the OpenAI API endpoint

Check your API key and make sure it's correctly set in the `.env` file.

For production deployment, set your OpenAI API key as a Firebase environment variable:

```
firebase functions:config:set openai.apikey="sk-your-api-key-here"
```
