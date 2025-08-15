/**
 * Default Type Registry Implementation
 * 
 * Provides efficient type detection and serialization for template processing.
 * Uses first-match-wins strategy with performance optimizations.
 */

import type { 
  TypeRegistry, 
  TypeConfig, 
  RegisteredType, 
  TypeSchema, 
  SerializationStrategy 
} from '@/types/type-registry';

/**
 * Default implementation of TypeRegistry with performance optimizations
 */
export class DefaultTypeRegistry implements TypeRegistry {
  private types: RegisteredType[] = [];

  /**
   * Register a new type with schema and serialization strategy
   * New types are added to the beginning for first-match-wins
   */
  public register(name: string, config: TypeConfig): void {
    // Validate name
    if (!name || typeof name !== 'string') {
      throw new Error('Type name must be a non-empty string');
    }

    // Validate config
    if (!config || !config.schema || !config.serialization) {
      throw new Error('Type config must include schema and serialization strategy');
    }

    // Remove existing registration if present
    this.types = this.types.filter(type => type.name !== name);

    // Add to beginning for first-match-wins
    this.types.unshift({ name, config });
  }

  /**
   * Detect type using optimized first-match-wins algorithm
   */
  public detectType(value: any): string | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }

    // Fast path: iterate through registered types
    for (const { name, config } of this.types) {
      if (this.matchesType(value, config)) {
        return name; // First match wins!
      }
    }

    return null;
  }

  /**
   * Serialize value using registered serialization strategy
   */
  public serialize(value: any, typeName: string): string {
    const registeredType = this.types.find(type => type.name === typeName);
    if (!registeredType) {
      throw new Error(`Unknown type: ${typeName}`);
    }

    const { serialization } = registeredType.config;

    try {
      switch (serialization) {
        case 'json':
          return JSON.stringify(value);
        case 'string':
          return String(value);
        default:
          return String(value);
      }
    } catch (error) {
      // Fallback to string if serialization fails
      return String(value);
    }
  }

  /**
   * Get all registered types
   */
  public getRegisteredTypes(): RegisteredType[] {
    return [...this.types]; // Return copy to prevent mutation
  }

  /**
   * Check if a type is registered
   */
  public hasType(name: string): boolean {
    return this.types.some(type => type.name === name);
  }

  /**
   * Check if a value matches a registered type
   * Optimized with fast required properties check first
   */
  private matchesType(value: any, config: TypeConfig): boolean {
    const { schema } = config;

    // Fast path: check required properties exist
    if (!this.hasRequiredProperties(value, schema.required)) {
      return false;
    }

    // Validate property types
    return this.validateProperties(value, schema);
  }

  /**
   * Fast O(n) check for required properties
   */
  private hasRequiredProperties(value: any, required: string[]): boolean {
    return required.every(prop => prop in value);
  }

  /**
   * Validate object properties against schema
   */
  private validateProperties(value: any, schema: TypeSchema): boolean {
    // Check each defined property
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      if (propName in value) {
        if (!this.validatePropertyType(value[propName], propSchema.type)) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Validate a single property type
   */
  private validatePropertyType(value: any, expectedType: string): boolean {
    if (value == null) {
      return true; // Allow null/undefined for optional properties
    }

    switch (expectedType) {
      case 'string':
        return typeof value === 'string';
      case 'number':
        return typeof value === 'number' && !isNaN(value);
      case 'boolean':
        return typeof value === 'boolean';
      case 'object':
        return typeof value === 'object' && !Array.isArray(value);
      case 'array':
        return Array.isArray(value);
      default:
        return true; // Unknown types pass validation
    }
  }
}

/**
 * Global type registry instance
 */
let globalTypeRegistry: TypeRegistry | null = null;

/**
 * Get or create the global type registry instance
 */
export function getGlobalTypeRegistry(): TypeRegistry {
  if (!globalTypeRegistry) {
    globalTypeRegistry = new DefaultTypeRegistry();
  }
  return globalTypeRegistry;
}

/**
 * Set a custom type registry implementation
 */
export function setGlobalTypeRegistry(registry: TypeRegistry): void {
  globalTypeRegistry = registry;
}

/**
 * Convenience function to register a type globally
 */
export function registerGlobalType(name: string, config: TypeConfig): void {
  getGlobalTypeRegistry().register(name, config);
}