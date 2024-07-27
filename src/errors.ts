import { isRight, Either } from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import colors from 'ansi-colors';
import { Tool, ToolCall } from './tools';
import { snugJSON } from 'snug-json';

export class TypaiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TypaiError';
  }
}

export class UnexpectedResponseError extends TypaiError {
  constructor(public finishReason: string, paths: string[]) {
    super(`${finishReason}, paths: [${paths.join(', ')}]`);
    this.name = 'UnexpectedResponseError';
  }
}

export class AINotFollowingInstructionsError extends TypaiError {
  constructor(public aiResponse: string) {
    super("AI did not follow instructions to use a tool");
    this.name = 'AINotFollowingInstructionsError';
  }
}

function getContextPath(context: t.Context): string[] { // ["", "foo", "bar"]
  return context.map(({ key }) => key);
}

function getTypeAtPath(type: t.Type<any>, path: string[]): t.Type<any> {
  let currentType: t.Type<any> = type;
  for (const key of path.slice(1)) {
    if (currentType instanceof t.InterfaceType || currentType instanceof t.PartialType) {
      currentType = currentType.props[key];
    } else if (currentType instanceof t.ArrayType && /^\d+$/.test(key)) {
      currentType = currentType.type;
    } else {
      return currentType;  // 現在の型をそのまま返す
    }
    if (!currentType) {
      return type;  // プロパティが見つからない場合は元の型を返す
    }
  }
  return currentType;
}

function getTypeName(type: t.Type<any>): string {
  if (type instanceof t.NumberType) return 'number';
  if (type instanceof t.StringType) return 'string';
  if (type instanceof t.BooleanType) return 'boolean';
  if (type instanceof t.ArrayType) return 'array';
  if (type instanceof t.InterfaceType || type instanceof t.PartialType) return 'object';
  return type.name;  // その他の型の場合は型名をそのまま使用
}

function formatValidationErrors(errors: t.Errors, rootType: t.Type<any>): { message: string, paths: string[] } {
  const message = colors.red('Error: Parameter validation failed\n') + errors.map(error => {
    const pathArray = getContextPath(error.context);
    const expectedType = getTypeAtPath(rootType, pathArray);
    const formattedValue = snugJSON(error.value);
    const expectedTypeName = getTypeName(expectedType);
    // パスの先頭のドットを削除
    const formattedPath = pathArray.join('.') || '.';

    return `
${colors.yellow('# Path:')} ${colors.gray(formattedPath)}

${colors.green('Expected type:')} ${colors.gray(expectedTypeName)}

${colors.red('Received type:')} ${colors.gray(typeof formattedValue)}
${colors.red('Received value:')} ${colors.gray(formattedValue)}
`;
// ${colors.red('Received value:')} ${colors.gray(snugJSON(receivedValue, { maxLength: 60, oneLineLength: 60 }))}

}).join();

  const paths = errors.map(error => getContextPath(error.context).join('.') || '.');
  return { message, paths };
}

export function validateToolCall<T>(
  tool: Tool,
  parameters: unknown,
  expectedType: t.Type<T>,
  decodedResult: Either<t.Errors, T>
): ToolCall<T> {
  if (isRight(decodedResult)) {
    const toolCall: ToolCall<T> = {
      tool: tool,
      parameters: decodedResult.right
    };
    return toolCall;
  } else {
    const {message, paths} = formatValidationErrors(decodedResult.left, expectedType);
    console.error(message);
    throw new UnexpectedResponseError(`Parameter validation failed`, paths);
  }
}
