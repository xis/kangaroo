/**
 * AST Executor - Safe expression execution without eval()
 * 
 * This module executes AST nodes safely by manually interpreting each node type
 * instead of using JavaScript's eval() or Function() constructor.
 */

import type { Node } from 'acorn';
import type {
  ExpressionContext,
  EvaluationResult,
  FunctionRegistry,
  SafeFunction,
  PerformanceMetrics
} from '@/types';

/**
 * Execution options for fine-tuning behavior
 */
export interface ExecutionOptions {
  /** Maximum execution time in milliseconds */
  timeout?: number;
  
  /** Maximum stack depth for recursion protection */
  maxStackDepth?: number;
  
  /** Whether to collect performance metrics */
  collectMetrics?: boolean;
  
  /** Whether to enable debugging information */
  enableDebugging?: boolean;
  
  /** Custom error handler */
  errorHandler?: (error: Error, node: Node, context: ExpressionContext) => any | undefined;
}

/**
 * Execution context with stack tracking
 */
interface ExecutionStackFrame {
  node: Node;
  depth: number;
  startTime: number;
  functionName?: string;
}

/**
 * Array operations interface for callback support
 */
export interface ArrayOperations {
  filter(array: any[], callbackNode: Node, context: ExpressionContext): any[];
  map(array: any[], callbackNode: Node, context: ExpressionContext): any[];
  find(array: any[], callbackNode: Node, context: ExpressionContext): any;
  some(array: any[], callbackNode: Node, context: ExpressionContext): boolean;
  every(array: any[], callbackNode: Node, context: ExpressionContext): boolean;
  reduce(array: any[], callbackNode: Node, initialValue: any, context: ExpressionContext): any;
}

/**
 * Enhanced AST executor with comprehensive safety features
 */
export class ASTExecutor {
  private functionRegistry: FunctionRegistry;
  private arrayOperations: ArrayOperations | null = null;
  private executionStack: ExecutionStackFrame[] = [];
  private startTime = 0;
  private options: ExecutionOptions;

  // Safe property access cache for performance
  private propertyCache = new Map<string, any>();
  private cacheSize = 0;
  private readonly maxCacheSize = 1000;

  // Execution statistics
  private stats = {
    totalExecutions: 0,
    totalTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0,
  };

  constructor(functionRegistry: FunctionRegistry, options: ExecutionOptions = {}) {
    this.functionRegistry = functionRegistry;
    this.options = {
      timeout: 5000,
      maxStackDepth: 50,
      collectMetrics: false,
      enableDebugging: false,
      ...options,
    };
  }

  /**
   * Set array operations implementation for callback support
   */
  public setArrayOperations(arrayOperations: ArrayOperations): void {
    this.arrayOperations = arrayOperations;
  }

  /**
   * Execute an AST node safely and return the result
   * 
   * @param node The AST node to execute
   * @param context The execution context with variables
   * @param options Optional execution configuration
   * @returns Evaluation result with value or error
   */
  public execute(
    node: Node, 
    context: ExpressionContext = {}, 
    options?: ExecutionOptions
  ): EvaluationResult {
    const executeOptions = { ...this.options, ...options };
    this.startTime = Date.now();
    this.executionStack = [];
    
    const metrics: PerformanceMetrics | undefined = executeOptions.collectMetrics ? {
      parseTime: 0,
      validationTime: 0,
      executionTime: 0,
      totalTime: 0,
    } : undefined;

    try {
      this.stats.totalExecutions++;
      
      // Check for timeout at start
      this.checkTimeout(executeOptions.timeout || 5000);
      
      const value = this.executeNode(node, context, executeOptions);
      const executionTime = Date.now() - this.startTime;
      
      this.stats.totalTime += executionTime;
      
      if (metrics) {
        metrics.executionTime = executionTime;
        metrics.totalTime = executionTime;
      }

      return {
        success: true,
        value,
        metadata: {
          executionTime,
          complexity: this.calculateNodeComplexity(node),
          accessedVariables: this.extractAccessedVariables(node, context),
          calledFunctions: this.extractCalledFunctions(node),
        },
      };
    } catch (error) {
      this.stats.errors++;
      const executionTime = Date.now() - this.startTime;
      
      if (metrics) {
        metrics.executionTime = executionTime;
        metrics.totalTime = executionTime;
      }

      // Use custom error handler if provided
      if (executeOptions.errorHandler) {
        try {
          const handledResult = executeOptions.errorHandler(error as Error, node, context);
          return {
            success: true,
            value: handledResult,
            metadata: { executionTime },
          };
        } catch (handlerError) {
          // Fall through to default error handling
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown execution error',
        errorType: this.categorizeError(error as Error) as any,
        metadata: { executionTime },
      };
    } finally {
      this.executionStack = [];
    }
  }

  /**
   * Get execution statistics
   */
  public getStats(): typeof this.stats {
    return { ...this.stats };
  }

  /**
   * Reset execution statistics
   */
  public resetStats(): void {
    this.stats = {
      totalExecutions: 0,
      totalTime: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
    };
  }

  /**
   * Clear property access cache
   */
  public clearCache(): void {
    this.propertyCache.clear();
    this.cacheSize = 0;
  }

  /**
   * Execute a specific AST node based on its type
   */
  private executeNode(
    node: Node, 
    context: ExpressionContext, 
    options: ExecutionOptions
  ): any {
    // Check execution limits
    this.checkTimeout(options.timeout || 5000);
    this.checkStackDepth(options.maxStackDepth || 50);
    
    // Push to execution stack
    const stackFrame: ExecutionStackFrame = {
      node,
      depth: this.executionStack.length,
      startTime: Date.now(),
    };
    this.executionStack.push(stackFrame);

    try {
      switch (node.type) {
        case 'Literal':
          return this.executeLiteral(node as any);

        case 'Identifier':
          return this.executeIdentifier(node as any, context);

        case 'MemberExpression':
          return this.executeMemberExpression(node as any, context, options);

        case 'CallExpression':
          return this.executeCallExpression(node as any, context, options);

        case 'BinaryExpression':
          return this.executeBinaryExpression(node as any, context, options);

        case 'LogicalExpression':
          return this.executeLogicalExpression(node as any, context, options);

        case 'ConditionalExpression':
          return this.executeConditionalExpression(node as any, context, options);

        case 'UnaryExpression':
          return this.executeUnaryExpression(node as any, context, options);

        case 'ArrayExpression':
          return this.executeArrayExpression(node as any, context, options);

        case 'ObjectExpression':
          return this.executeObjectExpression(node as any, context, options);

        default:
          throw new Error(`Unsupported node type: ${node.type}`);
      }
    } finally {
      this.executionStack.pop();
    }
  }

  /**
   * Execute literal nodes (strings, numbers, booleans, null)
   */
  private executeLiteral(node: any): any {
    return node.value;
  }

  /**
   * Execute identifier nodes (variable references)
   */
  private executeIdentifier(node: any, context: ExpressionContext): any {
    const name = node.name;

    // Check context variables first
    if (name in context) {
      return (context as any)[name];
    }

    // Check built-in constants
    switch (name) {
      case 'undefined':
        return undefined;
      case 'null':
        return null;
      case 'true':
        return true;
      case 'false':
        return false;
      case 'Infinity':
        return Infinity;
      case 'NaN':
        return NaN;
      default:
        // If identifier is not in context, it's undefined (JavaScript behavior)
        return undefined;
    }
  }

  /**
   * Execute member expression nodes (property access)
   */
  private executeMemberExpression(
    node: any, 
    context: ExpressionContext, 
    options: ExecutionOptions
  ): any {
    const object = this.executeNode(node.object, context, options);

    if (object == null) {
      return undefined;
    }

    let property: string | number;

    if (node.computed) {
      // Dynamic access: obj[prop]
      property = this.executeNode(node.property, context, options);
    } else {
      // Static access: obj.prop
      if (node.property.type !== 'Identifier') {
        throw new Error('Invalid property access');
      }
      property = node.property.name;
    }

    return this.safePropertyAccess(object, property);
  }

  /**
   * Execute call expression nodes (function calls)
   */
  private executeCallExpression(
    node: any, 
    context: ExpressionContext, 
    options: ExecutionOptions
  ): any {
    if (node.callee.type === 'Identifier') {
      // Direct function call: func()
      const args = node.arguments.map((arg: Node) =>
        this.executeNode(arg, context, options)
      );
      return this.executeFunction(node.callee.name, args, context);
    }

    if (node.callee.type === 'MemberExpression') {
      // Method call: obj.method() or Namespace.method()
      const methodName = this.getMethodName(node.callee);
      const fullMethodName = this.getFullMethodName(node.callee);

      if (!methodName) {
        throw new Error('Invalid method call');
      }

      // Check if it's a qualified method like Object.keys() or Math.round()
      if (fullMethodName && this.functionRegistry.has(fullMethodName)) {
        const args = node.arguments.map((arg: Node) =>
          this.executeNode(arg, context, options)
        );
        return this.executeFunction(fullMethodName, args, context);
      }

      // Check if this is a callback method that needs special handling
      const object = this.executeNode(node.callee.object, context, options);

      if (this.isCallbackMethod(methodName) && Array.isArray(object)) {
        if (!this.arrayOperations) {
          throw new Error('Array operations not initialized');
        }

        // For callback methods, pass the original AST nodes
        const originalArgs = node.arguments;
        const evaluatedArgs = originalArgs.map((arg: any) => {
          // Keep arrow functions as AST nodes, evaluate others
          if (arg.type === 'ArrowFunctionExpression') {
            return arg; // Pass AST node directly
          } else {
            return this.executeNode(arg, context, options);
          }
        });

        return this.executeCallbackMethod(object, methodName, evaluatedArgs, context);
      } else {
        // Regular method call - evaluate all arguments
        const args = node.arguments.map((arg: Node) =>
          this.executeNode(arg, context, options)
        );
        return this.executeMethod(object, methodName, args);
      }
    }

    throw new Error('Unsupported function call type');
  }

  /**
   * Execute binary expression nodes (+, -, *, /, ==, etc.)
   */
  private executeBinaryExpression(
    node: any, 
    context: ExpressionContext, 
    options: ExecutionOptions
  ): any {
    const left = this.executeNode(node.left, context, options);
    const right = this.executeNode(node.right, context, options);

    switch (node.operator) {
      case '+':
        return left + right;
      case '-':
        return left - right;
      case '*':
        return left * right;
      case '/':
        return left / right;
      case '%':
        return left % right;
      case '**':
        return left ** right;
      case '==':
        return left == right;
      case '!=':
        return left != right;
      case '===':
        return left === right;
      case '!==':
        return left !== right;
      case '<':
        return left < right;
      case '<=':
        return left <= right;
      case '>':
        return left > right;
      case '>=':
        return left >= right;
      case 'in':
        return left in right;
      default:
        throw new Error(`Unsupported binary operator: ${node.operator}`);
    }
  }

  /**
   * Execute logical expression nodes (&&, ||, ??)
   */
  private executeLogicalExpression(
    node: any, 
    context: ExpressionContext, 
    options: ExecutionOptions
  ): any {
    const left = this.executeNode(node.left, context, options);

    switch (node.operator) {
      case '&&':
        return left && this.executeNode(node.right, context, options);
      case '||':
        return left || this.executeNode(node.right, context, options);
      case '??':
        return left ?? this.executeNode(node.right, context, options);
      default:
        throw new Error(`Unsupported logical operator: ${node.operator}`);
    }
  }

  /**
   * Execute conditional expression nodes (ternary operator)
   */
  private executeConditionalExpression(
    node: any, 
    context: ExpressionContext, 
    options: ExecutionOptions
  ): any {
    const test = this.executeNode(node.test, context, options);
    return test
      ? this.executeNode(node.consequent, context, options)
      : this.executeNode(node.alternate, context, options);
  }

  /**
   * Execute unary expression nodes (+, -, !, typeof)
   */
  private executeUnaryExpression(
    node: any, 
    context: ExpressionContext, 
    options: ExecutionOptions
  ): any {
    const argument = this.executeNode(node.argument, context, options);

    switch (node.operator) {
      case '+':
        return +argument;
      case '-':
        return -argument;
      case '!':
        return !argument;
      case 'typeof':
        return typeof argument;
      case 'void':
        return void argument;
      default:
        throw new Error(`Unsupported unary operator: ${node.operator}`);
    }
  }

  /**
   * Execute array expression nodes ([1, 2, 3])
   */
  private executeArrayExpression(
    node: any, 
    context: ExpressionContext, 
    options: ExecutionOptions
  ): any {
    return node.elements.map((element: Node | null) =>
      element ? this.executeNode(element, context, options) : undefined
    );
  }

  /**
   * Execute object expression nodes ({key: value})
   */
  private executeObjectExpression(
    node: any, 
    context: ExpressionContext, 
    options: ExecutionOptions
  ): any {
    const result: Record<string, any> = {};

    for (const property of node.properties) {
      if (property.type !== 'Property') {
        throw new Error('Unsupported object property type');
      }

      let key: string;
      if (property.computed) {
        key = String(this.executeNode(property.key, context, options));
      } else if (property.key.type === 'Identifier') {
        key = property.key.name;
      } else if (property.key.type === 'Literal') {
        key = String(property.key.value);
      } else {
        throw new Error('Invalid property key');
      }

      const value = this.executeNode(property.value, context, options);
      result[key] = value;
    }

    return result;
  }

  /**
   * Execute a registered function
   */
  private executeFunction(name: string, args: any[], context: ExpressionContext): any {
    const func = this.functionRegistry.get(name);
    if (!func) {
      throw new Error(`Function '${name}' is not defined`);
    }

    this.validateFunctionCall(func, args, false);
    
    // Update stack frame with function name
    if (this.executionStack.length > 0) {
      this.executionStack[this.executionStack.length - 1]!.functionName = name;
    }

    try {
      return func.fn(...args);
    } catch (error) {
      throw new Error(`Error in function '${name}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute a method call on an object
   */
  private executeMethod(
    object: any,
    methodName: string,
    args: any[]
  ): any {
    const func = this.functionRegistry.get(methodName);
    if (!func) {
      throw new Error(`Method '${methodName}' is not defined`);
    }

    // For method calls, pass the object as the first argument
    const allArgs = [object, ...args];
    this.validateFunctionCall(func, allArgs, true);
    
    try {
      return func.fn(...allArgs);
    } catch (error) {
      throw new Error(`Error in method '${methodName}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Execute callback method with array operations
   */
  private executeCallbackMethod(
    array: any[],
    methodName: string,
    args: any[],
    context: ExpressionContext
  ): any {
    if (!this.arrayOperations) {
      throw new Error('Array operations not initialized');
    }

    if (args.length === 0) {
      throw new Error(`${methodName} requires a callback argument`);
    }

    const callbackArg = args[0];

    // Check if the callback is an arrow function AST node
    if (
      typeof callbackArg === 'object' &&
      callbackArg?.type === 'ArrowFunctionExpression'
    ) {
      switch (methodName) {
        case 'filter':
          return this.arrayOperations.filter(array, callbackArg, context);
        case 'map':
          return this.arrayOperations.map(array, callbackArg, context);
        case 'find':
          return this.arrayOperations.find(array, callbackArg, context);
        case 'some':
          return this.arrayOperations.some(array, callbackArg, context);
        case 'every':
          return this.arrayOperations.every(array, callbackArg, context);
        case 'reduce':
          const initialValue = args.length > 1 ? args[1] : undefined;
          return this.arrayOperations.reduce(array, callbackArg, initialValue, context);
        default:
          throw new Error(`Unsupported callback method: ${methodName}`);
      }
    } else {
      throw new Error(`${methodName} requires an arrow function callback`);
    }
  }

  /**
   * Validate function call arguments
   */
  private validateFunctionCall(
    func: SafeFunction,
    args: any[],
    isMethodCall: boolean = false
  ): void {
    const effectiveMinArgs = isMethodCall
      ? Math.max(0, (func.minArgs || 0) - 1)
      : func.minArgs || 0;
    const effectiveMaxArgs = func.maxArgs;

    // Check argument count
    if (args.length < effectiveMinArgs) {
      throw new Error(
        `Function '${func.name}' requires at least ${effectiveMinArgs} arguments, got ${args.length}`
      );
    }

    if (effectiveMaxArgs !== undefined && args.length > effectiveMaxArgs) {
      throw new Error(
        `Function '${func.name}' accepts at most ${effectiveMaxArgs} arguments, got ${args.length}`
      );
    }

    // Check argument types if specified
    if (func.typeChecks) {
      for (const [index, typeCheck] of Object.entries(func.typeChecks)) {
        const argIndex = parseInt(index, 10);
        if (argIndex < args.length && !typeCheck(args[argIndex])) {
          throw new Error(
            `Function '${func.name}' argument ${argIndex} has invalid type`
          );
        }
      }
    }
  }

  /**
   * Safe property access with security checks
   */
  private safePropertyAccess(object: any, property: string | number): any {
    // Generate cache key
    const cacheKey = `${typeof object}:${String(property)}`;
    
    // Check cache first for primitive property access
    if (typeof object !== 'object' || object === null) {
      const cached = this.propertyCache.get(cacheKey);
      if (cached !== undefined) {
        this.stats.cacheHits++;
        return cached;
      }
      this.stats.cacheMisses++;
    }

    // Prevent access to dangerous properties
    if (typeof property === 'string') {
      const blockedProps = new Set([
        'constructor',
        'prototype',
        '__proto__',
        '__defineGetter__',
        '__defineSetter__',
        '__lookupGetter__',
        '__lookupSetter__',
        'valueOf',
        'toString',
      ]);

      if (blockedProps.has(property)) {
        throw new Error(
          `Property '${property}' is blocked for security reasons`
        );
      }
    }

    // Handle array bounds checking
    if (Array.isArray(object) && typeof property === 'number') {
      if (property < 0 || property >= object.length) {
        return undefined; // Return undefined for out-of-bounds access
      }
    }

    // Special case for length property on arrays and strings
    if (property === 'length') {
      const result = Array.isArray(object) ? object.length : (object?.length ?? 0);
      this.setCached(cacheKey, result);
      return result;
    }

    const result = object[property];
    
    // Cache primitive results
    if (typeof result !== 'object' || result === null) {
      this.setCached(cacheKey, result);
    }

    return result;
  }

  /**
   * Check if method is a callback method
   */
  private isCallbackMethod(methodName: string): boolean {
    return ['filter', 'map', 'find', 'some', 'every', 'reduce'].includes(methodName);
  }

  /**
   * Get method name from member expression
   */
  private getMethodName(memberExpression: any): string | null {
    if (
      !memberExpression.computed &&
      memberExpression.property?.type === 'Identifier'
    ) {
      return memberExpression.property.name;
    }
    return null;
  }

  /**
   * Get full method name (e.g., "Math.round") from member expression
   */
  private getFullMethodName(memberExpression: any): string | null {
    if (
      !memberExpression.computed &&
      memberExpression.property?.type === 'Identifier'
    ) {
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
   * Check for execution timeout
   */
  private checkTimeout(timeoutMs: number): void {
    if (Date.now() - this.startTime > timeoutMs) {
      throw new Error(`Execution timeout after ${timeoutMs}ms`);
    }
  }

  /**
   * Check for stack depth overflow
   */
  private checkStackDepth(maxDepth: number): void {
    if (this.executionStack.length >= maxDepth) {
      throw new Error(`Maximum stack depth exceeded (${maxDepth})`);
    }
  }

  /**
   * Categorize error types for better error handling
   */
  private categorizeError(error: Error): 'syntax' | 'security' | 'runtime' | 'type' | 'timeout' {
    const message = error.message.toLowerCase();
    
    if (message.includes('timeout')) {
      return 'timeout';
    } else if (message.includes('blocked') || message.includes('security')) {
      return 'security';
    } else if (message.includes('type') || message.includes('argument')) {
      return 'type';
    } else if (message.includes('syntax') || message.includes('invalid')) {
      return 'syntax';
    } else {
      return 'runtime';
    }
  }

  /**
   * Calculate complexity of a node
   */
  private calculateNodeComplexity(node: Node): number {
    let complexity = 0;
    
    const walk = (n: Node): void => {
      complexity += 0.5;
      for (const key in n) {
        const value = (n as any)[key];
        if (value && typeof value === 'object') {
          if (Array.isArray(value)) {
            value.forEach(child => {
              if (child && typeof child === 'object' && child.type) {
                walk(child);
              }
            });
          } else if (value.type) {
            walk(value);
          }
        }
      }
    };
    
    walk(node);
    return complexity;
  }

  /**
   * Extract accessed variables from execution
   */
  private extractAccessedVariables(node: Node, context: ExpressionContext): string[] {
    const variables = new Set<string>();
    
    const walk = (n: Node): void => {
      if (n.type === 'Identifier') {
        const identifier = n as any;
        if (identifier.name in context) {
          variables.add(identifier.name);
        }
      }
      
      for (const key in n) {
        const value = (n as any)[key];
        if (value && typeof value === 'object') {
          if (Array.isArray(value)) {
            value.forEach(child => {
              if (child && typeof child === 'object' && child.type) {
                walk(child);
              }
            });
          } else if (value.type) {
            walk(value);
          }
        }
      }
    };
    
    walk(node);
    return Array.from(variables);
  }

  /**
   * Extract called functions from execution
   */
  private extractCalledFunctions(node: Node): string[] {
    const functions = new Set<string>();
    
    const walk = (n: Node): void => {
      if (n.type === 'CallExpression') {
        const callExpr = n as any;
        if (callExpr.callee?.type === 'Identifier') {
          functions.add(callExpr.callee.name);
        }
      }
      
      for (const key in n) {
        const value = (n as any)[key];
        if (value && typeof value === 'object') {
          if (Array.isArray(value)) {
            value.forEach(child => {
              if (child && typeof child === 'object' && child.type) {
                walk(child);
              }
            });
          } else if (value.type) {
            walk(value);
          }
        }
      }
    };
    
    walk(node);
    return Array.from(functions);
  }

  /**
   * Set value in property cache with size management
   */
  private setCached(key: string, value: any): void {
    if (this.cacheSize >= this.maxCacheSize) {
      // Simple LRU: remove first entry
      const firstKey = this.propertyCache.keys().next().value;
      if (firstKey) {
        this.propertyCache.delete(firstKey);
        this.cacheSize--;
      }
    }
    
    this.propertyCache.set(key, value);
    this.cacheSize++;
  }
}