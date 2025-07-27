/**
 * AST Parser - Enhanced expression parsing with Acorn
 * 
 * This module provides secure JavaScript expression parsing using the Acorn parser.
 * It handles both single expressions and template strings with {{}} interpolation.
 */

import { parse, type Node, type Options } from 'acorn';
import type { ParsedExpression, ComplexityAnalysis } from '@/types';

/**
 * Configuration options for the AST parser
 */
export interface ParseOptions {
  /** ECMAScript version to target */
  ecmaVersion?: Options['ecmaVersion'];
  
  /** Source type for parsing */
  sourceType?: 'script' | 'module';
  
  /** Whether to include location information in AST */
  locations?: boolean;
  
  /** Whether to allow return statements outside functions */
  allowReturnOutsideFunction?: boolean;
  
  /** Whether to preserve comments in AST */
  preserveComments?: boolean;
  
  /** Custom error recovery options */
  errorRecovery?: boolean;
}

/**
 * Template expression match result
 */
interface TemplateMatch {
  /** The full matched string including {{ }} */
  fullMatch: string;
  
  /** The expression content without braces */
  expression: string;
  
  /** Start index in the template string */
  startIndex: number;
  
  /** End index in the template string */
  endIndex: number;
  
  /** Whether this expression spans multiple lines */
  multiline: boolean;
}

/**
 * Enhanced AST parser with template support and complexity analysis
 */
export class ASTParser {
  private defaultOptions: Required<ParseOptions> = {
    ecmaVersion: 2022 as Options['ecmaVersion'],
    sourceType: 'script',
    locations: true,
    allowReturnOutsideFunction: false,
    preserveComments: false,
    errorRecovery: false,
  };

  private parseCache = new Map<string, ParsedExpression | null>();
  private cacheSize = 0;
  private readonly maxCacheSize = 1000;

  /**
   * Parse a JavaScript expression into an enhanced AST with metadata
   * 
   * @param expression The expression string to parse
   * @param options Optional parsing configuration
   * @returns Parsed expression with metadata or null if invalid
   */
  public parse(expression: string, options?: ParseOptions): ParsedExpression | null {
    if (!expression || typeof expression !== 'string') {
      return null;
    }

    const trimmed = expression.trim();
    if (!trimmed) {
      return null;
    }

    // Check cache first
    const cacheKey = this.getCacheKey(trimmed, options);
    if (this.parseCache.has(cacheKey)) {
      return this.parseCache.get(cacheKey) || null;
    }

    try {
      const result = this.parseInternal(trimmed, options);
      this.setCached(cacheKey, result);
      return result;
    } catch (error) {
      this.setCached(cacheKey, null);
      return null;
    }
  }

  /**
   * Parse multiple expressions from a template string
   * 
   * @param template Template string with {{expression}} syntax
   * @param options Optional parsing configuration
   * @returns Array of parsed expressions
   */
  public parseTemplate(template: string, options?: ParseOptions): Array<{
    expression: string;
    parsed: ParsedExpression | null;
    startIndex: number;
    endIndex: number;
  }> {
    const matches = this.extractTemplateExpressions(template);
    
    return matches.map(match => ({
      expression: match.expression,
      parsed: this.parse(match.expression, options),
      startIndex: match.startIndex,
      endIndex: match.endIndex,
    }));
  }

  /**
   * Check if a string contains template expressions
   * 
   * @param text The text to check
   * @returns True if template expressions are found
   */
  public static hasTemplateExpressions(text: string): boolean {
    return /\{\{[^{}]*\}\}/.test(text);
  }

  /**
   * Extract template expressions from a string
   * 
   * @param template The template string
   * @returns Array of extracted expressions
   */
  public extractTemplateExpressions(template: string): TemplateMatch[] {
    const expressions: TemplateMatch[] = [];
    const regex = /\{\{([^{}]*)\}\}/g;
    let match;

    while ((match = regex.exec(template)) !== null) {
      const fullMatch = match[0];
      const expression = match[1] ? match[1].trim() : '';
      const startIndex = match.index;
      const endIndex = match.index + fullMatch.length;
      const multiline = expression.includes('\n');

      if (expression) {
        expressions.push({
          fullMatch,
          expression,
          startIndex,
          endIndex,
          multiline,
        });
      }
    }

    return expressions;
  }

  /**
   * Replace template expressions in text with processed values
   * 
   * @param template The template string
   * @param replacer Function to process each expression
   * @returns Processed template string
   */
  public static replaceTemplateExpressions(
    template: string,
    replacer: (expression: string, match: TemplateMatch) => string
  ): string {
    const parser = new ASTParser();
    const matches = parser.extractTemplateExpressions(template);
    
    // Process matches in reverse order to maintain indices
    let result = template;
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      if (match) {
        const replacement = replacer(match.expression, match);
        result = result.slice(0, match.startIndex) + replacement + result.slice(match.endIndex);
      }
    }
    
    return result;
  }

  /**
   * Analyze expression complexity
   * 
   * @param expression The expression to analyze
   * @returns Detailed complexity analysis
   */
  public analyzeComplexity(expression: string): ComplexityAnalysis | null {
    const parsed = this.parse(expression);
    if (!parsed) {
      return null;
    }

    const breakdown: Record<string, number> = {};
    let functionCalls = 0;
    let propertyAccesses = 0;
    let maxDepth = 0;

    this.walkAST(parsed.ast, (node, depth) => {
      maxDepth = Math.max(maxDepth, depth || 0);
      
      const nodeType = node.type;
      breakdown[nodeType] = (breakdown[nodeType] || 0) + 1;
      
      if (nodeType === 'CallExpression') {
        functionCalls++;
      } else if (nodeType === 'MemberExpression') {
        propertyAccesses++;
      }
    });

    const estimatedTime = this.estimateExecutionTime(parsed.complexity);
    const risk = this.assessRisk(parsed.complexity, maxDepth, functionCalls);

    return {
      score: parsed.complexity,
      breakdown,
      maxDepth,
      functionCalls,
      propertyAccesses,
      estimatedTime,
      risk,
    };
  }

  /**
   * Clear the parse cache
   */
  public clearCache(): void {
    this.parseCache.clear();
    this.cacheSize = 0;
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cacheSize,
      maxSize: this.maxCacheSize,
      hitRate: 0, // Would need hit/miss tracking for actual rate
    };
  }

  /**
   * Internal parsing implementation
   */
  private parseInternal(expression: string, options?: ParseOptions): ParsedExpression | null {
    const parseOptions = { ...this.defaultOptions, ...options } as Options;
    
    // Wrap expression to make it parseable as a complete program
    const wrappedExpression = `(${expression})`;
    
    try {
      const program = parse(wrappedExpression, parseOptions);
      
      // Extract the actual expression from the wrapped program
      const ast = this.extractExpression(program);
      if (!ast) {
        return null;
      }

      // Analyze the expression
      const dependencies = this.extractDependencies(ast);
      const functions = this.extractFunctionCalls(ast);
      const complexity = this.calculateComplexity(ast);
      const isSimple = this.isSimpleExpression(ast);
      const hasTemplates = ASTParser.hasTemplateExpressions(expression);
      const depth = this.calculateDepth(ast);
      const estimatedMemoryUsage = this.estimateMemoryUsage(ast);

      return {
        ast,
        dependencies,
        functions,
        complexity,
        isSimple,
        hasTemplates,
        depth,
        estimatedMemoryUsage,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract the actual expression node from a wrapped program
   */
  private extractExpression(program: Node): Node | null {
    if (program.type !== 'Program') {
      return null;
    }

    const body = (program as any).body;
    if (!Array.isArray(body) || body.length !== 1) {
      return null;
    }

    const statement = body[0];
    if (statement.type !== 'ExpressionStatement') {
      return null;
    }

    return statement.expression;
  }

  /**
   * Extract variable dependencies from the AST
   */
  private extractDependencies(node: Node): Set<string> {
    const dependencies = new Set<string>();
    
    this.walkAST(node, (currentNode) => {
      if (currentNode.type === 'Identifier') {
        const identifier = currentNode as any;
        if (this.isContextVariable(identifier.name)) {
          dependencies.add(identifier.name);
        }
      }
      
      if (currentNode.type === 'MemberExpression') {
        const memberExpr = currentNode as any;
        if (memberExpr.object?.type === 'Identifier') {
          const rootVar = memberExpr.object.name;
          if (this.isContextVariable(rootVar)) {
            dependencies.add(rootVar);
          }
        }
      }
    });

    return dependencies;
  }

  /**
   * Extract function calls from the AST
   */
  private extractFunctionCalls(node: Node): Set<string> {
    const functions = new Set<string>();
    
    this.walkAST(node, (currentNode) => {
      if (currentNode.type === 'CallExpression') {
        const callExpr = currentNode as any;
        
        // Direct function call: func()
        if (callExpr.callee?.type === 'Identifier') {
          functions.add(callExpr.callee.name);
        }
        
        // Method call: obj.method() or Namespace.method()
        if (callExpr.callee?.type === 'MemberExpression') {
          const methodName = this.getMethodName(callExpr.callee);
          const fullMethodName = this.getFullMethodName(callExpr.callee);
          
          if (methodName) {
            functions.add(methodName);
          }
          if (fullMethodName && fullMethodName !== methodName) {
            functions.add(fullMethodName);
          }
        }
      }
    });

    return functions;
  }

  /**
   * Calculate expression complexity score
   */
  private calculateComplexity(node: Node): number {
    let complexity = 0;
    
    this.walkAST(node, (currentNode) => {
      switch (currentNode.type) {
        case 'CallExpression':
          complexity += 3; // Function calls are expensive
          break;
        case 'MemberExpression':
          complexity += 1;
          break;
        case 'BinaryExpression':
        case 'LogicalExpression':
          complexity += 1;
          break;
        case 'ConditionalExpression':
          complexity += 4; // Ternary operators add branching complexity
          break;
        case 'ArrayExpression':
          const arrayExpr = currentNode as any;
          complexity += 2 + (arrayExpr.elements?.length || 0) * 0.5;
          break;
        case 'ObjectExpression':
          const objExpr = currentNode as any;
          complexity += 2 + (objExpr.properties?.length || 0) * 0.5;
          break;
        case 'ArrowFunctionExpression':
          complexity += 5; // Arrow functions add significant complexity
          break;
        default:
          complexity += 0.5;
      }
    });

    return Math.round(complexity * 10) / 10; // Round to 1 decimal place
  }

  /**
   * Calculate maximum nesting depth
   */
  private calculateDepth(node: Node): number {
    let maxDepth = 0;
    
    this.walkAST(node, (_, depth) => {
      maxDepth = Math.max(maxDepth, depth || 0);
    });
    
    return maxDepth;
  }

  /**
   * Estimate memory usage for expression evaluation
   */
  private estimateMemoryUsage(node: Node): number {
    let estimatedBytes = 0;
    
    this.walkAST(node, (currentNode) => {
      switch (currentNode.type) {
        case 'Literal':
          const literal = currentNode as any;
          if (typeof literal.value === 'string') {
            estimatedBytes += literal.value.length * 2; // UTF-16
          } else {
            estimatedBytes += 8; // Numbers, booleans, etc.
          }
          break;
        case 'ArrayExpression':
          estimatedBytes += 64; // Base array overhead
          break;
        case 'ObjectExpression':
          estimatedBytes += 128; // Base object overhead
          break;
        case 'CallExpression':
          estimatedBytes += 32; // Function call overhead
          break;
        default:
          estimatedBytes += 16; // General node overhead
      }
    });
    
    return estimatedBytes;
  }

  /**
   * Determine if expression is simple (just property access and literals)
   */
  private isSimpleExpression(node: Node): boolean {
    const allowedTypes = new Set([
      'Identifier', 
      'MemberExpression', 
      'Literal',
      'BinaryExpression', // Allow simple comparisons
      'LogicalExpression' // Allow simple logical operations
    ]);
    
    let isSimple = true;
    let hasComplexOperation = false;
    
    this.walkAST(node, (currentNode) => {
      if (!allowedTypes.has(currentNode.type)) {
        isSimple = false;
      }
      
      // Function calls make it non-simple
      if (currentNode.type === 'CallExpression') {
        hasComplexOperation = true;
        isSimple = false;
      }
      
      // Conditional expressions make it non-simple
      if (currentNode.type === 'ConditionalExpression') {
        hasComplexOperation = true;
        isSimple = false;
      }
    });

    return isSimple && !hasComplexOperation;
  }

  /**
   * Walk the AST and call visitor function for each node
   */
  private walkAST(node: Node, visitor: (node: Node, depth?: number) => void, depth = 0): void {
    visitor(node, depth);
    
    for (const key in node) {
      const value = (node as any)[key];
      
      if (value && typeof value === 'object') {
        if (Array.isArray(value)) {
          value.forEach(child => {
            if (child && typeof child === 'object' && child.type) {
              this.walkAST(child, visitor, depth + 1);
            }
          });
        } else if (value.type) {
          this.walkAST(value, visitor, depth + 1);
        }
      }
    }
  }

  /**
   * Check if identifier is a context variable
   */
  private isContextVariable(name: string): boolean {
    const contextVars = new Set([
      'item', 'inputs', 'outputs', 'node', 'execution',
      // Built-in constants
      'true', 'false', 'null', 'undefined', 'Infinity', 'NaN'
    ]);
    return contextVars.has(name);
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
        // Only for known static namespaces
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
   * Estimate execution time based on complexity
   */
  private estimateExecutionTime(complexity: number): number {
    // Base time + complexity factor
    return Math.max(0.1, complexity * 0.05);
  }

  /**
   * Assess risk level based on complexity metrics
   */
  private assessRisk(complexity: number, depth: number, functionCalls: number): 'low' | 'medium' | 'high' {
    if (complexity > 50 || depth > 8 || functionCalls > 10) {
      return 'high';
    } else if (complexity > 20 || depth > 5 || functionCalls > 5) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Generate cache key for parsed expressions
   */
  private getCacheKey(expression: string, options?: ParseOptions): string {
    const optionsStr = options ? JSON.stringify(options) : '';
    return `${expression}|${optionsStr}`;
  }

  /**
   * Set value in cache with size management
   */
  private setCached(key: string, value: ParsedExpression | null): void {
    if (this.cacheSize >= this.maxCacheSize) {
      // Simple LRU: remove first entry
      const firstKey = this.parseCache.keys().next().value;
      if (firstKey) {
        this.parseCache.delete(firstKey);
        this.cacheSize--;
      }
    }
    
    this.parseCache.set(key, value);
    this.cacheSize++;
  }
}