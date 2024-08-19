import { describe, it, expect } from 'vitest';
import * as t from 'io-ts';
import { annotate, ignore, AnnotatedType, IgnoreType } from './AnnotatedType';
import { isRight } from 'fp-ts/Either';

describe('annotate function', () => {
  it('should create an AnnotatedType with the given annotations', () => {
    const StringType = t.string;
    const annotatedString = annotate(StringType, { description: 'A string value' });

    expect(annotatedString).toBeInstanceOf(AnnotatedType);
    expect(annotatedString.annotations).toEqual({ description: 'A string value' });
    expect(annotatedString.baseType).toBe(StringType);
  });

  it('should preserve the original type behavior', () => {
    const NumberType = t.number;
    const annotatedNumber = annotate(NumberType, { min: 0, max: 100 });

    expect(annotatedNumber.is(50)).toBe(true);
    expect(annotatedNumber.is('50')).toBe(false);
  });

  it('should work with complex types', () => {
    const PersonType = t.type({
      name: t.string,
      age: t.number,
    });
    const annotatedPerson = annotate(PersonType, { description: 'A person object' });

    expect(annotatedPerson.is({ name: 'Alice', age: 30 })).toBe(true);
    expect(annotatedPerson.is({ name: 'Bob', age: '25' })).toBe(false);
  });
});

describe('ignore function', () => {
  it('should create an IgnoreType', () => {
    const StringType = t.string;
    const ignoredString = ignore(StringType);

    expect(ignoredString).toBeInstanceOf(IgnoreType);
    expect(ignoredString.baseType).toBe(StringType);
  });

  it('should allow undefined values', () => {
    const NumberType = t.number;
    const ignoredNumber = ignore(NumberType);

    expect(ignoredNumber.is(10)).toBe(true);
    expect(ignoredNumber.is(undefined)).toBe(true);
    expect(ignoredNumber.is('10')).toBe(false);
  });

  it('should work within complex types', () => {
    const PersonType = t.type({
      name: t.string,
      age: t.number,
      email: ignore(t.string),
    });

    expect(PersonType.decode({ name: 'Alice', age: 30 })._tag).toBe('Right');
    expect(PersonType.decode({ name: 'Bob', age: 25, email: 'bob@example.com' })._tag).toBe('Right');
    expect(PersonType.decode({ name: 'Charlie', age: 35, email: undefined })._tag).toBe('Right');
    expect(PersonType.decode({ name: 'David', age: '40' })._tag).toBe('Left');
  });
});
 
describe('combination of annotate and ignore', () => {
  it('should work together in complex scenarios', () => {
    const ComplexType = annotate(
      t.type({
        id: t.number,
        name: t.string,
        optional: ignore(t.boolean),
      }),
      { description: 'A complex type with annotation and ignored field' }
    );

    expect(ComplexType.decode({ id: 1, name: 'Test' })._tag).toBe('Right');
    expect(ComplexType.decode({ id: 2, name: 'Test', optional: true })._tag).toBe('Right');
    expect(ComplexType.decode({ id: 3, name: 'Test', optional: undefined })._tag).toBe('Right');
    expect(ComplexType.decode({ id: '4', name: 'Test' })._tag).toBe('Left');
    expect(ComplexType.annotations).toEqual({ description: 'A complex type with annotation and ignored field' });
  });
});

describe('annotate function with default values', () => {
  it('should apply default value when input is undefined', () => {
    const StringWithDefault = annotate(t.string, { default: 'default value' });
    const result = StringWithDefault.decode(undefined);

    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right).toBe('default value');
    }
  });

  it('should not apply default value when input is valid', () => {
    const NumberWithDefault = annotate(t.number, { default: 0 });
    const result = NumberWithDefault.decode(42);

    expect(isRight(result)).toBe(true);
    if (isRight(result)) {
      expect(result.right).toBe(42);
    }
  });

  it('should work with complex types and nested defaults', () => {
    const PersonType = t.type({
      name: annotate(t.string, { default: 'John Doe' }),
      age: annotate(t.number, { default: 30 }),
      preferences: annotate(t.type({
        theme: annotate(t.string, { default: 'light' }),
        notifications: annotate(t.boolean, { default: true })
      }), { default: { theme: 'dark', notifications: false } })
    });

    const emptyResult = PersonType.decode({});
    expect(isRight(emptyResult)).toBe(true);
    if (isRight(emptyResult)) {
      expect(emptyResult.right).toEqual({
        name: 'John Doe',
        age: 30,
        preferences: { theme: 'dark', notifications: false }
      });
    }

    const partialResult = PersonType.decode({ name: 'Alice', preferences: { theme: 'light' } });
    expect(isRight(partialResult)).toBe(true);
    if (isRight(partialResult)) {
      expect(partialResult.right).toEqual({
        name: 'Alice',
        age: 30,
        preferences: { theme: 'light', notifications: true }
      });
    }
  });

  it('should handle union types with default values', () => {
    const UnionWithDefault = annotate(t.union([t.string, t.number]), { default: 'default' });
    
    expect(isRight(UnionWithDefault.decode(undefined))).toBe(true);
    expect(isRight(UnionWithDefault.decode('hello'))).toBe(true);
    expect(isRight(UnionWithDefault.decode(42))).toBe(true);
    expect(isRight(UnionWithDefault.decode(true))).toBe(false);

    const undefinedResult = UnionWithDefault.decode(undefined);
    if (isRight(undefinedResult)) {
      expect(undefinedResult.right).toBe('default');
    }
  });

  it('should preserve other annotations alongside default values', () => {
    const AnnotatedNumber = annotate(t.number, { default: 0, description: 'A number with default' });

    expect(AnnotatedNumber.annotations).toEqual({ default: 0, description: 'A number with default' });
    expect(isRight(AnnotatedNumber.decode(undefined))).toBe(true);
    
    const result = AnnotatedNumber.decode(undefined);
    if (isRight(result)) {
      expect(result.right).toBe(0);
    }
  });
});

describe('combination of annotate with default and ignore', () => {
  it('should work together with default values and ignored fields', () => {
    const ComplexType = t.type({
      id: annotate(t.number, { default: 0 }),
      name: annotate(t.string, { default: 'Unnamed' }),
      optional: ignore(annotate(t.boolean, { default: false }))
    });

    const emptyResult = ComplexType.decode({});
    expect(isRight(emptyResult)).toBe(true);
    if (isRight(emptyResult)) {
      expect(emptyResult.right).toEqual({ id: 0, name: 'Unnamed' });
    }

    const partialResult = ComplexType.decode({ id: 1, optional: true });
    expect(isRight(partialResult)).toBe(true);
    if (isRight(partialResult)) {
      expect(partialResult.right).toEqual({ id: 1, name: 'Unnamed', optional: true });
    }
  });
});
