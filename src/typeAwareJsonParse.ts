import * as t from 'io-ts'
import json5 from 'json5';

// typeがarrayなどのときに実際の値としてJSON文字列が渡された場合に、
// 再帰的にJSON.parseして継続を試みる

export class Json5ParseError extends Error {
  constructor(message: string, public path: string[], public value: string) {
    super(message);
    this.name = 'Json5ParseError';
  }
}

export function typeAwareJsonParse<T>(
  value: unknown,
  type: t.Type<T>,
  path: string[] = []
): unknown {
  // 文字列型の場合は、そのまま返す
  if (type instanceof t.StringType) {
    return value;
  }
  // Union型の場合
  if (type instanceof t.UnionType) {
    // 文字列の場合、JSON解析を試みる
    if (typeof value === 'string') {
      let parsed: unknown;
      try {
        console.log(value);
        parsed = json5.parse(value);
      } catch (error) {
        throw new Json5ParseError(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`, path, value);
      }
      // 解析結果が元の値と異なる場合のみ、再帰的に処理
      if (parsed !== value) {
        for (const subType of type.types) {
          const result = typeAwareJsonParse(parsed, subType, path);
          if (subType.is(result)) {
            return result;
          }
        }
      }
    }
    
    // 直接型チェックを試みる
    for (const subType of type.types) {
      if (subType.is(value)) {
        return value;
      }
    }
    
    // どの型にも一致しない場合は元の値を返す
    return value;
  }
  // 文字列でJSONパースが必要な場合
  if (typeof value === 'string') {
    let parsed: unknown;
    try {
      parsed = json5.parse(value);
    } catch (error) {
      throw new Json5ParseError(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`, path, value);
    }
    return typeAwareJsonParse(parsed, type, path);
  }
  // オブジェクト型の場合
  if (type instanceof t.InterfaceType || type instanceof t.PartialType) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      return Object.entries(value).reduce((acc, [key, val]) => {
        const propType = type.props[key];
        acc[key] = propType ? typeAwareJsonParse(val, propType, [...path, key]) : val;
        return acc;
      }, {} as Record<string, unknown>);
    }
    // オブジェクトでない場合は元の値を返す
    return value;
  }
  // 配列型の場合
  if (type instanceof t.ArrayType) {
    if (Array.isArray(value)) {
      return value.map((item, index) => typeAwareJsonParse(item, type.type, [...path, index.toString()]));
    }
    // 配列でない場合は元の値を返す
    return value;
  }
  // その他の型の場合は、そのまま返す
  return value;
}