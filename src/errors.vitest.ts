import { describe, it, expect, afterEach, vi } from 'vitest';
import * as t from 'io-ts';
import { isLeft } from 'fp-ts/lib/Either';
import { validateToolCall, UnexpectedResponseError } from './errors';
import { Tool } from './tools';

// モック関数を作成してコンソールエラーの出力をキャプチャ
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

describe('Focused Error Reporting', () => {
  // テスト後にモックをリセット
  afterEach(() => {
    mockConsoleError.mockClear();
  });

  // テストケース用の複雑な型定義
  const ComplexType = t.type({
    id: t.number,
    name: t.string,
    details: t.type({
      age: t.number,
      hobbies: t.array(t.string),
      address: t.type({
        street: t.string,
        city: t.string,
        zipCode: t.string
      })
    })
  });

  const mockTool: Tool = {
    name: 'testTool',
    description: 'A test tool',
    parameters: ComplexType
  };

  it('should validate correct data without errors', () => {
    const validData = {
      id: 1,
      name: "John",
      details: {
        age: 30,
        hobbies: ["reading", "cycling"],
        address: {
          street: "Main St",
          city: "New York",
          zipCode: "10001"
        }
      }
    };

    const result = ComplexType.decode(validData);
    expect(isLeft(result)).toBe(false);

    expect(() => validateToolCall(mockTool, validData, ComplexType, result)).not.toThrow();
    expect(mockConsoleError).not.toHaveBeenCalled();
  });

  it('should throw UnexpectedResponseError for invalid data', () => {
    const invalidData = {
      id: "123", // should be number
      name: "John",
      details: {
        age: 30,
        hobbies: ["reading", 42], // should be all strings
        address: {
          street: "Main St",
          city: "New York",
          zipCode: 10001 // should be string
        }
      }
    };

    const result = ComplexType.decode(invalidData);
    expect(isLeft(result)).toBe(true);

    expect(() => validateToolCall(mockTool, invalidData, ComplexType, result)).toThrow(UnexpectedResponseError);
    expect(mockConsoleError).toHaveBeenCalled();

    const errorMessage = mockConsoleError.mock.calls[0][0];
    expect(errorMessage).toContain('Error: Parameter validation failed');
    expect(errorMessage).toContain('"123"');
    expect(errorMessage).toContain('42');
    expect(errorMessage).toContain('10001');
  });

  it('should handle nested properties correctly', () => {
    const partiallyInvalidData = {
      id: 1,
      name: "John",
      details: {
        age: "30", // should be number
        hobbies: ["reading"],
        address: {
          street: "Main St",
          city: "New York",
          zipCode: "10001"
        }
      }
    };

    const result = ComplexType.decode(partiallyInvalidData);
    expect(isLeft(result)).toBe(true);

    expect(() => validateToolCall(mockTool, partiallyInvalidData, ComplexType, result)).toThrow(UnexpectedResponseError);
    expect(mockConsoleError).toHaveBeenCalled();

    const errorMessage = mockConsoleError.mock.calls[0][0];
    expect(errorMessage).toContain('.details.age');
    expect(errorMessage).toContain('30');
  });
});