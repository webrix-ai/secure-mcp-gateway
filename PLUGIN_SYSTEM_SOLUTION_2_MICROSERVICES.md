# Plugin System Solution 2: Microservices-Based Plugin Architecture

## Overview

This solution implements a microservices-based plugin system where each plugin runs as an independent service. The core MCP Gateway communicates with plugins through well-defined APIs, providing strong isolation, independent scalability, and language-agnostic plugin development.

## Architecture

### Core Components

1. **Plugin Registry Service**: Central service discovery and management
2. **Plugin Gateway**: Reverse proxy and load balancer for plugin services
3. **Event Bus**: Message queue for asynchronous inter-service communication
4. **Service Discovery**: Dynamic discovery and health checking of plugin services
5. **API Gateway**: Unified API endpoint with routing to appropriate plugins

### Communication Patterns

- **Synchronous**: REST APIs for request/response operations
- **Asynchronous**: Message queues for events and background processing
- **Streaming**: WebSocket/SSE for real-time data

### Directory Structure

```
microservices/
├── core/                           # Core gateway service
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── plugin-registry/                # Plugin registry service
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── event-bus/                      # Message queue service
│   ├── docker-compose.yml
│   └── config/
├── plugins/
│   ├── user-management/            # User management microservice
│   │   ├── src/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── openapi.yaml
│   ├── logging/                    # Logging microservice
│   │   └── ...
│   └── machine-users/              # Machine users microservice
│       └── ...
├── shared/                         # Shared libraries and types
│   ├── types/
│   ├── utils/
│   └── clients/
├── docker-compose.yml              # Development environment
└── kubernetes/                     # Production deployment configs
    ├── manifests/
    └── helm/
```

## Core Implementation

### Plugin Service Interface

```typescript
// shared/types/plugin-service.ts
export interface PluginService {
  name: string;
  version: string;
  description: string;
  endpoints: ServiceEndpoint[];
  events: EventDefinition[];
  dependencies: ServiceDependency[];
  healthCheck: string;
  config: ServiceConfig;
}

export interface ServiceEndpoint {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  auth: boolean;
  schema: {
    request?: any;
    response?: any;
  };
}

export interface EventDefinition {
  name: string;
  description: string;
  schema: any;
  producer?: boolean;
  consumer?: boolean;
}

export interface ServiceDependency {
  service: string;
  version: string;
  required: boolean;
}
```

### Plugin Registry Service

```typescript
// plugin-registry/src/registry.ts
import express from 'express';
import { PluginService } from '../../shared/types/plugin-service.js';

export class PluginRegistry {
  private services: Map<string, PluginService> = new Map();
  private healthChecks: Map<string, NodeJS.Timeout> = new Map();
  
  async registerService(service: PluginService, baseUrl: string): Promise<void> {
    console.log(`Registering service: ${service.name}@${service.version}`);
    
    // Validate service definition
    this.validateService(service);
    
    // Store service configuration
    this.services.set(service.name, {
      ...service,
      baseUrl,
      registeredAt: Date.now(),
      status: 'healthy'
    });
    
    // Start health checking
    this.startHealthCheck(service.name, baseUrl + service.healthCheck);
    
    // Notify other services of new registration
    await this.notifyServiceRegistration(service);
  }
  
  async unregisterService(serviceName: string): Promise<void> {
    console.log(`Unregistering service: ${serviceName}`);
    
    const service = this.services.get(serviceName);
    if (service) {
      // Stop health checking
      const healthCheckTimer = this.healthChecks.get(serviceName);
      if (healthCheckTimer) {
        clearInterval(healthCheckTimer);
        this.healthChecks.delete(serviceName);
      }
      
      // Remove from registry
      this.services.delete(serviceName);
      
      // Notify other services
      await this.notifyServiceUnregistration(serviceName);
    }
  }
  
  getService(serviceName: string): PluginService | undefined {
    return this.services.get(serviceName);
  }
  
  getAllServices(): PluginService[] {
    return Array.from(this.services.values());
  }
  
  getServicesByEvent(eventName: string): PluginService[] {
    return Array.from(this.services.values()).filter(service =>
      service.events.some(event => 
        event.name === eventName && event.consumer
      )
    );
  }
  
  private startHealthCheck(serviceName: string, healthUrl: string): void {
    const timer = setInterval(async () => {
      try {
        const response = await fetch(healthUrl);
        const isHealthy = response.ok;
        
        const service = this.services.get(serviceName);
        if (service) {
          service.status = isHealthy ? 'healthy' : 'unhealthy';
          service.lastHealthCheck = Date.now();
        }
        
        if (!isHealthy) {
          console.warn(`Service ${serviceName} health check failed`);
        }
      } catch (error) {
        console.error(`Health check failed for ${serviceName}:`, error);
        const service = this.services.get(serviceName);
        if (service) {
          service.status = 'unhealthy';
          service.lastHealthCheck = Date.now();
        }
      }
    }, 30000); // Check every 30 seconds
    
    this.healthChecks.set(serviceName, timer);
  }
}

// Express server setup
const app = express();
app.use(express.json());

const registry = new PluginRegistry();

app.post('/services/register', async (req, res) => {
  try {
    const { service, baseUrl } = req.body;
    await registry.registerService(service, baseUrl);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.delete('/services/:serviceName', async (req, res) => {
  await registry.unregisterService(req.params.serviceName);
  res.json({ success: true });
});

app.get('/services', (req, res) => {
  res.json(registry.getAllServices());
});

app.get('/services/:serviceName', (req, res) => {
  const service = registry.getService(req.params.serviceName);
  if (service) {
    res.json(service);
  } else {
    res.status(404).json({ error: 'Service not found' });
  }
});
```

### Event Bus Implementation

```typescript
// core/src/event-bus.ts
import { EventEmitter } from 'events';
import Redis from 'ioredis';

export class EventBus {
  private redis: Redis;
  private subscriber: Redis;
  private eventEmitter: EventEmitter;
  
  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
    this.subscriber = new Redis(redisUrl);
    this.eventEmitter = new EventEmitter();
    
    this.subscriber.on('message', (channel, message) => {
      try {
        const event = JSON.parse(message);
        this.eventEmitter.emit(channel, event);
      } catch (error) {
        console.error('Failed to parse event message:', error);
      }
    });
  }
  
  async publish(eventName: string, data: any, metadata?: any): Promise<void> {
    const event = {
      id: crypto.randomUUID(),
      name: eventName,
      data,
      metadata: {
        timestamp: Date.now(),
        source: process.env.SERVICE_NAME || 'unknown',
        ...metadata
      }
    };
    
    await this.redis.publish(eventName, JSON.stringify(event));
    console.log(`Published event: ${eventName}`);
  }
  
  async subscribe(eventName: string, handler: (event: any) => Promise<void>): Promise<void> {
    await this.subscriber.subscribe(eventName);
    this.eventEmitter.on(eventName, handler);
    console.log(`Subscribed to event: ${eventName}`);
  }
  
  async unsubscribe(eventName: string): Promise<void> {
    await this.subscriber.unsubscribe(eventName);
    this.eventEmitter.removeAllListeners(eventName);
    console.log(`Unsubscribed from event: ${eventName}`);
  }
}
```

### Service Discovery Client

```typescript
// shared/clients/service-discovery.ts
export class ServiceDiscoveryClient {
  private registryUrl: string;
  private services: Map<string, PluginService> = new Map();
  private refreshInterval: NodeJS.Timeout;
  
  constructor(registryUrl: string) {
    this.registryUrl = registryUrl;
    this.refreshServices();
    
    // Refresh service list every minute
    this.refreshInterval = setInterval(() => {
      this.refreshServices();
    }, 60000);
  }
  
  async refreshServices(): Promise<void> {
    try {
      const response = await fetch(`${this.registryUrl}/services`);
      const services = await response.json();
      
      this.services.clear();
      services.forEach((service: PluginService) => {
        this.services.set(service.name, service);
      });
    } catch (error) {
      console.error('Failed to refresh services:', error);
    }
  }
  
  getService(serviceName: string): PluginService | undefined {
    return this.services.get(serviceName);
  }
  
  getServiceUrl(serviceName: string): string | undefined {
    const service = this.getService(serviceName);
    return service?.baseUrl;
  }
  
  async callService(serviceName: string, endpoint: string, options: RequestInit = {}): Promise<any> {
    const serviceUrl = this.getServiceUrl(serviceName);
    if (!serviceUrl) {
      throw new Error(`Service ${serviceName} not found`);
    }
    
    const response = await fetch(`${serviceUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      throw new Error(`Service call failed: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }
  
  destroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}
```

## Example Plugin 1: User Management Microservice

### Service Definition

```typescript
// plugins/user-management/src/service.ts
import express from 'express';
import { PluginService } from '../../../shared/types/plugin-service.js';
import { ServiceDiscoveryClient } from '../../../shared/clients/service-discovery.js';
import { EventBus } from '../../../shared/clients/event-bus.js';

export class UserManagementService {
  private app: express.Application;
  private serviceDiscovery: ServiceDiscoveryClient;
  private eventBus: EventBus;
  private db: any; // Your database instance
  
  constructor() {
    this.app = express();
    this.app.use(express.json());
    
    this.serviceDiscovery = new ServiceDiscoveryClient(process.env.REGISTRY_URL!);
    this.eventBus = new EventBus(process.env.REDIS_URL!);
    
    this.setupRoutes();
    this.setupEventHandlers();
  }
  
  async start(): Promise<void> {
    const port = process.env.PORT || 3001;
    
    // Initialize database
    await this.initializeDatabase();
    
    // Start server
    this.app.listen(port, async () => {
      console.log(`User Management service running on port ${port}`);
      
      // Register with plugin registry
      await this.registerService();
    });
  }
  
  private async registerService(): Promise<void> {
    const serviceDefinition: PluginService = {
      name: 'user-management',
      version: '1.0.0',
      description: 'User management and permissions service',
      endpoints: [
        {
          path: '/users',
          method: 'GET',
          description: 'Get all users with permissions',
          auth: true,
          schema: {
            response: {
              type: 'object',
              properties: {
                users: {
                  type: 'array',
                  items: { $ref: '#/components/schemas/User' }
                }
              }
            }
          }
        },
        {
          path: '/users/:userId/permissions',
          method: 'PATCH',
          description: 'Update user permissions',
          auth: true,
          schema: {
            request: {
              type: 'object',
              properties: {
                permissions: { type: 'object' }
              }
            }
          }
        }
      ],
      events: [
        {
          name: 'user.created',
          description: 'User was created',
          schema: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              email: { type: 'string' }
            }
          },
          producer: true
        },
        {
          name: 'auth.login',
          description: 'User logged in',
          schema: {
            type: 'object',
            properties: {
              userId: { type: 'string' },
              timestamp: { type: 'number' }
            }
          },
          consumer: true
        }
      ],
      dependencies: [],
      healthCheck: '/health',
      config: {}
    };
    
    const registryUrl = process.env.REGISTRY_URL!;
    const baseUrl = `http://localhost:${process.env.PORT || 3001}`;
    
    await fetch(`${registryUrl}/services/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service: serviceDefinition,
        baseUrl
      })
    });
  }
  
  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: Date.now() });
    });
    
    // Get all users
    this.app.get('/users', async (req, res) => {
      try {
        const users = await this.getAllUsers();
        res.json({ users });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Update user permissions
    this.app.patch('/users/:userId/permissions', async (req, res) => {
      try {
        const { userId } = req.params;
        const { permissions } = req.body;
        
        await this.updateUserPermissions(userId, permissions);
        
        // Publish event
        await this.eventBus.publish('user.permissions.updated', {
          userId,
          permissions,
          updatedBy: req.headers['x-user-id']
        });
        
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Delete user
    this.app.delete('/users/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        await this.deleteUser(userId);
        
        // Publish event
        await this.eventBus.publish('user.deleted', {
          userId,
          deletedBy: req.headers['x-user-id']
        });
        
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }
  
  private setupEventHandlers(): void {
    // Handle authentication events
    this.eventBus.subscribe('auth.login', async (event) => {
      const { userId } = event.data;
      await this.ensureUserPermissions(userId);
    });
    
    // Handle user creation events
    this.eventBus.subscribe('auth.user.created', async (event) => {
      const { userId, email } = event.data;
      await this.createUserPermissions(userId, email);
    });
  }
  
  private async initializeDatabase(): Promise<void> {
    // Initialize SQLite database
    this.db = new Database('./user-management.sqlite');
    
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_permissions (
        user_id TEXT PRIMARY KEY,
        email TEXT,
        role TEXT DEFAULT 'user',
        permissions JSON,
        created_at INTEGER DEFAULT (unixepoch()),
        updated_at INTEGER DEFAULT (unixepoch())
      )
    `);
  }
  
  private async getAllUsers(): Promise<any[]> {
    const stmt = this.db.prepare(`
      SELECT user_id, email, role, permissions, created_at, updated_at
      FROM user_permissions
      ORDER BY created_at DESC
    `);
    
    return stmt.all().map((row: any) => ({
      ...row,
      permissions: JSON.parse(row.permissions)
    }));
  }
  
  private async updateUserPermissions(userId: string, permissions: any): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE user_permissions 
      SET permissions = ?, updated_at = unixepoch()
      WHERE user_id = ?
    `);
    
    stmt.run(JSON.stringify(permissions), userId);
  }
  
  private async deleteUser(userId: string): Promise<void> {
    const stmt = this.db.prepare('DELETE FROM user_permissions WHERE user_id = ?');
    stmt.run(userId);
  }
  
  private async ensureUserPermissions(userId: string): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT OR IGNORE INTO user_permissions (user_id, role, permissions)
      VALUES (?, ?, ?)
    `);
    
    const defaultPermissions = {
      tools: ['*'],
      servers: ['*'],
      admin: false
    };
    
    stmt.run(userId, 'user', JSON.stringify(defaultPermissions));
  }
  
  private async createUserPermissions(userId: string, email: string): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO user_permissions (user_id, email, role, permissions)
      VALUES (?, ?, ?, ?)
    `);
    
    const defaultPermissions = {
      tools: ['*'],
      servers: ['*'],
      admin: false
    };
    
    stmt.run(userId, email, 'user', JSON.stringify(defaultPermissions));
  }
}

// Start the service
const service = new UserManagementService();
service.start().catch(console.error);
```

### Dockerfile

```dockerfile
# plugins/user-management/Dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3001

CMD ["node", "dist/service.js"]
```

## Example Plugin 2: Logging Microservice

```typescript
// plugins/logging/src/service.ts
import express from 'express';
import { ServiceDiscoveryClient } from '../../../shared/clients/service-discovery.js';
import { EventBus } from '../../../shared/clients/event-bus.js';

export class LoggingService {
  private app: express.Application;
  private eventBus: EventBus;
  private db: any;
  
  constructor() {
    this.app = express();
    this.app.use(express.json());
    
    this.eventBus = new EventBus(process.env.REDIS_URL!);
    
    this.setupRoutes();
    this.setupEventHandlers();
  }
  
  async start(): Promise<void> {
    const port = process.env.PORT || 3002;
    
    await this.initializeDatabase();
    
    this.app.listen(port, async () => {
      console.log(`Logging service running on port ${port}`);
      await this.registerService();
    });
  }
  
  private setupRoutes(): void {
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: Date.now() });
    });
    
    this.app.get('/logs', async (req, res) => {
      try {
        const filters = req.query;
        const logs = await this.getLogs(filters);
        res.json({ logs });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    this.app.post('/logs', async (req, res) => {
      try {
        const { category, action, userId, details } = req.body;
        await this.logAction(category, action, userId, details);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }
  
  private setupEventHandlers(): void {
    // Subscribe to all events for logging
    const events = [
      'auth.login',
      'auth.logout',
      'tool.call.started',
      'tool.call.completed',
      'tool.call.failed',
      'user.created',
      'user.updated',
      'user.deleted'
    ];
    
    events.forEach(eventName => {
      this.eventBus.subscribe(eventName, async (event) => {
        await this.logEvent(eventName, event);
      });
    });
  }
  
  private async logEvent(eventName: string, event: any): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (user_id, action, resource, details, ip_address, user_agent, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      event.data.userId || 'system',
      eventName,
      'event',
      JSON.stringify(event.data),
      event.metadata.ip || null,
      event.metadata.userAgent || null,
      event.metadata.timestamp
    );
  }
  
  private async logAction(category: string, action: string, userId: string, details: any): Promise<void> {
    const stmt = this.db.prepare(`
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
      query += ' AND action LIKE ?';
      params.push(`%${filters.action}%`);
    }
    
    if (filters.from) {
      query += ' AND timestamp >= ?';
      params.push(parseInt(filters.from));
    }
    
    if (filters.to) {
      query += ' AND timestamp <= ?';
      params.push(parseInt(filters.to));
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(parseInt(filters.limit) || 100);
    
    const stmt = this.db.prepare(query);
    return stmt.all(...params);
  }
}
```

## Example Plugin 3: Machine Users Microservice

```typescript
// plugins/machine-users/src/service.ts
import express from 'express';
import crypto from 'crypto';
import { EventBus } from '../../../shared/clients/event-bus.js';

export class MachineUsersService {
  private app: express.Application;
  private eventBus: EventBus;
  private db: any;
  
  constructor() {
    this.app = express();
    this.app.use(express.json());
    
    this.eventBus = new EventBus(process.env.REDIS_URL!);
    
    this.setupRoutes();
  }
  
  private setupRoutes(): void {
    this.app.get('/health', (req, res) => {
      res.json({ status: 'healthy', timestamp: Date.now() });
    });
    
    this.app.post('/machine-users', async (req, res) => {
      try {
        const { name, permissions, expiresInDays } = req.body;
        const machineUser = await this.createMachineUser(name, permissions, expiresInDays);
        
        await this.eventBus.publish('machine-user.created', {
          id: machineUser.id,
          name: machineUser.name,
          createdBy: req.headers['x-user-id']
        });
        
        res.json(machineUser);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    this.app.get('/machine-users', async (req, res) => {
      try {
        const users = await this.getAllMachineUsers();
        res.json({ users });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    this.app.delete('/machine-users/:id', async (req, res) => {
      try {
        const { id } = req.params;
        await this.deleteMachineUser(id);
        
        await this.eventBus.publish('machine-user.deleted', {
          id,
          deletedBy: req.headers['x-user-id']
        });
        
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
    
    // Token validation endpoint for other services
    this.app.post('/validate-token', async (req, res) => {
      try {
        const { token } = req.body;
        const machineUser = await this.validateToken(token);
        
        if (machineUser) {
          res.json({ valid: true, user: machineUser });
        } else {
          res.json({ valid: false });
        }
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });
  }
  
  private async createMachineUser(name: string, permissions: any, expiresInDays?: number): Promise<any> {
    const id = crypto.randomUUID();
    const apiToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = expiresInDays ? Date.now() + (expiresInDays * 24 * 60 * 60 * 1000) : null;
    
    const stmt = this.db.prepare(`
      INSERT INTO machine_users (id, name, api_token, permissions, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    
    stmt.run(id, name, apiToken, JSON.stringify(permissions || {}), expiresAt);
    
    return { id, name, apiToken, expiresAt };
  }
  
  private async validateToken(token: string): Promise<any> {
    const stmt = this.db.prepare(`
      SELECT * FROM machine_users 
      WHERE api_token = ? AND (expires_at IS NULL OR expires_at > ?)
    `);
    
    const user = stmt.get(token, Date.now());
    
    if (user) {
      // Update last used timestamp
      this.db.prepare('UPDATE machine_users SET last_used = ? WHERE id = ?')
        .run(Date.now(), user.id);
      
      return {
        id: user.id,
        name: user.name,
        permissions: JSON.parse(user.permissions),
        type: 'machine'
      };
    }
    
    return null;
  }
}
```

## Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Core MCP Gateway
  mcp-gateway:
    build: ./core
    ports:
      - "3000:3000"
    environment:
      - REGISTRY_URL=http://plugin-registry:3100
      - REDIS_URL=redis://redis:6379
    depends_on:
      - plugin-registry
      - redis

  # Plugin Registry
  plugin-registry:
    build: ./plugin-registry
    ports:
      - "3100:3100"
    environment:
      - REDIS_URL=redis://redis:6379

  # Event Bus (Redis)
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # User Management Plugin
  user-management:
    build: ./plugins/user-management
    environment:
      - PORT=3001
      - REGISTRY_URL=http://plugin-registry:3100
      - REDIS_URL=redis://redis:6379
    depends_on:
      - plugin-registry
      - redis

  # Logging Plugin
  logging:
    build: ./plugins/logging
    environment:
      - PORT=3002
      - REGISTRY_URL=http://plugin-registry:3100
      - REDIS_URL=redis://redis:6379
    depends_on:
      - plugin-registry
      - redis

  # Machine Users Plugin
  machine-users:
    build: ./plugins/machine-users
    environment:
      - PORT=3003
      - REGISTRY_URL=http://plugin-registry:3100
      - REDIS_URL=redis://redis:6379
    depends_on:
      - plugin-registry
      - redis
```

## API Gateway Integration

```typescript
// core/src/plugin-gateway.ts
export class PluginGateway {
  private serviceDiscovery: ServiceDiscoveryClient;
  
  constructor() {
    this.serviceDiscovery = new ServiceDiscoveryClient(process.env.REGISTRY_URL!);
  }
  
  setupRoutes(app: express.Application): void {
    // Proxy requests to plugin services
    app.use('/api/plugins/:serviceName/*', async (req, res) => {
      try {
        const { serviceName } = req.params;
        const path = req.path.replace(`/api/plugins/${serviceName}`, '');
        
        const result = await this.serviceDiscovery.callService(serviceName, path, {
          method: req.method,
          headers: {
            ...req.headers,
            'x-user-id': res.locals.user?.id,
            'x-user-email': res.locals.user?.email
          },
          body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
        });
        
        res.json(result);
      } catch (error) {
        console.error('Plugin gateway error:', error);
        res.status(500).json({ error: 'Plugin service unavailable' });
      }
    });
  }
}
```

## Advantages of Microservices Approach

1. **Strong Isolation**: Each plugin runs in its own process/container
2. **Independent Scaling**: Scale plugins based on their specific load
3. **Language Agnostic**: Plugins can be written in any language
4. **Independent Deployment**: Deploy and update plugins without affecting core system
5. **Fault Isolation**: Plugin failures don't crash the entire system
6. **Technology Diversity**: Each plugin can use its optimal technology stack
7. **Team Independence**: Different teams can own different plugins

## Disadvantages

1. **Operational Complexity**: More services to monitor and manage
2. **Network Latency**: Inter-service communication overhead
3. **Deployment Complexity**: Container orchestration required
4. **Data Consistency**: Distributed data management challenges
5. **Development Overhead**: More boilerplate code for service setup
6. **Debugging Complexity**: Distributed tracing required for debugging

This microservices-based approach provides excellent isolation and scalability but requires more sophisticated infrastructure and operational practices.