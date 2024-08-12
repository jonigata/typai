import * as t from 'io-ts';
import OpenAI from 'openai';
import { annotate, AnnotatedType, ignore, IgnoreType } from './AnnotatedType';

export { annotate, AnnotatedType, ignore, IgnoreType };

export function generateJsonSchema(type: t.Type<any>): any {
  if (type instanceof IgnoreType) {
    return undefined;  // この型を無視する
  }
  
  if (type instanceof AnnotatedType) {
    const baseSchema = generateJsonSchema(type.baseType);
    return { ...baseSchema, ...type.annotations };
  }
  
  const annotations = 'annotations' in type ? (type as any).annotations : {};
  
  if (type && typeof type === 'object' && 'props' in type && type.props && typeof type.props === 'object') {
    const properties: Record<string, any> = {};
    const required: string[] = [];
    
    const props = type.props as Record<string, t.Type<any>>;
    
    for (const [key, prop] of Object.entries(props)) {
      const propSchema = generateJsonSchema(prop);
      if (propSchema !== undefined) {
        properties[key] = propSchema;
        if (!(prop instanceof IgnoreType)) {
          required.push(key);
        }
      }
    }
    
    return {
      type: 'object',
      properties,
      required: required.length > 0 ? required : undefined,
      ...annotations,
    };
  }
  
  const typeMap: { [key: string]: string } = {
    'string': 'string',
    'number': 'number',
    'boolean': 'boolean',
    'StringType': 'string',
    'NumberType': 'number',
    'BooleanType': 'boolean',
    'ArrayType': 'array',
  };
  
  if (type.name in typeMap || type === t.string || type === t.number || type === t.boolean) {
    return { type: typeMap[type.name] || type.name, ...annotations };
  }
  
  if (type instanceof t.ArrayType) {
    const itemsSchema = generateJsonSchema(type.type);
    return itemsSchema !== undefined ? { type: 'array', items: itemsSchema, ...annotations } : undefined;
  } else if (type instanceof t.UnionType) {
    const schemas = type.types.map(generateJsonSchema).filter((s:any) => s !== undefined);
    return schemas.length > 0 ? { oneOf: schemas, ...annotations } : undefined;
  } else if (type instanceof t.LiteralType) {
    return { const: type.value, ...annotations };
  } else if (type instanceof t.KeyofType) {
    return { type: 'string', enum: Object.keys(type.keys), ...annotations };
  }
  
  throw new Error(`Unsupported type: ${type.name}`);
}

export function generateSchema(outputType: t.Type<any>, functionName: string, description: string): OpenAI.ChatCompletionTool {
  // From the perspective of the user of generateSchema, the outputType
  // becomes the inputType (parameters) of the function called by the AI.
  return {
    type: "function",
    function: {
      name: functionName,
      description: description,
      parameters: generateJsonSchema(outputType),
    }
  };
}

export function wrapArrayType(type: t.Type<any>): t.Type<any> {
  if (type instanceof t.ArrayType) {
    return t.type({items: t.array(type.type)});
  }
  return type;
}

export function unwrapArrayData(data: any, type: t.Type<any>): any {
  if (type instanceof t.ArrayType) {
    return data.items;
  }
  return data;
}
