import * as t from 'io-ts';
import OpenAI from 'openai';
import { generateSchema } from './generateJsonSchema';
import json5 from 'json5';

export type Foo = {

};

export type Tool<T> = {
  name: string;
  description: string;
  parameters: t.Type<T>;
}

export type ToolCall<T> = {
  tool: Tool<T>,
  parameters: T
}

export async function queryAi<T>(openai: OpenAI, prompt: string, tools: Tool<T>[]): Promise<ToolCall<T>> {
  function gen(tool: Tool<T>) {
    return generateSchema(tool.parameters, tool.name, tool.description);
  }
  const schema = tools.map(gen);
  const chatCompletion = await openai.chat.completions.create({
    messages: [{ role: "user", content: prompt + `\nat the end, call one of tool.` }],
    model: "anthropic/claude-3-sonnet:beta",
    tools: schema
  });
  const choice = chatCompletion.choices[0];
  console.warn("queryAi RESULTS", choice);
  if (choice.finish_reason === "tool_calls") {
    const f = choice.message.tool_calls![0].function;
    const atool = tools.find(x => f.name == x.name);
    if (atool != null) {
      const parsedParameters = json5.parse(f.arguments);
      const toolCall: ToolCall<T> = {
        tool: atool,
        parameters: parsedParameters,
      };
      console.warn("succeeded, ", toolCall);
      return toolCall;
    }
  }
  console.error("================ Unexpected response: not tool_calls.")
  throw new Error("not tool_calls")
}

/*
// NewsChoice の定義
const NewsChoice = t.type({
  title: t.string,
});

// queryAi の呼び出し
const r = queryAi(
  "子供向けのニュースを選んでください", 
  [
    { 
      name: "chooseNews", 
      description: "選択した子供向けのニュースを通知", 
      parameters: NewsChoice
    }
  ]
);

// 結果の使用例
r.then((result) => {
  const newsChoice = NewsChoice.decode(result.parameters);
  if (newsChoice._tag === 'Right') {
    console.log("Selected news title:", newsChoice.right.title);
  } else {
    console.error("Failed to decode news choice:", newsChoice.left);
  }
});
*/
