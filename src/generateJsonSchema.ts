import * as t from 'io-ts';
import OpenAI from 'openai';
import { annotate, AnnotatedType } from './AnnotatedType';

export { annotate, AnnotatedType };

export function generateJsonSchema(type: t.Type<any>): any {
  const annotations = 'annotations' in type ? (type as any).annotations : {};
  if (type && typeof type === 'object' && 'props' in type && type.props && typeof type.props === 'object') {
    const properties: Record<string, any> = {};
    
    // Type assertion to assure TypeScript that type.props is a valid object
    const props = type.props as Record<string, t.Type<any>>;
    
    for (const [key, prop] of Object.entries(props)) {
      properties[key] = generateJsonSchema(prop);
    }
    
    return {
      type: 'object',
      properties,
      required: Object.keys(props),
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
    return { type: 'array', items: generateJsonSchema(type.type), ...annotations };
  } else if (type instanceof t.UnionType) {
    return { oneOf: type.types.map(generateJsonSchema), ...annotations };
  } else if (type instanceof t.LiteralType) {
    return { const: type.value, ...annotations };
  } else if (type instanceof t.KeyofType) {
    return { type: 'string', enum: Object.keys(type.keys), ...annotations };
  }

  throw new Error(`Unsupported type: ${type.name}`);
}

export function generateSchema(outputType: t.Type<any>, functionName: string, description: string): OpenAI.ChatCompletionTool {
  const jsonSchema = generateJsonSchema(outputType);
  
  let parameters: any;
  
  if (jsonSchema.type === 'array') {
    // If the top-level schema is an array, wrap it in an object
    parameters = {
      type: 'object',
      properties: {
        items: jsonSchema
      },
      required: ['items']
    };
  } else {
    parameters = jsonSchema;
  }

  return {
    type: "function",
    function: {
      name: functionName,
      description: description,
      parameters: parameters,
    }
  };
}

export function wrapArraySchema(schema: any, type: t.Type<any>): any {
  if (type instanceof t.ArrayType) {
    return {
      type: 'object',
      properties: {
        items: schema
      },
      required: ['items']
    };
  }
  return schema;
}

export function unwrapArraySchema(schema: any, type: t.Type<any>): any {
  if (type instanceof t.ArrayType && 
      schema.type === 'object' && 
      schema.properties && 
      schema.properties.items) {
    return schema.properties.items;
  }
  return schema;
}