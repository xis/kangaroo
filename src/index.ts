/**
 * Kangaroo Expression Evaluator
 * 
 * A secure, fast, and powerful JavaScript-like expression language evaluator
 * that uses AST-based execution instead of eval() for maximum security.
 * 
 * @packageDocumentation
 */

// Type imports for internal use
import type {
  ExpressionContext,
  EvaluationResult,
  SecurityValidation,
  EvaluatorOptions
} from './types';

// Import the main class for function signatures
import { Kangaroo } from './core/evaluator';

// Type exports
export type {
  // Core types
  ExpressionContext,
  EvaluationResult,
  SecurityValidation,
  SecurityViolation,
  ParsedExpression,
  EvaluatorOptions,
  SupportedNodeType,
  ASTNodeHandler,
  SecurityRule,
  
  // Function types
  SafeFunction,
  FunctionCategory,
  FunctionRegistry,
  FunctionRegistryStats,
  ValidationResult,
  SerializedFunctionRegistry,
  FunctionCallContext,
  AdvancedSafeFunction,
  
  // Additional types
  ExpressionEvaluator,
  TemplateResult,
  ComplexityAnalysis,
  PerformanceMetrics,
  EvaluationErrorType,
  CallbackContext,
  ArrayOperation,
  ArrayOperationConfig
} from './types';

// Main evaluator class
export { Kangaroo } from './core/evaluator';

// Core components (for advanced usage)
export { ASTParser } from './core/parser';
export { ASTExecutor } from './core/executor';
export { SecurityValidator } from './core/validator';

// Function registry
export { DefaultFunctionRegistry } from './functions/registry';

// Callback support
export { ASTArrayOperations, ASTCallbackEvaluator } from './callbacks/operations';

// Version information
export const VERSION = '0.0.1';

/**
 * Create a new Kangaroo expression evaluator with default settings
 * 
 * @param options Optional configuration options
 * @returns A new Kangaroo evaluator instance
 * 
 * @example
 * ```typescript
 * import { createEvaluator } from 'kangaroo';
 * 
 * const evaluator = createEvaluator({
 *   maxComplexity: 50,
 *   strictMode: true
 * });
 * 
 * const result = evaluator.evaluate('item.name.toUpperCase()', {
 *   item: { name: 'john' }
 * });
 * // { success: true, value: 'JOHN' }
 * ```
 */
export function createEvaluator(options?: EvaluatorOptions): Kangaroo {
  return new Kangaroo(options);
}

/**
 * Quick evaluation function for simple use cases
 * 
 * @param expression The expression to evaluate
 * @param context Optional context object
 * @param options Optional evaluator options
 * @returns Evaluation result
 * 
 * @example
 * ```typescript
 * import { evaluate } from 'kangaroo';
 * 
 * const result = evaluate('Math.round(item.price * 1.2)', {
 *   item: { price: 10.99 }
 * });
 * // { success: true, value: 13 }
 * ```
 */
export function evaluate(
  expression: string, 
  context?: ExpressionContext, 
  options?: EvaluatorOptions
): EvaluationResult {
  const evaluator = new Kangaroo(options);
  return evaluator.evaluate(expression, context);
}

/**
 * Quick validation function for simple use cases
 * 
 * @param expression The expression to validate
 * @param options Optional evaluator options
 * @returns Validation result
 * 
 * @example
 * ```typescript
 * import { validate } from 'kangaroo';
 * 
 * const validation = validate('item.name.toUpperCase()');
 * // { isValid: true, violations: [] }
 * 
 * const invalid = validate('eval("malicious code")');
 * // { isValid: false, violations: [{ type: 'blocked_identifier', ... }] }
 * ```
 */
export function validate(expression: string, options?: EvaluatorOptions): SecurityValidation {
  const evaluator = new Kangaroo(options);
  return evaluator.validate(expression);
}

/**
 * Check if an expression is a template (contains {{}} syntax)
 * 
 * @param expression The expression to check
 * @returns True if the expression contains template syntax
 * 
 * @example
 * ```typescript
 * import { isTemplate } from 'kangaroo';
 * 
 * isTemplate('Hello {{item.name}}!'); // true
 * isTemplate('item.name.toUpperCase()'); // false
 * ```
 */
export function isTemplate(expression: string): boolean {
  return /\{\{[^{}]*\}\}/.test(expression);
}

// Default export for convenience
export default Kangaroo;