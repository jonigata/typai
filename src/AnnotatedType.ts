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
  const hasDefault = 'default' in annotations;
  const defaultValue = annotations.default;

  return new AnnotatedType(
    `${type.name} (annotated)`,
    type.is,
    (u, c) =>
      pipe(
        type.validate(u, c),
        E.fold(
          (errors) => {
            if (hasDefault && (u === undefined || u === null)) {
              return t.success(defaultValue);
            } else if (type instanceof t.UnionType) {
              // Union型の場合、元の検証エラーをそのまま返す
              return t.failure(u, c, errors.map(e => e.message).join(', '));
            } else {
              return hasDefault ? t.success(defaultValue) : t.failure(u, c, errors.map(e => e.message).join(', '));
            }
          },
          (a) => t.success(a)
        )
      ),
    type.encode,
    type,
    annotations
  );
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
