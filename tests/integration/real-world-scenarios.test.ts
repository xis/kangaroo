/**
 * Real-World Scenarios Tests
 * 
 * Tests that simulate actual use cases like the original FileItem marshaling issue
 * and other common template processing scenarios.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { createEvaluator, registerGlobalType } from '../../src/index';
import { DefaultTypeRegistry, setGlobalTypeRegistry } from '../../src/core/type-registry';

describe('Real-World Scenarios', () => {
  beforeEach(() => {
    // Reset global registry for each test
    setGlobalTypeRegistry(new DefaultTypeRegistry());
  });

  describe('Dropbox Integration FileItem Issue', () => {
    beforeEach(() => {
      // Register FileItem type exactly as it would be in the real system
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
        serialization: 'json'
      });
    });

    it('should solve the original "[object Object]" problem', () => {
      // This is the exact scenario that was failing
      const evaluator = createEvaluator();
      
      const context = {
        item: {
          file_content: {
            file_id: 'd2fot8pjfe6r41j6baqg',
            workspace_id: 'd1u2uf9jfe6u88atraog',
            key: 'uploads/test-file.txt',
            name: 'test-file.txt',
            size_in_bytes: 1024,
            content_type: 'text/plain',
            url: 'https://example.com/file'
          }
        }
      };

      // This template was producing: {"file_content": "[object Object]"}
      const template = `{
  "credential_id": "{{item.credential_id}}",
  "file_content": "{{item.file_content}}"
}`;

      const result = evaluator.evaluate(template, context);
      
      expect(result.success).toBe(true);
      
      // Parse the result to verify it's valid JSON
      const templateResult = result as any;
      const parsed = JSON.parse(templateResult.result as string);
      
      // Verify the file_content is now properly serialized as a JSON string (not [object Object])
      expect(typeof parsed.file_content).toBe('string');
      expect(parsed.file_content).not.toBe('[object Object]');
      
      // Parse the inner JSON to verify it contains the FileItem data
      const fileContent = JSON.parse(parsed.file_content);
      expect(fileContent.file_id).toBe('d2fot8pjfe6r41j6baqg');
      expect(fileContent.workspace_id).toBe('d1u2uf9jfe6u88atraog');
      expect(fileContent.name).toBe('test-file.txt');
    });

    it('should handle Go JSON unmarshaling correctly', () => {
      // Simulate what Go would receive after Kangaroo processing
      const evaluator = createEvaluator();
      
      const context = {
        item: {
          file_path: '/uploads/test-file.txt',
          file_content: {
            file_id: 'd2fot8pjfe6r41j6baqg',
            workspace_id: 'd1u2uf9jfe6u88atraog',
            key: 'uploads/test-file.txt',
            name: 'test-file.txt',
            size_in_bytes: 1024,
            content_type: 'text/plain',
            url: 'https://example.com/file'
          }
        }
      };

      const template = `{
  "file_path": "{{item.file_path}}",
  "file_content": "{{item.file_content}}"
}`;

      const result = evaluator.evaluate(template, context);
      expect(result.success).toBe(true);
      
      // This JSON should now be unmarshalable by Go's json.Unmarshal
      const resultJson = ((result as any).result) as string;
      const parsed = JSON.parse(resultJson);
      
      // Verify structure matches Go's UploadFileParams
      expect(parsed).toHaveProperty('file_path');
      expect(parsed).toHaveProperty('file_content');
      expect(typeof parsed.file_path).toBe('string');
      expect(typeof parsed.file_content).toBe('string'); // JSON string that Go will unmarshal
      
      // Verify file_content is valid JSON that Go can unmarshal
      const fileContent = JSON.parse(parsed.file_content);
      expect(fileContent).toHaveProperty('file_id');
      expect(fileContent).toHaveProperty('workspace_id');
      expect(fileContent).toHaveProperty('key');
      expect(fileContent).toHaveProperty('name');
    });
  });

  describe('Multiple File Types Integration', () => {
    beforeEach(() => {
      // Register multiple file-related types
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
        serialization: 'json'
      });

      registerGlobalType('FolderItem', {
        schema: {
          type: 'object',
          properties: {
            folder_id: { type: 'string' },
            workspace_id: { type: 'string' },
            path: { type: 'string' },
            name: { type: 'string' },
            parent_id: { type: 'string' }
          },
          required: ['folder_id', 'workspace_id', 'path', 'name']
        },
        serialization: 'json'
      });
    });

    it('should handle complex nested structures', () => {
      const evaluator = createEvaluator();
      
      const context = {
        operation: {
          source_file: {
            file_id: 'src_123',
            workspace_id: 'ws_456',
            key: 'source/document.pdf',
            name: 'document.pdf',
            size_in_bytes: 2048,
            content_type: 'application/pdf',
            url: 'https://example.com/source/document.pdf'
          },
          target_folder: {
            folder_id: 'folder_789',
            workspace_id: 'ws_456',
            path: '/target/documents',
            name: 'documents',
            parent_id: 'root_folder'
          }
        }
      };

      const template = `{
  "operation_type": "move_file",
  "source": "{{operation.source_file}}",
  "destination": "{{operation.target_folder}}"
}`;

      const result = evaluator.evaluate(template, context);
      expect(result.success).toBe(true);
      
      const parsed = JSON.parse(((result as any).result) as string);
      
      // Verify both objects are properly serialized as JSON strings
      expect(typeof parsed.source).toBe('string');
      expect(typeof parsed.destination).toBe('string');
      
      const sourceFile = JSON.parse(parsed.source);
      const targetFolder = JSON.parse(parsed.destination);
      expect(sourceFile).toHaveProperty('file_id', 'src_123');
      expect(targetFolder).toHaveProperty('folder_id', 'folder_789');
    });
  });

  describe('API Response Formatting', () => {
    beforeEach(() => {
      registerGlobalType('ApiResponse', {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            data: { type: 'object' },
            message: { type: 'string' },
            timestamp: { type: 'string' }
          },
          required: ['success']
        },
        serialization: 'json'
      });

      registerGlobalType('UserSession', {
        schema: {
          type: 'object',
          properties: {
            session_id: { type: 'string' },
            user_id: { type: 'string' },
            expires_at: { type: 'string' },
            permissions: { type: 'object' }
          },
          required: ['session_id', 'user_id']
        },
        serialization: 'json'
      });
    });

    it('should format API responses correctly', () => {
      const evaluator = createEvaluator();
      
      const context = {
        response: {
          success: true,
          data: {
            session_id: 'sess_abc123',
            user_id: 'user_456',
            expires_at: '2024-12-31T23:59:59Z',
            permissions: { read: true, write: false }
          },
          message: 'Login successful',
          timestamp: '2024-01-15T10:30:00Z'
        },
        session: {
          session_id: 'sess_abc123',
          user_id: 'user_456',
          expires_at: '2024-12-31T23:59:59Z',
          permissions: { read: true, write: false }
        }
      };

      const template = `{
  "api_response": "{{response}}",
  "user_session": "{{session}}"
}`;

      const result = evaluator.evaluate(template, context);
      expect(result.success).toBe(true);
      
      const parsed = JSON.parse(((result as any).result) as string);
      
      // Verify complex nested structures are serialized as JSON strings
      expect(typeof parsed.api_response).toBe('string');
      expect(typeof parsed.user_session).toBe('string');
      
      const apiResponse = JSON.parse(parsed.api_response);
      const userSession = JSON.parse(parsed.user_session);
      expect(apiResponse.success).toBe(true);
      expect(apiResponse.data.permissions.read).toBe(true);
      expect(userSession.session_id).toBe('sess_abc123');
    });
  });

  describe('Performance with Many Types', () => {
    beforeEach(() => {
      // Register many types to test performance
      for (let i = 0; i < 10; i++) {
        registerGlobalType(`Type${i}`, {
          schema: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              type_specific_field: { type: 'string' }
            },
            required: ['id']
          },
          serialization: 'json'
        });
      }

      // Register our target type last to test first-match-wins performance
      registerGlobalType('TargetType', {
        schema: {
          type: 'object',
          properties: {
            target_id: { type: 'string' },
            special_field: { type: 'string' }
          },
          required: ['target_id']
        },
        serialization: 'json'
      });
    });

    it('should efficiently detect types with many registrations', () => {
      const evaluator = createEvaluator();
      
      const context = {
        item: {
          target_id: 'target_123',
          special_field: 'special_value'
        }
      };

      const template = `{"result": "{{item}}"}`;

      const startTime = Date.now();
      const result = evaluator.evaluate(template, context);
      const endTime = Date.now();
      
      expect(result.success).toBe(true);
      
      const parsed = JSON.parse(((result as any).result) as string);
      expect(typeof parsed.result).toBe('string');
      
      const resultObj = JSON.parse(parsed.result);
      expect(resultObj.target_id).toBe('target_123');
      
      // Should complete reasonably quickly even with many types registered
      expect(endTime - startTime).toBeLessThan(100); // 100ms threshold
    });
  });

  describe('Backward Compatibility', () => {
    it('should work without any registered types', () => {
      const evaluator = createEvaluator();
      
      const context = {
        item: {
          some_object: { prop: 'value' },
          simple_string: 'hello',
          number: 42
        }
      };

      const template = `Object: {{item.some_object}}, String: {{item.simple_string}}, Number: {{item.number}}`;

      const result = evaluator.evaluate(template, context);
      
      expect(result.success).toBe(true);
      expect(((result as any).result)).toContain('Object: [object Object]');
      expect(((result as any).result)).toContain('String: hello');
      expect(((result as any).result)).toContain('Number: 42');
    });

    it('should handle mixed registered and unregistered types', () => {
      registerGlobalType('RegisteredType', {
        schema: {
          type: 'object',
          properties: { reg_id: { type: 'string' } },
          required: ['reg_id']
        },
        serialization: 'json'
      });

      const evaluator = createEvaluator();
      
      const context = {
        registered: { reg_id: 'reg_123', data: 'test' },
        unregistered: { unreg_id: 'unreg_456', data: 'test' }
      };

      const template = `Registered: {{registered}}, Unregistered: {{unregistered}}`;

      const result = evaluator.evaluate(template, context);
      
      expect(result.success).toBe(true);
      expect(((result as any).result)).toContain('{\\"reg_id\\":\\"reg_123\\",\\"data\\":\\"test\\"}');
      expect(((result as any).result)).toContain('[object Object]');
    });
  });
});