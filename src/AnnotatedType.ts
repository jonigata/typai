// AnnotatedType.ts
import * as t from 'io-ts';

export class AnnotatedType<A, O, I> extends t.Type<A, O, I> {
  constructor(
    name: string,
    is: t.Is<A>,
    validate: t.Validate<I, A>,
    encode: t.Encode<A, O>,
    public baseType: t.Type<A, O, I>,
    public annotations: { [key: string]: any }
  ) {
    super(name, is, validate, encode);
  }
}

export function annotate<A, O, I>(
  type: t.Type<A, O, I>,
  annotations: { [key: string]: any }
): AnnotatedType<A, O, I> {
  return new AnnotatedType(type.name, type.is, type.validate, type.encode, type, annotations);
}
