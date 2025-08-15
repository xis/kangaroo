/**
 * Main type exports for the Kangaroo expression evaluator
 * 
 * This module re-exports all public types for easy consumption by library users.
 */

// Import types for local interface definitions
import type { ExpressionContext, EvaluationResult, SecurityValidation, ParsedExpression } from './core';
import type { SafeFunction, FunctionCategory } from './functions';

// Core types
export type {
  ExpressionContext,
  EvaluationResult,
  SecurityValidation,
  SecurityViolation,
  ParsedExpression,
  EvaluatorOptions,
  SupportedNodeType,
  ASTNodeHandler,
  SecurityRule
} from './core';

// Function registry types
export type {
  SafeFunction,
  FunctionCategory,
  FunctionRegistry,
  FunctionRegistryStats,
  ValidationResult,
  SerializedFunctionRegistry,
  FunctionCallContext,
  AdvancedSafeFunction
} from './functions';

// Type registry types
export type {
  TypeRegistry,
  TypeConfig,
  TypeSchema,
  TypePropertySchema,
  SerializationStrategy,
  RegisteredType
} from './type-registry';

/**
 * Main expression evaluator interface
 */
export interface ExpressionEvaluator {
  /**
   * Evaluates an expression with the given context
   * 
   * @param expression The expression string to evaluate
   * @param context Optional context object providing variables
   * @returns Promise resolving to evaluation result
   */
  evaluate(expression: string, context?: ExpressionContext): Promise<EvaluationResult> | EvaluationResult;
  
  /**
   * Validates an expression for syntax and security issues
   * 
   * @param expression The expression string to validate
   * @returns Promise resolving to validation result
   */
  validate(expression: string): Promise<SecurityValidation> | SecurityValidation;
  
  /**
   * Parses an expression and returns metadata
   * 
   * @param expression The expression string to parse
   * @returns Promise resolving to parsed expression or null if invalid
   */
  parse(expression: string): Promise<ParsedExpression | null> | ParsedExpression | null;
  
  /**
   * Extracts variable dependencies from expression
   * 
   * @param expression The expression string to analyze
   * @returns Promise resolving to array of dependency names
   */
  extractDependencies(expression: string): Promise<string[]> | string[];
  
  /**
   * Adds a custom function to the registry
   * 
   * @param func The safe function to add
   */
  addFunction(func: SafeFunction): void;
  
  /**
   * Removes a function from the registry
   * 
   * @param name The name of the function to remove
   */
  removeFunction(name: string): void;
  
  /**
   * Lists all available functions
   * 
   * @param category Optional category filter
   * @returns Array of safe functions
   */
  listFunctions(category?: FunctionCategory): SafeFunction[];
}

/**
 * Template processing result
 */
export interface TemplateResult {
  /** Whether template processing was successful */
  success: boolean;
  
  /** The processed template string */
  result?: string;
  
  /** Error message if processing failed */
  error?: string;
  
  /** Expressions that were processed */
  processedExpressions?: Array<{
    original: string;
    evaluated: any;
    startIndex: number;
    endIndex: number;
  }>;
}

/**
 * Expression complexity analysis result
 */
export interface ComplexityAnalysis {
  /** Overall complexity score */
  score: number;
  
  /** Breakdown by node type */
  breakdown: Record<string, number>;
  
  /** Maximum nesting depth */
  maxDepth: number;
  
  /** Number of function calls */
  functionCalls: number;
  
  /** Number of property accesses */
  propertyAccesses: number;
  
  /** Estimated evaluation time in milliseconds */
  estimatedTime: number;
  
  /** Risk assessment */
  risk: 'low' | 'medium' | 'high';
}

/**
 * Performance metrics for expression evaluation
 */
export interface PerformanceMetrics {
  /** Parse time in milliseconds */
  parseTime: number;
  
  /** Validation time in milliseconds */
  validationTime: number;
  
  /** Execution time in milliseconds */
  executionTime: number;
  
  /** Total time in milliseconds */
  totalTime: number;
  
  /** Memory usage in bytes */
  memoryUsage?: number;
  
  /** Cache hit/miss information */
  cache?: {
    hit: boolean;
    key: string;
  };
}

/**
 * Error types that can occur during evaluation
 */
export type EvaluationErrorType = 
  | 'syntax'      // Syntax error in expression
  | 'security'    // Security violation
  | 'runtime'     // Runtime error during execution
  | 'type'        // Type error (wrong argument types, etc.)
  | 'complexity'  // Expression too complex
  | 'timeout'     // Evaluation timed out
  | 'memory'      // Memory limit exceeded
  | 'unknown';    // Unknown error

/**
 * Callback context for array operations
 */
export interface CallbackContext extends ExpressionContext {
  /** Dynamic parameter binding for callback functions */
  [paramName: string]: any;
}

/**
 * Array operation types supported by the evaluator
 */
export type ArrayOperation = 
  | 'filter'
  | 'map'
  | 'find'
  | 'some'
  | 'every'
  | 'reduce'
  | 'sort'
  | 'forEach';

/**
 * Configuration for specific array operations
 */
export interface ArrayOperationConfig {
  /** Maximum array size to process */
  maxArraySize?: number;
  
  /** Maximum callback execution time */
  maxCallbackTime?: number;
  
  /** Whether to allow nested array operations */
  allowNested?: boolean;
  
  /** Memory limit for array operations */
  memoryLimit?: number;
}