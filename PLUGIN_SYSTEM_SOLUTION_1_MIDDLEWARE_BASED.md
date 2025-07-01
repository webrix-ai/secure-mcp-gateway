# Plugin System Solution 1: Middleware-Based Plugin Architecture

## Overview

This solution implements a middleware-based plugin system that integrates seamlessly with the Express.js server architecture. Plugins are registered as middleware functions that can intercept and modify requests, responses, and core functionality at specific hook points throughout the request lifecycle.

## Architecture

### Core Components

1. **Plugin Manager**: Central registry for loading, configuring, and managing plugins
2. **Hook System**: Predefined extension points throughout the application lifecycle
3. **Plugin Interface**: Standardized API for plugin development
4. **Configuration System**: Plugin-specific configuration management
5. **Dependency Resolution**: Automatic plugin dependency management

### Plugin Lifecycle

```
Plugin Loading → Registration → Initialization → Hook Binding → Execution → Cleanup
```

### Directory Structure

```
plugins/
├── core/                          # Core plugin interfaces
│   ├── plugin-manager.ts
│   ├── plugin-interface.ts
│   └── hooks.ts
├── registry/                      # Plugin registry
│   └── installed-plugins.json
├── user-management/               # Example plugin
│   ├── package.json
│   ├── src/
│   │   ├── index.ts
│   │   ├── middleware.ts
│   │   └── routes.ts
│   └── config.json
├── logging/                       # Example plugin
│   └── ...
└── machine-users/                 # Example plugin
    └── ...
```

## Core Implementation

### Plugin Interface

```typescript
// plugins/core/plugin-interface.ts
export interface Plugin {
  name: string;
  version: string;
  description: string;
  dependencies?: string[];
  
  // Plugin lifecycle methods
  initialize?(context: PluginContext): Promise<void>;
  activate?(context: PluginContext): Promise<void>;
  deactivate?(): Promise<void>;
  
  // Hook registrations
  hooks?: {
    [hookName: string]: HookHandler;
  };
  
  // Express middleware
  middleware?: {
    before?: MiddlewareFunction[];
    after?: MiddlewareFunction[];
    routes?: RouteDefinition[];
  };
}

export interface PluginContext {
  app: Express;
  config: PluginConfig;
  db: Database;
  hooks: HookManager;
  logger: Logger;
}

export interface HookHandler {
  (context: HookContext, next: () => void): Promise<void> | void;
}

export interface MiddlewareFunction {
  (req: Request, res: Response, next: NextFunction): void;
}
```

### Hook System

```typescript
// plugins/core/hooks.ts
export enum SystemHooks {
  // Authentication hooks
  PRE_AUTH = 'pre-auth',
  POST_AUTH = 'post-auth',
  AUTH_FAILED = 'auth-failed',
  
  // Request lifecycle hooks
  PRE_REQUEST = 'pre-request',
  POST_REQUEST = 'post-request',
  REQUEST_ERROR = 'request-error',
  
  // MCP operation hooks
  PRE_TOOL_CALL = 'pre-tool-call',
  POST_TOOL_CALL = 'post-tool-call',
  TOOL_CALL_ERROR = 'tool-call-error',
  
  // Server lifecycle hooks
  SERVER_START = 'server-start',
  SERVER_STOP = 'server-stop',
  
  // User management hooks
  USER_CREATED = 'user-created',
  USER_UPDATED = 'user-updated',
  USER_DELETED = 'user-deleted',
}

export class HookManager {
  private hooks: Map<string, HookHandler[]> = new Map();
  
  register(hookName: string, handler: HookHandler): void {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }
    this.hooks.get(hookName)!.push(handler);
  }
  
  async execute(hookName: string, context: HookContext): Promise<void> {
    const handlers = this.hooks.get(hookName) || [];
    
    for (const handler of handlers) {
      await new Promise<void>((resolve, reject) => {
        try {
          const result = handler(context, resolve);
          if (result instanceof Promise) {
            result.then(resolve).catch(reject);
          }
        } catch (error) {
          reject(error);
        }
      });
    }
  }
}
```

### Plugin Manager

```typescript
// plugins/core/plugin-manager.ts
export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private context: PluginContext;
  private hooks: HookManager;
  
  constructor(context: PluginContext) {
    this.context = context;
    this.hooks = context.hooks;
  }
  
  async loadPlugin(pluginPath: string): Promise<void> {
    try {
      const pluginModule = await import(pluginPath);
      const plugin: Plugin = pluginModule.default || pluginModule;
      
      // Validate plugin structure
      this.validatePlugin(plugin);
      
      // Check dependencies
      await this.resolveDependencies(plugin);
      
      // Register plugin
      this.plugins.set(plugin.name, plugin);
      
      // Initialize plugin
      if (plugin.initialize) {
        await plugin.initialize(this.context);
      }
      
      // Register hooks
      if (plugin.hooks) {
        Object.entries(plugin.hooks).forEach(([hookName, handler]) => {
          this.hooks.register(hookName, handler);
        });
      }
      
      // Register middleware
      if (plugin.middleware) {
        this.registerMiddleware(plugin);
      }
      
      // Activate plugin
      if (plugin.activate) {
        await plugin.activate(this.context);
      }
      
      console.log(`✅ Plugin '${plugin.name}' loaded successfully`);
    } catch (error) {
      console.error(`❌ Failed to load plugin from ${pluginPath}:`, error);
      throw error;
    }
  }
  
  private registerMiddleware(plugin: Plugin): void {
    const { middleware } = plugin;
    
    if (middleware?.before) {
      middleware.before.forEach(mw => this.context.app.use(mw));
    }
    
    if (middleware?.routes) {
      middleware.routes.forEach(route => {
        this.context.app[route.method](route.path, ...route.handlers);
      });
    }
    
    if (middleware?.after) {
      middleware.after.forEach(mw => this.context.app.use(mw));
    }
  }
  
  async loadAllPlugins(): Promise<void> {
    const registry = await this.loadPluginRegistry();
    
    for (const pluginConfig of registry.plugins) {
      if (pluginConfig.enabled) {
        await this.loadPlugin(pluginConfig.path);
      }
    }
  }
  
  private async loadPluginRegistry(): Promise<PluginRegistry> {
    try {
      const registryPath = path.join(process.cwd(), 'plugins/registry/installed-plugins.json');
      const content = await fs.readFile(registryPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return { plugins: [] };
    }
  }
}
```

## Plugin Configuration

### Registry Configuration

```json
// plugins/registry/installed-plugins.json
{
  "plugins": [
    {
      "name": "user-management",
      "path": "./plugins/user-management/dist/index.js",
      "enabled": true,
      "config": {
        "maxUsers": 100,
        "defaultRole": "user"
      }
    },
    {
      "name": "logging",
      "path": "./plugins/logging/dist/index.js",
      "enabled": true,
      "config": {
        "logLevel": "info",
        "retentionDays": 30
      }
    },
    {
      "name": "machine-users",
      "path": "./plugins/machine-users/dist/index.js",
      "enabled": true,
      "config": {
        "tokenExpiry": "7d"
      }
    }
  ]
}
```

## Example Plugin 1: User Management

### Plugin Structure

```typescript
// plugins/user-management/src/index.ts
import { Plugin, PluginContext, SystemHooks } from '../../core/plugin-interface.js';
import { userManagementMiddleware } from './middleware.js';
import { userRoutes } from './routes.js';

export default class UserManagementPlugin implements Plugin {
  name = 'user-management';
  version = '1.0.0';
  description = 'Manages user permissions and access control';
  
  private db?: Database;
  
  async initialize(context: PluginContext): Promise<void> {
    this.db = context.db;
    
    // Create user management tables
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        user_id TEXT PRIMARY KEY,
        role TEXT DEFAULT 'user',
        permissions JSON,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      )
    `);
    
    console.log('User Management plugin initialized');
  }
  
  hooks = {
    [SystemHooks.POST_AUTH]: async (context: any) => {
      const { user } = context;
      await this.ensureUserPermissions(user);
    },
    
    [SystemHooks.PRE_TOOL_CALL]: async (context: any) => {
      const { user, tool } = context;
      const hasPermission = await this.checkToolPermission(user, tool);
      
      if (!hasPermission) {
        throw new Error(`User ${user.email} does not have permission to use tool ${tool.name}`);
      }
    }
  };
  
  middleware = {
    before: [userManagementMiddleware],
    routes: userRoutes
  };
  
  private async ensureUserPermissions(user: any): Promise<void> {
    const stmt = this.db!.prepare(`
      INSERT OR IGNORE INTO user_permissions (user_id, role, permissions)
      VALUES (?, ?, ?)
    `);
    
    const defaultPermissions = {
      tools: ['*'],
      servers: ['*'],
      admin: false
    };
    
    stmt.run(user.id, 'user', JSON.stringify(defaultPermissions));
  }
  
  private async checkToolPermission(user: any, tool: any): Promise<boolean> {
    const stmt = this.db!.prepare(`
      SELECT permissions FROM user_permissions WHERE user_id = ?
    `);
    
    const result = stmt.get(user.id) as any;
    if (!result) return false;
    
    const permissions = JSON.parse(result.permissions);
    return permissions.tools.includes('*') || permissions.tools.includes(tool.name);
  }
}
```

### Middleware Implementation

```typescript
// plugins/user-management/src/middleware.ts
import { Request, Response, NextFunction } from 'express';

export function userManagementMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Add user management context to request
  if (res.locals.session?.user) {
    res.locals.userManagement = {
      checkPermission: (permission: string) => {
        // Permission checking logic
        return true; // Simplified for example
      }
    };
  }
  
  next();
}
```

### Routes Implementation

```typescript
// plugins/user-management/src/routes.ts
import { Router } from 'express';
import { RouteDefinition } from '../../core/plugin-interface.js';

const router = Router();

router.get('/users', async (req, res) => {
  // Get all users with their permissions
  res.json({ users: [] });
});

router.patch('/users/:userId/permissions', async (req, res) => {
  // Update user permissions
  res.json({ success: true });
});

router.delete('/users/:userId', async (req, res) => {
  // Delete user
  res.json({ success: true });
});

export const userRoutes: RouteDefinition[] = [
  { method: 'use', path: '/api/user-management', handlers: [router] }
];
```

## Example Plugin 2: Logging

```typescript
// plugins/logging/src/index.ts
import { Plugin, PluginContext, SystemHooks } from '../../core/plugin-interface.js';

export default class LoggingPlugin implements Plugin {
  name = 'logging';
  version = '1.0.0';
  description = 'Comprehensive logging and audit trail';
  
  private db?: Database;
  
  async initialize(context: PluginContext): Promise<void> {
    this.db = context.db;
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        action TEXT,
        resource TEXT,
        details JSON,
        ip_address TEXT,
        user_agent TEXT,
        timestamp INTEGER DEFAULT (unixepoch())
      )
    `);
    
    console.log('Logging plugin initialized');
  }
  
  hooks = {
    [SystemHooks.POST_AUTH]: async (context: any) => {
      await this.logAction('auth', 'login', context.user.id, {
        provider: context.provider,
        timestamp: Date.now()
      });
    },
    
    [SystemHooks.PRE_TOOL_CALL]: async (context: any) => {
      await this.logAction('tool', 'call_initiated', context.user.id, {
        tool: context.tool.name,
        server: context.server,
        arguments: context.arguments
      });
    },
    
    [SystemHooks.POST_TOOL_CALL]: async (context: any) => {
      await this.logAction('tool', 'call_completed', context.user.id, {
        tool: context.tool.name,
        server: context.server,
        duration: context.duration,
        success: context.success
      });
    }
  };
  
  middleware = {
    before: [(req, res, next) => {
      req.requestStartTime = Date.now();
      next();
    }],
    
    routes: [{
      method: 'get',
      path: '/api/logs',
      handlers: [async (req, res) => {
        const logs = await this.getLogs(req.query);
        res.json(logs);
      }]
    }]
  };
  
  private async logAction(category: string, action: string, userId: string, details: any): Promise<void> {
    const stmt = this.db!.prepare(`
      INSERT INTO audit_logs (user_id, action, resource, details, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(userId, action, category, JSON.stringify(details), Date.now());
  }
  
  private async getLogs(filters: any): Promise<any[]> {
    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params: any[] = [];
    
    if (filters.user_id) {
      query += ' AND user_id = ?';
      params.push(filters.user_id);
    }
    
    if (filters.action) {
      query += ' AND action = ?';
      params.push(filters.action);
    }
    
    query += ' ORDER BY timestamp DESC LIMIT 100';
    
    const stmt = this.db!.prepare(query);
    return stmt.all(...params);
  }
}
```

## Example Plugin 3: Machine Users

```typescript
// plugins/machine-users/src/index.ts
import { Plugin, PluginContext, SystemHooks } from '../../core/plugin-interface.js';
import crypto from 'crypto';

export default class MachineUsersPlugin implements Plugin {
  name = 'machine-users';
  version = '1.0.0';
  description = 'API token-based authentication for machine users';
  
  private db?: Database;
  
  async initialize(context: PluginContext): Promise<void> {
    this.db = context.db;
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS machine_users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        api_token TEXT UNIQUE NOT NULL,
        permissions JSON,
        created_at INTEGER DEFAULT (unixepoch()),
        expires_at INTEGER,
        last_used INTEGER
      )
    `);
    
    console.log('Machine Users plugin initialized');
  }
  
  middleware = {
    before: [this.authenticateApiToken.bind(this)],
    
    routes: [
      {
        method: 'post',
        path: '/api/machine-users',
        handlers: [this.createMachineUser.bind(this)]
      },
      {
        method: 'get',
        path: '/api/machine-users',
        handlers: [this.listMachineUsers.bind(this)]
      },
      {
        method: 'delete',
        path: '/api/machine-users/:id',
        handlers: [this.deleteMachineUser.bind(this)]
      }
    ]
  };
  
  private authenticateApiToken(req: any, res: any, next: any): void {
    const authHeader = req.headers['x-api-token'];
    
    if (!authHeader) {
      return next();
    }
    
    const stmt = this.db!.prepare(`
      SELECT * FROM machine_users 
      WHERE api_token = ? AND (expires_at IS NULL OR expires_at > ?)
    `);
    
    const machineUser = stmt.get(authHeader, Date.now());
    
    if (machineUser) {
      // Update last used timestamp
      this.db!.prepare('UPDATE machine_users SET last_used = ? WHERE id = ?')
        .run(Date.now(), machineUser.id);
      
      // Set machine user context
      res.locals.machineUser = machineUser;
      res.locals.user = {
        id: machineUser.id,
        name: machineUser.name,
        type: 'machine'
      };
    }
    
    next();
  }
  
  private async createMachineUser(req: any, res: any): Promise<void> {
    const { name, permissions, expiresInDays } = req.body;
    
    const id = crypto.randomUUID();
    const apiToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = expiresInDays ? Date.now() + (expiresInDays * 24 * 60 * 60 * 1000) : null;
    
    const stmt = this.db!.prepare(`
      INSERT INTO machine_users (id, name, api_token, permissions, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, name, apiToken, JSON.stringify(permissions || {}), expiresAt);
    
    res.json({
      id,
      name,
      apiToken,
      expiresAt
    });
  }
  
  private async listMachineUsers(req: any, res: any): Promise<void> {
    const stmt = this.db!.prepare(`
      SELECT id, name, created_at, expires_at, last_used 
      FROM machine_users
      ORDER BY created_at DESC
    `);
    
    const users = stmt.all();
    res.json(users);
  }
  
  private async deleteMachineUser(req: any, res: any): Promise<void> {
    const { id } = req.params;
    
    const stmt = this.db!.prepare('DELETE FROM machine_users WHERE id = ?');
    const result = stmt.run(id);
    
    if (result.changes > 0) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Machine user not found' });
    }
  }
}
```

## Integration with Main Server

### Modified Server Setup

```typescript
// src/server.ts (additions)
import { PluginManager } from '../plugins/core/plugin-manager.js';
import { HookManager, SystemHooks } from '../plugins/core/hooks.js';

// Initialize plugin system
const hooks = new HookManager();
const pluginManager = new PluginManager({
  app,
  config: envVars,
  db: db, // Your existing database instance
  hooks,
  logger: console // Or your logging system
});

// Load all plugins
await pluginManager.loadAllPlugins();

// Integrate hooks into existing routes
app.use('/auth', async (req, res, next) => {
  await hooks.execute(SystemHooks.PRE_AUTH, { req, res });
  next();
});

// Add hook after successful authentication
app.get('/authorized', async (req, res) => {
  // ... existing auth logic ...
  
  if (user) {
    await hooks.execute(SystemHooks.POST_AUTH, { 
      user, 
      provider: 'your-provider',
      req, 
      res 
    });
  }
  
  // ... rest of route logic ...
});

// Add hooks to tool calling
app.post('/call/:integrationSlug/:toolSlug', async (req, res) => {
  const startTime = Date.now();
  
  try {
    await hooks.execute(SystemHooks.PRE_TOOL_CALL, {
      user: res.locals.user,
      tool: { name: req.params.toolSlug },
      server: req.params.integrationSlug,
      arguments: req.body
    });
    
    // ... existing tool call logic ...
    
    await hooks.execute(SystemHooks.POST_TOOL_CALL, {
      user: res.locals.user,
      tool: { name: req.params.toolSlug },
      server: req.params.integrationSlug,
      duration: Date.now() - startTime,
      success: true
    });
  } catch (error) {
    await hooks.execute(SystemHooks.TOOL_CALL_ERROR, {
      user: res.locals.user,
      error,
      tool: { name: req.params.toolSlug }
    });
    throw error;
  }
});
```

## Plugin Development Guide

### Creating a New Plugin

1. **Create Plugin Directory Structure**:
   ```bash
   mkdir plugins/my-plugin
   cd plugins/my-plugin
   npm init -y
   ```

2. **Implement Plugin Interface**:
   ```typescript
   import { Plugin, PluginContext } from '../core/plugin-interface.js';
   
   export default class MyPlugin implements Plugin {
     name = 'my-plugin';
     version = '1.0.0';
     description = 'My custom plugin';
     
     async initialize(context: PluginContext): Promise<void> {
       // Plugin initialization logic
     }
     
     hooks = {
       'my-custom-hook': async (context) => {
         // Hook implementation
       }
     };
   }
   ```

3. **Register Plugin**:
   Add entry to `plugins/registry/installed-plugins.json`

4. **Build and Test**:
   ```bash
   npm run build
   npm test
   ```

### Plugin CLI Tool

```bash
# Install the plugin development CLI
npm install -g @mcp-s/plugin-cli

# Create a new plugin
mcp-s-plugin create my-plugin

# Build plugin
mcp-s-plugin build

# Test plugin
mcp-s-plugin test

# Publish plugin
mcp-s-plugin publish
```

## Advantages of Middleware-Based Approach

1. **Express.js Integration**: Seamless integration with existing Express middleware ecosystem
2. **Familiar Development Model**: Developers already familiar with Express middleware patterns
3. **Request/Response Interception**: Easy to modify requests and responses
4. **Flexible Hook System**: Comprehensive hook points throughout the application lifecycle
5. **Hot Reloading**: Plugins can be reloaded without server restart
6. **Dependency Management**: Automatic resolution of plugin dependencies
7. **Configuration Management**: Centralized plugin configuration system

## Disadvantages

1. **Performance Overhead**: Multiple middleware layers can impact performance
2. **Complex Debugging**: Middleware chain can make debugging more difficult
3. **Order Dependencies**: Middleware execution order can be critical
4. **Memory Usage**: All plugins loaded in memory simultaneously
5. **Limited Isolation**: Plugins share the same process space

This middleware-based approach provides a robust foundation for extending the MCP Gateway with a familiar development pattern that integrates naturally with the Express.js ecosystem.