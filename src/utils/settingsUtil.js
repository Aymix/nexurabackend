/**
 * Utility for accessing and managing API settings
 */
const fs = require('fs');
const path = require('path');

// Define the path to the settings file
const SETTINGS_FILE_PATH = path.join(process.cwd(), 'settings.json');

/**
 * Get the current settings
 * @returns {Object} Settings object
 */
function getSettings() {
  try {
    if (!fs.existsSync(SETTINGS_FILE_PATH)) {
      const defaultSettings = {
        twitter: {
          apiKey: '',
          apiKeySecret: '',
          accessToken: '',
          accessTokenSecret: ''
        },
        facebook: {
          appId: '',
          appSecret: '',
          accessToken: ''
        }
      };
      fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(defaultSettings, null, 2));
      return defaultSettings;
    }
    
    const settingsJson = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
    return JSON.parse(settingsJson);
  } catch (error) {
    console.error('Error reading settings file:', error);
    return {
      twitter: { apiKey: '', apiKeySecret: '', accessToken: '', accessTokenSecret: '' },
      facebook: { appId: '', appSecret: '', accessToken: '' }
    };
  }
}

/**
 * Get Twitter API credentials
 * @returns {Object} Twitter credentials
 */
function getTwitterCredentials() {
  const settings = getSettings();
  return settings.twitter || { 
    apiKey: '', 
    apiKeySecret: '', 
    accessToken: '', 
    accessTokenSecret: '' 
  };
}

/**
 * Get Facebook API credentials
 * @returns {Object} Facebook credentials
 */
function getFacebookCredentials() {
  const settings = getSettings();
  return settings.facebook || { 
    appId: '', 
    appSecret: '', 
    accessToken: '' 
  };
}

/**
 * Check if Twitter credentials are configured
 * @returns {boolean} Whether Twitter is configured
 */
function isTwitterConfigured() {
  const { apiKey, apiKeySecret, accessToken, accessTokenSecret } = getTwitterCredentials();
  return !!(apiKey && apiKeySecret && accessToken && accessTokenSecret);
}

/**
 * Check if Facebook credentials are configured
 * @returns {boolean} Whether Facebook is configured
 */
function isFacebookConfigured() {
  const { appId, appSecret, accessToken } = getFacebookCredentials();
  return !!(appId && appSecret && accessToken);
}

module.exports = {
  getSettings,
  getTwitterCredentials,
  getFacebookCredentials,
  isTwitterConfigured,
  isFacebookConfigured
};
