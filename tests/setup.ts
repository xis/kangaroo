/**
 * Jest setup file - runs before each test
 */

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toEvaluateTo(expected: any): R;
      toHaveSecurityViolation(violationType?: string): R;
      toBeValidExpression(): R;
    }
  }
}

// Custom matcher for expression evaluation
expect.extend({
  toEvaluateTo(received: any, expected: any) {
    const pass = received?.success === true && received?.value === expected;
    
    if (pass) {
      return {
        message: () => `Expected expression not to evaluate to ${expected}`,
        pass: true,
      };
    } else {
      return {
        message: () => {
          if (received?.success === false) {
            return `Expected expression to evaluate to ${expected}, but got error: ${received.error}`;
          }
          return `Expected expression to evaluate to ${expected}, but got: ${received?.value}`;
        },
        pass: false,
      };
    }
  },

  toHaveSecurityViolation(received: any, violationType?: string) {
    const hasViolations = received?.violations && received.violations.length > 0;
    const hasSpecificViolation = violationType 
      ? received?.violations?.some((v: any) => v.type === violationType)
      : true;
    
    const pass = !received?.isValid && hasViolations && hasSpecificViolation;
    
    if (pass) {
      return {
        message: () => `Expected expression not to have security violations`,
        pass: true,
      };
    } else {
      return {
        message: () => {
          if (received?.isValid) {
            return `Expected expression to have security violations, but it was valid`;
          }
          if (!hasViolations) {
            return `Expected expression to have security violations, but none were found`;
          }
          return `Expected expression to have violation type "${violationType}", but got: ${received?.violations?.map((v: any) => v.type).join(', ')}`;
        },
        pass: false,
      };
    }
  },

  toBeValidExpression(received: any) {
    const pass = received?.isValid === true && (!received?.violations || received.violations.length === 0);
    
    if (pass) {
      return {
        message: () => `Expected expression not to be valid`,
        pass: true,
      };
    } else {
      return {
        message: () => {
          if (received?.violations && received.violations.length > 0) {
            const violations = received.violations.map((v: any) => v.message).join('; ');
            return `Expected expression to be valid, but got violations: ${violations}`;
          }
          return `Expected expression to be valid, but it was invalid`;
        },
        pass: false,
      };
    }
  },
});

// Global test configuration
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Suppress console.error and console.warn during tests unless needed
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  // Restore original console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Common test utilities
export const createTestContext = (overrides: any = {}) => ({
  item: { 
    id: 1,
    name: 'test',
    value: 42,
    tags: ['tag1', 'tag2'],
    nested: { prop: 'value' }
  },
  inputs: {},
  outputs: {},
  node: { id: 'node-1', name: 'Test Node' },
  execution: { id: 'exec-1', state: 'running' },
  ...overrides
});

// Type registry test utilities
export const createTestFileItem = (overrides: any = {}) => ({
  file_id: 'test_file_123',
  workspace_id: 'test_workspace_456',
  key: 'test/file.txt',
  name: 'file.txt',
  size_in_bytes: 1024,
  content_type: 'text/plain',
  url: 'https://example.com/test/file.txt',
  ...overrides
});

export const createTestUserProfile = (overrides: any = {}) => ({
  user_id: 'test_user_123',
  username: 'testuser',
  email: 'test@example.com',
  settings: { theme: 'dark', notifications: true },
  ...overrides
});

export const expectTypeDetection = (registry: any, value: any, expectedType: string | null) => {
  const detected = registry.detectType(value);
  expect(detected).toBe(expectedType);
};

export const expectJsonSerialization = (registry: any, value: any, typeName: string) => {
  const serialized = registry.serialize(value, typeName);
  const parsed = JSON.parse(serialized);
  expect(parsed).toEqual(value);
};

export const expectValidEvaluation = (result: any, expectedValue: any) => {
  expect(result.success).toBe(true);
  expect(result.value).toEqual(expectedValue);
  expect(result.error).toBeUndefined();
};

export const expectEvaluationError = (result: any, expectedErrorType?: string) => {
  expect(result.success).toBe(false);
  expect(result.error).toBeDefined();
  if (expectedErrorType) {
    expect(result.errorType).toBe(expectedErrorType);
  }
};

export const expectSecurityViolation = (validation: any, expectedType?: string) => {
  expect(validation.isValid).toBe(false);
  expect(validation.violations).toHaveLength(expect.any(Number));
  expect(validation.violations.length).toBeGreaterThan(0);
  
  if (expectedType) {
    expect(validation.violations.some((v: any) => v.type === expectedType)).toBe(true);
  }
};