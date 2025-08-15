import { createEvaluator, getGlobalTypeRegistry, registerGlobalType } from '@/index';
import { createTestFileItem } from '../setup';

describe('Object Serialization Strategy', () => {
  beforeEach(() => {
    // Clear any existing registrations
    const registry = getGlobalTypeRegistry();
    // Reset by creating a new registry instance (simple approach for testing)
  });

  describe('Direct Object Return', () => {
    it('should return objects directly with object serialization strategy', () => {
      // Register FileItem with object serialization
      registerGlobalType('FileItem', {
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
        serialization: 'object'
      });

      const evaluator = createEvaluator();
      const fileItem = createTestFileItem();
      
      // Test direct object access via getSerializedValue
      const serialized = evaluator.getSerializedValue(fileItem);
      
      expect(serialized).toBe(fileItem); // Should be the exact same object
      expect(typeof serialized).toBe('object');
      expect(serialized.file_id).toBe('test_file_123');
    });

    it('should still convert to JSON string in templates with object serialization', () => {
      // Register FileItem with object serialization
      registerGlobalType('FileItem', {
        schema: {
          type: 'object',
          properties: {
            file_id: { type: 'string' },
            workspace_id: { type: 'string' },
            key: { type: 'string' },
            name: { type: 'string' }
          },
          required: ['file_id', 'workspace_id', 'key', 'name']
        },
        serialization: 'object'
      });

      const evaluator = createEvaluator();
      const fileItem = createTestFileItem();
      
      const template = '{"file_data": "{{item.file_content}}"}';
      const context = { item: { file_content: fileItem } };
      
      const result = evaluator.evaluate(template, context);
      
      expect(result.success).toBe(true);
      const resultValue = (result as any).result;
      expect(resultValue).toContain('"file_id":"test_file_123"');
      expect(resultValue).toContain('"workspace_id":"test_workspace_456"');
    });

    it('should handle mixed serialization strategies correctly', () => {
      // Register FileItem with object serialization
      registerGlobalType('FileItem', {
        schema: {
          type: 'object',
          properties: {
            file_id: { type: 'string' },
            workspace_id: { type: 'string' },
            key: { type: 'string' },
            name: { type: 'string' }
          },
          required: ['file_id', 'workspace_id', 'key', 'name']
        },
        serialization: 'object'
      });

      // Register another type with JSON serialization
      registerGlobalType('UserProfile', {
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

      const evaluator = createEvaluator();
      const fileItem = createTestFileItem();
      const userProfile = {
        user_id: 'user_123',
        username: 'testuser',
        email: 'test@example.com'
      };
      
      // Test that FileItem returns object
      const fileItemSerialized = evaluator.getSerializedValue(fileItem);
      expect(fileItemSerialized).toBe(fileItem);
      expect(typeof fileItemSerialized).toBe('object');
      
      // Test that UserProfile returns JSON string
      const userProfileSerialized = evaluator.getSerializedValue(userProfile);
      expect(typeof userProfileSerialized).toBe('string');
      expect(userProfileSerialized).toBe(JSON.stringify(userProfile));
    });

    it('should fallback to string for unregistered types', () => {
      const evaluator = createEvaluator();
      const unknownObject = { foo: 'bar', num: 42 };
      
      const serialized = evaluator.getSerializedValue(unknownObject);
      expect(typeof serialized).toBe('string');
      expect(serialized).toBe('[object Object]');
    });

    it('should handle primitive values correctly', () => {
      const evaluator = createEvaluator();
      
      expect(evaluator.getSerializedValue('hello')).toBe('hello');
      expect(evaluator.getSerializedValue(42)).toBe('42');
      expect(evaluator.getSerializedValue(true)).toBe('true');
      expect(evaluator.getSerializedValue(null)).toBe('');
      expect(evaluator.getSerializedValue(undefined)).toBe('');
    });
  });

  describe('Type Registry with Object Strategy', () => {
    it('should correctly detect and serialize with object strategy', () => {
      const registry = getGlobalTypeRegistry();
      
      registry.register('TestType', {
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            value: { type: 'number' }
          },
          required: ['id']
        },
        serialization: 'object'
      });

      const testObject = { id: 'test_123', value: 42 };
      
      const detectedType = registry.detectType(testObject);
      expect(detectedType).toBe('TestType');
      
      const serialized = registry.serialize(testObject, 'TestType');
      expect(serialized).toBe(testObject); // Same object reference
      expect(typeof serialized).toBe('object');
    });
  });
});