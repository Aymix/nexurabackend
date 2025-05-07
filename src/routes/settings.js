const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Define the path to the JSON file where settings will be stored
const SETTINGS_FILE_PATH = path.join(process.cwd(), 'settings.json');

// Ensure settings file exists
const ensureSettingsFile = () => {
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
  
  try {
    const settingsJson = fs.readFileSync(SETTINGS_FILE_PATH, 'utf-8');
    return JSON.parse(settingsJson);
  } catch (error) {
    console.error('Error reading settings file:', error);
    // If there's an error reading the file, create a new one
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
};

// Helper function to mask sensitive data
function maskString(str) {
  if (!str) return '';
  if (str.length <= 8) {
    return '*'.repeat(str.length);
  }
  return str.substring(0, 4) + '*'.repeat(str.length - 8) + str.substring(str.length - 4);
}

/**
 * @route GET /settings
 * @desc Get API settings with masked sensitive data
 * @access Public
 */
router.get('/', (req, res) => {
  try {
    const settings = ensureSettingsFile();
    
    // Return masked values for security
    const maskedSettings = {
      twitter: {
        apiKey: maskString(settings.twitter.apiKey),
        apiKeySecret: maskString(settings.twitter.apiKeySecret),
        accessToken: maskString(settings.twitter.accessToken),
        accessTokenSecret: maskString(settings.twitter.accessTokenSecret)
      },
      facebook: {
        appId: maskString(settings.facebook.appId),
        appSecret: maskString(settings.facebook.appSecret),
        accessToken: maskString(settings.facebook.accessToken)
      }
    };
    
    return res.json(maskedSettings);
  } catch (error) {
    console.error('Error getting settings:', error);
    return res.status(500).json({ error: 'Failed to retrieve settings' });
  }
});

/**
 * @route POST /settings
 * @desc Update API settings for a specific platform
 * @access Public
 */
router.post('/', (req, res) => {
  try {
    const { platform, keys } = req.body;
    
    if (!platform || !keys) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (platform !== 'twitter' && platform !== 'facebook') {
      return res.status(400).json({ error: 'Invalid platform' });
    }
    
    // Get current settings
    const settings = ensureSettingsFile();
    
    // Update settings for the specified platform
    settings[platform] = {
      ...settings[platform],
      ...keys
    };
    
    // Save updated settings
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2));
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error updating settings:', error);
    return res.status(500).json({ error: 'Failed to update settings' });
  }
});

module.exports = router;
