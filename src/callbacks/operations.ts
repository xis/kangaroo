/**
 * AST-based callback evaluator - executes arrow functions directly from AST
 * 
 * This module provides secure execution of arrow function callbacks in array operations
 * by interpreting the AST nodes directly instead of using eval() or Function constructor.
 */

import type { Node } from 'acorn';
import type { ExpressionContext } from '@/types';
import type { ASTExecutor } from '@/core/executor';
import type { SecurityValidator } from '@/core/validator';

export interface CallbackContext extends ExpressionContext {
  [paramName: string]: any; // Dynamic parameter binding for callback
}

/**
 * Executes arrow function AST nodes directly for array operations
 */
export class ASTCallbackEvaluator {
  constructor(
    private executor: ASTExecutor,
    private validator: SecurityValidator
  ) {}

  /**
   * Validates an arrow function AST node
   */
  validateArrowFunction(arrowNode: any): boolean {
    if (arrowNode.type !== 'ArrowFunctionExpression') {
      return false;
    }

    // Validate parameters
    if (!Array.isArray(arrowNode.params) || arrowNode.params.length > 3) {
      return false; // Max 3 params: (item, index, array)
    }

    // Validate parameter names
    for (const param of arrowNode.params) {
      if (param.type !== 'Identifier') {
        return false; // Only simple identifiers allowed
      }
      if (!/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(param.name)) {
        return false; // Valid JavaScript identifier
      }
    }

    // Validate function body using existing security validator
    const validation = this.validator.validate(arrowNode.body);
    return validation.isValid;
  }

  /**
   * Executes arrow function for a single array element
   */
  executeCallback(
    arrowNode: any,
    callbackArgs: any[],
    baseContext: ExpressionContext
  ): any {
    if (!this.validateArrowFunction(arrowNode)) {
      throw new Error('Invalid or unsafe arrow function');
    }

    // Create callback context with parameter bindings
    const callbackContext: CallbackContext = { ...baseContext };
    
    // Bind arrow function parameters to their values
    arrowNode.params.forEach((param: any, index: number) => {
      if (index < callbackArgs.length) {
        callbackContext[param.name] = callbackArgs[index];
      }
    });

    // Execute the arrow function body with callback context
    const result = this.executor.execute(arrowNode.body, callbackContext);
    
    if (!result.success) {
      throw new Error(result.error || 'Callback execution failed');
    }

    return result.value;
  }
}

/**
 * Array operations with AST-based arrow function support
 */
export class ASTArrayOperations {
  private callbackEvaluator: ASTCallbackEvaluator;

  constructor(
    private executor: ASTExecutor,
    private validator: SecurityValidator
  ) {
    this.callbackEvaluator = new ASTCallbackEvaluator(executor, validator);
  }

  /**
   * Filter array using arrow function AST
   */
  filter(array: any[], arrowNode: Node, context: ExpressionContext): any[] {
    if (!Array.isArray(array)) {
      return [];
    }

    return array.filter((item, index) => {
      try {
        const args = [item, index, array];
        const result = this.callbackEvaluator.executeCallback(arrowNode, args, context);
        return Boolean(result);
      } catch (error) {
        // On callback error, exclude the item
        return false;
      }
    });
  }

  /**
   * Map array using arrow function AST
   */
  map(array: any[], arrowNode: Node, context: ExpressionContext): any[] {
    if (!Array.isArray(array)) {
      return [];
    }

    return array.map((item, index) => {
      try {
        const args = [item, index, array];
        return this.callbackEvaluator.executeCallback(arrowNode, args, context);
      } catch (error) {
        // On callback error, return undefined
        return undefined;
      }
    });
  }

  /**
   * Find element using arrow function AST
   */
  find(array: any[], arrowNode: Node, context: ExpressionContext): any {
    if (!Array.isArray(array)) {
      return undefined;
    }

    return array.find((item, index) => {
      try {
        const args = [item, index, array];
        const result = this.callbackEvaluator.executeCallback(arrowNode, args, context);
        return Boolean(result);
      } catch (error) {
        return false;
      }
    });
  }

  /**
   * Test if some elements match using arrow function AST
   */
  some(array: any[], arrowNode: Node, context: ExpressionContext): boolean {
    if (!Array.isArray(array)) {
      return false;
    }

    return array.some((item, index) => {
      try {
        const args = [item, index, array];
        const result = this.callbackEvaluator.executeCallback(arrowNode, args, context);
        return Boolean(result);
      } catch (error) {
        return false;
      }
    });
  }

  /**
   * Test if all elements match using arrow function AST
   */
  every(array: any[], arrowNode: Node, context: ExpressionContext): boolean {
    if (!Array.isArray(array)) {
      return false;
    }

    return array.every((item, index) => {
      try {
        const args = [item, index, array];
        const result = this.callbackEvaluator.executeCallback(arrowNode, args, context);
        return Boolean(result);
      } catch (error) {
        return false;
      }
    });
  }

  /**
   * Reduce array using arrow function AST
   */
  reduce(array: any[], arrowNode: Node, initialValue: any, context: ExpressionContext): any {
    if (!Array.isArray(array)) {
      return initialValue;
    }

    return array.reduce((accumulator, item, index) => {
      try {
        const args = [accumulator, item, index, array];
        return this.callbackEvaluator.executeCallback(arrowNode, args, context);
      } catch (error) {
        return accumulator; // On error, keep current accumulator
      }
    }, initialValue);
  }
}