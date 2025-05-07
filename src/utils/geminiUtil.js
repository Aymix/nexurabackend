const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize the Gemini API client
function getGeminiClient() {
  // For testing purposes, we're using the API key directly
  // IMPORTANT: Remove this in production and use environment variables
  const apiKey = "AIzaSyAysPOARBTTav8-r16pHqlyBNJUKVdLjz0";
  
  console.log('Initializing Gemini client with API key');
  return new GoogleGenerativeAI(apiKey);
}

// Generate content using Gemini
async function generateContent(prompt) {
  try {
    console.log('Generating content with prompt length:', prompt.length);
    const genAI = getGeminiClient();
    const model = genAI.getGenerativeModel({ model: "models/gemini-2.0-flash" });
    
    // Set safety settings to make sure content is generated
    const generationConfig = {
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
      maxOutputTokens: 2048,
    };
    
    // Add a timeout to prevent infinite waiting
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Request to Gemini API timed out')), 30000);
    });
    
    // Race the API call against the timeout
    const apiCallPromise = model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig,
    });
    
    const result = await Promise.race([apiCallPromise, timeoutPromise]);
    console.log('Received response from Gemini API');
    
    // Type guard to check if the response has the expected structure
    const isGenerativeResult = (value) => {
      return value !== null && 
             typeof value === 'object' && 
             'response' in value && 
             value.response !== null && 
             typeof value.response === 'object' && 
             'text' in value.response && 
             typeof value.response.text === 'function';
    };
    
    // Handle the Gemini API response safely
    if (isGenerativeResult(result)) {
      const response = await result.response;
      const text = response.text();
      return { success: true, content: text };
    } else {
      throw new Error('Invalid response format from Gemini API');
    }
  } catch (error) {
    console.error('Error generating content with Gemini:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      details: JSON.stringify(error)
    };
  }
}

// Generate content based on platform, topic, tone, and word count
async function generateBlogPost(topic, tone = 'informative', wordCount = 800, platform = 'blog') {
  let prompt;
  
  // Determine the appropriate prompt based on the platform
  switch(platform.toLowerCase()) {
    case 'twitter':
    case 'x':
      // Ensure word count is converted to an appropriate character limit
      const charLimit = Math.min(wordCount, 280);
      prompt = `
        Write a tweet about: ${topic}.
        EXTREMELY IMPORTANT RULES:
        1. Your response must ONLY contain the tweet text - NO explanations, disclaimers, quotes, or extra words
        2. The tweet MUST be EXACTLY ${charLimit - 10} characters or fewer - COUNT THE CHARACTERS CAREFULLY
        3. Do not include hashtags or URLs unless specifically mentioned in the topic
        4. Do not write phrases like "Here's your tweet:" or anything similar
        5. Do not use quotation marks around the content
        6. Return NOTHING but the tweet text
        7. The character count is your highest priority - if your tweet exceeds ${charLimit - 10} characters, cut it down
        8. Tone: ${tone}

        Format the response as a JSON object with the following structure:
        {
          "title": "Tweet",
          "content": "The tweet text"
        }
      `;
      break;
      
    case 'linkedin':
      prompt = `
        Write a professional LinkedIn post about: ${topic}.
        Tone: ${tone}
        Target word count: approximately ${wordCount} words (max 1000)
        
        Guidelines:
        - Make it engaging for business professionals
        - Include 1-2 professional insights or takeaways
        - Be conversational yet professional
        - Add a subtle call-to-action for engagement
        
        Format the response as a JSON object with the following structure:
        {
          "title": "LinkedIn Post",
          "content": "The LinkedIn post content"
        }
      `;
      break;
    
    case 'instagram':
      prompt = `
        Create an Instagram caption about: ${topic}.
        Tone: ${tone}
        Target word count: approximately ${Math.min(wordCount, 500)} words
        
        Guidelines:
        - Make it visually descriptive and engaging
        - Use emotive language that connects with followers
        - Include 2-4 relevant hashtags naturally integrated into the text
        - Add a question or call-to-action to encourage engagement
        
        Format the response as a JSON object with the following structure:
        {
          "title": "Instagram Caption",
          "content": "The Instagram caption"
        }
      `;
      break;
      
    case 'facebook':
      prompt = `
        Write a Facebook post about: ${topic}.
        Tone: ${tone}
        Target word count: approximately ${Math.min(wordCount, 700)} words
        
        Guidelines:
        - Make it engaging for a general audience
        - Be conversational and relatable
        - Include a question or call-to-action to encourage engagement
        - Structure it with short paragraphs for easy reading
        
        Format the response as a JSON object with the following structure:
        {
          "title": "Facebook Post",
          "content": "The Facebook post content"
        }
      `;
      break;
      
    case 'blog':
    default:
      prompt = `
        Write a blog post about: ${topic}.
        Tone: ${tone}
        Target word count: approximately ${wordCount} words
        
        Structure:
        - Engaging title
        - Introduction that hooks the reader
        - 3-4 main sections with subheadings
        - Conclusion with call to action
        
        Format the response as a JSON object with the following structure:
        {
          "title": "The blog post title",
          "content": "The full blog post content with formatting"
        }
      `;
  }
  
  const result = await generateContent(prompt);
  
  if (!result.success) {
    return { 
      success: false, 
      error: result.error || 'Failed to generate content',
      details: result.details 
    };
  }
  
  // At this point, we know result.success is true, so result.content exists
  const content = result.content;
  
  try {
    // Try to parse the response as JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const jsonContent = JSON.parse(jsonMatch[0]);
      return { 
        success: true, 
        title: jsonContent.title, 
        content: jsonContent.content,
        rawResponse: content
      };
    } else {
      // If can't parse as JSON, return the raw content
      return { 
        success: true, 
        title: "Generated Content", 
        content: content,
        rawResponse: content 
      };
    }
  } catch (error) {
    // If JSON parsing fails, return the raw content
    console.error('Error parsing JSON response:', error);
    return { 
      success: true, 
      title: "Generated Content", 
      content: content,
      rawResponse: content 
    };
  }
}

// Generate an engaging tweet about a blog post
async function generateTweet(topic, content, maxLength = 280) {
  // Ensure maxLength is within Twitter's limits
  if (maxLength > 280) maxLength = 280;
  if (maxLength < 30) maxLength = 30;
  
  const prompt = `
   
  `;
  
  const result = await generateContent(prompt);
  
  if (!result.success) {
    return { 
      success: false, 
      error: result.error || 'Failed to generate tweet',
      details: result.details 
    };
  }
  
  // Clean up the response to get just the tweet text
  let tweetText = result.content.trim();
  
  // Remove any quotes that might have been added
  tweetText = tweetText.replace(/^["']|["']$/g, '');
  
  // Ensure the tweet is under the specified length
  if (tweetText.length > maxLength - 10) {
    tweetText = tweetText.substring(0, maxLength - 13) + '...';
  }
  
  return {
    success: true,
    tweet: tweetText
  };
}

module.exports = {
  generateContent,
  generateBlogPost,
  generateTweet
};
