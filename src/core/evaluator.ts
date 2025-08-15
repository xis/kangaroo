/**
 * Kangaroo Expression Evaluator - Main evaluator class
 * 
 * This is the primary entry point for the Kangaroo expression evaluator.
 * It combines the AST parser, security validator, and executor into a
 * cohesive, easy-to-use interface.
 */

import type {
  ExpressionEvaluator,
  ExpressionContext,
  EvaluationResult,
  SecurityValidation,
  ParsedExpression,
  EvaluatorOptions,
  SafeFunction,
  FunctionCategory,
  TemplateResult,
  PerformanceMetrics
} from '@/types';

import { ASTParser } from './parser';
import { SecurityValidator } from './validator';
import { ASTExecutor, type ExecutionOptions } from './executor';
import { DefaultFunctionRegistry } from '@/functions/registry';
import { ASTArrayOperations } from '@/callbacks/operations';
import { getGlobalTypeRegistry } from './type-registry';
import type { TypeRegistry } from '@/types/type-registry';

/**
 * Main Kangaroo expression evaluator class
 * 
 * Provides a secure, fast, and feature-rich expression evaluation engine
 * with comprehensive security validation and rich function library.
 */
export class Kangaroo implements ExpressionEvaluator {
  private parser: ASTParser;
  private validator: SecurityValidator;
  private executor: ASTExecutor;
  private functionRegistry: DefaultFunctionRegistry;
  private arrayOperations: ASTArrayOperations | null = null;
  private typeRegistry: TypeRegistry;
  private options: Required<EvaluatorOptions>;

  // Performance tracking
  private stats = {
    totalEvaluations: 0,
    successfulEvaluations: 0,
    failedEvaluations: 0,
    averageExecutionTime: 0,
    cacheHits: 0,
  };

  // Template cache for repeated template processing
  private templateCache = new Map<string, TemplateResult>();
  private templateCacheSize = 0;
  private readonly maxTemplateCacheSize = 100;

  constructor(options: EvaluatorOptions = {}) {
    // Set up default options
    this.options = {
      maxComplexity: 100,
      maxDepth: 10,
      enableDebugging: false,
      customFunctions: [],
      strictMode: true,
      timeout: 5000,
      enableCaching: true,
      maxCacheSize: 1000,
      collectMetrics: false,
      customSecurityRules: [],
      ...options,
    };

    // Initialize core components
    this.functionRegistry = new DefaultFunctionRegistry();
    this.parser = new ASTParser();
    this.validator = new SecurityValidator(this.functionRegistry);
    this.typeRegistry = getGlobalTypeRegistry();
    
    const executionOptions: ExecutionOptions = {
      timeout: this.options.timeout,
      collectMetrics: this.options.collectMetrics,
      enableDebugging: this.options.enableDebugging,
    };
    this.executor = new ASTExecutor(this.functionRegistry, executionOptions);

    // Initialize array operations for callback support
    this.initializeArrayOperations();

    // Register custom functions
    this.options.customFunctions.forEach(func => {
      this.functionRegistry.register(func);
    });

    // Add custom security rules
    this.options.customSecurityRules.forEach(rule => {
      this.validator.addRule(rule);
    });
  }

  /**
   * Evaluate an expression with the given context
   * 
   * @param expression The expression string to evaluate
   * @param context Optional context object providing variables
   * @returns Evaluation result with value or error
   */
  public evaluate(expression: string, context: ExpressionContext = {}): EvaluationResult {
    const startTime = Date.now();
    this.stats.totalEvaluations++;

    try {
      if (!expression || typeof expression !== 'string') {
        return { success: true, value: expression };
      }

      const trimmed = expression.trim();
      if (!trimmed) {
        return { success: true, value: '' };
      }

      // Check if this is a template with {{}} expressions
      if (ASTParser.hasTemplateExpressions(trimmed)) {
        return this.evaluateTemplate(trimmed, context);
      } else {
        // Direct expression evaluation
        return this.evaluateExpression(trimmed, context);
      }
    } catch (error) {
      this.stats.failedEvaluations++;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown evaluation error',
        errorType: 'runtime',
        metadata: {
          executionTime: Date.now() - startTime,
        },
      };
    } finally {
      // Update performance metrics
      const executionTime = Date.now() - startTime;
      this.updatePerformanceMetrics(executionTime);
    }
  }

  /**
   * Validate an expression for syntax and security issues
   * 
   * @param expression The expression string to validate
   * @returns Validation result with any violations found
   */
  public validate(expression: string): SecurityValidation {
    if (!expression || typeof expression !== 'string') {
      return { isValid: true, violations: [] };
    }

    const trimmed = expression.trim();
    if (!trimmed) {
      return { isValid: true, violations: [] };
    }

    try {
      // Extract expressions from template
      const expressions = ASTParser.hasTemplateExpressions(trimmed)
        ? this.parser.extractTemplateExpressions(trimmed).map(match => match.expression)
        : [trimmed];

      const allViolations = [];

      for (const expr of expressions) {
        if (!expr.trim()) continue;

        const parsed = this.parser.parse(expr);
        if (!parsed) {
          allViolations.push({
            type: 'blocked_pattern' as const,
            message: `Invalid syntax in expression: ${expr}`,
          });
          continue;
        }

        // Check complexity
        if (parsed.complexity > this.options.maxComplexity) {
          allViolations.push({
            type: 'complexity_limit' as const,
            message: `Expression too complex (${parsed.complexity} > ${this.options.maxComplexity})`,
          });
        }

        // Check depth
        if (parsed.depth > this.options.maxDepth) {
          allViolations.push({
            type: 'depth_limit' as const,
            message: `Expression too deep (${parsed.depth} > ${this.options.maxDepth})`,
          });
        }

        // Security validation
        const validation = this.validator.validate(parsed.ast);
        allViolations.push(...validation.violations);
      }

      return {
        isValid: allViolations.length === 0,
        violations: allViolations,
        metadata: {
          riskLevel: this.assessOverallRisk(allViolations),
          rulesChecked: ['complexity', 'depth', 'security'],
        },
      };
    } catch (error) {
      return {
        isValid: false,
        violations: [{
          type: 'blocked_pattern',
          message: error instanceof Error ? error.message : 'Validation error',
        }],
      };
    }
  }

  /**
   * Parse an expression and return metadata
   * 
   * @param expression The expression string to parse
   * @returns Parsed expression with metadata or null if invalid
   */
  public parse(expression: string): ParsedExpression | null {
    if (!expression || typeof expression !== 'string') {
      return null;
    }

    return this.parser.parse(expression.trim());
  }

  /**
   * Extract variable dependencies from expression
   * 
   * @param expression The expression string to analyze
   * @returns Array of dependency names
   */
  public extractDependencies(expression: string): string[] {
    if (!expression || typeof expression !== 'string') {
      return [];
    }

    const dependencies = new Set<string>();
    const expressions = ASTParser.hasTemplateExpressions(expression)
      ? this.parser.extractTemplateExpressions(expression).map(match => match.expression)
      : [expression];

    for (const expr of expressions) {
      const parsed = this.parser.parse(expr);
      if (parsed) {
        parsed.dependencies.forEach(dep => dependencies.add(dep));
      }
    }

    return Array.from(dependencies);
  }

  /**
   * Add a custom function to the registry
   * 
   * @param func The safe function to add
   */
  public addFunction(func: SafeFunction): void {
    this.functionRegistry.register(func);
  }

  /**
   * Remove a function from the registry
   * 
   * @param name The name of the function to remove
   */
  public removeFunction(name: string): void {
    this.functionRegistry.unregister(name);
  }

  /**
   * List all available functions
   * 
   * @param category Optional category filter
   * @returns Array of safe functions
   */
  public listFunctions(category?: FunctionCategory): SafeFunction[] {
    return this.functionRegistry.list(category);
  }

  /**
   * Get registry statistics
   * 
   * @returns Function registry statistics
   */
  public getFunctionStats(): any {
    return this.functionRegistry.getStats();
  }

  /**
   * Get evaluator performance statistics
   * 
   * @returns Performance statistics
   */
  public getPerformanceStats(): typeof this.stats {
    return { ...this.stats };
  }

  /**
   * Register a type with the global type registry
   * 
   * @param name Type name (e.g., 'FileItem')
   * @param config Type configuration with schema and serialization strategy
   */
  public registerType(name: string, config: import('@/types/type-registry').TypeConfig): void {
    this.typeRegistry.register(name, config);
  }

  /**
   * Check if a type is registered
   * 
   * @param name Type name to check
   * @returns True if the type is registered
   */
  public hasType(name: string): boolean {
    return this.typeRegistry.hasType(name);
  }

  /**
   * Get all registered types
   * 
   * @returns Array of registered types
   */
  public getRegisteredTypes(): import('@/types/type-registry').RegisteredType[] {
    return this.typeRegistry.getRegisteredTypes();
  }

  /**
   * Reset all performance statistics
   */
  public resetStats(): void {
    this.stats = {
      totalEvaluations: 0,
      successfulEvaluations: 0,
      failedEvaluations: 0,
      averageExecutionTime: 0,
      cacheHits: 0,
    };
    
    this.executor.resetStats();
    this.parser.clearCache();
    this.validator.clearCache();
  }

  /**
   * Clear all caches
   */
  public clearCaches(): void {
    this.parser.clearCache();
    this.validator.clearCache();
    this.executor.clearCache();
    this.templateCache.clear();
    this.templateCacheSize = 0;
  }

  /**
   * Evaluate a template string with multiple expressions
   */
  private evaluateTemplate(template: string, context: ExpressionContext): TemplateResult {
    // Check template cache
    const cacheKey = this.getTemplateCacheKey(template, context);
    if (this.options.enableCaching && this.templateCache.has(cacheKey)) {
      this.stats.cacheHits++;
      return this.templateCache.get(cacheKey)!;
    }

    try {
      const processedExpressions: TemplateResult['processedExpressions'] = [];
      
      const result = ASTParser.replaceTemplateExpressions(template, (expression, match) => {
        const evalResult = this.evaluateExpression(expression, context);
        
        processedExpressions?.push({
          original: expression,
          evaluated: evalResult.success ? evalResult.value : evalResult.error,
          startIndex: match.startIndex,
          endIndex: match.endIndex,
        });
        
        if (!evalResult.success) {
          throw new Error(evalResult.error);
        }
        
        return evalResult.value != null ? this.serializeValue(evalResult.value) : '';
      });

      const templateResult: TemplateResult = {
        success: true,
        result,
        processedExpressions,
      };

      // Cache the result
      if (this.options.enableCaching) {
        this.setTemplateCached(cacheKey, templateResult);
      }

      return templateResult;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Template evaluation error',
      };
    }
  }

  /**
   * Evaluate a single expression
   */
  private evaluateExpression(expression: string, context: ExpressionContext): EvaluationResult {
    try {
      // Parse expression
      const parsed = this.parser.parse(expression);
      if (!parsed) {
        return {
          success: false,
          error: `Invalid syntax: ${expression}`,
          errorType: 'syntax',
        };
      }

      // Check complexity
      if (parsed.complexity > this.options.maxComplexity) {
        return {
          success: false,
          error: `Expression too complex (${parsed.complexity} > ${this.options.maxComplexity})`,
          errorType: 'complexity',
        };
      }

      // Check depth
      if (parsed.depth > this.options.maxDepth) {
        return {
          success: false,
          error: `Expression too deep (${parsed.depth} > ${this.options.maxDepth})`,
          errorType: 'complexity',
        };
      }

      // Security validation
      if (this.options.strictMode) {
        const validation = this.validator.validate(parsed.ast, context);
        if (!validation.isValid) {
          const violations = validation.violations.map(v => v.message).join('; ');
          return {
            success: false,
            error: `Security violation: ${violations}`,
            errorType: 'security',
          };
        }
      }

      // Execute expression
      const result = this.executor.execute(parsed.ast, context);
      
      if (result.success) {
        this.stats.successfulEvaluations++;
      } else {
        this.stats.failedEvaluations++;
      }
      
      return result;
    } catch (error) {
      this.stats.failedEvaluations++;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Execution error',
        errorType: 'runtime',
      };
    }
  }

  /**
   * Initialize array operations for callback support
   */
  private initializeArrayOperations(): void {
    try {
      this.arrayOperations = new ASTArrayOperations(this.executor, this.validator);
      this.executor.setArrayOperations(this.arrayOperations);
    } catch (error) {
      // Array operations are optional, continue without them
      console.warn('Failed to initialize array operations:', error);
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(executionTime: number): void {
    const totalTime = this.stats.averageExecutionTime * (this.stats.totalEvaluations - 1);
    this.stats.averageExecutionTime = (totalTime + executionTime) / this.stats.totalEvaluations;
  }

  /**
   * Assess overall risk level from violations
   */
  private assessOverallRisk(violations: any[]): 'low' | 'medium' | 'high' {
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
   * Generate cache key for templates
   */
  private getTemplateCacheKey(template: string, context: ExpressionContext): string {
    // Simple hash based on template and context keys
    const contextKeys = Object.keys(context).sort().join(',');
    return `${template}|${contextKeys}`;
  }

  /**
   * Set value in template cache with size management
   */
  private setTemplateCached(key: string, value: TemplateResult): void {
    if (this.templateCacheSize >= this.maxTemplateCacheSize) {
      // Simple LRU: remove first entry
      const firstKey = this.templateCache.keys().next().value;
      if (firstKey) {
        this.templateCache.delete(firstKey);
        this.templateCacheSize--;
      }
    }
    
    this.templateCache.set(key, value);
    this.templateCacheSize++;
  }

  /**
   * Serialize a value using type registry or default string conversion
   */
  private serializeValue(value: any): string {
    if (value == null) return '';
    
    // Try to detect registered type
    const typeName = this.typeRegistry.detectType(value);
    if (typeName) {
      const serialized = this.typeRegistry.serialize(value, typeName);
      
      // If this is JSON serialization, we need to escape it for template embedding
      const registeredType = this.typeRegistry.getRegisteredTypes().find(t => t.name === typeName);
      if (registeredType?.config.serialization === 'json') {
        // Escape double quotes and backslashes for JSON string embedding
        return serialized.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      }
      
      return serialized;
    }
    
    // Default fallback to string conversion
    return String(value);
  }
}