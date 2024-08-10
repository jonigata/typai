import OpenAI from 'openai';
import { generateSchema, unwrapArrayData, wrapArrayType } from './generateJsonSchema';
import { typeAwareJsonParse, Json5ParseError } from './typeAwareJsonParse';
import { UnexpectedResponseError, AINotFollowingInstructionsError } from './errors';
import { Tool, ToolCall } from './tools';
import { validateToolCall } from './errors';
import { snugJSON, TruncateOptions } from 'snug-json';
import colors from 'ansi-colors';

type ChatCompletionMessageParam = OpenAI.ChatCompletionMessageParam;

interface Options {
  verbose?: TruncateOptions;
  verboseOnError?: TruncateOptions;
}

const useSampleMessage = false;
// const useSampleMessage = true;

// オーバーロードシグネチャ
export function queryFormatted<T>(
  openai: OpenAI, 
  model: string,
  prompt: string, 
  tool: Tool<T>,
  options?: Options
): Promise<ToolCall<T>>;
export function queryFormatted<T>(
  openai: OpenAI, 
  model: string,
  messages: ChatCompletionMessageParam[], 
  tool: Tool<T>,
  options?: Options
): Promise<ToolCall<T>>;

// 実装
export async function queryFormatted<T>(
  openai: OpenAI,
  model: string,
  promptOrMessages: string | ChatCompletionMessageParam[],
  tool: Tool<T>,
  options?: Options
): Promise<ToolCall<T>> {
  options ??= {}
  if (options.verboseOnError === undefined) options.verboseOnError = { maxLength: Infinity };

  let messages: ChatCompletionMessageParam[] = typeof promptOrMessages === 'string'
    ? [{ role: "user", content: promptOrMessages }]
    : promptOrMessages;

  const originalParameters = tool.parameters;
  const wrapToolParameters = wrapArrayType(originalParameters);

  let schema;
  let tool_calls;
  if (!useSampleMessage) {
    schema = generateSchema(
      wrapToolParameters,
      tool.name, 
      tool.description);

    messages = [...messages, { role: "system", content: "At the end, call the provided tool." }];
    if (options.verbose) {
      console.info(`${colors.yellow('schema')}\n${snugJSON(schema, options.verbose)}`);
      console.info(`${colors.yellow('prompt')}\n${snugJSON(messages, options.verbose)}`);
    }
    console.info(`${colors.yellow('schema')}\n${snugJSON(schema, {indent:2})}`);

    const chatCompletion = await openai.chat.completions.create({
      messages,
      model: model,
      tools: [schema],
      tool_choice: "required"
    });

    const e = chatCompletion as any;
    if (e.error !== undefined) {
      throw new UnexpectedResponseError(e.error.message, []);
    }

    const choice = chatCompletion.choices[0];
    tool_calls = choice.message.tool_calls;

    if (!tool_calls) {
      throw new AINotFollowingInstructionsError("tool_calls is not found");
    }
    // console.warn("tool_calls", JSON.stringify(tool_calls[0].function.arguments));
  } else {
    tool_calls = [
      {
        id: 'toolu_01XLiCa7CS8XnQy2iFcbRZSP',
        type: 'function',
        function: {
          name: 'chooseNews',
          arguments: '{"items":"[\\n  {\\n    \\"title\\": \\"写真ニュース(1/1): 「野球が好きで、野球が楽しい」５年目で初の故障離脱を経験したエース左腕…オリックスの後半戦キーマン\\",\\n    \\"link\\": \\"https://news.biglobe.ne.jp/sports/0726/5250787616/sph_sph_20240726115511_1_jpg.html\\"\\n  },\\n  {\\n    \\"title\\": \\"「ちょっと難しいけど楽しい」児童が司書の仕事を体験 | tysニュース | ｔｙｓテレビ山口 (1ページ)\\",\\n    \\"link\\": \\"https://newsdig.tbs.co.jp/articles/tys/1318798?display=1\\"\\n  },\\n  {\\n    \\"title\\": \\"ニュース・気象/マイ!Biz 日常の\\"楽しい\\"を共有しよう\\",\\n    \\"link\\": \\"https://www.nhk.jp/p/my-asa/rs/J8792PY43V/episode/re/N8571Y1VYK/\\"\\n  }\\n]"}'
        }
      }
    ];
  }

  const f = tool_calls[0].function;
  if (tool.name !== f.name) {
    throw new AINotFollowingInstructionsError(`tool name was not ${tool.name}, but '${f.name}'`);
  }

  let parsedParameterData;
  try {
    parsedParameterData = typeAwareJsonParse(f.arguments, wrapToolParameters);
  }
  catch (ee) {
    const e = ee as Json5ParseError;
    console.error(`
${colors.red(`JSON parse error at .${e.path.join('.')}, This is an AI issue, not user-related.`)}

${colors.yellow('Target text')}
${colors.gray(e.value)}
`);
    if (options.verboseOnError) {
      console.info(`${colors.yellow('schema')}\n${snugJSON(schema, options.verboseOnError)}`);
      console.info(`${colors.yellow('prompt')}\n${snugJSON(messages, options.verboseOnError)}`);
    }

    throw e;      
  }  
  const unwrapParameterData = unwrapArrayData(parsedParameterData, originalParameters);
  // console.warn(parsedParameters);
  const decodedResult = originalParameters.decode(unwrapParameterData);
    
  return validateToolCall(tool, unwrapParameterData, originalParameters, decodedResult);
}
