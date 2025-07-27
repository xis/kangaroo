/**
 * Core types for the Kangaroo expression evaluator
 * 
 * This module defines the fundamental interfaces and types used throughout
 * the expression evaluation system, providing a secure and type-safe API.
 */

import type { Node } from 'acorn';
import type { SafeFunction } from './functions';

/**
 * Context object that provides data and variables to expressions
 * 
 * @example
 * ```typescript
 * const context: ExpressionContext = {
 *   item: { name: 'John', age: 30 },
 *   inputs: { userInput: 'hello' },
 *   outputs: { processedData: [1, 2, 3] }
 * };
 * ```
 */
export interface ExpressionContext {
  /** The primary data item being processed in the expression */
  item?: any;
  
  /** Input data from previous workflow steps or external sources */
  inputs?: Record<string, any[]>;
  
  /** Output data from previous workflow steps */
  outputs?: Record<string, any[]>;
  
  /** Current workflow node information */
  node?: {
    id: string;
    name?: string;
    type?: string;
  };
  
  /** Current execution context information */
  execution?: {
    id: string;
    state?: string;
  };
  
  /** Additional custom context variables */
  [key: string]: any;
}

/**
 * Result of expression evaluation
 * 
 * @template T The type of the evaluated value
 */
export interface EvaluationResult<T = any> {
  /** Whether the evaluation was successful */
  success: boolean;
  
  /** The evaluated value (only present if success is true) */
  value?: T;
  
  /** Error message (only present if success is false) */
  error?: string;
  
  /** Type of error that occurred */
  errorType?: 'syntax' | 'security' | 'runtime' | 'type' | 'complexity';
  
  /** Position where the error occurred */
  position?: {
    line: number;
    column: number;
  };
  
  /** Additional metadata about the evaluation */
  metadata?: {
    /** Time taken to evaluate in milliseconds */
    executionTime?: number;
    
    /** Complexity score of the expression */
    complexity?: number;
    
    /** Variables that were accessed during evaluation */
    accessedVariables?: string[];
    
    /** Functions that were called during evaluation */
    calledFunctions?: string[];
  };
}

/**
 * Security validation result for expressions
 */
export interface SecurityValidation {
  /** Whether the expression passes all security checks */
  isValid: boolean;
  
  /** List of security violations found */
  violations: SecurityViolation[];
  
  /** Security metadata */
  metadata?: {
    /** Overall risk level of the expression */
    riskLevel: 'low' | 'medium' | 'high';
    
    /** Security rules that were checked */
    rulesChecked: string[];
    
    /** Time taken for validation in milliseconds */
    validationTime?: number;
  };
}

/**
 * Individual security violation
 */
export interface SecurityViolation {
  /** Type of security violation */
  type: 'blocked_identifier' | 'blocked_property' | 'invalid_node_type' | 'blocked_pattern' | 'complexity_limit' | 'depth_limit';
  
  /** Human-readable description of the violation */
  message: string;
  
  /** AST node where the violation occurred */
  node?: Node;
  
  /** Position in the source code where the violation occurred */
  position?: {
    line: number;
    column: number;
  };
  
  /** Severity level of the violation */
  severity?: 'error' | 'warning';
  
  /** Suggested fix for the violation */
  suggestion?: string;
}

/**
 * Parsed expression with metadata
 */
export interface ParsedExpression {
  /** The parsed AST */
  ast: Node;
  
  /** Set of variables that the expression depends on */
  dependencies: Set<string>;
  
  /** Set of functions called in the expression */
  functions: Set<string>;
  
  /** Complexity score of the expression */
  complexity: number;
  
  /** Whether this is a simple expression (just property access) */
  isSimple: boolean;
  
  /** Whether this expression has template syntax {{}} */
  hasTemplates: boolean;
  
  /** Maximum nesting depth of the expression */
  depth: number;
  
  /** Estimated memory usage for evaluation */
  estimatedMemoryUsage?: number;
}

/**
 * Configuration options for the expression evaluator
 */
export interface EvaluatorOptions {
  /** Maximum complexity score allowed for expressions (default: 100) */
  maxComplexity?: number;
  
  /** Maximum nesting depth allowed (default: 10) */
  maxDepth?: number;
  
  /** Whether to enable debugging information (default: false) */
  enableDebugging?: boolean;
  
  /** Custom functions to add to the registry */
  customFunctions?: SafeFunction[];
  
  /** Whether to use strict mode validation (default: true) */
  strictMode?: boolean;
  
  /** Timeout for expression evaluation in milliseconds (default: 5000) */
  timeout?: number;
  
  /** Whether to cache parsed expressions (default: true) */
  enableCaching?: boolean;
  
  /** Maximum cache size for parsed expressions (default: 1000) */
  maxCacheSize?: number;
  
  /** Whether to collect performance metrics (default: false) */
  collectMetrics?: boolean;
  
  /** Custom security rules to apply */
  customSecurityRules?: SecurityRule[];
}

/**
 * Supported AST node types for expression evaluation
 */
export type SupportedNodeType = 
  | 'MemberExpression'
  | 'CallExpression'
  | 'Literal'
  | 'Identifier'
  | 'BinaryExpression'
  | 'ConditionalExpression'
  | 'ArrayExpression'
  | 'ObjectExpression'
  | 'Property'
  | 'UnaryExpression'
  | 'LogicalExpression'
  | 'ArrowFunctionExpression'
  | 'TemplateLiteral'
  | 'TemplateElement';

/**
 * Handler for specific AST node types
 */
export interface ASTNodeHandler<T extends Node = Node> {
  /** The AST node type this handler processes */
  nodeType: SupportedNodeType;
  
  /** Validates the node for security issues */
  validate: (node: T) => SecurityValidation;
  
  /** Executes the node and returns the result */
  execute: (node: T, context: ExpressionContext) => any;
  
  /** Calculates complexity score for this node */
  calculateComplexity?: (node: T) => number;
  
  /** Extracts dependencies from this node */
  extractDependencies?: (node: T) => string[];
}

/**
 * Custom security rule definition
 */
export interface SecurityRule {
  /** Unique identifier for the rule */
  id: string;
  
  /** Human-readable name of the rule */
  name: string;
  
  /** Description of what the rule checks */
  description: string;
  
  /** Severity level if rule is violated */
  severity: 'error' | 'warning';
  
  /** Function that checks if the rule is violated */
  check: (node: Node, context?: ExpressionContext) => boolean;
  
  /** Error message if rule is violated */
  message: string;
  
  /** Suggested fix for the violation */
  suggestion?: string;
}