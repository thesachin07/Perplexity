import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import {ChatMistralAI} from "@langchain/mistralai"
import { HumanMessage } from "langchain"


const geminiModel = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-flash-lite",
  apiKey: process.env.GEMINI_API_KEY
});

const mistralModel = new ChatMistralAI({
    model: "mistral-small-latest",
   apiKey: process.env.Mistral_API_KEY
})

export async function generateResponse(message){
    const response = await geminiModel.invoke([
        new HumanMessage(message)
    ])

export async function generateMistralResponse(message){
    const response = await mistralModel.invoke([
        new SystemMessage(`You are a helpful assistant that provides concise and accurate answers to user queries. Always provide clear and informative responses, and avoid unnecessary details.`),
    ])
}

    return response.text;
}