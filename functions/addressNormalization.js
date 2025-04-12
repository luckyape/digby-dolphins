const { onCall } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const fetch = require('node-fetch');

/**
 * Cloud Function to normalize and geocode an address using OpenAI and Nominatim
 * This function takes a user-entered address, cleans it using OpenAI, and geocodes it using Nominatim
 * If Nominatim fails, it falls back to a basic address structure
 */
exports.normalizeAddress = onCall(
  {
    timeoutSeconds: 30,
    region: 'us-central1',
    memory: '256MiB',
  },
  async (request) => {
    const { address } = request.data;

    if (!address) {
      return {
        success: false,
        error: 'No address provided.',
      };
    }

    try {
      // Step 1: Clean the address using OpenAI
      const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

      if (!OPENAI_API_KEY) {
        logger.error('OpenAI API key not found');
        return {
          success: false,
          error: 'OpenAI API key not configured',
        };
      }

      const prompt = `Take this messy user-entered address and return a clean, properly formatted version suitable for geocoding. Include country if missing. Format it with commas between components. Return it as a single string.\n\nInput: "${address}"\nCleaned:`;

      let cleaned;
      try {
        const gptRes = await fetch('https://api.openai.com/v1/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-3.5-turbo-instruct',
            prompt,
            max_tokens: 100,
            temperature: 0.2,
          }),
        });

        const gptJson = await gptRes.json();
        cleaned = gptJson.choices?.[0]?.text?.trim();

        if (!cleaned) {
          logger.warn(
            'OpenAI did not return a cleaned address, using original'
          );
          cleaned = address;
        }
      } catch (openaiError) {
        logger.error('Error calling OpenAI:', openaiError);
        cleaned = address; // Fall back to original address
      }

      // Step 2: Geocode using Nominatim with retry logic
      let geoJson = [];
      let attempts = 0;
      const maxAttempts = 3;
      const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

      while (attempts < maxAttempts && (!geoJson || geoJson.length === 0)) {
        attempts++;

        try {
          // Add country to improve geocoding success rate if not present
          const addressWithCountry = cleaned.toLowerCase().includes('canada')
            ? cleaned
            : `${cleaned}, Canada`;

          const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            addressWithCountry
          )}&format=json&limit=1`;

          logger.info(
            `Attempt ${attempts}: Geocoding address: ${addressWithCountry}`
          );

          const geoRes = await fetch(nominatimUrl, {
            headers: {
              'User-Agent': 'DigbyDolphins/1.0 (support@digbydolphins.com)',
            },
          });

          if (!geoRes.ok) {
            logger.warn(`Nominatim API returned status ${geoRes.status}`);
            if (attempts < maxAttempts) await delay(1000); // Wait 1 second before retry
            continue;
          }

          geoJson = await geoRes.json();

          if (!geoJson || geoJson.length === 0) {
            logger.warn('Nominatim returned empty results');
            if (attempts < maxAttempts) await delay(1000); // Wait 1 second before retry
          }
        } catch (geoError) {
          logger.error('Error calling Nominatim:', geoError);
          if (attempts < maxAttempts) await delay(1000); // Wait 1 second before retry
        }
      }

      // If we still don't have geocoding results after all attempts
      if (!geoJson || geoJson.length === 0) {
        logger.warn(
          'Geocoding failed after multiple attempts, returning cleaned address only'
        );

        // Return partial success with just the cleaned address
        return {
          success: true,
          original: address,
          cleaned: cleaned,
          formattedAddress: cleaned,
          // Provide null coordinates to indicate geocoding failed
          coordinates: null,
        };
      }

      logger.info(`Successfully normalized and geocoded address: ${address}`);

      return {
        success: true,
        original: address,
        cleaned,
        geocode: geoJson[0],
        formattedAddress: geoJson[0].display_name,
        coordinates: {
          lat: parseFloat(geoJson[0].lat),
          lng: parseFloat(geoJson[0].lon),
        },
      };
    } catch (err) {
      logger.error('normalizeAddress failed:', err);
      return {
        success: false,
        error: err.message || 'Something went wrong during normalization.',
      };
    }
  }
);
