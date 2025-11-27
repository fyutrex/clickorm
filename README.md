# ClickORM - Type-Safe ORM for ClickHouse

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A production-grade, type-safe ORM for ClickHouse with full TypeScript support, designed to rival Sequelize in robustness, TypeORM in type safety, and Drizzle in developer experience.

## 🚀 Features

- **Type Safety First**: Full end-to-end type inference with zero `any` types
- **Zero Raw SQL**: Users never write SQL strings directly (with escape hatches when needed)
- **Fluent API**: Method chaining with immutable query builders
- **ClickHouse Optimized**: Batch inserts, streaming, and ClickHouse-specific features
- **Developer Experience**: Intuitive API with excellent autocomplete
- **Extensible**: Plugin architecture for custom data types and operations

## 📦 Installation

```bash
npm install @clickorm/core @clickhouse/client
```

## 🎯 Quick Start

```typescript
import { createClickORMClient, DataType } from '@clickorm/core';

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
import { createSchema } from '@clickorm/core';

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
│   │   ├── client.ts          # ✅ Connection pool management
│   │   ├── model.ts           # ⏳ Base Model class (in progress)
│   │   ├── schema.ts          # ✅ Schema definition & validation
│   │   ├── types.ts           # ✅ Type utilities & inference
│   │   └── errors.ts          # ✅ Custom error classes
│   ├── query/
│   │   ├── builder.ts         # ⏳ Type-safe query builder
│   │   ├── where.ts           # ✅ WHERE clause builder
│   │   ├── select.ts          # ⏳ SELECT operations
│   │   ├── insert.ts          # ⏳ INSERT operations
│   │   ├── update.ts          # ⏳ UPDATE operations
│   │   └── delete.ts          # ⏳ DELETE operations
│   ├── utils/
│   │   ├── sql-builder.ts     # ✅ SQL string construction
│   │   ├── type-mapper.ts     # ✅ TS ↔ ClickHouse mapping
│   │   ├── validator.ts       # ✅ Runtime validation
│   │   └── logger.ts          # ✅ Structured logging
│   └── index.ts               # ⏳ Public API exports
├── tests/                     # ⏳ Test suite
├── examples/                  # ⏳ Usage examples
└── docs/                      # ⏳ Documentation
```

**Legend:** ✅ Completed | ⏳ In Progress | ⬜ Pending

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

**Phase 1: Core ORM** (80% Complete)

- ✅ Connection management
- ✅ Schema definition and validation
- ✅ Type system and inference
- ✅ SQL builder utilities
- ✅ WHERE clause builder
- ⏳ Model class implementation
- ⏳ Query builder (SELECT, INSERT, UPDATE, DELETE)

**Phase 2: Relations & Associations** (Planned)

- Relation definitions
- Eager loading
- Lazy loading
- Join operations

**Phase 3: Analytics & Aggregations** (Planned)

- Aggregation functions
- GROUP BY operations
- Time-series analysis
- Window functions

**Phase 4: Migrations** (Planned)

- Migration generator
- Schema diffing
- Migration runner

## 📝 License

MIT

## 👥 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## 🙏 Acknowledgments

- Built with [@clickhouse/client](https://github.com/ClickHouse/clickhouse-js)
- Inspired by Sequelize, TypeORM, and Drizzle
- TypeScript compiler team for amazing type inference

---

**Note**: This project is currently in active development. The API may change before v1.0.5.
