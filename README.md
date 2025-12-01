# ClickORM - Type-Safe ORM for ClickHouse

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A **production-ready**, **type-safe ORM** for ClickHouse with comprehensive TypeScript support. Designed to rival **Sequelize** in robustness, **TypeORM** in type safety, and **Drizzle** in developer experience. Features advanced **relationship management**, **lifecycle hooks**, **auto-migration**, and **MongoDB-style query compatibility**.

## 🚀 Features

### 🎯 Core Features
- **💪 Type Safety First**: Full end-to-end type inference with zero `any` types
- **🛡️ Zero Raw SQL**: Users never write SQL strings directly (with escape hatches when needed)
- **⚡ ClickHouse Optimized**: Native support for ClickHouse features, batch inserts, and streaming
- **🔗 Fluent API**: Method chaining with immutable query builders
- **📊 Schema Definition**: Declarative schema with validation and DDL generation
- **🔌 Connection Management**: Advanced connection pooling with retry logic and health monitoring

### 🏗️ Advanced ORM Features
- **🔄 Relations & Associations**: Full support for `hasMany`, `hasOne`, `belongsTo`, `belongsToMany`
- **🚀 Eager/Lazy Loading**: Optimize data fetching with flexible loading strategies
- **🪝 Lifecycle Hooks**: Sequelize-style hooks (`beforeCreate`, `afterUpdate`, `beforeValidate`, etc.)
- **📝 Auto-Migration**: Intelligent schema diffing and automatic table alterations
- **📚 Model Registry**: Centralized model management and relationship tracking

### 🔍 Query Builder Features
- **🎯 Smart WHERE Clauses**: Type-safe conditions with 20+ operators (`eq`, `gt`, `in`, `like`, `between`, etc.)
- **🍃 MongoDB Compatibility**: Support for MongoDB-style operators (`$and`, `$or`, `$not`)
- **📈 Aggregations**: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX` with GROUP BY support
- **🔢 Pagination**: Built-in `LIMIT` and `OFFSET` with type-safe field selection
- **📊 Raw Queries**: Escape hatch for complex ClickHouse-specific operations

### 🛠️ Data Types & Validation
- **📐 All ClickHouse Types**: `UInt8-64`, `Int8-64`, `Float32/64`, `Decimal`, `String`, `UUID`, `DateTime`, etc.
- **🏷️ Complex Types**: `Array`, `Tuple`, `Map`, `Nested`, `JSON`, `Nullable`, `LowCardinality`
- **🌐 Network Types**: `IPv4`, `IPv6` with built-in validation
- **✅ Runtime Validation**: Email, UUID, IP address, URL pattern validators
- **🔒 SQL Injection Prevention**: Automatic parameterization and input sanitization

### 👨‍💻 Developer Experience
- **🎨 Excellent IntelliSense**: Full autocomplete with TypeScript integration
- **📊 Comprehensive Logging**: Structured logging with query performance metrics
- **🧪 Extensive Testing**: >90% code coverage with 400+ test cases
- **📚 Rich Documentation**: Examples, guides, and API reference
- **🔧 Multiple Formats**: Support for ESM, CJS, and TypeScript declaration files
- **⚠️ Detailed Error Messages**: Custom error classes with context and suggestions

## 📦 Installation

```bash
npm install @fyutrex/clickorm @clickhouse/client
```

## 🎯 Quick Start

```typescript
import { createClickORMClient, DataType } from '@fyutrex/clickorm';

// Create client
const orm = createClickORMClient({
  host: 'http://localhost:8123',
  database: 'default',
  username: 'default',
  password: '',
});

// Define schema
const UserSchema = {
  id: { type: DataType.UInt32, primaryKey: true },
  name: { type: DataType.String, nullable: false },
  email: { type: DataType.String, unique: true },
  age: { type: DataType.UInt8, nullable: true },
  country: { type: DataType.String, default: 'US' },
  createdAt: { type: DataType.DateTime, default: () => new Date() },
  metadata: { type: DataType.JSON, nullable: true },
} as const;

// Create model
const User = orm.define('users', UserSchema);

// TypeScript infers the full type:
// type UserType = {
//   id: number;
//   name: string;
//   email: string;
//   age: number | null;
//   country: string;
//   createdAt: Date;
//   metadata: Record<string, any> | null;
// };
```

## 📚 Core Concepts

### Schema Definition

ClickORM provides multiple ways to define your schema:

```typescript
// 1. Object-based schema (recommended)
const UserSchema = {
  id: { type: DataType.UInt32, primaryKey: true },
  name: { type: DataType.String },
  email: { type: DataType.String, unique: true },
} as const;

// 2. Schema builder (fluent API)
import { createSchema } from '@fyutrex/clickorm';

const User = createSchema()
  .uint('id', { primaryKey: true })
  .string('name')
  .string('email', { unique: true })
  .build('users');
```

### Supported Data Types

ClickORM supports all major ClickHouse data types:

**Numeric Types:**

- `UInt8`, `UInt16`, `UInt32`, `UInt64`
- `Int8`, `Int16`, `Int32`, `Int64`
- `Float32`, `Float64`, `Decimal`

**String Types:**

- `String`, `FixedString`, `UUID`

**Date/Time Types:**

- `Date`, `Date32`, `DateTime`, `DateTime64`

**Boolean:**

- `Boolean` (mapped to UInt8)

**Complex Types:**

- `Array`, `Tuple`, `Map`, `Nested`, `JSON`
- `Nullable`, `LowCardinality`

**Network Types:**

- `IPv4`, `IPv6`

**Enum Types:**

- `Enum8`, `Enum16`

## 🔍 Project Structure

```
clickorm/
├── src/
│   ├── core/
│   │   ├── client.ts          # ✅ Advanced connection management with pooling & retries
│   │   ├── model.ts           # ✅ Full Model class with CRUD operations & relations
│   │   ├── schema.ts          # ✅ Schema definition, validation & DDL generation
│   │   ├── types.ts           # ✅ Complete type system with inference
│   │   ├── errors.ts          # ✅ 16 custom error classes with context
│   │   ├── hooks.ts           # ✅ Sequelize-style lifecycle hooks system
│   │   └── relations.ts       # ✅ Full relationship management & lazy/eager loading
│   ├── query/
│   │   └── where.ts           # ✅ Advanced WHERE clause builder with 20+ operators
│   ├── utils/
│   │   ├── sql-builder.ts     # ✅ Secure SQL construction & parameterization
│   │   ├── type-mapper.ts     # ✅ Bidirectional ClickHouse ↔ TypeScript mapping
│   │   ├── validator.ts       # ✅ Runtime validation with pattern matchers
│   │   ├── logger.ts          # ✅ Structured logging with performance metrics
│   │   └── common.ts          # ✅ Utility functions & helpers
│   └── index.ts               # ✅ Complete public API with 200+ exports
├── tests/                     # ✅ Comprehensive test suite (438 tests, >90% coverage)
│   ├── unit/                  # Unit tests for all core modules
│   ├── integration/           # Integration tests with ClickHouse
│   ├── fixtures/              # Mock data & test utilities
│   └── helpers/               # Reusable test helpers
├── examples/                  # ✅ Working usage examples
│   ├── basic-usage.ts         # Basic CRUD operations
│   ├── relations-usage.ts     # Relationship examples
│   ├── hooks-usage.ts         # Lifecycle hooks examples
│   └── user-model-with-hooks.ts # Complete model example
└── docs/                      # 📚 Auto-generated documentation
```

**Legend:** ✅ Production Ready | 📚 Documentation | 🧪 Testing Infrastructure

## 🏗️ Architecture

### Type System

ClickORM's type system provides full type inference:

```typescript
// Schema definition with const assertion
const schema = {
  id: { type: DataType.UInt32 },
  name: { type: DataType.String, nullable: false },
  age: { type: DataType.UInt8, nullable: true },
} as const;

// TypeScript automatically infers:
type Inferred = {
  id: number;
  name: string;
  age: number | null;
};
```

### Query Builder

Type-safe query building with method chaining:

```typescript
const users = await User.where({ country: 'IN' })
  .where({ age: { gte: 18 } })
  .select(['name', 'email'])
  .orderBy('age', 'DESC')
  .limit(10)
  .execute();
// Type: Array<{ name: string; email: string }>
```

### WHERE Clause Operators

```typescript
// Comparison operators
{ age: { gt: 18 } }           // age > 18
{ age: { gte: 18, lt: 65 } }  // age >= 18 AND age < 65

// Array operators
{ country: { in: ['US', 'IN', 'UK'] } }
{ status: { notIn: ['deleted', 'banned'] } }

// String operators
{ name: { like: '%John%' } }
{ email: { ilike: '%@gmail.com' } }

// NULL checks
{ deletedAt: { isNull: true } }
{ avatar: { notNull: true } }

// Complex conditions (ClickORM style)
{
  and: [
    { age: { gte: 18 } },
    { or: [
      { country: 'US' },
      { country: 'IN' }
    ]}
  ]
}

// MongoDB-style operators (also supported)
{
  $and: [
    { age: { gte: 18 } },
    { $or: [
      { country: 'US' },
      { country: 'IN' }
    ]}
  ]
}
```

**MongoDB Compatibility**: ClickORM supports MongoDB-style operators (`$and`, `$or`, `$not`) for seamless migration from MongoDB to ClickHouse. See [MongoDB Compatibility Guide](./docs/MONGODB_COMPATIBILITY.md) for details.

## 🛠️ Development

### Setup

```bash
# Install dependencies
npm install

# Run type checking
npm run typecheck

# Run linter
npm run lint

# Run tests
npm test

# Build
npm run build
```

### Testing

```bash
# Unit tests
npm run test:unit

# Integration tests (requires ClickHouse)
npm run test:integration

# Watch mode
npm run test:watch
```

## 📖 Documentation

### Core Components

#### 1. **Client** (`src/core/client.ts`)

Manages database connections with pooling, retry logic, and health monitoring.

#### 2. **Schema** (`src/core/schema.ts`)

Defines table schemas with validation and DDL generation.

#### 3. **Types** (`src/core/types.ts`)

Comprehensive type system for type-safe operations throughout the library.

#### 4. **SQL Builder** (`src/utils/sql-builder.ts`)

Secure SQL query construction with automatic parameterization.

#### 5. **Type Mapper** (`src/utils/type-mapper.ts`)

Bidirectional type conversion between TypeScript and ClickHouse.

#### 6. **Validator** (`src/utils/validator.ts`)

Runtime data validation against schema definitions.

#### 7. **WHERE Builder** (`src/query/where.ts`)

Type-safe WHERE clause construction with operator support.

## 🔐 Security

ClickORM is designed with security in mind:

- **SQL Injection Prevention**: All queries use parameterized statements
- **Identifier Validation**: Column and table names are validated against injection
- **Input Sanitization**: User inputs are automatically sanitized
- **Type Safety**: Runtime validation ensures data integrity

## 🚧 Current Status

**Phase 1: Core ORM** ✅ **Complete**

- ✅ Advanced connection management with pooling & health monitoring
- ✅ Complete schema definition, validation & DDL generation
- ✅ Full type system with end-to-end inference
- ✅ Secure SQL builder with parameterization
- ✅ Advanced WHERE clause builder (20+ operators)
- ✅ Complete Model class with fluent API
- ✅ All CRUD operations (CREATE, READ, UPDATE, DELETE, UPSERT)

**Phase 2: Relations & Associations** ✅ **Complete**

- ✅ Full relationship support (`hasMany`, `hasOne`, `belongsTo`, `belongsToMany`)
- ✅ Lazy loading with separate queries
- ✅ Eager loading support
- ✅ Association management & registry
- ✅ Nested includes with attribute selection

**Phase 3: Advanced Features** ✅ **Complete**

- ✅ Lifecycle hooks system (Sequelize-style)
- ✅ Aggregation functions (`COUNT`, `SUM`, `AVG`, etc.)
- ✅ GROUP BY operations
- ✅ Auto-migration with schema diffing
- ✅ Comprehensive error handling (16 error types)
- ✅ Runtime validation & sanitization

**Phase 4: Developer Experience** ✅ **Complete**

- ✅ Comprehensive test suite (438+ tests, >90% coverage)
- ✅ Production examples & documentation
- ✅ TypeScript declaration files
- ✅ Multiple build formats (ESM, CJS)
- ✅ Structured logging with performance metrics

**Current Version: 1.0.5** - Production Ready 🚀

## 📝 License

MIT

## 👥 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 🙏 Acknowledgments

- Built with [@clickhouse/client](https://github.com/ClickHouse/clickhouse-js)
- Inspired by Sequelize, TypeORM, and Drizzle
- TypeScript compiler team for amazing type inference

---

**Note**: This project is **production-ready** at version **1.0.5**. The API is stable and follows semantic versioning.
