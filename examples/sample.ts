import 'dotenv/config';
import OpenAI from 'openai';
import * as t from 'io-ts';
import { queryAi, Tool } from '../src';

const openai = new OpenAI(
  // Probably unnecessary if using process.env (should work even if removed)
  {
    apiKey: process.env.OPENAI_API_KEY || '',
    baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  });

const tool: Tool<{ message: string }> = {
  name: 'Echo',
  description: 'Echoes back the input',
  parameters: t.type({
    message: t.string
  })
};

const tools = [tool];

const prompt = "Please echo back the following message: 'Hello, Human!'";

async function main() {
  const result = await queryAi(openai, "anthropic/claude-3-haiku:beta", prompt, tools);
  console.log("Tool called:", result.tool.name);
  console.log("Parameters:", result.parameters);
}

main();

