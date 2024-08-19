
import * as t from 'io-ts';
import { pipe } from 'fp-ts/function';
import * as E from 'fp-ts/Either';
import { AnnotatedType, IgnoreType } from './AnnotatedType';

export function applyDefaultValues(value: any, type: t.Type<any>): any {
  if (value === null || value === undefined) {
    if (type instanceof AnnotatedType && 'default' in type.annotations) {
      return type.annotations.default;
    }
    return value;
  }

  if (type instanceof t.InterfaceType || type instanceof t.PartialType) {
    const result: Record<string, any> = {};
    for (const [key, propType] of Object.entries(type.props)) {
      if (propType instanceof IgnoreType && !(key in value)) {
        continue;
      }
      result[key] = applyDefaultValues(value[key], propType as t.Type<any>);
    }
    return result;
  }

  if (type instanceof t.ArrayType) {
    if (Array.isArray(value)) {
      return value.map(item => applyDefaultValues(item, type.type));
    }
    return value;
  }

  if (type instanceof t.UnionType) {
    for (const subType of type.types) {
      const decoded = pipe(
        subType.decode(value),
        E.fold(
          () => null,
          (v) => v
        )
      );
      if (decoded !== null) {
        return value; // Union型の場合、値が存在すれば変更しない
      }
    }
    // どのサブタイプにも一致しない場合、元の値を返す
    return value;
  }

  return value;
}