import OpenAI from 'openai';
import { generateSchema, wrapArraySchema, unwrapArrayData } from './generateJsonSchema';
import json5 from 'json5';
import { UnexpectedResponseError, AINotFollowingInstructionsError } from './errors';
import { Tool, ToolCall } from './tools';
import { validateToolCall } from './errors';

type ChatCompletionMessageParam = OpenAI.ChatCompletionMessageParam;

// オーバーロードシグネチャ
export function queryFormatted<T>(
  openai: OpenAI, 
  model: string,
  prompt: string, 
  tool: Tool<T>
): Promise<ToolCall<T>>;
export function queryFormatted<T>(
  openai: OpenAI, 
  model: string,
  messages: ChatCompletionMessageParam[], 
  tool: Tool<T>
): Promise<ToolCall<T>>;

// 実装
export async function queryFormatted<T>(
  openai: OpenAI,
  model: string,
  promptOrMessages: string | ChatCompletionMessageParam[],
  tool: Tool<T>
): Promise<ToolCall<T>> {
  const messages: ChatCompletionMessageParam[] = typeof promptOrMessages === 'string'
    ? [{ role: "user", content: promptOrMessages }]
    : promptOrMessages;

  const schema = wrapArraySchema(
    generateSchema(
      tool.parameters, 
      tool.name, 
      tool.description), 
    tool.parameters);
  
  const chatCompletion = await openai.chat.completions.create({
    messages: [...messages, { role: "system", content: "At the end, call the provided tool." }],
    model: model,
    tools: [schema],
    tool_choice: "required"
  });

  const e = chatCompletion as any;
  if (e.error !== undefined) {
    throw new UnexpectedResponseError(e.error.message);
  }

  const choice = chatCompletion.choices[0];
  // console.warn("queryAi RESULTS", choice);
  if (!choice.message.tool_calls) {
    throw new AINotFollowingInstructionsError("tool_calls is not found");
  }
  // console.warn("tool_calls", choice.message.tool_calls);

  const f = choice.message.tool_calls![0].function;
  if (tool.name !== f.name) {
    throw new AINotFollowingInstructionsError(`tool name was not ${tool.name}, but '${f.name}'`);
  }

  const parsedParameters = json5.parse(f.arguments);
  // console.warn(parsedParameters);
  const decodedResult = tool.parameters.decode(
    unwrapArrayData(parsedParameters, tool.parameters));
  return validateToolCall(tool, parsedParameters, tool.parameters, decodedResult);
}
