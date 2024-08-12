import { describe, it, expect } from 'vitest';
import * as t from 'io-ts';
import { annotate, ignore, AnnotatedType, IgnoreType } from './AnnotatedType';

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
