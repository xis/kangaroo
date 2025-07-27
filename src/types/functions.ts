/**
 * Function registry types for the Kangaroo expression evaluator
 * 
 * This module defines types related to the safe function registry system,
 * which provides a controlled set of functions available to expressions.
 */

/**
 * Definition of a safe function that can be called from expressions
 */
export interface SafeFunction {
  /** Unique name of the function */
  name: string;
  
  /** The actual function implementation */
  fn: (...args: any[]) => any;
  
  /** Human-readable description of what the function does */
  description?: string;
  
  /** Category this function belongs to */
  category?: FunctionCategory;
  
  /** Minimum number of arguments required */
  minArgs?: number;
  
  /** Maximum number of arguments allowed (undefined means unlimited) */
  maxArgs?: number;
  
  /** Type checking functions for each argument position */
  typeChecks?: {
    [paramIndex: number]: (value: any) => boolean;
  };
  
  /** Whether this function is async */
  isAsync?: boolean;
  
  /** Expected return type */
  returnType?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  
  /** Examples of how to use this function */
  examples?: string[];
  
  /** Whether this function has side effects */
  hasSideEffects?: boolean;
  
  /** Performance characteristics */
  performance?: {
    /** Expected time complexity */
    timeComplexity?: string;
    
    /** Expected space complexity */
    spaceComplexity?: string;
    
    /** Whether the function is expensive to call */
    expensive?: boolean;
  };
  
  /** Version when this function was added */
  since?: string;
  
  /** Whether this function is deprecated */
  deprecated?: boolean | {
    since: string;
    message: string;
    replacement?: string;
  };
}

/**
 * Function categories for organization
 */
export type FunctionCategory = 
  | 'string'      // String manipulation functions
  | 'array'       // Array processing functions  
  | 'object'      // Object manipulation functions
  | 'math'        // Mathematical functions
  | 'date'        // Date and time functions
  | 'json'        // JSON parsing and serialization functions
  | 'crypto'      // Cryptographic functions
  | 'workflow'    // Workflow-specific functions
  | 'conditional' // Conditional logic functions
  | 'utility'     // General utility functions
  | 'format'      // Formatting functions
  | 'validation'; // Validation functions

/**
 * Function registry interface for managing safe functions
 */
export interface FunctionRegistry {
  /** Get a function by name */
  get(name: string): SafeFunction | undefined;
  
  /** Register a new function */
  register(func: SafeFunction): void;
  
  /** Unregister a function by name */
  unregister(name: string): void;
  
  /** List all functions, optionally filtered by category */
  list(category?: FunctionCategory): SafeFunction[];
  
  /** Check if a function exists */
  has(name: string): boolean;
  
  /** Get all function names */
  getNames(): string[];
  
  /** Get all categories */
  getCategories(): FunctionCategory[];
  
  /** Get functions by category */
  getByCategory(category: FunctionCategory): SafeFunction[];
  
  /** Clear all functions */
  clear(): void;
  
  /** Get registry statistics */
  getStats(): FunctionRegistryStats;
  
  /** Validate a function definition */
  validateFunction(func: SafeFunction): ValidationResult;
  
  /** Import functions from another registry */
  import(other: FunctionRegistry): void;
  
  /** Export functions to a serializable format */
  export(): SerializedFunctionRegistry;
}

/**
 * Statistics about the function registry
 */
export interface FunctionRegistryStats {
  /** Total number of functions */
  totalFunctions: number;
  
  /** Number of functions by category */
  functionsByCategory: Record<FunctionCategory, number>;
  
  /** Number of async functions */
  asyncFunctions: number;
  
  /** Number of deprecated functions */
  deprecatedFunctions: number;
  
  /** Most used functions (if usage tracking is enabled) */
  mostUsed?: Array<{
    name: string;
    usageCount: number;
  }>;
}

/**
 * Result of function validation
 */
export interface ValidationResult {
  /** Whether the function is valid */
  isValid: boolean;
  
  /** Validation errors */
  errors: string[];
  
  /** Validation warnings */
  warnings: string[];
}

/**
 * Serialized function registry for export/import
 */
export interface SerializedFunctionRegistry {
  /** Registry metadata */
  metadata: {
    version: string;
    exportedAt: string;
    functionCount: number;
  };
  
  /** Serialized functions (without the actual function implementations) */
  functions: Array<{
    name: string;
    description?: string;
    category?: FunctionCategory;
    minArgs?: number;
    maxArgs?: number;
    isAsync?: boolean;
    returnType?: string;
    examples?: string[];
    since?: string;
    deprecated?: boolean | object;
  }>;
}

/**
 * Function call context for advanced use cases
 */
export interface FunctionCallContext {
  /** The original expression being evaluated */
  expression?: string;
  
  /** Current evaluation context */
  evaluationContext?: any;
  
  /** Call stack depth */
  depth?: number;
  
  /** Performance tracking */
  startTime?: number;
  
  /** Whether this is a nested call */
  isNested?: boolean;
}

/**
 * Advanced function definition with context awareness
 */
export interface AdvancedSafeFunction extends SafeFunction {
  /** Function that can access call context */
  execute?: (args: any[], context?: FunctionCallContext) => any;
  
  /** Pre-execution hook */
  beforeExecute?: (args: any[], context?: FunctionCallContext) => boolean;
  
  /** Post-execution hook */
  afterExecute?: (result: any, args: any[], context?: FunctionCallContext) => any;
  
  /** Custom argument validation */
  validateArgs?: (args: any[]) => ValidationResult;
  
  /** Whether this function should be cached */
  cacheable?: boolean;
  
  /** Cache key generator for this function */
  getCacheKey?: (args: any[]) => string;
}