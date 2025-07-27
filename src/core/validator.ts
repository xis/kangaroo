/**
 * Security Validator - Enhanced security validation for AST nodes
 * 
 * This module provides comprehensive security validation to prevent malicious
 * code execution while allowing safe expression evaluation.
 */

import type { Node } from 'acorn';
import type { 
  SecurityValidation, 
  SecurityViolation, 
  SupportedNodeType,
  FunctionRegistry,
  SecurityRule,
  ExpressionContext
} from '@/types';

/**
 * Security rule severity levels
 */
type Severity = 'error' | 'warning';

/**
 * Built-in security rule definitions
 */
interface BuiltInRule {
  id: string;
  name: string;
  description: string;
  severity: Severity;
  check: (node: Node, context?: ExpressionContext) => boolean;
  message: string;
  suggestion?: string;
}

/**
 * Comprehensive security validator with extensible rule system
 */
export class SecurityValidator {
  private functionRegistry: FunctionRegistry;
  private customRules: Map<string, SecurityRule> = new Map();
  private validationCache = new Map<string, SecurityValidation>();
  private cacheSize = 0;
  private readonly maxCacheSize = 500;

  // Dangerous identifiers that should never be accessible
  private readonly blockedIdentifiers = new Set([
    // JavaScript globals
    'eval', 'Function', 'constructor', 'prototype', '__proto__',
    'window', 'document', 'global', 'globalThis', 'self', 'parent', 'top', 'frames',
    
    // Node.js globals
    'process', 'require', 'module', 'exports', '__dirname', '__filename',
    'Buffer', 'setImmediate', 'clearImmediate', 'setInterval', 'clearInterval',
    
    // Browser APIs
    'alert', 'confirm', 'prompt', 'console', 'fetch', 'XMLHttpRequest',
    'localStorage', 'sessionStorage', 'indexedDB', 'location', 'history', 'navigator',
    
    // Timers (could be used for DoS)
    'setTimeout', 'clearTimeout',
    
    // Workers and imports
    'Worker', 'SharedWorker', 'ServiceWorker', 'importScripts', 'import',
    
    // WebAssembly
    'WebAssembly',
    
    // Other dangerous APIs
    'WebSocket', 'EventSource', 'FileReader', 'Blob', 'URL', 'URLSearchParams',
    'postMessage', 'MessageChannel', 'BroadcastChannel',
    
    // Error constructors that could leak information
    'Error', 'SyntaxError', 'ReferenceError', 'TypeError',
  ]);

  // Dangerous property names that should not be accessed
  private readonly blockedProperties = new Set([
    'constructor', 'prototype', '__proto__', '__defineGetter__', '__defineSetter__',
    '__lookupGetter__', '__lookupSetter__', 'valueOf', 'toString',
    'hasOwnProperty', 'isPrototypeOf', 'propertyIsEnumerable',
    '__defineProperty__', '__getOwnPropertyDescriptor__', '__getPrototypeOf__',
    '__setPrototypeOf__', 'apply', 'call', 'bind',
  ]);

  // Allowed node types in our AST
  private readonly supportedNodeTypes: Set<string> = new Set([
    'MemberExpression',
    'CallExpression', 
    'Literal',
    'Identifier',
    'BinaryExpression',
    'ConditionalExpression',
    'ArrayExpression',
    'ObjectExpression',
    'Property',
    'UnaryExpression',
    'LogicalExpression',
    'ArrowFunctionExpression',
    'TemplateLiteral',
    'TemplateElement',
  ]);

  // Dangerous operators
  private readonly blockedOperators = new Set([
    'instanceof', 'delete', 'new', 'typeof', 'void'
  ]);

  // Dangerous patterns in string literals
  private readonly dangerousPatterns = [
    /javascript:/i,
    /data:text\/html/i,
    /data:application\/javascript/i,
    /vbscript:/i,
    /<script/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /eval\s*\(/i,
    /Function\s*\(/i,
    /setTimeout\s*\(/i,
    /setInterval\s*\(/i,
  ];

  constructor(functionRegistry: FunctionRegistry) {
    this.functionRegistry = functionRegistry;
    this.initializeBuiltInRules();
  }

  /**
   * Validate an AST node and its children for security violations
   * 
   * @param node The AST node to validate
   * @param context Optional context for advanced validation
   * @returns Validation result with any violations found
   */
  public validate(node: Node, context?: ExpressionContext): SecurityValidation {
    const cacheKey = this.getCacheKey(node, context);
    
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!;
    }

    const startTime = Date.now();
    const violations: SecurityViolation[] = [];
    const rulesChecked = new Set<string>();
    
    this.validateNode(node, violations, context, rulesChecked);
    
    const validationTime = Date.now() - startTime;
    const riskLevel = this.assessRiskLevel(violations);
    
    const result: SecurityValidation = {
      isValid: violations.length === 0,
      violations,
      metadata: {
        riskLevel,
        rulesChecked: Array.from(rulesChecked),
        validationTime,
      },
    };

    this.setCached(cacheKey, result);
    return result;
  }

  /**
   * Add a custom security rule
   * 
   * @param rule The security rule to add
   */
  public addRule(rule: SecurityRule): void {
    this.customRules.set(rule.id, rule);
  }

  /**
   * Remove a custom security rule
   * 
   * @param ruleId The ID of the rule to remove
   */
  public removeRule(ruleId: string): void {
    this.customRules.delete(ruleId);
  }

  /**
   * Get all active security rules
   * 
   * @returns Array of all security rules
   */
  public getRules(): SecurityRule[] {
    return Array.from(this.customRules.values());
  }

  /**
   * Clear validation cache
   */
  public clearCache(): void {
    this.validationCache.clear();
    this.cacheSize = 0;
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cacheSize,
      maxSize: this.maxCacheSize,
    };
  }

  /**
   * Validate a single node and recursively validate its children
   */
  private validateNode(
    node: Node, 
    violations: SecurityViolation[], 
    context?: ExpressionContext,
    rulesChecked?: Set<string>
  ): void {
    // Check if node type is supported
    if (!this.supportedNodeTypes.has(node.type as SupportedNodeType)) {
      violations.push({
        type: 'invalid_node_type',
        message: `Node type '${node.type}' is not allowed`,
        node,
        position: this.getPosition(node),
        severity: 'error',
        suggestion: 'Use only supported expression syntax',
      });
      return; // Don't traverse further if node type is blocked
    }

    // Apply built-in validation rules based on node type
    this.applyBuiltInValidation(node, violations, context, rulesChecked);

    // Apply custom security rules
    this.applyCustomRules(node, violations, context, rulesChecked);

    // Recursively validate child nodes
    this.validateChildren(node, violations, context, rulesChecked);
  }

  /**
   * Apply built-in validation rules
   */
  private applyBuiltInValidation(
    node: Node,
    violations: SecurityViolation[],
    context?: ExpressionContext,
    rulesChecked?: Set<string>
  ): void {
    switch (node.type) {
      case 'Identifier':
        this.validateIdentifier(node as any, violations);
        rulesChecked?.add('identifier-validation');
        break;
        
      case 'MemberExpression':
        this.validateMemberExpression(node as any, violations);
        rulesChecked?.add('member-expression-validation');
        break;
        
      case 'CallExpression':
        this.validateCallExpression(node as any, violations);
        rulesChecked?.add('call-expression-validation');
        break;
        
      case 'BinaryExpression':
        this.validateBinaryExpression(node as any, violations);
        rulesChecked?.add('binary-expression-validation');
        break;
        
      case 'UnaryExpression':
        this.validateUnaryExpression(node as any, violations);
        rulesChecked?.add('unary-expression-validation');
        break;
        
      case 'ArrowFunctionExpression':
        this.validateArrowFunction(node as any, violations);
        rulesChecked?.add('arrow-function-validation');
        break;
        
      case 'Literal':
        this.validateLiteral(node as any, violations);
        rulesChecked?.add('literal-validation');
        break;
        
      case 'ObjectExpression':
        this.validateObjectExpression(node as any, violations);
        rulesChecked?.add('object-expression-validation');
        break;
    }
  }

  /**
   * Apply custom security rules
   */
  private applyCustomRules(
    node: Node,
    violations: SecurityViolation[],
    context?: ExpressionContext,
    rulesChecked?: Set<string>
  ): void {
    for (const rule of this.customRules.values()) {
      try {
        if (rule.check(node, context)) {
          violations.push({
            type: 'blocked_pattern',
            message: rule.message,
            node,
            position: this.getPosition(node),
            severity: rule.severity,
            suggestion: rule.suggestion,
          });
        }
        rulesChecked?.add(rule.id);
      } catch (error) {
        // Ignore rule execution errors but log them
        console.warn(`Security rule '${rule.id}' failed:`, error);
      }
    }
  }

  /**
   * Validate identifier nodes
   */
  private validateIdentifier(node: any, violations: SecurityViolation[]): void {
    if (this.blockedIdentifiers.has(node.name)) {
      violations.push({
        type: 'blocked_identifier',
        message: `Identifier '${node.name}' is blocked for security reasons`,
        node,
        position: this.getPosition(node),
        severity: 'error',
        suggestion: 'Use only allowed identifiers and context variables',
      });
    }
  }

  /**
   * Validate member expression nodes
   */
  private validateMemberExpression(node: any, violations: SecurityViolation[]): void {
    // Static property access: obj.prop
    if (!node.computed && node.property?.type === 'Identifier') {
      if (this.blockedProperties.has(node.property.name)) {
        violations.push({
          type: 'blocked_property',
          message: `Property '${node.property.name}' is blocked for security reasons`,
          node,
          position: this.getPosition(node),
          severity: 'error',
          suggestion: 'Avoid accessing prototype chain properties',
        });
      }
    }
    
    // Check for prototype pollution patterns
    if (this.isPrototypePollutionPattern(node)) {
      violations.push({
        type: 'blocked_pattern',
        message: 'Potential prototype pollution pattern detected',
        node,
        position: this.getPosition(node),
        severity: 'error',
        suggestion: 'Use safe property access patterns',
      });
    }

    // Check for deep property chains (potential DoS)
    const chainDepth = this.getPropertyChainDepth(node);
    if (chainDepth > 10) {
      violations.push({
        type: 'depth_limit',
        message: `Property chain too deep (${chainDepth} levels)`,
        node,
        position: this.getPosition(node),
        severity: 'warning',
        suggestion: 'Limit property chain depth to avoid performance issues',
      });
    }
  }

  /**
   * Validate call expression nodes
   */
  private validateCallExpression(node: any, violations: SecurityViolation[]): void {
    // Check if it's a direct function call
    if (node.callee?.type === 'Identifier') {
      const functionName = node.callee.name;
      
      // Check if function is in our registry
      if (!this.functionRegistry.has(functionName)) {
        violations.push({
          type: 'blocked_identifier',
          message: `Function '${functionName}' is not in the allowed function registry`,
          node,
          position: this.getPosition(node),
          severity: 'error',
          suggestion: 'Use only registered safe functions',
        });
      }
    }
    
    // Check for method calls: obj.method() or Namespace.method()
    if (node.callee?.type === 'MemberExpression') {
      const methodName = this.getMethodName(node.callee);
      const fullMethodName = this.getFullMethodName(node.callee);
      
      // Check if this is a built-in callback method (handled specially)
      const isCallbackMethod = methodName && ['filter', 'map', 'find', 'some', 'every', 'reduce'].includes(methodName);
      
      if (isCallbackMethod) {
        this.validateCallbackMethodCall(node, violations);
      } else {
        // For regular methods, check the function registry
        const hasMethod = methodName && this.functionRegistry.has(methodName);
        const hasFullMethod = fullMethodName && this.functionRegistry.has(fullMethodName);
        
        if (!hasMethod && !hasFullMethod) {
          violations.push({
            type: 'blocked_identifier',
            message: `Method '${fullMethodName || methodName}' is not in the allowed function registry`,
            node,
            position: this.getPosition(node),
            severity: 'error',
            suggestion: 'Use only registered safe methods',
          });
        }
      }
    }

    // Check for excessive arguments (potential DoS)
    if (node.arguments && node.arguments.length > 20) {
      violations.push({
        type: 'complexity_limit',
        message: `Too many function arguments (${node.arguments.length})`,
        node,
        position: this.getPosition(node),
        severity: 'warning',
        suggestion: 'Limit function arguments to reasonable numbers',
      });
    }
  }

  /**
   * Validate callback method calls
   */
  private validateCallbackMethodCall(node: any, violations: SecurityViolation[]): void {
    if (!node.arguments || node.arguments.length === 0) {
      violations.push({
        type: 'blocked_pattern',
        message: 'Callback methods require at least one argument',
        node,
        position: this.getPosition(node),
        severity: 'error',
        suggestion: 'Provide a callback function for array methods',
      });
      return;
    }

    const firstArg = node.arguments[0];
    
    // For now, we only support arrow functions as callbacks
    if (firstArg.type !== 'ArrowFunctionExpression') {
      violations.push({
        type: 'blocked_pattern',
        message: 'Callback methods require arrow function arguments',
        node,
        position: this.getPosition(node),
        severity: 'error',
        suggestion: 'Use arrow functions for array method callbacks',
      });
    }
  }

  /**
   * Validate binary expression nodes
   */
  private validateBinaryExpression(node: any, violations: SecurityViolation[]): void {
    if (this.blockedOperators.has(node.operator)) {
      violations.push({
        type: 'blocked_pattern',
        message: `Operator '${node.operator}' is not allowed`,
        node,
        position: this.getPosition(node),
        severity: 'error',
        suggestion: 'Use only safe operators for comparisons and arithmetic',
      });
    }
  }

  /**
   * Validate unary expression nodes
   */
  private validateUnaryExpression(node: any, violations: SecurityViolation[]): void {
    if (this.blockedOperators.has(node.operator)) {
      violations.push({
        type: 'blocked_pattern',
        message: `Operator '${node.operator}' is not allowed`,
        node,
        position: this.getPosition(node),
        severity: 'error',
        suggestion: 'Use only safe unary operators',
      });
    }
  }

  /**
   * Validate arrow function nodes
   */
  private validateArrowFunction(node: any, violations: SecurityViolation[]): void {
    // Validate parameters
    if (!Array.isArray(node.params)) {
      violations.push({
        type: 'invalid_node_type',
        message: 'Arrow function parameters must be an array',
        node,
        position: this.getPosition(node),
        severity: 'error',
      });
      return;
    }

    // Limit parameter count
    if (node.params.length > 4) {
      violations.push({
        type: 'complexity_limit',
        message: `Arrow functions cannot have more than 4 parameters (got ${node.params.length})`,
        node,
        position: this.getPosition(node),
        severity: 'error',
        suggestion: 'Limit arrow function parameters to (item, index, array)',
      });
    }

    // Validate parameter names
    for (const param of node.params) {
      if (param.type !== 'Identifier') {
        violations.push({
          type: 'invalid_node_type',
          message: 'Arrow function parameters must be simple identifiers',
          node,
          position: this.getPosition(node),
          severity: 'error',
        });
        continue;
      }

      if (this.blockedIdentifiers.has(param.name)) {
        violations.push({
          type: 'blocked_identifier',
          message: `Parameter name '${param.name}' is blocked for security reasons`,
          node,
          position: this.getPosition(node),
          severity: 'error',
        });
      }
    }
  }

  /**
   * Validate literal nodes
   */
  private validateLiteral(node: any, violations: SecurityViolation[]): void {
    if (typeof node.value === 'string') {
      // Check for dangerous patterns in string literals
      for (const pattern of this.dangerousPatterns) {
        if (pattern.test(node.value)) {
          violations.push({
            type: 'blocked_pattern',
            message: `String literal contains dangerous pattern: ${pattern.source}`,
            node,
            position: this.getPosition(node),
            severity: 'error',
            suggestion: 'Avoid script injection patterns in strings',
          });
        }
      }

      // Check for excessively long strings (potential DoS)
      if (node.value.length > 10000) {
        violations.push({
          type: 'complexity_limit',
          message: `String literal too long (${node.value.length} characters)`,
          node,
          position: this.getPosition(node),
          severity: 'warning',
          suggestion: 'Limit string length to reasonable sizes',
        });
      }
    }
  }

  /**
   * Validate object expression nodes
   */
  private validateObjectExpression(node: any, violations: SecurityViolation[]): void {
    if (node.properties && node.properties.length > 50) {
      violations.push({
        type: 'complexity_limit',
        message: `Object literal has too many properties (${node.properties.length})`,
        node,
        position: this.getPosition(node),
        severity: 'warning',
        suggestion: 'Limit object properties to reasonable numbers',
      });
    }
  }

  /**
   * Validate child nodes recursively
   */
  private validateChildren(
    node: Node, 
    violations: SecurityViolation[], 
    context?: ExpressionContext,
    rulesChecked?: Set<string>
  ): void {
    for (const key in node) {
      const value = (node as any)[key];
      
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          value.forEach(child => {
            if (child && typeof child === 'object' && child.type) {
              this.validateNode(child, violations, context, rulesChecked);
            }
          });
        } else if (value.type) {
          this.validateNode(value, violations, context, rulesChecked);
        }
      }
    }
  }

  /**
   * Check for prototype pollution patterns
   */
  private isPrototypePollutionPattern(node: any): boolean {
    // Check for patterns like obj['__proto__'] or obj.constructor.prototype
    if (node.computed && node.property?.type === 'Literal') {
      const propertyValue = node.property.value;
      if (typeof propertyValue === 'string' && this.blockedProperties.has(propertyValue)) {
        return true;
      }
    }
    
    // Check for nested prototype access patterns
    if (node.object?.type === 'MemberExpression') {
      return this.isPrototypePollutionPattern(node.object);
    }
    
    return false;
  }

  /**
   * Calculate property chain depth
   */
  private getPropertyChainDepth(node: any): number {
    let depth = 1;
    let current = node;
    
    while (current.object?.type === 'MemberExpression') {
      depth++;
      current = current.object;
    }
    
    return depth;
  }

  /**
   * Get method name from member expression
   */
  private getMethodName(memberExpression: any): string | null {
    if (!memberExpression.computed && memberExpression.property?.type === 'Identifier') {
      return memberExpression.property.name;
    }
    return null;
  }

  /**
   * Get full method name (e.g., "Math.round") from member expression
   */
  private getFullMethodName(memberExpression: any): string | null {
    if (!memberExpression.computed && memberExpression.property?.type === 'Identifier') {
      const methodName = memberExpression.property.name;
      
      if (memberExpression.object?.type === 'Identifier') {
        const objectName = memberExpression.object.name;
        const staticNamespaces = new Set([
          'Object', 'Math', 'JSON', 'Date', 'Array', 'Crypto', 'String', 'Number'
        ]);
        
        if (staticNamespaces.has(objectName)) {
          return `${objectName}.${methodName}`;
        }
      }
    }
    
    return null;
  }

  /**
   * Get position information from AST node
   */
  private getPosition(node: Node): { line: number; column: number } | undefined {
    if (node.loc) {
      return {
        line: node.loc.start.line,
        column: node.loc.start.column,
      };
    }
    return undefined;
  }

  /**
   * Assess overall risk level based on violations
   */
  private assessRiskLevel(violations: SecurityViolation[]): 'low' | 'medium' | 'high' {
    const errorCount = violations.filter(v => v.severity === 'error').length;
    const warningCount = violations.filter(v => v.severity === 'warning').length;
    
    if (errorCount > 0) {
      return 'high';
    } else if (warningCount > 2) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Generate cache key for validation results
   */
  private getCacheKey(node: Node, context?: ExpressionContext): string {
    // Simple hash based on node type and basic properties
    const nodeKey = `${node.type}:${JSON.stringify(node).substring(0, 100)}`;
    const contextKey = context ? JSON.stringify(context).substring(0, 50) : '';
    return `${nodeKey}|${contextKey}`;
  }

  /**
   * Set value in cache with size management
   */
  private setCached(key: string, value: SecurityValidation): void {
    if (this.cacheSize >= this.maxCacheSize) {
      // Simple LRU: remove first entry
      const firstKey = this.validationCache.keys().next().value;
      if (firstKey) {
        this.validationCache.delete(firstKey);
        this.cacheSize--;
      }
    }
    
    this.validationCache.set(key, value);
    this.cacheSize++;
  }

  /**
   * Initialize built-in security rules
   */
  private initializeBuiltInRules(): void {
    // Built-in rules are implemented as methods above
    // Custom rules can be added via addRule()
  }
}