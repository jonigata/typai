# typai

typai is a TypeScript library that provides a type-safe way to interact with AI models, specifically designed for tool-based interactions. It leverages the power of OpenAI's API and io-ts for runtime type checking.

## Features

- Type-safe interactions with AI models
- Support for both single prompts and chat-style message arrays
- Flexible model selection
- Tool-based interaction support with runtime type checking

## Installation

Install typai using npm:

```bash
npm install typai
```

## Usage

Here's a basic example of how to use typai:

```typescript
import OpenAI from 'openai';
import { queryAi, Tool } from 'typai';
import * as t from 'io-ts';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Define a tool
const echoTool: Tool<{ message: string }> = {
  name: 'Echo',
  description: 'Echoes back the input',
  parameters: t.type({
    message: t.string
  })
};

// Use the tool
async function main() {
  try {
    const result = await queryAi(
      openai,
      "anthropic/claude-3-sonnet:beta",
      "Please echo back: Hello, World!",
      [echoTool]
    );
    console.log("Tool called:", result.tool.name);
    console.log("Parameters:", result.parameters);
  } catch (error) {
    console.error("Error:", error);
  }
}

main();
```

## API

### `queryAi<T>`

```typescript
function queryAi<T>(
  openai: OpenAI,
  model: string,
  prompt: string,
  tools: Tool<T>[]
): Promise<ToolCall<T>>;

function queryAi<T>(
  openai: OpenAI,
  model: string,
  messages: ChatCompletionMessageParam[],
  tools: Tool<T>[]
): Promise<ToolCall<T>>;
```

This function allows you to query an AI model with either a single prompt or an array of chat messages, along with a set of tools. It returns a promise that resolves to a `ToolCall<T>` object.

### Types

- `Tool<T>`: Represents a tool that can be used by the AI.
- `ToolCall<T>`: Represents the result of an AI query, including the tool used and its parameters.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License.

## Support

If you encounter any problems or have any questions, please open an issue on the GitHub repository.

---

Remember to update this README with your specific package details, usage instructions, and any other relevant information as your project evolves.
