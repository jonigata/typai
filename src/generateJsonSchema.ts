import * as t from 'io-ts';
import OpenAI from 'openai';
import { annotate, AnnotatedType } from './AnnotatedType';

export { annotate, AnnotatedType };

export function generateJsonSchema(type: t.Type<any>): any {
  const annotations = type instanceof AnnotatedType ? type.annotations : {};
  
  if (type instanceof t.InterfaceType) {
    const properties: Record<string, any> = {};
    for (const [key, prop] of Object.entries(type.props)) {
      properties[key] = generateJsonSchema(prop as any);
    }
    return {
      type: 'object',
      properties,
      required: Object.keys(type.props),
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
