import { isRight, Either } from 'fp-ts/lib/Either';
import * as t from 'io-ts';
import colors from 'ansi-colors';
import { Tool, ToolCall } from './tools';

export class TypaiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TypaiError';
  }
}

export class UnexpectedResponseError extends TypaiError {
  constructor(public finishReason: string) {
    super(`Unexpected response: finish_reason was "${finishReason}" instead of "tool_calls"`);
    this.name = 'UnexpectedResponseError';
  }
}

export class AINotFollowingInstructionsError extends TypaiError {
  constructor(public aiResponse: string) {
    super("AI did not follow instructions to use a tool");
    this.name = 'AINotFollowingInstructionsError';
  }
}

function formatValue(value: unknown): string {
  return typeof value === 'object'
    ? JSON.stringify(value, null, 2)
    : String(value);
}

function getContextPath(context: t.Context): string {
  return context.map(({ key, type }) => key).join('.');
}

function formatValidationErrors(errors: t.Errors): string {
  return errors.map(error => {
    const path = getContextPath(error.context);
    const expectedType = error.context[error.context.length - 1].type.name;
    const receivedValue = formatValue(error.value);
    return `${path ? `${path}: ` : ''}Expected ${expectedType}, but received: ${receivedValue}`;
  }).join('\n');
}

function createErrorMessage(expected: t.Type<any>, received: unknown, errors: t.Errors): string {
  const expectedType = expected.name;
  const receivedValue = formatValue(received);

  return `
${colors.red('Error: Parameter validation failed')}

${colors.green('Expected type:')}
${colors.green(expectedType)}

${colors.red('Received value:')}
${colors.red(receivedValue)}

${colors.yellow('Validation errors:')}
${formatValidationErrors(errors)}
`;
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
    const errorMessage = createErrorMessage(expectedType, parameters, decodedResult.left);
    console.error(errorMessage);
    throw new UnexpectedResponseError(`Parameter validation failed`);
  }
}