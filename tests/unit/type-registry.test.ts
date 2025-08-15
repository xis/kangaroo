/**
 * Type Registry Unit Tests
 * 
 * Tests for the type registry system including detection, serialization,
 * and integration with the evaluator.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { 
  DefaultTypeRegistry, 
  getGlobalTypeRegistry, 
  setGlobalTypeRegistry, 
  registerGlobalType 
} from '../../src/core/type-registry';
import type { TypeConfig } from '../../src/types/type-registry';

describe('DefaultTypeRegistry', () => {
  let registry: DefaultTypeRegistry;

  beforeEach(() => {
    registry = new DefaultTypeRegistry();
  });

  describe('register', () => {
    it('should register a type with valid config', () => {
      const config: TypeConfig = {
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' }
          },
          required: ['id']
        },
        serialization: 'json'
      };

      expect(() => registry.register('TestType', config)).not.toThrow();
      expect(registry.hasType('TestType')).toBe(true);
    });

    it('should throw error for invalid type name', () => {
      const config: TypeConfig = {
        schema: {
          type: 'object',
          properties: {},
          required: []
        },
        serialization: 'json'
      };

      expect(() => registry.register('', config)).toThrow('Type name must be a non-empty string');
      expect(() => registry.register(null as any, config)).toThrow('Type name must be a non-empty string');
    });

    it('should throw error for invalid config', () => {
      expect(() => registry.register('TestType', null as any)).toThrow('Type config must include schema and serialization strategy');
      expect(() => registry.register('TestType', {} as any)).toThrow('Type config must include schema and serialization strategy');
    });

    it('should replace existing type registration', () => {
      const config1: TypeConfig = {
        schema: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id']
        },
        serialization: 'json'
      };

      const config2: TypeConfig = {
        schema: {
          type: 'object',
          properties: { id: { type: 'string' }, name: { type: 'string' } },
          required: ['id', 'name']
        },
        serialization: 'string'
      };

      registry.register('TestType', config1);
      registry.register('TestType', config2);

      const types = registry.getRegisteredTypes();
      expect(types).toHaveLength(1);
      expect(types[0].config.serialization).toBe('string');
    });
  });

  describe('detectType', () => {
    beforeEach(() => {
      registry.register('FileItem', {
        schema: {
          type: 'object',
          properties: {
            file_id: { type: 'string' },
            workspace_id: { type: 'string' },
            key: { type: 'string' },
            name: { type: 'string' },
            size_in_bytes: { type: 'number' },
            content_type: { type: 'string' },
            url: { type: 'string' }
          },
          required: ['file_id', 'workspace_id', 'key', 'name']
        },
        serialization: 'json'
      });

      registry.register('UserProfile', {
        schema: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string' }
          },
          required: ['user_id', 'username']
        },
        serialization: 'json'
      });
    });

    it('should detect FileItem type correctly', () => {
      const fileItem = {
        file_id: 'file_123',
        workspace_id: 'ws_456',
        key: 'uploads/test.txt',
        name: 'test.txt',
        size_in_bytes: 1024,
        content_type: 'text/plain',
        url: 'https://example.com/file'
      };

      expect(registry.detectType(fileItem)).toBe('FileItem');
    });

    it('should detect UserProfile type correctly', () => {
      const userProfile = {
        user_id: 'user_123',
        username: 'john_doe',
        email: 'john@example.com'
      };

      expect(registry.detectType(userProfile)).toBe('UserProfile');
    });

    it('should return null for objects missing required properties', () => {
      const incompleteFileItem = {
        file_id: 'file_123',
        // Missing required properties: workspace_id, key, name
        size_in_bytes: 1024
      };

      expect(registry.detectType(incompleteFileItem)).toBe(null);
    });

    it('should return null for non-objects', () => {
      expect(registry.detectType(null)).toBe(null);
      expect(registry.detectType(undefined)).toBe(null);
      expect(registry.detectType('string')).toBe(null);
      expect(registry.detectType(123)).toBe(null);
      expect(registry.detectType([])).toBe(null);
    });

    it('should return null for objects with wrong property types', () => {
      const wrongTypes = {
        file_id: 'file_123',
        workspace_id: 'ws_456',
        key: 'uploads/test.txt',
        name: 'test.txt',
        size_in_bytes: 'not-a-number', // Should be number
        content_type: 'text/plain',
        url: 'https://example.com/file'
      };

      expect(registry.detectType(wrongTypes)).toBe(null);
    });

    it('should use first-match-wins strategy', () => {
      // Register a type that could match both
      registry.register('GenericItem', {
        schema: {
          type: 'object',
          properties: {
            file_id: { type: 'string' }
          },
          required: ['file_id']
        },
        serialization: 'string'
      });

      const ambiguousItem = {
        file_id: 'file_123',
        workspace_id: 'ws_456',
        key: 'uploads/test.txt',
        name: 'test.txt'
      };

      // Should match GenericItem first since it was registered last (added to beginning)
      expect(registry.detectType(ambiguousItem)).toBe('GenericItem');
    });
  });

  describe('serialize', () => {
    beforeEach(() => {
      registry.register('JsonType', {
        schema: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id']
        },
        serialization: 'json'
      });

      registry.register('StringType', {
        schema: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id']
        },
        serialization: 'string'
      });
    });

    it('should serialize with json strategy', () => {
      const obj = { id: 'test', name: 'example' };
      const result = registry.serialize(obj, 'JsonType');
      expect(result).toBe('{"id":"test","name":"example"}');
    });

    it('should serialize with string strategy', () => {
      const obj = { id: 'test', name: 'example' };
      const result = registry.serialize(obj, 'StringType');
      expect(result).toBe('[object Object]');
    });

    it('should throw error for unknown type', () => {
      const obj = { id: 'test' };
      expect(() => registry.serialize(obj, 'UnknownType')).toThrow('Unknown type: UnknownType');
    });

    it('should fallback to string on serialization error', () => {
      const circularObj: any = { id: 'test' };
      circularObj.self = circularObj; // Create circular reference

      const result = registry.serialize(circularObj, 'JsonType');
      expect(result).toBe('[object Object]'); // Fallback to String()
    });
  });

  describe('getRegisteredTypes', () => {
    it('should return empty array initially', () => {
      expect(registry.getRegisteredTypes()).toEqual([]);
    });

    it('should return all registered types', () => {
      registry.register('Type1', {
        schema: { type: 'object', properties: {}, required: [] },
        serialization: 'json'
      });
      registry.register('Type2', {
        schema: { type: 'object', properties: {}, required: [] },
        serialization: 'string'
      });

      const types = registry.getRegisteredTypes();
      expect(types).toHaveLength(2);
      expect(types.map(t => t.name).sort()).toEqual(['Type1', 'Type2']);
    });

    it('should return copy to prevent mutation', () => {
      registry.register('TestType', {
        schema: { type: 'object', properties: {}, required: [] },
        serialization: 'json'
      });

      const types1 = registry.getRegisteredTypes();
      const types2 = registry.getRegisteredTypes();

      expect(types1).not.toBe(types2); // Different instances
      expect(types1).toEqual(types2); // Same content
    });
  });
});

describe('Global Type Registry', () => {
  beforeEach(() => {
    // Reset global registry
    setGlobalTypeRegistry(new DefaultTypeRegistry());
  });

  describe('getGlobalTypeRegistry', () => {
    it('should return same instance on multiple calls', () => {
      const registry1 = getGlobalTypeRegistry();
      const registry2 = getGlobalTypeRegistry();
      expect(registry1).toBe(registry2);
    });
  });

  describe('setGlobalTypeRegistry', () => {
    it('should replace global registry', () => {
      const customRegistry = new DefaultTypeRegistry();
      setGlobalTypeRegistry(customRegistry);
      expect(getGlobalTypeRegistry()).toBe(customRegistry);
    });
  });

  describe('registerGlobalType', () => {
    it('should register type in global registry', () => {
      registerGlobalType('GlobalTest', {
        schema: {
          type: 'object',
          properties: { id: { type: 'string' } },
          required: ['id']
        },
        serialization: 'json'
      });

      const globalRegistry = getGlobalTypeRegistry();
      expect(globalRegistry.hasType('GlobalTest')).toBe(true);
    });
  });
});