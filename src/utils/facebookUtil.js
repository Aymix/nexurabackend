/**
 * Facebook API integration utility
 */
const { getFacebookCredentials, isFacebookConfigured } = require('./settingsUtil');

/**
 * Post content to a Facebook page
 * @param {string} content - The content to post
 * @param {string} imageUrl - Optional image URL to include with the post
 * @returns {Promise<object>} - The response from the Facebook API
 */
async function postToFacebook(content, imageUrl = null) {
  try {
    // Check if Facebook is configured
    if (!isFacebookConfigured()) {
      return {
        success: false,
        error: 'Facebook API is not configured',
        details: 'Please configure your Facebook API keys in the settings page'
      };
    }

    const credentials = getFacebookCredentials();
    
    // Determine what type of post to create based on whether an image is provided
    const endpoint = imageUrl 
      ? `https://graph.facebook.com/v17.0/me/photos` 
      : `https://graph.facebook.com/v17.0/me/feed`;
    
    // Prepare the post data
    const formData = new URLSearchParams();
    formData.append('access_token', credentials.accessToken);
    formData.append('message', content);
    
    // Add image URL if provided
    if (imageUrl) {
      formData.append('url', imageUrl);
    }

    // Make the API call
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData
    });

    const responseData = await response.json();
    
    if (response.ok) {
      console.log('Facebook post created successfully:', responseData);
      return {
        success: true,
        data: responseData
      };
    } else {
      console.error('Failed to create Facebook post:', responseData);
      return {
        success: false,
        error: 'Failed to create Facebook post',
        details: responseData
      };
    }
  } catch (error) {
    console.error('Error posting to Facebook:', error);
    return {
      success: false,
      error: 'Error posting to Facebook',
      details: error.message
    };
  }
}

module.exports = {
  postToFacebook
};
