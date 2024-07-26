import { describe, it, expect, vi } from 'vitest';
import { dispatchQueryFormatted, handleToolCall } from './dispatchQueryFormatted';
import { Tool } from './tools';
import * as t from 'io-ts';
import { AINotFollowingInstructionsError } from './errors';

describe('dispatchQueryFormatted and handleToolCall', () => {
  // ツールの定義
  const tool1: Tool<{ action: string }> = {
    name: 'tool1',
    description: 'Tool 1 description',
    parameters: t.type({ action: t.string }),
  };

  const tool2: Tool<{ value: number }> = {
    name: 'tool2',
    description: 'Tool 2 description',
    parameters: t.type({ value: t.number }),
  };

  const arrayRootTool: Tool<string[]> = {
    name: 'arrayRootTool',
    description: 'Array root tool description',
    parameters: t.array(t.string),
  };

  // モックOpenAIクライアントの作成関数
  const createMockOpenAI = (toolCalls: any) => ({
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{ message: { tool_calls: toolCalls } }]
        })
      }
    }
  });

  describe('dispatchQueryFormatted', () => {
    it('should dispatch to the correct tool', async () => {
      const mockOpenAI = createMockOpenAI([
        { function: { name: 'tool1', arguments: '{"action":"test"}' } }
      ]);

      const result = await dispatchQueryFormatted(
        mockOpenAI as any,
        'test-model',
        'Test prompt',
        tool1,
        tool2
      );

      expect(result).toEqual({
        tool: tool1,
        parameters: { action: 'test' },
        toolIndex: 0
      });
    });

    it('should handle array root tool', async () => {
      const mockOpenAI = createMockOpenAI([
        { function: { name: 'arrayRootTool', arguments: '["item1", "item2"]' } }
      ]);

      const result = await dispatchQueryFormatted(
        mockOpenAI as any,
        'test-model',
        'Test prompt',
        tool1,
        arrayRootTool
      );

      expect(result).toEqual({
        tool: arrayRootTool,
        parameters: ['item1', 'item2'],
        toolIndex: 1
      });
    });

    it('should throw AINotFollowingInstructionsError for invalid tool name', async () => {
      const mockOpenAI = createMockOpenAI([
        { function: { name: 'invalidTool', arguments: '{}' } }
      ]);

      await expect(dispatchQueryFormatted(
        mockOpenAI as any,
        'test-model',
        'Test prompt',
        tool1,
        tool2
      )).rejects.toThrow(AINotFollowingInstructionsError);
    });

    it('should throw AINotFollowingInstructionsError for invalid parameters', async () => {
      const mockOpenAI = createMockOpenAI([
        { function: { name: 'tool2', arguments: '{"invalidKey": "value"}' } }
      ]);

      await expect(dispatchQueryFormatted(
        mockOpenAI as any,
        'test-model',
        'Test prompt',
        tool1,
        tool2
      )).rejects.toThrow(AINotFollowingInstructionsError);
    });
  });

  describe('handleToolCall', () => {
    it('should call the correct handler for tool1', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      handleToolCall(
        { tool: tool1, parameters: { action: 'test' }, toolIndex: 0 },
        handler1,
        handler2
      );

      expect(handler1).toHaveBeenCalledWith({ action: 'test' });
      expect(handler2).not.toHaveBeenCalled();
    });

    it('should call the correct handler for tool2', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      handleToolCall(
        { tool: tool2, parameters: { value: 42 }, toolIndex: 1 },
        handler1,
        handler2
      );

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledWith({ value: 42 });
    });

    it('should handle array root tool correctly', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      handleToolCall(
        { tool: arrayRootTool, parameters: ['item1', 'item2'], toolIndex: 1 },
        handler1,
        handler2
      );

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).toHaveBeenCalledWith(['item1', 'item2']);
    });
  });
});