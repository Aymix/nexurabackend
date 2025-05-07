/**
 * Twitter API integration utility
 */
const crypto = require('crypto');
const OAuth = require('oauth-1.0a');
const { getTwitterCredentials, isTwitterConfigured } = require('./settingsUtil');

/**
 * Generate OAuth 1.0a authorization header for Twitter
 * @param {string} method - HTTP method (GET, POST, etc)
 * @param {string} url - The request URL
 * @param {Object} credentials - Twitter API credentials
 * @returns {string} - Authorization header value
 */
function generateAuthHeader(method, url, credentials) {
  const oauth = OAuth({
    consumer: { key: credentials.apiKey, secret: credentials.apiKeySecret },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
      return crypto
        .createHmac('sha1', key)
        .update(base_string)
        .digest('base64');
    },
  });

  const authorization = oauth.authorize(
    { url, method },
    { key: credentials.accessToken, secret: credentials.accessTokenSecret }
  );

  return oauth.toHeader(authorization).Authorization;
}

/**
 * Post a tweet using the Twitter API
 * @param {string} content - The content of the tweet
 * @returns {Promise<object>} - The response from the Twitter API
 */
async function postTweet(content) {
  try {
    // Check if Twitter is configured
    if (!isTwitterConfigured()) {
      return {
        success: false,
        error: 'Twitter API is not configured',
        details: 'Please configure your Twitter API keys in the settings page'
      };
    }

    const credentials = getTwitterCredentials();
    const url = 'https://api.twitter.com/2/tweets';
    const method = 'POST';
    
    // Configure headers with OAuth authentication
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", generateAuthHeader(method, url, credentials));

    // Prepare the request body
    const raw = JSON.stringify({
      "text": content
    });

    // Set request options
    const requestOptions = {
      method: "POST",
      headers: myHeaders,
      body: raw,
      redirect: "follow"
    };

    // Make the API call
    const response = await fetch("https://api.twitter.com/2/tweets", requestOptions);
    const responseText = await response.text();
    
    // Parse the response if it's JSON
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch (e) {
      responseData = { rawResponse: responseText };
    }
    
    // Check for success
    if (response.ok) {
      console.log('Tweet posted successfully:', responseData);
      return {
        success: true,
        data: responseData
      };
    } else {
      console.error('Failed to post tweet:', responseData);
      return {
        success: false,
        error: 'Failed to post tweet',
        details: responseData
      };
    }
  } catch (error) {
    console.error('Error posting tweet:', error);
    return {
      success: false,
      error: 'Error posting tweet',
      details: error.message
    };
  }
}

module.exports = {
  postTweet
};
