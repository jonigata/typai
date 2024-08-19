import { describe, it, expect } from 'vitest';
import * as t from 'io-ts';
import { applyDefaultValues } from './applyDefaultValues';
import { annotate, ignore } from './AnnotatedType';

describe('applyDefaultValues', () => {
  it('should apply default value for null or undefined', () => {
    const schema = annotate(t.string, { default: 'default value' });
    expect(applyDefaultValues(null, schema)).toBe('default value');
    expect(applyDefaultValues(undefined, schema)).toBe('default value');
    expect(applyDefaultValues('actual value', schema)).toBe('actual value');
  });

  it('should handle nested objects', () => {
    const schema = t.type({
      name: annotate(t.string, { default: 'John Doe' }),
      age: annotate(t.number, { default: 30 }),
      address: t.type({
        street: annotate(t.string, { default: 'Main St' }),
        city: annotate(t.string, { default: 'Anytown' })
      })
    });

    const input = {
      name: 'Alice',
      address: {
        street: null
      }
    };

    const expected = {
      name: 'Alice',
      age: 30,
      address: {
        street: 'Main St',
        city: 'Anytown'
      }
    };

    expect(applyDefaultValues(input, schema)).toEqual(expected);
  });

  it('should handle arrays', () => {
    const schema = t.array(annotate(t.number, { default: 0 }));
    const input = [1, null, 3, undefined, 5];
    const expected = [1, 0, 3, 0, 5];

    expect(applyDefaultValues(input, schema)).toEqual(expected);
  });

  it('should handle union types correctly', () => {
    const schema = t.union([t.string, t.number]);

    expect(applyDefaultValues(null, schema)).toBe(null);
    expect(applyDefaultValues(undefined, schema)).toBe(undefined);
    expect(applyDefaultValues('hello', schema)).toBe('hello');
    expect(applyDefaultValues(42, schema)).toBe(42);
  });

  it('should apply default value to annotated union type', () => {
    const schema = annotate(
      t.union([t.string, t.number]),
      { default: 'default value' }
    );

    expect(applyDefaultValues(null, schema)).toBe('default value');
    expect(applyDefaultValues(undefined, schema)).toBe('default value');
    expect(applyDefaultValues('hello', schema)).toBe('hello');
    expect(applyDefaultValues(42, schema)).toBe(42);
  });

  it('should ignore properties with IgnoreType', () => {
    const schema = t.type({
      required: t.string,
      optional: ignore(t.string)
    });

    const input = { required: 'value' };
    const expected = { required: 'value' };

    expect(applyDefaultValues(input, schema)).toEqual(expected);
  });

  it('should handle complex nested structures', () => {
    const schema = t.type({
      user: t.type({
        name: annotate(t.string, { default: 'Anonymous' }),
        settings: t.type({
          theme: annotate(t.union([t.literal('light'), t.literal('dark')]), { default: 'light' }),
          notifications: annotate(t.boolean, { default: true })
        })
      }),
      posts: t.array(t.type({
        title: annotate(t.string, { default: 'Untitled' }),
        content: t.string,
        tags: t.array(t.string) // 修正: デフォルト値を個別の要素に設定しない
      }))
    });

    const input = {
      user: {
        name: 'Alice',
        settings: {
          theme: null
        }
      },
      posts: [
        { content: 'Hello world', tags: ['tech', null] },
        { title: 'My Second Post', content: 'Content here' }
      ]
    };

    const expected = {
      user: {
        name: 'Alice',
        settings: {
          theme: 'light',
          notifications: true
        }
      },
      posts: [
        { title: 'Untitled', content: 'Hello world', tags: ['tech', null] },
        { title: 'My Second Post', content: 'Content here', tags: undefined }
      ]
    };

    expect(applyDefaultValues(input, schema)).toEqual(expected);
  });

  it('should handle arrays with annotated elements', () => {
    const schema = t.array(annotate(t.string, { default: 'default' }));
    const input = ['a', null, 'b', undefined];
    const expected = ['a', 'default', 'b', 'default'];

    expect(applyDefaultValues(input, schema)).toEqual(expected);
  });

  it('should not apply defaults to non-annotated array elements', () => {
    const schema = t.array(t.string);
    const input = ['a', null, 'b', undefined];
    const expected = ['a', null, 'b', undefined];

    expect(applyDefaultValues(input, schema)).toEqual(expected);
  });
});