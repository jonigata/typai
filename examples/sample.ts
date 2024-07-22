import 'dotenv/config';
import OpenAI from 'openai';
import { queryFormatted, Tool, annotate } from 'typai';
import { dispatchQueryFormatted, handleToolCall } from 'typai';
import * as t from 'io-ts';

const openai = new OpenAI(
  // Probably unnecessary if using process.env (should work even if removed)
  {
    apiKey: process.env.OPENAI_API_KEY ?? '',
    baseURL: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
  });

const emotionTool: Tool<{ emotion: string }> = {
  name: 'notifyEmotion',
  description: 'Notify the emotion of a given text',
  parameters: t.type({
    emotion: annotate(t.string, {
      description: 'estimated emotion',
      enum: ['happy', 'angry', 'sad']
    })
  })
};

async function estimateEmotion() {
  try {
    const result = await queryFormatted(
      openai,
      process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      "次の発言の感情を推定してください。「ちっとも涼しくならないですぅ💦」",
      emotionTool
    );
    console.log("Tool called:", result.tool.name);
    console.log("Parameters:", result.parameters);
  } catch (error) {
    console.log(error);
  }
}

const useItemTool: Tool<{ item: string }> = {
  name: 'useItem',
  description: 'use an Item',
  parameters: t.type({
    item: t.string,
  })
};

const walkToTool: Tool<{ direction: string }> = {
  name: 'walkTo',
  description: 'walk to direction',
  parameters: t.type({
    direction: annotate(t.string, {
      description: 'estimated emotion',
      enum: ['left', 'right', 'back']
    }),
  })
};

const tools = [useItemTool, walkToTool] as const;

async function decideAction() {
  try {
    const result = await dispatchQueryFormatted(
      openai,
      process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
      "あなたはダンジョンの分かれ道にいます。次の行動を決定してください。",
      ...tools
    );

    handleToolCall(
      result, 
      (params: { item: string }) => {
        console.log("usedItemTool was called with parameters:", params);
      },
      (params: { direction: string }) => {
        console.log("walkTool was called with parameters:", params);
      });
  } catch (error) {
    console.log(error);
  }
}

async function main() {
  await estimateEmotion();
  await decideAction();
}

main();