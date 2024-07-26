import * as t from 'io-ts';

export type Tool<T=any> = {
  name: string;
  description: string;
  parameters: t.Type<T>;
}

export type ToolCall<T> = {
  tool: Tool<T>,
  parameters: T
}

