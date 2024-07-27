import { describe, it, expect } from 'vitest';
import * as t from 'io-ts';
import { typeAwareJsonParse } from './typeAwareJsonParse';

describe('typeAwareJsonParse', () => {
  it('t.string型の場合、文字列をそのまま返すこと', () => {
    expect(typeAwareJsonParse('test', t.string)).toBe('test');
    expect(typeAwareJsonParse('{"a": 1}', t.string)).toBe('{"a": 1}');
  });

  it('t.number型の場合、数値をそのまま返し、文字列の場合はパースすること', () => {
    expect(typeAwareJsonParse(42, t.number)).toBe(42);
    expect(typeAwareJsonParse('42', t.number)).toBe(42);
    expect(typeAwareJsonParse('"42"', t.number)).toBe(42);
  });

  it('t.boolean型の場合、ブール値をそのまま返し、文字列の場合はパースすること', () => {
    expect(typeAwareJsonParse(true, t.boolean)).toBe(true);
    expect(typeAwareJsonParse('true', t.boolean)).toBe(true);
    expect(typeAwareJsonParse('"false"', t.boolean)).toBe(false);
  });

  it('t.null型の場合、nullをそのまま返し、文字列の場合はパースすること', () => {
    expect(typeAwareJsonParse(null, t.null)).toBe(null);
    expect(typeAwareJsonParse('null', t.null)).toBe(null);
  });

  it('t.array型の場合、配列をそのまま返し、文字列の場合はパースすること', () => {
    const arrayType = t.array(t.number);
    expect(typeAwareJsonParse([1, 2, 3], arrayType)).toEqual([1, 2, 3]);
    expect(typeAwareJsonParse('[1, 2, 3]', arrayType)).toEqual([1, 2, 3]);
    expect(typeAwareJsonParse('"[1, 2, 3]"', arrayType)).toEqual([1, 2, 3]);
  });

  it('t.type（オブジェクト型）の場合、オブジェクトをそのまま返し、文字列の場合はパースすること', () => {
    const objectType = t.type({ a: t.number, b: t.string });
    expect(typeAwareJsonParse({ a: 1, b: 'test' }, objectType)).toEqual({ a: 1, b: 'test' });
    expect(typeAwareJsonParse('{"a": 1, "b": "test"}', objectType)).toEqual({ a: 1, b: 'test' });
    expect(typeAwareJsonParse('"{\\"a\\": 1, \\"b\\": \\"test\\"}"', objectType)).toEqual({ a: 1, b: 'test' });
  });

  it('ネストされた構造を正しく処理すること', () => {
    const nestedType = t.type({
      a: t.number,
      b: t.array(t.type({ c: t.string, d: t.boolean }))
    });
    const input = '{"a": 1, "b": [{"c": "test", "d": true}, {"c": "test2", "d": false}]}';
    expect(typeAwareJsonParse(input, nestedType)).toEqual({
      a: 1,
      b: [{ c: 'test', d: true }, { c: 'test2', d: false }]
    });
  });

  it('JSON5形式の入力を正しくパースすること', () => {
    const type = t.type({ a: t.number, b: t.array(t.string) });
    const input = `{
      a: 1,
      b: ['test', 'test2',], // trailing comma
    }`;
    expect(typeAwareJsonParse(input, type)).toEqual({ a: 1, b: ['test', 'test2'] });
  });

  it('無効なJSONの場合、例外をスローすること', () => {
    const input = '{invalid: json}';
    expect(() => typeAwareJsonParse(input, t.unknown)).toThrow();
  });
  
  it('t.union型を正しく処理すること', () => {
    const unionType = t.union([t.string, t.number]);
    expect(typeAwareJsonParse('"test"', unionType)).toBe('test');
    expect(typeAwareJsonParse('42', unionType)).toBe(42);
    expect(typeAwareJsonParse('"42"', unionType)).toBe('42');
    expect(() => typeAwareJsonParse('test', unionType)).toThrow('Failed to parse JSON');
  });

  it('t.intersection型を正しく処理すること', () => {
    const intersectionType = t.intersection([
      t.type({ a: t.number }),
      t.type({ b: t.string })
    ]);
    const input = '{"a": 1, "b": "test"}';
    expect(typeAwareJsonParse(input, intersectionType)).toEqual({ a: 1, b: 'test' });
  });

  it('t.partial型を正しく処理すること', () => {
    const partialType = t.partial({ a: t.number, b: t.string });
    expect(typeAwareJsonParse('{"a": 1}', partialType)).toEqual({ a: 1 });
    expect(typeAwareJsonParse('{"b": "test"}', partialType)).toEqual({ b: 'test' });
    expect(typeAwareJsonParse('{}', partialType)).toEqual({});
  });

  it('深くネストされた文字列を正しくパースすること', () => {
    const deepType = t.type({
      a: t.type({
        b: t.type({
          c: t.array(t.number)
        })
      })
    });
    const input = '{"a":{"b":{"c":"[1,2,3]"}}}';
    expect(typeAwareJsonParse(input, deepType)).toEqual({ a: { b: { c: [1, 2, 3] } } });
  });
});