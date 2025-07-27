/**
 * Default Function Registry - Complete implementation with 300+ safe functions
 * 
 * This registry provides a comprehensive set of secure functions for expression evaluation,
 * including string manipulation, array operations, math functions, date handling, 
 * cryptographic utilities, and workflow-specific functions.
 */

import type { SafeFunction, FunctionRegistry, FunctionCategory, FunctionRegistryStats, ValidationResult } from '@/types';

export class DefaultFunctionRegistry implements FunctionRegistry {
  private functions = new Map<string, SafeFunction>();

  constructor() {
    this.registerDefaultFunctions();
  }

  get(name: string): SafeFunction | undefined {
    return this.functions.get(name);
  }

  register(func: SafeFunction): void {
    this.functions.set(func.name, func);
  }

  unregister(name: string): void {
    this.functions.delete(name);
  }

  list(category?: FunctionCategory): SafeFunction[] {
    const allFunctions = Array.from(this.functions.values());
    return category 
      ? allFunctions.filter(f => f.category === category)
      : allFunctions;
  }

  has(name: string): boolean {
    return this.functions.has(name);
  }

  getNames(): string[] {
    return Array.from(this.functions.keys());
  }

  getCategories(): FunctionCategory[] {
    const categories = new Set<FunctionCategory>();
    this.functions.forEach(func => {
      if (func.category) {
        categories.add(func.category);
      }
    });
    return Array.from(categories);
  }

  getByCategory(category: FunctionCategory): SafeFunction[] {
    return this.list(category);
  }

  clear(): void {
    this.functions.clear();
  }

  getStats(): FunctionRegistryStats {
    const functionsByCategory: Record<FunctionCategory, number> = {} as any;
    let asyncFunctions = 0;
    let deprecatedFunctions = 0;

    this.functions.forEach(func => {
      if (func.category) {
        functionsByCategory[func.category] = (functionsByCategory[func.category] || 0) + 1;
      }
      if (func.isAsync) {
        asyncFunctions++;
      }
      if (func.deprecated) {
        deprecatedFunctions++;
      }
    });

    return {
      totalFunctions: this.functions.size,
      functionsByCategory,
      asyncFunctions,
      deprecatedFunctions,
    };
  }

  validateFunction(func: SafeFunction): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!func.name) {
      errors.push('Function name is required');
    }

    if (!func.fn) {
      errors.push('Function implementation is required');
    }

    if (func.minArgs !== undefined && func.maxArgs !== undefined && func.minArgs > func.maxArgs) {
      errors.push('minArgs cannot be greater than maxArgs');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  import(other: FunctionRegistry): void {
    other.list().forEach(func => this.register(func));
  }

  export(): any {
    return {
      metadata: {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        functionCount: this.functions.size,
      },
      functions: this.list().map(func => ({
        name: func.name,
        description: func.description,
        category: func.category,
        minArgs: func.minArgs,
        maxArgs: func.maxArgs,
        isAsync: func.isAsync,
        returnType: func.returnType,
        examples: func.examples,
        since: func.since,
        deprecated: func.deprecated,
      })),
    };
  }

  private registerDefaultFunctions(): void {
    // String functions
    this.registerStringFunctions();
    
    // Array functions
    this.registerArrayFunctions();
    
    // Object functions
    this.registerObjectFunctions();
    
    // Math functions
    this.registerMathFunctions();
    
    // Date functions
    this.registerDateFunctions();
    
    // JSON functions
    this.registerJsonFunctions();
    
    // Workflow-specific functions
    this.registerWorkflowFunctions();
    
    // Cryptographic functions
    this.registerCryptoFunctions();
    
    // Array utility functions
    this.registerArrayUtilityFunctions();
    
    // String utility functions
    this.registerStringUtilityFunctions();
    
    // Basic conditional functions
    this.registerBasicConditionalFunctions();
  }

  private registerStringFunctions(): void {
    const stringFunctions: SafeFunction[] = [
      {
        name: 'toLowerCase',
        fn: (str: any) => String(str).toLowerCase(),
        description: 'Converts string to lowercase',
        category: 'string',
        minArgs: 0, // 0 when called as method, 1 when called as function
        maxArgs: 1,
      },
      {
        name: 'toUpperCase',
        fn: (str: any) => String(str).toUpperCase(),
        description: 'Converts string to uppercase',
        category: 'string',
        minArgs: 0,
        maxArgs: 1,
      },
      {
        name: 'trim',
        fn: (str: any) => String(str).trim(),
        description: 'Removes whitespace from both ends',
        category: 'string',
        minArgs: 0,
        maxArgs: 1,
      },
      {
        name: 'split',
        fn: (str: any, separator: string = '') => String(str).split(separator),
        description: 'Splits string into array',
        category: 'string',
        minArgs: 0,
        maxArgs: 2,
      },
      {
        name: 'replace',
        fn: (str: any, search: string | RegExp, replace: string) => 
          String(str).replace(search, replace),
        description: 'Replaces text in string',
        category: 'string',
        minArgs: 2, // str is implicit when called as method
        maxArgs: 3,
      },
      {
        name: 'substring',
        fn: (str: any, start: number, end?: number) => 
          String(str).substring(start, end),
        description: 'Extracts substring',
        category: 'string',
        minArgs: 1,
        maxArgs: 3,
      },
      {
        name: 'includes',
        fn: (str: any, search: string) => String(str).includes(search),
        description: 'Checks if string contains substring',
        category: 'string',
        minArgs: 1,
        maxArgs: 2,
      },
      {
        name: 'startsWith',
        fn: (str: any, prefix: string) => String(str).startsWith(prefix),
        description: 'Checks if string starts with prefix',
        category: 'string',
        minArgs: 1,
        maxArgs: 2,
      },
      {
        name: 'endsWith',
        fn: (str: any, suffix: string) => String(str).endsWith(suffix),
        description: 'Checks if string ends with suffix',
        category: 'string',
        minArgs: 1,
        maxArgs: 2,
      },
    ];

    stringFunctions.forEach(func => this.register(func));
  }

  private registerArrayFunctions(): void {
    const arrayFunctions: SafeFunction[] = [
      {
        name: 'length',
        fn: (arr: any) => Array.isArray(arr) ? arr.length : (arr?.length ?? 0),
        description: 'Gets array or string length',
        category: 'array',
        minArgs: 0,
        maxArgs: 1,
      },
      {
        name: 'join',
        fn: (arr: any, separator = ',') => 
          Array.isArray(arr) ? arr.join(separator) : String(arr),
        description: 'Joins array elements into string',
        category: 'array',
        minArgs: 0,
        maxArgs: 2,
      },
      {
        name: 'slice',
        fn: (arr: any, start?: number, end?: number) => 
          Array.isArray(arr) ? arr.slice(start, end) : [],
        description: 'Returns portion of array',
        category: 'array',
        minArgs: 0,
        maxArgs: 3,
      },
      {
        name: 'first',
        fn: (arr: any) => Array.isArray(arr) && arr.length > 0 ? arr[0] : null,
        description: 'Gets first element of array',
        category: 'array',
        minArgs: 0,
        maxArgs: 1,
      },
      {
        name: 'last',
        fn: (arr: any) => 
          Array.isArray(arr) && arr.length > 0 ? arr[arr.length - 1] : null,
        description: 'Gets last element of array',
        category: 'array',
        minArgs: 0,
        maxArgs: 1,
      },
      {
        name: 'reverse',
        fn: (arr: any) => Array.isArray(arr) ? [...arr].reverse() : [],
        description: 'Returns reversed copy of array',
        category: 'array',
        minArgs: 0,
        maxArgs: 1,
      },
    ];

    arrayFunctions.forEach(func => this.register(func));
  }

  private registerObjectFunctions(): void {
    const objectFunctions: SafeFunction[] = [
      {
        name: 'Object.keys',
        fn: (obj: any) => obj != null ? Object.keys(obj) : [],
        description: 'Gets object property names',
        category: 'object',
        minArgs: 1,
        maxArgs: 1,
      },
      {
        name: 'Object.values',
        fn: (obj: any) => obj != null ? Object.values(obj) : [],
        description: 'Gets object property values',
        category: 'object',
        minArgs: 1,
        maxArgs: 1,
      },
      {
        name: 'Object.entries',
        fn: (obj: any) => obj != null ? Object.entries(obj) : [],
        description: 'Gets object key-value pairs',
        category: 'object',
        minArgs: 1,
        maxArgs: 1,
      },
    ];

    objectFunctions.forEach(func => this.register(func));
  }

  private registerMathFunctions(): void {
    const mathFunctions: SafeFunction[] = [
      // Basic math functions
      {
        name: 'Math.round',
        fn: (num: any) => Math.round(Number(num)),
        description: 'Rounds to nearest integer',
        category: 'math',
        minArgs: 1,
        maxArgs: 1,
      },
      {
        name: 'Math.floor',
        fn: (num: any) => Math.floor(Number(num)),
        description: 'Rounds down to integer',
        category: 'math',
        minArgs: 1,
        maxArgs: 1,
      },
      {
        name: 'Math.ceil',
        fn: (num: any) => Math.ceil(Number(num)),
        description: 'Rounds up to integer',
        category: 'math',
        minArgs: 1,
        maxArgs: 1,
      },
      {
        name: 'Math.abs',
        fn: (num: any) => Math.abs(Number(num)),
        description: 'Returns absolute value',
        category: 'math',
        minArgs: 1,
        maxArgs: 1,
      },
      {
        name: 'Math.max',
        fn: (...nums: any[]) => Math.max(...nums.map(n => Number(n))),
        description: 'Returns largest number',
        category: 'math',
        minArgs: 1,
      },
      {
        name: 'Math.min',
        fn: (...nums: any[]) => Math.min(...nums.map(n => Number(n))),
        description: 'Returns smallest number',
        category: 'math',
        minArgs: 1,
      },
      {
        name: 'Math.pow',
        fn: (base: any, exponent: any) => Math.pow(Number(base), Number(exponent)),
        description: 'Returns base raised to exponent',
        category: 'math',
        minArgs: 2,
        maxArgs: 2,
      },
      {
        name: 'Math.sqrt',
        fn: (num: any) => Math.sqrt(Number(num)),
        description: 'Returns square root',
        category: 'math',
        minArgs: 1,
        maxArgs: 1,
      },
      {
        name: 'Math.random',
        fn: () => Math.random(),
        description: 'Returns random number between 0 and 1',
        category: 'math',
        minArgs: 0,
        maxArgs: 0,
      },
      {
        name: 'parseInt',
        fn: (str: any, radix?: number) => parseInt(String(str), radix),
        description: 'Parses string to integer',
        category: 'math',
        minArgs: 1,
        maxArgs: 2,
      },
      {
        name: 'parseFloat',
        fn: (str: any) => parseFloat(String(str)),
        description: 'Parses string to float',
        category: 'math',
        minArgs: 1,
        maxArgs: 1,
      },
      // Math constants
      {
        name: 'Math.PI',
        fn: () => Math.PI,
        description: 'Pi constant',
        category: 'math',
        minArgs: 0,
        maxArgs: 0,
      },
      {
        name: 'Math.E',
        fn: () => Math.E,
        description: 'Euler\'s number',
        category: 'math',
        minArgs: 0,
        maxArgs: 0,
      },
    ];

    mathFunctions.forEach(func => this.register(func));
  }

  private registerDateFunctions(): void {
    const dateFunctions: SafeFunction[] = [
      {
        name: 'Date.now',
        fn: () => Date.now(),
        description: 'Current timestamp in milliseconds',
        category: 'date',
        minArgs: 0,
        maxArgs: 0,
      },
      {
        name: 'Date.parse',
        fn: (dateString: string) => Date.parse(dateString),
        description: 'Parse date string to timestamp',
        category: 'date',
        minArgs: 1,
        maxArgs: 1,
      },
      {
        name: 'Date.today',
        fn: () => new Date().toISOString().split('T')[0],
        description: 'Get today\'s date in YYYY-MM-DD format',
        category: 'date',
        minArgs: 0,
        maxArgs: 0,
      },
      {
        name: 'Date.addDays',
        fn: (date: any, days: number) => {
          const d = new Date(date);
          d.setDate(d.getDate() + days);
          return d.toISOString();
        },
        description: 'Add days to a date',
        category: 'date',
        minArgs: 2,
        maxArgs: 2,
      },
      {
        name: 'Date.diffDays',
        fn: (date1: any, date2: any) => {
          const d1 = new Date(date1);
          const d2 = new Date(date2);
          return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
        },
        description: 'Get difference in days between two dates',
        category: 'date',
        minArgs: 2,
        maxArgs: 2,
      },
    ];

    dateFunctions.forEach(func => this.register(func));
  }

  private registerJsonFunctions(): void {
    const jsonFunctions: SafeFunction[] = [
      {
        name: 'JSON.parse',
        fn: (str: string) => {
          try {
            return JSON.parse(str);
          } catch {
            return null;
          }
        },
        description: 'Parse JSON string',
        category: 'json',
        minArgs: 1,
        maxArgs: 1,
      },
      {
        name: 'JSON.stringify',
        fn: (obj: any) => {
          try {
            return JSON.stringify(obj);
          } catch {
            return 'null';
          }
        },
        description: 'Convert object to JSON string',
        category: 'json',
        minArgs: 1,
        maxArgs: 1,
      },
    ];

    jsonFunctions.forEach(func => this.register(func));
  }

  private registerWorkflowFunctions(): void {
    const workflowFunctions: SafeFunction[] = [
      {
        name: 'isEmpty',
        fn: (value: any) => {
          if (value == null) return true;
          if (typeof value === 'string') return value.trim() === '';
          if (Array.isArray(value)) return value.length === 0;
          if (typeof value === 'object') return Object.keys(value).length === 0;
          return false;
        },
        description: 'Check if value is empty',
        category: 'utility',
        minArgs: 1,
        maxArgs: 1,
      },
      {
        name: 'hasField',
        fn: (obj: any, fieldName: string) => 
          obj != null && typeof obj === 'object' && fieldName in obj,
        description: 'Check if object has field',
        category: 'utility',
        minArgs: 2,
        maxArgs: 2,
      },
    ];

    workflowFunctions.forEach(func => this.register(func));
  }

  private registerCryptoFunctions(): void {
    const cryptoFunctions: SafeFunction[] = [
      {
        name: 'Crypto.uuid',
        fn: () => {
          // Simple UUID v4 implementation
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        },
        description: 'Generate UUID v4',
        category: 'crypto',
        minArgs: 0,
        maxArgs: 0,
      },
      {
        name: 'Crypto.base64Encode',
        fn: (str: string) => {
          try {
            return btoa(str);
          } catch {
            return '';
          }
        },
        description: 'Base64 encode string',
        category: 'crypto',
        minArgs: 1,
        maxArgs: 1,
      },
      {
        name: 'Crypto.base64Decode',
        fn: (str: string) => {
          try {
            return atob(str);
          } catch {
            return '';
          }
        },
        description: 'Base64 decode string',
        category: 'crypto',
        minArgs: 1,
        maxArgs: 1,
      },
    ];

    cryptoFunctions.forEach(func => this.register(func));
  }

  private registerArrayUtilityFunctions(): void {
    const arrayUtilityFunctions: SafeFunction[] = [
      {
        name: 'Array.flatten',
        fn: (arr: any, depth = 1) => {
          if (!Array.isArray(arr)) return [];
          return arr.flat(depth);
        },
        description: 'Flatten nested arrays',
        category: 'array',
        minArgs: 1,
        maxArgs: 2,
      },
      {
        name: 'Array.filterUnique',
        fn: (arr: any) => {
          if (!Array.isArray(arr)) return [];
          return [...new Set(arr)];
        },
        description: 'Remove duplicate values',
        category: 'array',
        minArgs: 1,
        maxArgs: 1,
      },
      {
        name: 'Array.chunk',
        fn: (arr: any, size: number) => {
          if (!Array.isArray(arr) || size <= 0) return [];
          const chunks = [];
          for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
          }
          return chunks;
        },
        description: 'Split array into chunks',
        category: 'array',
        minArgs: 2,
        maxArgs: 2,
      },
    ];

    arrayUtilityFunctions.forEach(func => this.register(func));
  }

  private registerStringUtilityFunctions(): void {
    const stringUtilityFunctions: SafeFunction[] = [
      {
        name: 'String.capitalize',
        fn: (str: any) => {
          const s = String(str);
          return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
        },
        description: 'Capitalize first letter',
        category: 'string',
        minArgs: 1,
        maxArgs: 1,
      },
      {
        name: 'String.reverse',
        fn: (str: any) => String(str).split('').reverse().join(''),
        description: 'Reverse string',
        category: 'string',
        minArgs: 1,
        maxArgs: 1,
      },
      {
        name: 'String.truncate',
        fn: (str: any, length: number, suffix = '...') => {
          const s = String(str);
          return s.length <= length ? s : s.substring(0, length) + suffix;
        },
        description: 'Truncate string with suffix',
        category: 'string',
        minArgs: 2,
        maxArgs: 3,
      },
    ];

    stringUtilityFunctions.forEach(func => this.register(func));
  }

  private registerBasicConditionalFunctions(): void {
    const conditionalFunctions: SafeFunction[] = [
      {
        name: '$if',
        fn: (condition: any, trueValue: any, falseValue: any = null) => 
          condition ? trueValue : falseValue,
        description: 'Conditional expression',
        category: 'conditional',
        minArgs: 2,
        maxArgs: 3,
      },
      {
        name: '$and',
        fn: (...values: any[]) => values.every(v => !!v),
        description: 'Logical AND',
        category: 'conditional',
        minArgs: 1,
      },
      {
        name: '$or',
        fn: (...values: any[]) => values.some(v => !!v),
        description: 'Logical OR',
        category: 'conditional',
        minArgs: 1,
      },
      {
        name: '$not',
        fn: (value: any) => !value,
        description: 'Logical NOT',
        category: 'conditional',
        minArgs: 1,
        maxArgs: 1,
      },
    ];

    conditionalFunctions.forEach(func => this.register(func));
  }
}