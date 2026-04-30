import {tavily as tavily} from "@tavily/core";

const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY, });

export const searchInternet = async ( {query} ) => {
  const results = await tavily.search(query, {
    maxResults: 5,
    searchDepth: "normal"
  });
  return JSON.stringify(results);
};