import 'dotenv/config';
import OpenAI from 'openai';
import { queryAi, Tool, annotate } from '../src';
import * as t from 'io-ts';


const openai = new OpenAI(
  // Probably unnecessary if using process.env (should work even if removed)
  {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  });

const weatherTool: Tool<{ location: string, date: string }> = {
  name: 'GetWeather',
  description: 'Get the weather forecast for a specific location and date',
  parameters: t.type({
    location: annotate(t.string, {
      description: 'The city and state, e.g. San Francisco, CA',
      examples: ['New York, NY', 'Los Angeles, CA']
    }),
    date: annotate(t.string, {
      description: 'The date for the weather forecast in YYYY-MM-DD format',
      examples: ['2023-05-15', '2024-01-01']
    })
  })
};

async function main() {
  try {
    const result = await queryAi(
      openai,
      "gpt-4",
      "What's the weather like in Tokyo next Monday?",
      [weatherTool]
    );
    console.log("Tool called:", result.tool.name);
    console.log("Parameters:", result.parameters);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();