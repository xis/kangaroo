/**
 * Type Registry Types
 * 
 * Defines interfaces and types for the global type registry system
 * that enables intelligent serialization based on object schemas.
 */

/**
 * Supported serialization strategies
 */
export type SerializationStrategy = 'json' | 'string' | 'object';

/**
 * Lightweight JSON Schema definition
 * Only includes the subset we need for type detection
 */
export interface TypeSchema {
  type: 'object';
  properties: Record<string, TypePropertySchema>;
  required: string[];
}

/**
 * Property schema for type validation
 */
export interface TypePropertySchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
}

/**
 * Type configuration for registry
 */
export interface TypeConfig {
  /** JSON Schema for type validation */
  schema: TypeSchema;
  /** How to serialize this type in templates */
  serialization: SerializationStrategy;
}

/**
 * Registered type entry
 */
export interface RegisteredType {
  name: string;
  config: TypeConfig;
}

/**
 * Type registry interface
 */
export interface TypeRegistry {
  /**
   * Register a new type with schema and serialization strategy
   * 
   * @param name Type name (e.g., 'FileItem')
   * @param config Type configuration
   */
  register(name: string, config: TypeConfig): void;

  /**
   * Detect the type of a value based on registered schemas
   * Uses first-match-wins strategy for performance
   * 
   * @param value Value to detect type for
   * @returns Type name if detected, null otherwise
   */
  detectType(value: any): string | null;

  /**
   * Serialize a value using its registered serialization strategy
   * 
   * @param value Value to serialize
   * @param typeName Name of the registered type
   * @returns Serialized value (string for 'json'/'string', object for 'object')
   */
  serialize(value: any, typeName: string): any;

  /**
   * Get all registered types
   * 
   * @returns Array of registered types
   */
  getRegisteredTypes(): RegisteredType[];

  /**
   * Check if a type is registered
   * 
   * @param name Type name to check
   * @returns True if registered
   */
  hasType(name: string): boolean;
}