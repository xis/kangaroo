# Kangaroo Expression Evaluator

A secure JavaScript-like expression evaluator that uses AST-based execution instead of `eval()` for maximum security.

> **Note**: This library is in active development and has not reached version 1.0 yet. The API is functional but may change. We recommend pinning to specific versions in production environments.

## Features

- **Secure by Design** - AST-based execution, no `eval()` or `Function()` constructor  
- **300+ Built-in Functions** - Comprehensive function library covering strings, arrays, objects, math, dates, JSON, and more
- **Arrow Function Support** - Full callback support for array operations (map, filter, reduce, etc.)
- **Template Expressions** - Support for `{{expression}}` syntax in strings
- **TypeScript Support** - Complete type definitions and strict type checking
- **Multiple Build Formats** - ESM, CommonJS, and UMD builds included
- **Security Validation** - Comprehensive security rules and input validation
- **Performance Optimized** - Caching and complexity analysis for efficient execution

## Installation

```bash
npm install kangaroo-expression
```

## Quick Start

```typescript
import { createEvaluator, registerGlobalType } from 'kangaroo-expression';

const evaluator = createEvaluator();

// Simple expressions
const result = evaluator.evaluate('Math.round(item.price * 1.2)', {
  item: { price: 10.99 }
});
console.log(result); // { success: true, value: 13 }

// Array operations with callbacks
const filtered = evaluator.evaluate('items.filter(x => x.active)', {
  items: [{ active: true }, { active: false }]
});

// Template expressions
const template = evaluator.evaluate('Hello {{item.name.toUpperCase()}}!', {
  item: { name: 'world' }
});

// Type registry for intelligent object serialization
registerGlobalType('Product', {
  schema: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      price: { type: 'number' }
    },
    required: ['id', 'name']
  },
  serialization: 'object' // Returns object directly
});

const product = { id: 'p123', name: 'Laptop', price: 999.99 };
const serialized = evaluator.getSerializedValue(product);
console.log(serialized); // Returns the actual object, not a string
```

### Convenience Functions

```typescript
import { evaluate, validate, isTemplate, registerGlobalType } from 'kangaroo-expression';

// Quick evaluation
const result = evaluate('expression', context, options);

// Validation
const validation = validate('expression');

// Template detection  
console.log(isTemplate('Hello {{name}}!')); // true

// Type registry with different serialization strategies
registerGlobalType('Product', {
  schema: { /* schema definition */ },
  serialization: 'object'  // Returns object directly
});

registerGlobalType('UserProfile', {
  schema: { /* schema definition */ },
  serialization: 'json'    // Returns JSON string
});

registerGlobalType('ApiResponse', {
  schema: { /* schema definition */ },
  serialization: 'string'  // Returns string representation
});
```

## Function Categories

**String Functions**: `toLowerCase`, `toUpperCase`, `trim`, `split`, `replace`, `substring`, `includes`, `startsWith`, `endsWith`

**Array Functions**: `length`, `join`, `slice`, `first`, `last`, `reverse`, `filter`, `map`, `find`, `some`, `every`, `reduce`

**Math Functions**: `Math.round`, `Math.floor`, `Math.ceil`, `Math.abs`, `Math.max`, `Math.min`, `Math.pow`, `Math.sqrt`, `Math.random`

**Date Functions**: `Date.now`, `Date.parse`, `Date.today`, `Date.addDays`, `Date.diffDays`

**Object Functions**: `Object.keys`, `Object.values`, `Object.entries`

**JSON Functions**: `JSON.parse`, `JSON.stringify`

**Utility Functions**: `isEmpty`, `hasField`, `$if`, `$and`, `$or`, `$not`

## Type Registry System

Kangaroo includes a type registry that enables object serialization based on JSON Schema validation.

### Serialization Strategies

- **`'object'`**: Returns the object directly without conversion
- **`'json'`**: Converts to JSON string (escaped for template embedding)  
- **`'string'`**: Converts to string representation

### Example Usage

```typescript
import { createEvaluator, registerGlobalType } from 'kangaroo-expression';

// Register a type for direct object access
registerGlobalType('Product', {
  schema: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
      price: { type: 'number' },
      category: { type: 'string' }
    },
    required: ['id', 'name', 'price']
  },
  serialization: 'object'
});

const evaluator = createEvaluator();
const product = {
  id: 'prod_123',
  name: 'Wireless Headphones',
  price: 199.99,
  category: 'Electronics'
};

// Get direct object access
const directObject = evaluator.getSerializedValue(product);
console.log(directObject === product); // true - same object reference

// Templates automatically convert to JSON for embedding
const template = evaluator.evaluate('Product: {{item}}', { item: product });
// Result: 'Product: {"id":"prod_123","name":"Wireless Headphones",...}'
```

### Type Detection

The type registry uses JSON Schema validation with performance optimizations:

- **First-match-wins**: Types registered first take precedence
- **Required properties check**: O(n) validation before full schema check
- **Property type validation**: Validates each property against expected types

## API Reference

### Basic Usage

```typescript
import { Kangaroo, createEvaluator, evaluate } from 'kangaroo';

// Create evaluator instance
const evaluator = new Kangaroo({
  maxComplexity: 50,
  timeout: 5000,
  strictMode: true
});

// Quick evaluation
const result = evaluate('expression', context, options);

// Validation
const validation = evaluator.validate('expression');
```

### Expression Context

```typescript
const context = {
  item: { name: 'John', age: 30 },
  inputs: { userInput: 'hello' },
  outputs: { processedData: [1, 2, 3] }
};
```

### Arrow Functions

```typescript
// Array operations with arrow functions
evaluator.evaluate('numbers.map(x => x * 2)', { numbers: [1, 2, 3] });
evaluator.evaluate('users.filter(u => u.age > 18)', { users: [...] });
evaluator.evaluate('items.reduce((sum, item) => sum + item.value, 0)', { items: [...] });
```

## Security

Kangaroo is designed with security as a primary concern:

- **No Code Execution**: Never uses `eval()`, `Function()`, or similar dynamic execution methods
- **AST-Only Processing**: Expressions are parsed into Abstract Syntax Trees and interpreted safely
- **Controlled Function Registry**: Only whitelisted functions are available
- **Input Validation**: All expressions are validated before execution
- **Timeout Protection**: Prevents long-running expressions from blocking

## Development Status

**Pre-1.0**: The library is functional and tested, but the API may change before the 1.0 release. We recommend pinning to specific versions in production environments.

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import { ExpressionContext, EvaluationResult, SafeFunction } from 'kangaroo';

const context: ExpressionContext = { item: { value: 42 } };
const result: EvaluationResult = evaluator.evaluate('item.value', context);
```

## Performance

- **Caching**: Parsed expressions are cached for better performance
- **Complexity Analysis**: Expressions are analyzed for computational complexity
- **Timeout Controls**: Configurable execution timeouts prevent runaway expressions
- **Memory Efficient**: Minimal memory footprint with smart caching strategies

## License

Apache 2.0 License - see LICENSE file for details.

## Contributing

Issues and pull requests are welcome. Please ensure all tests pass and follow the existing code style.
