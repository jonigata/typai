import { describe, it, expect } from 'vitest';
import * as t from 'io-ts';
import { wrapArraySchema } from './generateJsonSchema'; // パスを更新してください

describe('wrapArraySchema and unwrapArraySchema', () => {
  // 非配列型のテスト用オブジェクト
  const nonArrayType = t.type({
    name: t.string,
    age: t.number,
  });

  // 配列型のテスト用オブジェクト
  const arrayType = t.array(t.string);

  describe('wrapArraySchema', () => {
    it('should wrap array schema correctly', () => {
      const schema = {
        type: "function",
        function: {
          name: "testFunction",
          description: "A test function",
          parameters: {
            type: "array",
            items: { type: "string" }
          }
        }
      };
      const wrapped = wrapArraySchema(schema, arrayType);

      expect(wrapped).toEqual({
        type: "function",
        function: {
          name: "testFunction",
          description: "A test function",
          parameters: {
            type: 'object',
            properties: {
              items: {
                type: "array",
                items: { type: "string" }
              }
            },
            required: ['items']
          }
        }
      });
    });

    it('should not modify non-array schema', () => {
      const schema = {
        type: "function",
        function: {
          name: "testFunction",
          description: "A test function",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string" },
              age: { type: "number" }
            }
          }
        }
      };
      const wrapped = wrapArraySchema(schema, nonArrayType);

      expect(wrapped).toEqual(schema);
    });
  });
});