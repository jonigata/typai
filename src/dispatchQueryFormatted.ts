import OpenAI from 'openai';
import { generateSchema } from './generateJsonSchema';
import { isRight } from 'fp-ts/lib/Either';
import json5 from 'json5';
import { Tool, ToolCall } from './queryFormatted';  // 既存の型をインポート
import { UnexpectedResponseError, AINotFollowingInstructionsError } from './errors';

type ToolCallWithIndex<T, I extends number> = ToolCall<T> & { toolIndex: I };

// dispatchQueryFormatted のオーバーロード
export function dispatchQueryFormatted<T>(
  openai: OpenAI,
  model: string,
  promptOrMessages: string | OpenAI.ChatCompletionMessageParam[],
  tool1: Tool<T>
): Promise<ToolCallWithIndex<T, 0>>;

export function dispatchQueryFormatted<T1, T2>(
  openai: OpenAI,
  model: string,
  promptOrMessages: string | OpenAI.ChatCompletionMessageParam[],
  tool1: Tool<T1>,
  tool2: Tool<T2>
): Promise<ToolCallWithIndex<T1, 0> | ToolCallWithIndex<T2, 1>>;

export function dispatchQueryFormatted<T1, T2, T3>(
  openai: OpenAI,
  model: string,
  promptOrMessages: string | OpenAI.ChatCompletionMessageParam[],
  tool1: Tool<T1>,
  tool2: Tool<T2>,
  tool3: Tool<T3>
): Promise<ToolCallWithIndex<T1, 0> | ToolCallWithIndex<T2, 1> | ToolCallWithIndex<T3, 2>>;

// 実装
export async function dispatchQueryFormatted(
  openai: OpenAI,
  model: string,
  promptOrMessages: string | OpenAI.ChatCompletionMessageParam[],
  ...tools: Tool<any>[]
): Promise<ToolCallWithIndex<any, number>> {
  const messages = typeof promptOrMessages === 'string'
    ? [{ role: "user" as const, content: promptOrMessages }]
    : promptOrMessages;

  const chatCompletion = await openai.chat.completions.create({
    messages: [...messages, { role: "system", content: "Choose and call one of the provided tools." }],
    model: model,
    tools: tools.map(tool => generateSchema(tool.parameters, tool.name, tool.description)),
    tool_choice: "required"
  });

  const e = chatCompletion as any;
  if (e.error !== undefined) {
    throw new UnexpectedResponseError(e.error.message);
  }

  const choice = chatCompletion.choices[0];
  if (!choice.message.tool_calls) {
    throw new AINotFollowingInstructionsError("tool_calls is not found");
  }

  const toolCall = choice.message.tool_calls[0];
  const selectedToolIndex = tools.findIndex(tool => tool.name === toolCall.function.name);
  if (selectedToolIndex === -1) {
    throw new AINotFollowingInstructionsError(`Tool call does not match any of the provided tools, but '${toolCall.function.name}'`);
  }

  const selectedTool = tools[selectedToolIndex];
  
  const parsedParameters = json5.parse(toolCall.function.arguments);
  const decodedResult = selectedTool.parameters.decode(parsedParameters);
  
  if (isRight(decodedResult)) {
    return {
      tool: selectedTool,
      parameters: decodedResult.right,
      toolIndex: selectedToolIndex
    };
  } else {
    throw new AINotFollowingInstructionsError("Parameter validation failed");
  }
}

// handleToolCall のオーバーロード
export function handleToolCall<T>(
  result: ToolCallWithIndex<T, 0>,
  handler1: (params: T) => void
): void;

export function handleToolCall<T1, T2>(
  result: ToolCallWithIndex<T1, 0> | ToolCallWithIndex<T2, 1>,
  handler1: (params: T1) => void,
  handler2: (params: T2) => void
): void;

export function handleToolCall<T1, T2, T3>(
  result: ToolCallWithIndex<T1, 0> | ToolCallWithIndex<T2, 1> | ToolCallWithIndex<T3, 2>,
  handler1: (params: T1) => void,
  handler2: (params: T2) => void,
  handler3: (params: T3) => void
): void;

// handleToolCall の実装
export function handleToolCall(
  result: ToolCallWithIndex<any, number>,
  ...handlers: ((params: any) => void)[]
): void {
  const handler = handlers[result.toolIndex];
  if (handler) {
    handler(result.parameters);
  } else {
    throw new Error(`Unhandled tool call: '${result.tool.name}'`);
  }
}