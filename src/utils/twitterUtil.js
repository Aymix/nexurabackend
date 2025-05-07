/**
 * Twitter API integration utility
 */

/**
 * Post a tweet using the Twitter API
 * @param {string} content - The content of the tweet
 * @returns {Promise<object>} - The response from the Twitter API
 */
async function postTweet(content) {
  try {
    // Configure headers with OAuth authentication
    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    myHeaders.append("Authorization", "OAuth oauth_consumer_key=\"mnrYieqoKOTta3AIZl7tVN90E\",oauth_token=\"1916899758645395456-gHNZqZmN6TEKbxpecijScv4IcTTCoK\",oauth_signature_method=\"HMAC-SHA1\",oauth_timestamp=\"1746630335\",oauth_nonce=\"2cN2H8lliZS\",oauth_version=\"1.0\",oauth_signature=\"pnAScqhAG%2F9RAB%2FgwFA3zNtgVyo%3D\"");

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
