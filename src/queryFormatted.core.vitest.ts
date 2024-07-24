import { describe, it, expect } from 'vitest';
import { queryFormatted, Tool } from './queryFormatted';
import * as t from 'io-ts';
import { UnexpectedResponseError, AINotFollowingInstructionsError } from './errors';
import OpenAI from 'openai';

describe('queryFormatted with simple mock', () => {
  const testTool: Tool<{ emotion: string }> = {
    name: 'testTool',
    description: 'A test tool',
    parameters: t.type({
      emotion: t.string,
    }),
  };

  // 簡略化されたモック作成関数
  const createMockOpenAI = (toolCalls: any) => ({
    chat: {
      completions: {
        create: async () => ({ choices: [{ message: { tool_calls: toolCalls } }] })
      }
    }
  });

  // 成功ケース用のモック
  const successMockOpenAI = createMockOpenAI([
    { function: { name: 'testTool', arguments: '{"emotion":"happy"}' } }
  ]);

  // tool_calls欠落用のモック
  const missingToolCallsMockOpenAI = createMockOpenAI(undefined);

  // 誤ったツール呼び出し用のモック
  const wrongToolMockOpenAI = createMockOpenAI([
    { function: { name: 'wrongTool', arguments: '{}' } }
  ]);

  // パラメータ検証失敗用のモック
  const invalidParamMockOpenAI = createMockOpenAI([
    { function: { name: 'testTool', arguments: '{"invalidParam":"value"}' } }
  ]);

  // OpenAIエラー用のモック
  const errorMockOpenAI = {
    chat: {
      completions: {
        create: async () => ({ error: { message: 'OpenAI error' } })
      }
    }
  };
  
  it('should successfully call the tool and return the result', async () => {
    const result = await queryFormatted(
      successMockOpenAI as any,
      'test-model',
      'Test prompt',
      testTool
    );

    expect(result).toEqual({
      tool: testTool,
      parameters: { emotion: 'happy' },
    });
  });

  it('should throw UnexpectedResponseError when OpenAI returns an error', async () => {
    await expect(queryFormatted(
      errorMockOpenAI as any,
      'test-model',
      'Test prompt',
      testTool
    )).rejects.toThrow(UnexpectedResponseError);
  });

  it('should throw AINotFollowingInstructionsError when tool_calls is missing', async () => {
    await expect(queryFormatted(
      missingToolCallsMockOpenAI as any,
      'test-model',
      'Test prompt',
      testTool
    )).rejects.toThrow(AINotFollowingInstructionsError);
  });

  it('should throw AINotFollowingInstructionsError when wrong tool is called', async () => {
    await expect(queryFormatted(
      wrongToolMockOpenAI as any,
      'test-model',
      'Test prompt',
      testTool
    )).rejects.toThrow(AINotFollowingInstructionsError);
  });

  it('should throw UnexpectedResponseError when parameter validation fails', async () => {
    await expect(queryFormatted(
      invalidParamMockOpenAI as any,
      'test-model',
      'Test prompt',
      testTool
    )).rejects.toThrow(UnexpectedResponseError);
  });

  it('should handle messages array input', async () => {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'user', content: 'Message 1' },
      { role: 'assistant', content: 'Message 2' },
    ];

    const result = await queryFormatted(
      successMockOpenAI as any,
      'test-model',
      messages,
      testTool
    );

    expect(result).toEqual({
      tool: testTool,
      parameters: { emotion: 'happy' },
    });
  });
});