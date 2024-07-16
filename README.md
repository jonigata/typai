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

// Initialize OpenAI client, and by changing the baseUrl, openrouter can also be used
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

## Advanced Usage

### Using `annotate` for Enhanced Schema Information

The `annotate` function allows you to add extra metadata to your io-ts type definitions. This is particularly useful when you want to provide more detailed schema information to the AI model.

Here's an example of how to use `annotate`:

```typescript
import OpenAI from 'openai';
import { queryAi, Tool, annotate } from 'typai';
import * as t from 'io-ts';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
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
```

In this example, we use `annotate` to add descriptions and examples to the `location` and `date` parameters of the `GetWeather` tool. This additional information helps the AI model understand how to use the tool more effectively.

The `annotate` function allows you to add various metadata to your type definitions, such as:

- `description`: A detailed explanation of the parameter
- `examples`: Sample values for the parameter
- `default`: A default value for the parameter
- `minimum` and `maximum`: For numeric types, specifying the allowed range
- `enum`: For string types, specifying a list of allowed values

By using `annotate`, you can create more robust and informative tool definitions, which can lead to better AI model performance and more accurate results.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the ISC License - see the LICENSE file for details.

## Support

If you encounter any problems or have any questions, please open an issue on the GitHub repository.

---

Remember to update this README with your specific package details, usage instructions, and any other relevant information as your project evolves.
