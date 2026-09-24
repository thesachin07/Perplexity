import { tavily } from "@tavily/core";

const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

export const searchInternet = async (input) => {
  try {
    // Handle both direct query string and object with query property
    const query = typeof input === 'string' ? input : input.query;
    
    if (!query || query.trim().length === 0) {
      console.warn("⚠️  Empty search query provided");
      return "Error: No search query provided";
    }

    console.log(`\n🔎 Starting Tavily search for: "${query}"`);
    console.log(`📍 Tavily API Key configured: ${process.env.TAVILY_API_KEY ? 'Yes' : 'No'}`);

    const results = await tvly.search(query, {
      maxResults: 5,
      searchDepth: "basic", // Fast for real-time queries
      includeAnswer: true,
      includeImages: false,
      topic: "news" // Optimized for current news and events
    });

    console.log("✅ Tavily search completed successfully");
    console.log(`📊 Results object keys: ${Object.keys(results).join(', ')}`);

    // Handle empty or null results
    if (!results) {
      console.warn("⚠️  Tavily returned null/undefined");
      return "No search results available. Please try a different query.";
    }

    // Build formatted response
    let formattedResponse = "";

    // Include direct answer if available
    if (results.answer && results.answer.trim()) {
      console.log("📝 Including direct answer from Tavily");
      formattedResponse += `🔹 DIRECT ANSWER:\n${results.answer}\n\n`;
    }

    // Include search results
    if (results.results && Array.isArray(results.results) && results.results.length > 0) {
      console.log(`📄 Found ${results.results.length} search results`);
      formattedResponse += "🔹 SEARCH RESULTS:\n";
      
      results.results.forEach((result, index) => {
        console.log(`  Result ${index + 1}: ${result.title}`);
        
        formattedResponse += `\n[${index + 1}] ${result.title}\n`;
        
        if (result.content) {
          // Truncate long content to 300 chars
          const content = result.content.substring(0, 300);
          formattedResponse += `    ${content}${result.content.length > 300 ? '...' : ''}\n`;
        }
        
        if (result.url) {
          formattedResponse += `    Source: ${result.url}\n`;
        }
        
        if (result.publishedDate) {
          formattedResponse += `    Published: ${result.publishedDate}\n`;
        }
      });
    } else {
      console.warn("⚠️  No search results array in Tavily response");
    }

    // Log response length
    console.log(`📤 Formatted response length: ${formattedResponse.length} characters`);

    // Return formatted response or fallback
    const finalResponse = formattedResponse.trim() || 
      `Raw Tavily Response: ${JSON.stringify(results, null, 2)}`;

    console.log(`✨ Returning response preview: ${finalResponse.substring(0, 150)}...\n`);
    
    return finalResponse;

  } catch (error) {
    console.error("\n❌ ERROR in searchInternet:");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Error details:", error);
    console.error("\n");

    // Provide detailed error feedback
    if (error.message.includes("401") || error.message.includes("Unauthorized")) {
      return "❌ Authentication Error: Invalid Tavily API key. Please check your TAVILY_API_KEY environment variable.";
    } else if (error.message.includes("429") || error.message.includes("Rate limit")) {
      return "❌ Rate Limit Error: Too many requests to Tavily. Please try again in a moment.";
    } else if (error.message.includes("timeout") || error.message.includes("ECONNREFUSED")) {
      return "❌ Connection Error: Unable to reach Tavily API. Please check your internet connection.";
    } else {
      return `❌ Search Error: ${error.message}. Please try a different query or check your API configuration.`;
    }
  }
};