// sample.ts
import 'dotenv/config';
import OpenAI from 'openai';
import * as t from 'io-ts';
import { queryAi, type Tool } from '../dist/index.cjs.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || ''
});

const tool: Tool<{ message: string }> = {
  name: 'Echo',
  description: 'Echoes back the input',
  parameters: t.type({
    message: t.string
  })
};

const tools = [tool];

const prompt = "Please echo back the following message: 'Hello, world!'";

queryAi(openai, prompt, tools)
  .then(result => {
    console.log("Tool called:", result.tool.name);
    console.log("Parameters:", result.parameters);
  })
  .catch(err => {
    console.error("Error:", err);
  });
