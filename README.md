# typai

typai is a TypeScript library that provides a type-safe way to interact with AI models, specifically designed for tool-based interactions. It leverages the power of OpenAI's API and io-ts for runtime type checking.

## Features

- Type-safe interactions with AI models
- Support for both single prompts and chat-style message arrays
- Flexible model selection
- Tool-based interaction support with runtime type checking
- Support for multiple tools with `dispatchQueryFormatted`

## Installation

Install typai using npm:

```bash
npm install typai
```

## Usage

Here are examples of how to use typai:

### Basic Usage with Single Tool

```typescript
import 'dotenv/config';
import OpenAI from 'openai';
import { queryFormatted, Tool, annotate } from 'typai';
import * as t from 'io-ts';

const openai = new OpenAI({
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
      process.env.OPENAI_MODEL ?? 'gpt-4-0613',
      "Please estimate the emotion in the following statement: 'It's not getting cooler at all! 💦'",
      emotionTool
    );
    console.log("Tool called:", result.tool.name);
    console.log("Parameters:", result.parameters);
  } catch (error) {
    console.log(error);
  }
}

estimateEmotion();
```

### Advanced Usage with Multiple Tools

```typescript
import { dispatchQueryFormatted, handleToolCall, Tool, annotate } from 'typai';
import * as t from 'io-ts';

const useItemTool: Tool<{ item: string }> = {
  name: 'useItem',
  description: 'use an Item',
  parameters: t.type({
    item: t.string,
  })
};

const walkTool: Tool<{ direction: string }> = {
  name: 'walkTo',
  description: 'walk to direction',
  parameters: t.type({
    direction: annotate(t.string, {
      description: 'direction to walk',
      enum: ['left', 'right', 'back']
    }),
  })
};

async function decideAction() {
  try {
    const result = await dispatchQueryFormatted(
      openai,
      process.env.OPENAI_MODEL ?? 'gpt-4-0613',
      "You are at a crossroads in a dungeon. Decide on your next action.",
      useItemTool,
      walkTool
    );
    handleToolCall(
      result,
      (params) => {
        console.log("useItem was called with item:", params.item);
      },
      (params) => {
        console.log("walkTo was called with direction:", params.direction);
      }
    );
  } catch (error) {
    console.log(error);
  }
}

decideAction();
```

## API

### `queryFormatted<T>`

```typescript
function queryFormatted<T>(
  openai: OpenAI,
  model: string,
  prompt: string,
  tool: Tool<T>
): Promise<ToolCall<T>>;
```

This function allows you to query an AI model with a single prompt and a tool. It returns a promise that resolves to a `ToolCall<T>` object.

### `dispatchQueryFormatted`

```typescript
function dispatchQueryFormatted<T1>(
  openai: OpenAI,
  model: string,
  promptOrMessages: string | OpenAI.ChatCompletionMessageParam[],
  tool1: Tool<T1>
): Promise<ToolCallWithIndex<T1, 0>>;

function dispatchQueryFormatted<T1, T2>(
  openai: OpenAI,
  model: string,
  promptOrMessages: string | OpenAI.ChatCompletionMessageParam[],
  tool1: Tool<T1>,
  tool2: Tool<T2>
): Promise<ToolCallWithIndex<T1, 0> | ToolCallWithIndex<T2, 1>>;

function dispatchQueryFormatted<T1, T2, T3>(
  openai: OpenAI,
  model: string,
  promptOrMessages: string | OpenAI.ChatCompletionMessageParam[],
  tool1: Tool<T1>,
  tool2: Tool<T2>,
  tool3: Tool<T3>
): Promise<ToolCallWithIndex<T1, 0> | ToolCallWithIndex<T2, 1> | ToolCallWithIndex<T3, 2>>;
```

This function allows you to query an AI model with either a single prompt or an array of chat messages, along with multiple tools. It returns a promise that resolves to a `ToolCallWithIndex` object for one of the provided tools.

### `handleToolCall`

```typescript
function handleToolCall<T>(
  result: ToolCallWithIndex<T, 0>,
  handler1: (params: T) => void
): void;

function handleToolCall<T1, T2>(
  result: ToolCallWithIndex<T1, 0> | ToolCallWithIndex<T2, 1>,
  handler1: (params: T1) => void,
  handler2: (params: T2) => void
): void;

function handleToolCall<T1, T2, T3>(
  result: ToolCallWithIndex<T1, 0> | ToolCallWithIndex<T2, 1> | ToolCallWithIndex<T3, 2>,
  handler1: (params: T1) => void,
  handler2: (params: T2) => void,
  handler3: (params: T3) => void
): void;
```

This function handles the result of `dispatchQueryFormatted`, allowing you to define handlers for each tool. The handlers are provided in the same order as the tools in the `dispatchQueryFormatted` call.

## Error Handling

typai uses custom error classes to provide more informative error messages. Here's an example of how to handle these errors:

```typescript
import { TypaiError, UnexpectedResponseError, AINotFollowingInstructionsError } from 'typai';

try {
  const result = await dispatchQueryFormatted(openai, model, prompt, tool1, tool2);
  // ... handle the result ...
} catch (error) {
  if (error instanceof AINotFollowingInstructionsError) {
    console.error("AI didn't use any of the provided tools.");
    console.error("AI response:", error.aiResponse);
  } else if (error instanceof UnexpectedResponseError) {
    console.error(`Unexpected response type: ${error.message}`);
    console.error(`Finish reason: ${error.finishReason}`);
  } else if (error instanceof TypaiError) {
    console.error(`A typai-specific error occurred: ${error.message}`);
  } else {
    console.error(`An unexpected error occurred: ${error}`);
  }
}
```

This approach allows for more granular error handling and provides users with more context about what went wrong, including cases where the AI doesn't follow instructions to use the provided tools.

### Types

- `Tool<T>`: Represents a tool that can be used by the AI.
- `ToolCall<T>`: Represents the result of an AI query, including the tool used and its parameters.
- `ToolCallWithIndex<T, I>`: Represents the result of `dispatchQueryFormatted`, including the tool used, its parameters, and the index of the tool.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Support

If you encounter any problems or have any questions, please open an issue on the GitHub repository.