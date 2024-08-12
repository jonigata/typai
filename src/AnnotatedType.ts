import * as t from 'io-ts';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';

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

export class IgnoreType<A, O> extends t.Type<A | undefined, O | undefined, unknown> {
  readonly _tag: 'IgnoreType' = 'IgnoreType'
  constructor(
    name: string,
    is: t.Is<A | undefined>,
    validate: t.Validate<unknown, A | undefined>,
    encode: t.Encode<A | undefined, O | undefined>,
    public baseType: t.Type<A, O, unknown>
  ) {
    super(name, is, validate, encode);
  }
}

export function ignore<A, O>(type: t.Type<A, O, unknown>): IgnoreType<A, O> {
  return new IgnoreType(
    `Ignore<${type.name}>`,
    (u): u is A | undefined => u === undefined || type.is(u),
    (u, c) => 
      u === undefined 
        ? t.success(undefined)
        : pipe(
            type.decode(u),
            E.fold(
              (errors) => t.failure(u, c, errors.map(e => e.message).join(', ')),
              (a) => t.success(a)
            )
          ),
    (a) => a === undefined ? undefined : type.encode(a),
    type
  );
}
