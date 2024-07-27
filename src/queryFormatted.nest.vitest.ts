import { describe, it, expect, vi } from 'vitest';
import { queryFormatted } from './queryFormatted';
import { Tool } from './tools';
import * as t from 'io-ts';

describe('queryFormatted', () => {
  const testTool: Tool<{ items: Array<{ title: string, link: string }> }> = {
    name: 'chooseNews',
    description: 'Choose news articles',
    parameters: t.type({
      items: t.array(t.type({
        title: t.string,
        link: t.string,
      })),
    }),
  };

  const createMockOpenAI = (toolCalls: any) => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({ choices: [{ message: { tool_calls: toolCalls } }] })
      }
    }
  });

  it('文字列化されたJSON配列を正しくパースすること', async () => {
    const mockOpenAI = createMockOpenAI([
      {
        id: 'call_123',
        type: 'function',
        function: {
          name: 'chooseNews',
          arguments: '{"items":"[{\\"title\\":\\"ニュース1\\",\\"link\\":\\"https://example.com/1\\"},{\\"title\\":\\"ニュース2\\",\\"link\\":\\"https://example.com/2\\"}]"}'
        }
      }
    ]);

    const result = await queryFormatted(
      mockOpenAI as any,
      'test-model',
      'テストプロンプト',
      testTool
    );

    expect(result).toEqual({
      tool: testTool,
      parameters: {
        items: [
          { title: 'ニュース1', link: 'https://example.com/1' },
          { title: 'ニュース2', link: 'https://example.com/2' }
        ]
      },
    });
  });

  it('ネストされたJSON文字列を正しくパースすること', async () => {
    const mockOpenAI = createMockOpenAI([
      {
        id: 'call_456',
        type: 'function',
        function: {
          name: 'chooseNews',
          arguments: '{"items":[{"title":"ニュース3","link":"https://example.com/3"}]}'
        }
      }
    ]);
  
    const result = await queryFormatted(
      mockOpenAI as any,
      'test-model',
      'テストプロンプト',
      testTool
    );
  
    expect(result).toEqual({
      tool: testTool,
      parameters: {
        items: [
          { title: 'ニュース3', link: 'https://example.com/3' }
        ]
      },
    });
  });

  it('二重にエスケープされたJSON文字列を正しくパースすること', async () => {
    const mockOpenAI = createMockOpenAI([
      {
        id: 'call_457',
        type: 'function',
        function: {
          name: 'chooseNews',
          arguments: '{"items":"[{\\"title\\":\\"ニュース4\\",\\"link\\":\\"https://example.com/4\\"}]"}'
        }
      }
    ]);
  
    const result = await queryFormatted(
      mockOpenAI as any,
      'test-model',
      'テストプロンプト',
      testTool
    );
  
    expect(result).toEqual({
      tool: testTool,
      parameters: {
        items: [
          { title: 'ニュース4', link: 'https://example.com/4' }
        ]
      },
    });
  });
  
  it('JSON5形式の入力を正しくパースすること', async () => {
    const mockOpenAI = createMockOpenAI([
      {
        id: 'call_789',
        type: 'function',
        function: {
          name: 'chooseNews',
          arguments: `{
            items: [
              { title: 'ニュース4', link: 'https://example.com/4', },
              { title: 'ニュース5', link: 'https://example.com/5', },
            ]
          }`
        }
      }
    ]);

    const result = await queryFormatted(
      mockOpenAI as any,
      'test-model',
      'テストプロンプト',
      testTool
    );

    expect(result).toEqual({
      tool: testTool,
      parameters: {
        items: [
          { title: 'ニュース4', link: 'https://example.com/4' },
          { title: 'ニュース5', link: 'https://example.com/5' }
        ]
      },
    });
  });
});