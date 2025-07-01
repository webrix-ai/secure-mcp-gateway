# Plugin System Solution 3: Extension Points-Based Plugin Architecture

## Overview

This solution implements an extension points-based plugin system that defines specific integration points throughout the codebase where plugins can extend functionality. It provides a clean, type-safe approach to plugin development with compile-time checking and strong integration with the existing codebase.

## Architecture

### Core Components

1. **Extension Point Registry**: Central registry of all available extension points
2. **Plugin Loader**: Dynamic loading and registration of plugins
3. **Extension Manager**: Manages the relationship between plugins and extension points
4. **Provider Pattern**: Interface-based plugin implementations
5. **Configuration Schema**: Strongly-typed plugin configuration system

### Extension Point Types

- **Functional Extensions**: Pure functions that transform data
- **Provider Extensions**: Service implementations following defined interfaces
- **Decorator Extensions**: Wrapper functions that enhance existing functionality
- **Factory Extensions**: Create new instances of services or components
- **Event Handler Extensions**: React to system events

### Directory Structure

```
extensions/
├── core/                           # Core extension system
│   ├── extension-registry.ts
│   ├── extension-manager.ts
│   ├── plugin-loader.ts
│   └── types/
│       ├── extension-point.ts
│       ├── plugin.ts
│       └── provider.ts
├── points/                         # Extension point definitions
│   ├── auth/
│   │   ├── authentication-provider.ts
│   │   ├── authorization-provider.ts
│   │   └── user-provider.ts
│   ├── mcp/
│   │   ├── tool-interceptor.ts
│   │   ├── server-factory.ts
│   │   └── response-transformer.ts
│   ├── logging/
│   │   ├── log-provider.ts
│   │   └── audit-provider.ts
│   └── storage/
│       ├── database-provider.ts
│       └── cache-provider.ts
├── plugins/                        # Plugin implementations
│   ├── user-management/
│   │   ├── extension.json
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── user-provider.ts
│   │   │   └── auth-provider.ts
│   │   └── config.schema.json
│   ├── logging/
│   └── machine-users/
└── registry/                       # Plugin registry
    └── enabled-extensions.json
```

## Core Implementation

### Extension Point Interface

```typescript
// extensions/core/types/extension-point.ts
export interface ExtensionPoint<T = any> {
  id: string;
  name: string;
  description: string;
  version: string;
  interface: string;
  schema: ExtensionSchema;
  singleton?: boolean;
  required?: boolean;
  multiple?: boolean;
}

export interface ExtensionSchema {
  input?: JSONSchema;
  output?: JSONSchema;
  config?: JSONSchema;
  context?: JSONSchema;
}

export interface Extension<T = any> {
  id: string;
  extensionPointId: string;
  pluginId: string;
  priority: number;
  enabled: boolean;
  config: any;
  implementation: T;
}

export type ExtensionProvider<T> = (config: any, context: ExtensionContext) => T | Promise<T>;

export interface ExtensionContext {
  app: any;
  db: any;
  config: any;
  logger: any;
  extensions: ExtensionManager;
}
```

### Extension Registry

```typescript
// extensions/core/extension-registry.ts
export class ExtensionRegistry {
  private extensionPoints: Map<string, ExtensionPoint> = new Map();
  private extensions: Map<string, Extension[]> = new Map();
  
  registerExtensionPoint<T>(point: ExtensionPoint<T>): void {
    if (this.extensionPoints.has(point.id)) {
      throw new Error(`Extension point ${point.id} already registered`);
    }
    
    this.extensionPoints.set(point.id, point);
    this.extensions.set(point.id, []);
    
    console.log(`Registered extension point: ${point.id}`);
  }
  
  registerExtension<T>(extension: Extension<T>): void {
    const point = this.extensionPoints.get(extension.extensionPointId);
    if (!point) {
      throw new Error(`Extension point ${extension.extensionPointId} not found`);
    }
    
    if (!point.multiple) {
      const existing = this.extensions.get(extension.extensionPointId) || [];
      if (existing.length > 0) {
        throw new Error(`Extension point ${extension.extensionPointId} does not allow multiple extensions`);
      }
    }
    
    const extensions = this.extensions.get(extension.extensionPointId) || [];
    extensions.push(extension);
    
    // Sort by priority (higher priority first)
    extensions.sort((a, b) => b.priority - a.priority);
    
    this.extensions.set(extension.extensionPointId, extensions);
    
    console.log(`Registered extension: ${extension.id} for point ${extension.extensionPointId}`);
  }
  
  getExtensionPoint(id: string): ExtensionPoint | undefined {
    return this.extensionPoints.get(id);
  }
  
  getExtensions(extensionPointId: string): Extension[] {
    return this.extensions.get(extensionPointId) || [];
  }
  
  getActiveExtensions(extensionPointId: string): Extension[] {
    return this.getExtensions(extensionPointId).filter(ext => ext.enabled);
  }
  
  getAllExtensionPoints(): ExtensionPoint[] {
    return Array.from(this.extensionPoints.values());
  }
}
```

### Extension Manager

```typescript
// extensions/core/extension-manager.ts
import { ExtensionRegistry } from './extension-registry.js';
import { PluginLoader } from './plugin-loader.js';

export class ExtensionManager {
  private registry: ExtensionRegistry;
  private loader: PluginLoader;
  private context: ExtensionContext;
  private instances: Map<string, any> = new Map();
  
  constructor(context: ExtensionContext) {
    this.context = context;
    this.registry = new ExtensionRegistry();
    this.loader = new PluginLoader(this.registry, context);
  }
  
  async initialize(): Promise<void> {
    // Register built-in extension points
    await this.registerBuiltInExtensionPoints();
    
    // Load all plugins
    await this.loader.loadAllPlugins();
    
    // Initialize singleton extensions
    await this.initializeSingletonExtensions();
  }
  
  private async registerBuiltInExtensionPoints(): Promise<void> {
    const extensionPoints = [
      // Authentication extension points
      {
        id: 'auth.user-provider',
        name: 'User Provider',
        description: 'Provides user information and management',
        version: '1.0.0',
        interface: 'UserProvider',
        singleton: true,
        schema: {
          output: {
            type: 'object',
            properties: {
              getUser: { type: 'function' },
              createUser: { type: 'function' },
              updateUser: { type: 'function' },
              deleteUser: { type: 'function' }
            }
          }
        }
      },
      
      // MCP extension points
      {
        id: 'mcp.tool-interceptor',
        name: 'Tool Call Interceptor',
        description: 'Intercepts and processes tool calls',
        version: '1.0.0',
        interface: 'ToolInterceptor',
        multiple: true,
        schema: {
          input: {
            type: 'object',
            properties: {
              tool: { type: 'object' },
              arguments: { type: 'object' },
              user: { type: 'object' }
            }
          },
          output: {
            type: 'object',
            properties: {
              allowed: { type: 'boolean' },
              modifiedArguments: { type: 'object' }
            }
          }
        }
      },
      
      // Logging extension points
      {
        id: 'logging.audit-provider',
        name: 'Audit Provider',
        description: 'Handles audit logging and compliance',
        version: '1.0.0',
        interface: 'AuditProvider',
        singleton: true,
        schema: {
          input: {
            type: 'object',
            properties: {
              event: { type: 'string' },
              data: { type: 'object' },
              user: { type: 'object' }
            }
          }
        }
      }
    ];
    
    extensionPoints.forEach(point => {
      this.registry.registerExtensionPoint(point);
    });
  }
  
  async getExtension<T>(extensionPointId: string): Promise<T | null> {
    const extensions = this.registry.getActiveExtensions(extensionPointId);
    if (extensions.length === 0) {
      return null;
    }
    
    const extension = extensions[0]; // Get highest priority extension
    
    // Check if already instantiated (for singletons)
    if (this.instances.has(extension.id)) {
      return this.instances.get(extension.id);
    }
    
    // Create new instance
    const instance = await extension.implementation(extension.config, this.context);
    
    // Cache if singleton
    const point = this.registry.getExtensionPoint(extensionPointId);
    if (point?.singleton) {
      this.instances.set(extension.id, instance);
    }
    
    return instance;
  }
  
  async getAllExtensions<T>(extensionPointId: string): Promise<T[]> {
    const extensions = this.registry.getActiveExtensions(extensionPointId);
    const instances: T[] = [];
    
    for (const extension of extensions) {
      const instance = await extension.implementation(extension.config, this.context);
      instances.push(instance);
    }
    
    return instances;
  }
  
  async executeExtensions<TInput, TOutput>(
    extensionPointId: string,
    input: TInput,
    combiner?: (results: TOutput[]) => TOutput
  ): Promise<TOutput | TOutput[] | null> {
    const extensions = this.registry.getActiveExtensions(extensionPointId);
    if (extensions.length === 0) {
      return null;
    }
    
    const results: TOutput[] = [];
    
    for (const extension of extensions) {
      try {
        const instance = await extension.implementation(extension.config, this.context);
        const result = await instance(input);
        results.push(result);
      } catch (error) {
        console.error(`Extension ${extension.id} failed:`, error);
        // Continue with other extensions
      }
    }
    
    if (combiner) {
      return combiner(results);
    }
    
    return results.length === 1 ? results[0] : results;
  }
}
```

### Plugin Loader

```typescript
// extensions/core/plugin-loader.ts
export class PluginLoader {
  private registry: ExtensionRegistry;
  private context: ExtensionContext;
  
  constructor(registry: ExtensionRegistry, context: ExtensionContext) {
    this.registry = registry;
    this.context = context;
  }
  
  async loadAllPlugins(): Promise<void> {
    const enabledPlugins = await this.getEnabledPlugins();
    
    for (const pluginConfig of enabledPlugins) {
      try {
        await this.loadPlugin(pluginConfig);
      } catch (error) {
        console.error(`Failed to load plugin ${pluginConfig.id}:`, error);
      }
    }
  }
  
  async loadPlugin(pluginConfig: any): Promise<void> {
    console.log(`Loading plugin: ${pluginConfig.id}`);
    
    // Load plugin manifest
    const manifest = await this.loadPluginManifest(pluginConfig.path);
    
    // Validate plugin configuration
    this.validatePluginConfig(manifest, pluginConfig.config);
    
    // Load plugin module
    const pluginModule = await import(path.join(pluginConfig.path, 'dist/index.js'));
    const plugin = pluginModule.default || pluginModule;
    
    // Initialize plugin
    if (plugin.initialize) {
      await plugin.initialize(this.context);
    }
    
    // Register extensions
    for (const extensionDef of manifest.extensions) {
      const extension: Extension = {
        id: `${pluginConfig.id}.${extensionDef.id}`,
        extensionPointId: extensionDef.extensionPoint,
        pluginId: pluginConfig.id,
        priority: extensionDef.priority || 0,
        enabled: extensionDef.enabled !== false,
        config: { ...extensionDef.config, ...pluginConfig.config },
        implementation: plugin[extensionDef.provider]
      };
      
      this.registry.registerExtension(extension);
    }
    
    console.log(`✅ Plugin ${pluginConfig.id} loaded successfully`);
  }
  
  private async loadPluginManifest(pluginPath: string): Promise<any> {
    const manifestPath = path.join(pluginPath, 'extension.json');
    const content = await fs.readFile(manifestPath, 'utf-8');
    return JSON.parse(content);
  }
  
  private async getEnabledPlugins(): Promise<any[]> {
    try {
      const registryPath = path.join(process.cwd(), 'extensions/registry/enabled-extensions.json');
      const content = await fs.readFile(registryPath, 'utf-8');
      const registry = JSON.parse(content);
      return registry.plugins.filter((p: any) => p.enabled);
    } catch (error) {
      console.warn('No plugin registry found, no plugins will be loaded');
      return [];
    }
  }
}
```

## Extension Point Definitions

### Authentication Extension Points

```typescript
// extensions/points/auth/user-provider.ts
export interface UserProvider {
  getUser(userId: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  createUser(userData: CreateUserData): Promise<User>;
  updateUser(userId: string, updates: Partial<User>): Promise<User>;
  deleteUser(userId: string): Promise<void>;
  searchUsers(criteria: SearchCriteria): Promise<User[]>;
  getUserPermissions(userId: string): Promise<UserPermissions>;
  updateUserPermissions(userId: string, permissions: UserPermissions): Promise<void>;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: UserPermissions;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface UserPermissions {
  tools: string[];
  servers: string[];
  admin: boolean;
  customPermissions?: Record<string, any>;
}

// Extension point registration
const userProviderExtensionPoint: ExtensionPoint<UserProvider> = {
  id: 'auth.user-provider',
  name: 'User Provider',
  description: 'Provides user management and authentication services',
  version: '1.0.0',
  interface: 'UserProvider',
  singleton: true,
  required: true,
  schema: {
    output: {
      type: 'object',
      required: ['getUser', 'createUser', 'updateUser', 'deleteUser'],
      properties: {
        getUser: { type: 'function' },
        createUser: { type: 'function' },
        updateUser: { type: 'function' },
        deleteUser: { type: 'function' }
      }
    }
  }
};
```

### MCP Extension Points

```typescript
// extensions/points/mcp/tool-interceptor.ts
export interface ToolInterceptor {
  interceptToolCall(context: ToolCallContext): Promise<ToolCallResult>;
}

export interface ToolCallContext {
  tool: {
    name: string;
    description: string;
    inputSchema: any;
  };
  arguments: Record<string, any>;
  user: User;
  server: string;
  metadata: {
    ip?: string;
    userAgent?: string;
    timestamp: number;
  };
}

export interface ToolCallResult {
  allowed: boolean;
  reason?: string;
  modifiedArguments?: Record<string, any>;
  additionalMetadata?: Record<string, any>;
}

// Extension point registration
const toolInterceptorExtensionPoint: ExtensionPoint<ToolInterceptor> = {
  id: 'mcp.tool-interceptor',
  name: 'Tool Call Interceptor',
  description: 'Intercepts and validates tool calls before execution',
  version: '1.0.0',
  interface: 'ToolInterceptor',
  multiple: true,
  schema: {
    input: {
      type: 'object',
      required: ['tool', 'arguments', 'user'],
      properties: {
        tool: { type: 'object' },
        arguments: { type: 'object' },
        user: { type: 'object' },
        server: { type: 'string' }
      }
    },
    output: {
      type: 'object',
      required: ['allowed'],
      properties: {
        allowed: { type: 'boolean' },
        reason: { type: 'string' },
        modifiedArguments: { type: 'object' }
      }
    }
  }
};
```

### Logging Extension Points

```typescript
// extensions/points/logging/audit-provider.ts
export interface AuditProvider {
  logEvent(event: AuditEvent): Promise<void>;
  queryLogs(query: LogQuery): Promise<AuditEvent[]>;
  getLogStats(timeRange: TimeRange): Promise<LogStats>;
}

export interface AuditEvent {
  id?: string;
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  details: Record<string, any>;
  ip?: string;
  userAgent?: string;
  result: 'success' | 'failure' | 'pending';
  metadata?: Record<string, any>;
}

export interface LogQuery {
  userId?: string;
  action?: string;
  resource?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
}

export interface LogStats {
  totalEvents: number;
  uniqueUsers: number;
  topActions: Array<{ action: string; count: number }>;
  errorRate: number;
}
```

## Example Plugin 1: User Management

### Plugin Manifest

```json
// extensions/plugins/user-management/extension.json
{
  "id": "user-management",
  "name": "User Management Plugin",
  "version": "1.0.0",
  "description": "Provides comprehensive user management functionality",
  "author": "MCP-S Team",
  "dependencies": [],
  "extensions": [
    {
      "id": "user-provider",
      "extensionPoint": "auth.user-provider",
      "provider": "createUserProvider",
      "priority": 100,
      "enabled": true,
      "config": {
        "defaultRole": "user",
        "maxUsers": 1000
      }
    },
    {
      "id": "tool-permission-interceptor",
      "extensionPoint": "mcp.tool-interceptor",
      "provider": "createToolInterceptor",
      "priority": 50,
      "enabled": true,
      "config": {
        "strictMode": false
      }
    }
  ],
  "configSchema": {
    "type": "object",
    "properties": {
      "defaultRole": {
        "type": "string",
        "default": "user",
        "enum": ["user", "admin", "viewer"]
      },
      "maxUsers": {
        "type": "number",
        "default": 1000,
        "minimum": 1
      },
      "strictMode": {
        "type": "boolean",
        "default": false
      }
    }
  }
}
```

### Plugin Implementation

```typescript
// extensions/plugins/user-management/src/index.ts
import { ExtensionContext, UserProvider, ToolInterceptor } from '../../../core/types/index.js';
import { UserProviderImpl } from './user-provider.js';
import { PermissionInterceptor } from './permission-interceptor.js';

export async function initialize(context: ExtensionContext): Promise<void> {
  console.log('Initializing User Management plugin');
  
  // Initialize database tables
  const db = context.db;
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      permissions JSON,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      metadata JSON
    )
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)
  `);
}

export function createUserProvider(config: any, context: ExtensionContext): UserProvider {
  return new UserProviderImpl(config, context);
}

export function createToolInterceptor(config: any, context: ExtensionContext): ToolInterceptor {
  return new PermissionInterceptor(config, context);
}
```

### User Provider Implementation

```typescript
// extensions/plugins/user-management/src/user-provider.ts
import { UserProvider, User, UserPermissions, CreateUserData, SearchCriteria } from '../../../points/auth/user-provider.js';
import { ExtensionContext } from '../../../core/types/extension-point.js';

export class UserProviderImpl implements UserProvider {
  private db: any;
  private config: any;
  private logger: any;
  
  constructor(config: any, context: ExtensionContext) {
    this.config = config;
    this.db = context.db;
    this.logger = context.logger;
  }
  
  async getUser(userId: string): Promise<User | null> {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(userId);
    
    if (!row) return null;
    
    return this.mapRowToUser(row);
  }
  
  async getUserByEmail(email: string): Promise<User | null> {
    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
    const row = stmt.get(email);
    
    if (!row) return null;
    
    return this.mapRowToUser(row);
  }
  
  async createUser(userData: CreateUserData): Promise<User> {
    const id = crypto.randomUUID();
    const defaultPermissions: UserPermissions = {
      tools: this.config.strictMode ? [] : ['*'],
      servers: this.config.strictMode ? [] : ['*'],
      admin: false
    };
    
    const stmt = this.db.prepare(`
      INSERT INTO users (id, email, name, role, permissions, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      userData.email,
      userData.name,
      userData.role || this.config.defaultRole,
      JSON.stringify(userData.permissions || defaultPermissions),
      JSON.stringify(userData.metadata || {})
    );
    
    const user = await this.getUser(id);
    if (!user) {
      throw new Error('Failed to create user');
    }
    
    this.logger.info(`User created: ${user.email} (${user.id})`);
    return user;
  }
  
  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const existingUser = await this.getUser(userId);
    if (!existingUser) {
      throw new Error('User not found');
    }
    
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updates.email) {
      fields.push('email = ?');
      values.push(updates.email);
    }
    
    if (updates.name) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    
    if (updates.role) {
      fields.push('role = ?');
      values.push(updates.role);
    }
    
    if (updates.permissions) {
      fields.push('permissions = ?');
      values.push(JSON.stringify(updates.permissions));
    }
    
    if (updates.metadata) {
      fields.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }
    
    fields.push('updated_at = unixepoch()');
    values.push(userId);
    
    const stmt = this.db.prepare(`
      UPDATE users SET ${fields.join(', ')} WHERE id = ?
    `);
    
    stmt.run(...values);
    
    const updatedUser = await this.getUser(userId);
    if (!updatedUser) {
      throw new Error('Failed to update user');
    }
    
    this.logger.info(`User updated: ${updatedUser.email} (${updatedUser.id})`);
    return updatedUser;
  }
  
  async deleteUser(userId: string): Promise<void> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(userId);
    
    if (result.changes === 0) {
      throw new Error('Failed to delete user');
    }
    
    this.logger.info(`User deleted: ${user.email} (${user.id})`);
  }
  
  async searchUsers(criteria: SearchCriteria): Promise<User[]> {
    let query = 'SELECT * FROM users WHERE 1=1';
    const params: any[] = [];
    
    if (criteria.email) {
      query += ' AND email LIKE ?';
      params.push(`%${criteria.email}%`);
    }
    
    if (criteria.name) {
      query += ' AND name LIKE ?';
      params.push(`%${criteria.name}%`);
    }
    
    if (criteria.role) {
      query += ' AND role = ?';
      params.push(criteria.role);
    }
    
    query += ' ORDER BY created_at DESC';
    
    if (criteria.limit) {
      query += ' LIMIT ?';
      params.push(criteria.limit);
    }
    
    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params);
    
    return rows.map(row => this.mapRowToUser(row));
  }
  
  async getUserPermissions(userId: string): Promise<UserPermissions> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }
    
    return user.permissions;
  }
  
  async updateUserPermissions(userId: string, permissions: UserPermissions): Promise<void> {
    await this.updateUser(userId, { permissions });
  }
  
  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      permissions: JSON.parse(row.permissions),
      createdAt: new Date(row.created_at * 1000),
      updatedAt: new Date(row.updated_at * 1000),
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    };
  }
}
```

### Permission Interceptor

```typescript
// extensions/plugins/user-management/src/permission-interceptor.ts
import { ToolInterceptor, ToolCallContext, ToolCallResult } from '../../../points/mcp/tool-interceptor.js';
import { ExtensionContext } from '../../../core/types/extension-point.js';

export class PermissionInterceptor implements ToolInterceptor {
  private config: any;
  private context: ExtensionContext;
  
  constructor(config: any, context: ExtensionContext) {
    this.config = config;
    this.context = context;
  }
  
  async interceptToolCall(context: ToolCallContext): Promise<ToolCallResult> {
    const { user, tool, server } = context;
    
    // Get user provider to check permissions
    const userProvider = await this.context.extensions.getExtension('auth.user-provider');
    if (!userProvider) {
      return {
        allowed: false,
        reason: 'User provider not available'
      };
    }
    
    const permissions = await userProvider.getUserPermissions(user.id);
    
    // Check tool permissions
    const hasToolPermission = permissions.tools.includes('*') || 
                             permissions.tools.includes(tool.name);
    
    if (!hasToolPermission) {
      return {
        allowed: false,
        reason: `User does not have permission to use tool: ${tool.name}`
      };
    }
    
    // Check server permissions
    const hasServerPermission = permissions.servers.includes('*') || 
                               permissions.servers.includes(server);
    
    if (!hasServerPermission) {
      return {
        allowed: false,
        reason: `User does not have permission to access server: ${server}`
      };
    }
    
    // Additional validation in strict mode
    if (this.config.strictMode) {
      const isValidArguments = await this.validateArguments(tool, context.arguments);
      if (!isValidArguments) {
        return {
          allowed: false,
          reason: 'Invalid arguments provided'
        };
      }
    }
    
    return {
      allowed: true,
      additionalMetadata: {
        userRole: user.role,
        permissionLevel: permissions.admin ? 'admin' : 'user'
      }
    };
  }
  
  private async validateArguments(tool: any, args: Record<string, any>): Promise<boolean> {
    // Implement custom argument validation logic
    // This could validate against tool schema, sanitize inputs, etc.
    return true;
  }
}
```

## Example Plugin 2: Logging

```typescript
// extensions/plugins/logging/src/index.ts
import { ExtensionContext, AuditProvider } from '../../../core/types/index.js';
import { AuditProviderImpl } from './audit-provider.js';

export async function initialize(context: ExtensionContext): Promise<void> {
  console.log('Initializing Logging plugin');
  
  const db = context.db;
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      action TEXT NOT NULL,
      resource TEXT NOT NULL,
      details JSON,
      ip TEXT,
      user_agent TEXT,
      result TEXT DEFAULT 'success',
      metadata JSON
    )
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp)
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action)
  `);
}

export function createAuditProvider(config: any, context: ExtensionContext): AuditProvider {
  return new AuditProviderImpl(config, context);
}
```

## Example Plugin 3: Machine Users

```typescript
// extensions/plugins/machine-users/src/index.ts
import { ExtensionContext } from '../../../core/types/index.js';
import { MachineUserProvider } from './machine-user-provider.js';
import { ApiTokenInterceptor } from './api-token-interceptor.js';

export async function initialize(context: ExtensionContext): Promise<void> {
  console.log('Initializing Machine Users plugin');
  
  const db = context.db;
  db.exec(`
    CREATE TABLE IF NOT EXISTS machine_users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      api_token TEXT UNIQUE NOT NULL,
      permissions JSON,
      created_at INTEGER DEFAULT (unixepoch()),
      expires_at INTEGER,
      last_used INTEGER,
      metadata JSON
    )
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_machine_users_token ON machine_users(api_token)
  `);
}

export function createMachineUserProvider(config: any, context: ExtensionContext) {
  return new MachineUserProvider(config, context);
}

export function createApiTokenInterceptor(config: any, context: ExtensionContext) {
  return new ApiTokenInterceptor(config, context);
}
```

## Integration with Main Server

```typescript
// src/server.ts (modifications)
import { ExtensionManager } from '../extensions/core/extension-manager.js';

// Initialize extension system
const extensionManager = new ExtensionManager({
  app,
  db: db, // Your existing database
  config: envVars,
  logger: console,
  extensions: null as any // Will be set after initialization
});

// Self-reference for extensions to access the manager
(extensionManager as any).context.extensions = extensionManager;

// Initialize extensions
await extensionManager.initialize();

// Integrate with existing authentication flow
app.get('/authorized', async (req, res) => {
  // ... existing auth logic ...
  
  if (user) {
    // Use extension to handle user creation/update
    const userProvider = await extensionManager.getExtension('auth.user-provider');
    if (userProvider) {
      let dbUser = await userProvider.getUserByEmail(user.email);
      if (!dbUser) {
        dbUser = await userProvider.createUser({
          email: user.email,
          name: user.name,
          role: 'user'
        });
      }
      
      // Log the authentication event
      const auditProvider = await extensionManager.getExtension('logging.audit-provider');
      if (auditProvider) {
        await auditProvider.logEvent({
          timestamp: new Date(),
          userId: dbUser.id,
          action: 'auth.login',
          resource: 'authentication',
          details: { provider: 'oauth' },
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          result: 'success'
        });
      }
    }
  }
  
  // ... rest of route logic ...
});

// Integrate with tool calling
app.post('/call/:integrationSlug/:toolSlug', async (req, res) => {
  const startTime = Date.now();
  
  try {
    // Run tool interceptors
    const interceptors = await extensionManager.getAllExtensions('mcp.tool-interceptor');
    
    const toolContext = {
      tool: { name: req.params.toolSlug },
      arguments: req.body,
      user: res.locals.user,
      server: req.params.integrationSlug,
      metadata: {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        timestamp: Date.now()
      }
    };
    
    for (const interceptor of interceptors) {
      const result = await interceptor.interceptToolCall(toolContext);
      if (!result.allowed) {
        return res.status(403).json({ error: result.reason });
      }
      
      // Apply any argument modifications
      if (result.modifiedArguments) {
        Object.assign(req.body, result.modifiedArguments);
      }
    }
    
    // ... existing tool call logic ...
    
    // Log successful tool call
    const auditProvider = await extensionManager.getExtension('logging.audit-provider');
    if (auditProvider) {
      await auditProvider.logEvent({
        timestamp: new Date(),
        userId: res.locals.user.id,
        action: 'tool.call',
        resource: `${req.params.integrationSlug}:${req.params.toolSlug}`,
        details: { 
          arguments: req.body,
          duration: Date.now() - startTime
        },
        result: 'success'
      });
    }
    
  } catch (error) {
    // Log failed tool call
    const auditProvider = await extensionManager.getExtension('logging.audit-provider');
    if (auditProvider) {
      await auditProvider.logEvent({
        timestamp: new Date(),
        userId: res.locals.user?.id || 'unknown',
        action: 'tool.call',
        resource: `${req.params.integrationSlug}:${req.params.toolSlug}`,
        details: { 
          arguments: req.body,
          error: error.message,
          duration: Date.now() - startTime
        },
        result: 'failure'
      });
    }
    
    throw error;
  }
});
```

## Plugin Configuration Registry

```json
// extensions/registry/enabled-extensions.json
{
  "plugins": [
    {
      "id": "user-management",
      "path": "./extensions/plugins/user-management",
      "enabled": true,
      "config": {
        "defaultRole": "user",
        "maxUsers": 500,
        "strictMode": true
      }
    },
    {
      "id": "logging",
      "path": "./extensions/plugins/logging",
      "enabled": true,
      "config": {
        "retentionDays": 90,
        "logLevel": "info"
      }
    },
    {
      "id": "machine-users",
      "path": "./extensions/plugins/machine-users",
      "enabled": true,
      "config": {
        "defaultTokenExpiry": "30d",
        "maxTokensPerUser": 5
      }
    }
  ]
}
```

## Advantages of Extension Points Approach

1. **Type Safety**: Strong TypeScript interfaces ensure compile-time checking
2. **Clean Architecture**: Well-defined extension points create clear boundaries
3. **Testability**: Easy to mock and test individual extensions
4. **Documentation**: Extension points serve as API documentation
5. **IDE Support**: Full IntelliSense and autocomplete support
6. **Validation**: Schema validation for extension configurations
7. **Performance**: Direct function calls without network overhead

## Disadvantages

1. **Coupling**: Plugins are more tightly coupled to the core system
2. **Language Limitation**: Plugins must be written in TypeScript/JavaScript
3. **Restart Required**: Plugin changes typically require server restart
4. **Memory Sharing**: All plugins share the same memory space
5. **Versioning Complexity**: API changes affect all plugins simultaneously

This extension points-based approach provides the strongest integration with the existing codebase while maintaining clean separation of concerns through well-defined interfaces.