import { describe, it, expect } from 'vitest';
import { queryFormatted, Tool } from './queryFormatted';
import * as t from 'io-ts';
import { UnexpectedResponseError, AINotFollowingInstructionsError } from './errors';
import OpenAI from 'openai';

describe('queryFormatted with array root tool', () => {
  // ツールの定義をarrayのrootを持つものに変更
  const arrayRootTool: Tool<string[]> = {
    name: 'arrayRootTool',
    description: 'A tool that expects an array of strings',
    parameters: t.array(t.string),
  };

  // 簡略化されたモック作成関数
  const createMockOpenAI = (toolCalls: any) => ({
    chat: {
      completions: {
        create: async () => ({ 
          choices: [{ message: { tool_calls: toolCalls } }]
        })
      }
    }
  });

  // 成功ケース用のモック（正しい配列を返す）
  const successMockOpenAI = createMockOpenAI([
    { function: { name: 'arrayRootTool', arguments: '["item1", "item2", "item3"]' } }
  ]);

  // 失敗ケース用のモック（オブジェクトを返す）
  const failureMockOpenAI = createMockOpenAI([
    { function: { name: 'arrayRootTool', arguments: '{"key": "value"}' } }
  ]);

  // 空配列を返すケース用のモック
  const emptyArrayMockOpenAI = createMockOpenAI([
    { function: { name: 'arrayRootTool', arguments: '[]' } }
  ]);

  it('should successfully call the tool and return the result with array input', async () => {
    const result = await queryFormatted(
      successMockOpenAI as any,
      'test-model',
      'Test prompt for array root tool',
      arrayRootTool
    );

    expect(result).toEqual({
      tool: arrayRootTool,
      parameters: ['item1', 'item2', 'item3'],
    });
  });

  it('should throw UnexpectedResponseError when non-array is returned', async () => {
    await expect(queryFormatted(
      failureMockOpenAI as any,
      'test-model',
      'Test prompt for array root tool',
      arrayRootTool
    )).rejects.toThrow(UnexpectedResponseError);
  });

  it('should successfully handle empty array input', async () => {
    const result = await queryFormatted(
      emptyArrayMockOpenAI as any,
      'test-model',
      'Test prompt for array root tool',
      arrayRootTool
    );

    expect(result).toEqual({
      tool: arrayRootTool,
      parameters: [],
    });
  });

  it('should handle messages array input with array root tool', async () => {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'user', content: 'Message 1' },
      { role: 'assistant', content: 'Message 2' },
    ];

    const result = await queryFormatted(
      successMockOpenAI as any,
      'test-model',
      messages,
      arrayRootTool
    );

    expect(result).toEqual({
      tool: arrayRootTool,
      parameters: ['item1', 'item2', 'item3'],
    });
  });

  // エラーケースのテスト（tool_calls欠落、誤ったツール名など）も必要に応じて追加
});
