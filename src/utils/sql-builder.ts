/**
 * SQL builder utility for safe SQL string construction
 * Prevents SQL injection and provides a clean API for building queries
 */

import { SQLInjectionError } from '../core/errors.js';
import { RawExpression, SQLIdentifier } from '../core/types.js';

/**
 * SQL Builder class for constructing SQL queries
 */
export class SQLBuilder {
  private parts: string[] = [];
  private parameters: unknown[] = [];
  private paramCounter = 0;

  /**
   * Add raw SQL string (use with caution)
   */
  raw(sql: string): this {
    this.parts.push(sql);
    return this;
  }

  /**
   * Add a parameterized value
   */
  param(value: unknown): string {
    // Track original value for type inference
    const originalValue = value;
    let paramValue = value;

    // Convert Date objects to Unix timestamps in seconds (integers)
    if (value instanceof Date) {
      paramValue = Math.floor(value.getTime() / 1000);
    } else if (typeof value === 'boolean') {
      // Convert booleans to integers
      paramValue = value ? 1 : 0;
    } else if (
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      !(value instanceof Date)
    ) {
      // JSON-stringify objects for ClickHouse JSON fields
      paramValue = JSON.stringify(value);
    }

    this.parameters.push(paramValue);
    const placeholder = `{param${this.paramCounter++}:${this.inferClickHouseType(paramValue, originalValue)}}`;
    return placeholder;
  }

  /**
   * Add multiple parameters
   */
  params(values: unknown[]): string[] {
    return values.map((v) => this.param(v));
  }

  /**
   * Add an identifier (table or column name)
   */
  identifier(name: string | SQLIdentifier): string {
    const value = typeof name === 'string' ? name : name.value;
    this.validateIdentifier(value);
    return this.escapeIdentifier(value);
  }

  /**
   * Add multiple identifiers
   */
  identifiers(names: string[]): string[] {
    return names.map((n) => this.identifier(n));
  }

  /**
   * Build SELECT clause
   */
  select(fields: string[]): this {
    if (fields.length === 0) {
      throw new SQLInjectionError('SELECT fields cannot be empty');
    }

    this.parts.push('SELECT');

    if (fields.includes('*')) {
      this.parts.push('*');
    } else {
      this.parts.push(fields.map((f) => this.identifier(f)).join(', '));
    }

    return this;
  }

  /**
   * Build FROM clause
   */
  from(table: string, alias?: string): this {
    this.parts.push('FROM');
    this.parts.push(this.identifier(table));

    if (alias) {
      this.parts.push('AS');
      this.parts.push(this.identifier(alias));
    }

    return this;
  }

  /**
   * Build WHERE clause
   */
  where(condition: string): this {
    this.parts.push('WHERE');
    this.parts.push(condition);
    return this;
  }

  /**
   * Build AND condition
   */
  and(condition: string): this {
    this.parts.push('AND');
    this.parts.push(condition);
    return this;
  }

  /**
   * Build OR condition
   */
  or(condition: string): this {
    this.parts.push('OR');
    this.parts.push(condition);
    return this;
  }

  /**
   * Build ORDER BY clause
   */
  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    if (this.parts.join(' ').includes('ORDER BY')) {
      this.parts.push(',');
      this.parts.push(this.identifier(field));
      this.parts.push(direction);
    } else {
      this.parts.push('ORDER BY');
      this.parts.push(this.identifier(field));
      this.parts.push(direction);
    }
    return this;
  }

  /**
   * Build GROUP BY clause
   */
  groupBy(fields: string[]): this {
    this.parts.push('GROUP BY');
    this.parts.push(fields.map((f) => this.identifier(f)).join(', '));
    return this;
  }

  /**
   * Build LIMIT clause
   */
  limit(count: number): this {
    if (count < 0) {
      throw new SQLInjectionError('LIMIT must be non-negative');
    }
    this.parts.push('LIMIT');
    this.parts.push(String(count));
    return this;
  }

  /**
   * Build OFFSET clause
   */
  offset(count: number): this {
    if (count < 0) {
      throw new SQLInjectionError('OFFSET must be non-negative');
    }
    this.parts.push('OFFSET');
    this.parts.push(String(count));
    return this;
  }

  /**
   * Build JOIN clause
   */
  join(
    type: 'INNER' | 'LEFT' | 'RIGHT' | 'FULL' | 'CROSS',
    table: string,
    on?: string,
    alias?: string
  ): this {
    this.parts.push(`${type} JOIN`);
    this.parts.push(this.identifier(table));

    if (alias) {
      this.parts.push('AS');
      this.parts.push(this.identifier(alias));
    }

    if (on && type !== 'CROSS') {
      this.parts.push('ON');
      this.parts.push(on);
    }

    return this;
  }

  /**
   * Build INSERT INTO clause
   */
  insertInto(table: string, fields: string[]): this {
    this.parts.push('INSERT INTO');
    this.parts.push(this.identifier(table));
    this.parts.push(`(${fields.map((f) => this.identifier(f)).join(', ')})`);
    return this;
  }

  /**
   * Build VALUES clause
   */
  values(rows: unknown[][]): this {
    this.parts.push('VALUES');

    const valueSets = rows.map((row) => {
      const placeholders = row.map((value) => this.param(value));
      return `(${placeholders.join(', ')})`;
    });

    this.parts.push(valueSets.join(', '));
    return this;
  }

  /**
   * Build UPDATE clause
   */
  update(table: string): this {
    this.parts.push('UPDATE');
    this.parts.push(this.identifier(table));
    return this;
  }

  /**
   * Build SET clause
   */
  set(updates: Record<string, unknown>): this {
    this.parts.push('SET');

    const assignments = Object.entries(updates).map(([key, value]) => {
      return `${this.identifier(key)} = ${this.param(value)}`;
    });

    this.parts.push(assignments.join(', '));
    return this;
  }

  /**
   * Build DELETE FROM clause
   */
  deleteFrom(table: string): this {
    this.parts.push('DELETE FROM');
    this.parts.push(this.identifier(table));
    return this;
  }

  /**
   * Build the final SQL query
   */
  build(): { sql: string; params: unknown[] } {
    return {
      sql: this.parts.join(' '),
      params: this.parameters,
    };
  }

  /**
   * Get the SQL string
   */
  toSQL(): string {
    return this.parts.join(' ');
  }

  /**
   * Get the parameters
   */
  getParams(): unknown[] {
    return [...this.parameters];
  }

  /**
   * Reset the builder
   */
  reset(): this {
    this.parts = [];
    this.parameters = [];
    this.paramCounter = 0;
    return this;
  }

  /**
   * Validate identifier to prevent SQL injection
   */
  private validateIdentifier(identifier: string): void {
    // Allow alphanumeric, underscore, and dot (for qualified names)
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/.test(identifier)) {
      throw new SQLInjectionError(
        `Invalid identifier: ${identifier}. Identifiers must start with a letter or underscore and contain only alphanumeric characters, underscores, or dots.`,
        identifier
      );
    }
  }

  /**
   * Escape identifier with backticks
   */
  private escapeIdentifier(identifier: string): string {
    // Split on dots for qualified names
    const parts = identifier.split('.');
    return parts.map((part) => `\`${part.replace(/`/g, '``')}\``).join('.');
  }
  /**
   * Infer ClickHouse type from JavaScript value for parameterization
   */
  private inferClickHouseType(value: unknown, originalValue?: unknown): string {
    // If original value was a boolean, it should be UInt8 even after conversion to number
    if (originalValue !== undefined && typeof originalValue === 'boolean') {
      return 'UInt8';
    }

    // If original value was a Date, it's DateTime even after conversion to number
    if (originalValue instanceof Date) {
      return 'DateTime';
    }

    if (value === null || value === undefined) {
      return 'Nullable(String)';
    }

    const type = typeof value;

    switch (type) {
      case 'number':
        return Number.isInteger(value) ? 'Int32' : 'Float64';
      case 'bigint':
        return 'Int64';
      case 'string':
        return 'String';
      case 'boolean':
        return 'UInt8';
      case 'object':
        if (value instanceof Date) {
          return 'DateTime';
        }
        if (Array.isArray(value)) {
          return 'Array(String)';
        }
        return 'String'; // Will be JSON stringified
      default:
        return 'String';
    }
  }
}

/**
 * Create a new SQL builder instance
 */
export function createSQLBuilder(): SQLBuilder {
  return new SQLBuilder();
}

/**
 * Build a SELECT query
 */
export function buildSelect(
  table: string,
  options: {
    fields?: string[];
    where?: Record<string, unknown>;
    orderBy?: Record<string, 'ASC' | 'DESC'>;
    limit?: number;
    offset?: number;
  }
): { sql: string; params: unknown[] } {
  const builder = new SQLBuilder();

  // SELECT
  builder.select(options.fields || ['*']);

  // FROM
  builder.from(table);

  // WHERE
  if (options.where && Object.keys(options.where).length > 0) {
    const conditions = Object.entries(options.where).map(([key, value]) => {
      return `${builder.identifier(key)} = ${builder.param(value)}`;
    });
    builder.where(conditions.join(' AND '));
  }

  // ORDER BY
  if (options.orderBy) {
    Object.entries(options.orderBy).forEach(([field, direction]) => {
      builder.orderBy(field, direction);
    });
  }

  // LIMIT and OFFSET
  if (options.limit !== undefined) {
    builder.limit(options.limit);
  }
  if (options.offset !== undefined) {
    builder.offset(options.offset);
  }

  return builder.build();
}

/**
 * Build an INSERT query
 */
export function buildInsert(
  table: string,
  data: Record<string, unknown> | Record<string, unknown>[]
): { sql: string; params: unknown[] } {
  const builder = new SQLBuilder();
  const records = Array.isArray(data) ? data : [data];

  if (records.length === 0) {
    throw new SQLInjectionError('INSERT requires at least one record');
  }

  const fields = Object.keys(records[0]!);
  builder.insertInto(table, fields);

  const rows = records.map((record) => fields.map((field) => record[field]));
  builder.values(rows);

  return builder.build();
}

/**
 * Build an UPDATE query
 */
export function buildUpdate(
  table: string,
  data: Record<string, unknown>,
  where: Record<string, unknown>
): { sql: string; params: unknown[] } {
  const builder = new SQLBuilder();

  builder.update(table);
  builder.set(data);

  if (Object.keys(where).length > 0) {
    const conditions = Object.entries(where).map(([key, value]) => {
      return `${builder.identifier(key)} = ${builder.param(value)}`;
    });
    builder.where(conditions.join(' AND '));
  }

  return builder.build();
}

/**
 * Build a DELETE query
 */
export function buildDelete(
  table: string,
  where: Record<string, unknown>
): { sql: string; params: unknown[] } {
  const builder = new SQLBuilder();

  builder.deleteFrom(table);

  if (Object.keys(where).length > 0) {
    const conditions = Object.entries(where).map(([key, value]) => {
      return `${builder.identifier(key)} = ${builder.param(value)}`;
    });
    builder.where(conditions.join(' AND '));
  }

  return builder.build();
}

/**
 * Create a raw SQL expression
 */
export function raw(sql: string, values?: unknown[]): RawExpression {
  return {
    _brand: 'RawExpression',
    sql,
    values,
  };
}

/**
 * Escape a string value for use in SQL (for edge cases)
 */
export function escapeString(value: string): string {
  return value.replace(/'/g, "''");
}

/**
 * Build a CREATE TABLE query
 */
export function buildCreateTable(
  table: string,
  columns: Record<string, string>,
  options?: {
    engine?: string;
    orderBy?: string[];
    partitionBy?: string;
    primaryKey?: string[];
    ifNotExists?: boolean;
  }
): string {
  const builder = new SQLBuilder();
  const parts: string[] = [];

  parts.push('CREATE TABLE');

  if (options?.ifNotExists) {
    parts.push('IF NOT EXISTS');
  }

  parts.push(builder.identifier(table));

  // Columns
  const columnDefs = Object.entries(columns).map(([name, type]) => {
    return `${builder.identifier(name)} ${type}`;
  });
  parts.push(`(${columnDefs.join(', ')})`);

  // Engine
  if (options?.engine) {
    parts.push(`ENGINE = ${options.engine}`);
  }

  // Order By
  if (options?.orderBy && options.orderBy.length > 0) {
    parts.push(`ORDER BY (${options.orderBy.map((f) => builder.identifier(f)).join(', ')})`);
  }

  // Partition By
  if (options?.partitionBy) {
    parts.push(`PARTITION BY ${options.partitionBy}`);
  }

  // Primary Key
  if (options?.primaryKey && options.primaryKey.length > 0) {
    parts.push(`PRIMARY KEY (${options.primaryKey.map((f) => builder.identifier(f)).join(', ')})`);
  }

  return parts.join(' ');
}

/**
 * Build a DROP TABLE query
 */
export function buildDropTable(table: string, ifExists = false): string {
  const builder = new SQLBuilder();
  const parts: string[] = ['DROP TABLE'];

  if (ifExists) {
    parts.push('IF EXISTS');
  }

  parts.push(builder.identifier(table));

  return parts.join(' ');
}
