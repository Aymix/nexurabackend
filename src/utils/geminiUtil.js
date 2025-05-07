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

// Generate a blog post with a specific structure
async function generateBlogPost(topic, tone = 'informative', wordCount = 800) {
  const prompt = `
    Write a blog post about "${topic}".
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

module.exports = {
  generateContent,
  generateBlogPost
};
