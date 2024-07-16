import * as t from 'io-ts';
import OpenAI from 'openai';
import { generateSchema } from './generateJsonSchema';
import json5 from 'json5';
import { isRight } from 'fp-ts/lib/Either';

type ChatCompletionMessageParam = OpenAI.ChatCompletionMessageParam;

export type Tool<T> = {
  name: string;
  description: string;
  parameters: t.Type<T>;
}

export type ToolCall<T> = {
  tool: Tool<T>,
  parameters: T
}

// オーバーロードシグネチャ
export function queryAi<T>(
  openai: OpenAI, 
  model: string,
  prompt: string, 
  tools: Tool<T>[]
): Promise<ToolCall<T>>;
export function queryAi<T>(
  openai: OpenAI, 
  model: string,
  messages: ChatCompletionMessageParam[], 
  tools: Tool<T>[]
): Promise<ToolCall<T>>;

// 実装
export async function queryAi<T>(
  openai: OpenAI,
  model: string,
  promptOrMessages: string | ChatCompletionMessageParam[],
  tools: Tool<T>[]
): Promise<ToolCall<T>> {
  const messages: ChatCompletionMessageParam[] = typeof promptOrMessages === 'string'
    ? [{ role: "user", content: promptOrMessages }]
    : promptOrMessages;

  function gen(tool: Tool<T>) {
    return generateSchema(tool.parameters, tool.name, tool.description);
  }
  const schema = tools.map(gen);
  const chatCompletion = await openai.chat.completions.create({
    messages: [...messages, { role: "system", content: "At the end, call one of the provided tools." }],
    model: model,
    tools: schema
  });

  const choice = chatCompletion.choices[0];
  // console.warn("queryAi RESULTS", choice);
  if (choice.finish_reason === "tool_calls") {
    const f = choice.message.tool_calls![0].function;
    const atool = tools.find(x => f.name == x.name);
    if (atool != null) {
      const parsedParameters = json5.parse(f.arguments);
      console.warn(parsedParameters);
      const decodedResult = atool.parameters.decode(parsedParameters);
      
      if (isRight(decodedResult)) {
        const toolCall: ToolCall<T> = {
          tool: atool,
          parameters: decodedResult.right
        };
        // console.warn("succeeded, ", toolCall);
        return toolCall;
      } else {
        // console.error("Parameter validation failed:", decodedResult.left);
        throw new Error("Parameter validation failed");
      }
    }
  }
  // console.error("================ Unexpected response: not tool_calls.")
  throw new Error("not tool_calls")
}
