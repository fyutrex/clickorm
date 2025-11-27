/**
 * Comprehensive tests for SQL builder utility
 * Tests SQL query construction, parameterization, and injection prevention
 */

import {
  SQLBuilder,
  createSQLBuilder,
  buildSelect,
  buildInsert,
  buildUpdate,
  buildDelete,
  raw,
  escapeString,
  buildCreateTable,
  buildDropTable,
} from '../../../src/utils/sql-builder.js';
import { SQLInjectionError } from '../../../src/core/errors.js';

describe('SQLBuilder', () => {
  let builder: SQLBuilder;

  beforeEach(() => {
    builder = new SQLBuilder();
  });

  describe('raw()', () => {
    it('should add raw SQL string', () => {
      builder.raw('SELECT *');

      expect(builder.toSQL()).toBe('SELECT *');
    });

    it('should concatenate multiple raw strings', () => {
      builder.raw('SELECT').raw('*').raw('FROM users');

      expect(builder.toSQL()).toBe('SELECT * FROM users');
    });
  });

  describe('param()', () => {
    it('should add parameterized value', () => {
      const placeholder = builder.param('test');

      expect(placeholder).toMatch(/\{param\d+:String\}/);
      expect(builder.getParams()).toContain('test');
    });

    it('should infer correct type for numbers', () => {
      const placeholder = builder.param(42);

      expect(placeholder).toContain('Int32');
    });

    it('should infer correct type for floats', () => {
      const placeholder = builder.param(3.14);

      expect(placeholder).toContain('Float64');
    });

    it('should infer correct type for booleans', () => {
      const placeholder = builder.param(true);

      expect(placeholder).toContain('UInt8');
    });

    it('should infer correct type for dates', () => {
      const placeholder = builder.param(new Date());

      expect(placeholder).toContain('DateTime');
    });

    it('should handle null values', () => {
      const placeholder = builder.param(null);

      expect(placeholder).toContain('Nullable');
    });

    it('should increment parameter counter', () => {
      builder.param('first');
      builder.param('second');

      const params = builder.getParams();
      expect(params).toHaveLength(2);
      expect(params[0]).toBe('first');
      expect(params[1]).toBe('second');
    });
  });

  describe('params()', () => {
    it('should add multiple parameters', () => {
      const placeholders = builder.params([1, 2, 3]);

      expect(placeholders).toHaveLength(3);
      expect(builder.getParams()).toEqual([1, 2, 3]);
    });
  });

  describe('identifier()', () => {
    it('should escape valid identifier', () => {
      const escaped = builder.identifier('users');

      expect(escaped).toBe('`users`');
    });

    it('should escape qualified names', () => {
      const escaped = builder.identifier('db.users');

      expect(escaped).toBe('`db`.`users`');
    });

    it('should throw on invalid identifier', () => {
      expect(() => builder.identifier('user-name')).toThrow(SQLInjectionError);
      expect(() => builder.identifier('1user')).toThrow(SQLInjectionError);
      expect(() => builder.identifier('')).toThrow(SQLInjectionError);
    });

    it('should prevent SQL injection in identifiers', () => {
      expect(() => builder.identifier('users; DROP TABLE users--')).toThrow(SQLInjectionError);
      expect(() => builder.identifier("users' OR 1=1--")).toThrow(SQLInjectionError);
    });

    it('should allow underscores', () => {
      const escaped = builder.identifier('user_name');

      expect(escaped).toBe('`user_name`');
    });

    it('should allow numbers after first character', () => {
      const escaped = builder.identifier('user123');

      expect(escaped).toBe('`user123`');
    });

    it('should reject identifiers with backticks', () => {
      expect(() => builder.identifier('user`name')).toThrow(SQLInjectionError);
    });
  });

  describe('identifiers()', () => {
    it('should escape multiple identifiers', () => {
      const escaped = builder.identifiers(['id', 'name', 'email']);

      expect(escaped).toEqual(['`id`', '`name`', '`email`']);
    });
  });

  describe('select()', () => {
    it('should build SELECT with specific fields', () => {
      builder.select(['id', 'name']);

      expect(builder.toSQL()).toBe('SELECT `id`, `name`');
    });

    it('should build SELECT *', () => {
      builder.select(['*']);

      expect(builder.toSQL()).toBe('SELECT *');
    });

    it('should throw on empty fields', () => {
      expect(() => builder.select([])).toThrow(SQLInjectionError);
    });
  });

  describe('from()', () => {
    it('should build FROM clause', () => {
      builder.select(['*']).from('users');

      expect(builder.toSQL()).toBe('SELECT * FROM `users`');
    });

    it('should build FROM with alias', () => {
      builder.select(['*']).from('users', 'u');

      expect(builder.toSQL()).toBe('SELECT * FROM `users` AS `u`');
    });
  });

  describe('where()', () => {
    it('should build WHERE clause', () => {
      builder.select(['*']).from('users').where('id = 1');

      expect(builder.toSQL()).toBe('SELECT * FROM `users` WHERE id = 1');
    });
  });

  describe('and()', () => {
    it('should add AND condition', () => {
      builder.select(['*']).from('users').where('id = 1').and('active = true');

      expect(builder.toSQL()).toBe('SELECT * FROM `users` WHERE id = 1 AND active = true');
    });
  });

  describe('or()', () => {
    it('should add OR condition', () => {
      builder.select(['*']).from('users').where('id = 1').or('id = 2');

      expect(builder.toSQL()).toBe('SELECT * FROM `users` WHERE id = 1 OR id = 2');
    });
  });

  describe('orderBy()', () => {
    it('should build ORDER BY ASC', () => {
      builder.select(['*']).from('users').orderBy('name', 'ASC');

      expect(builder.toSQL()).toBe('SELECT * FROM `users` ORDER BY `name` ASC');
    });

    it('should build ORDER BY DESC', () => {
      builder.select(['*']).from('users').orderBy('name', 'DESC');

      expect(builder.toSQL()).toBe('SELECT * FROM `users` ORDER BY `name` DESC');
    });

    it('should default to ASC', () => {
      builder.select(['*']).from('users').orderBy('name');

      expect(builder.toSQL()).toBe('SELECT * FROM `users` ORDER BY `name` ASC');
    });

    it('should handle multiple ORDER BY', () => {
      builder.select(['*']).from('users').orderBy('name', 'ASC').orderBy('age', 'DESC');

      expect(builder.toSQL()).toBe('SELECT * FROM `users` ORDER BY `name` ASC , `age` DESC');
    });
  });

  describe('groupBy()', () => {
    it('should build GROUP BY clause', () => {
      builder.select(['*']).from('users').groupBy(['country', 'city']);

      expect(builder.toSQL()).toBe('SELECT * FROM `users` GROUP BY `country`, `city`');
    });

    it('should handle single field', () => {
      builder.select(['*']).from('users').groupBy(['country']);

      expect(builder.toSQL()).toBe('SELECT * FROM `users` GROUP BY `country`');
    });
  });

  describe('limit()', () => {
    it('should build LIMIT clause', () => {
      builder.select(['*']).from('users').limit(10);

      expect(builder.toSQL()).toBe('SELECT * FROM `users` LIMIT 10');
    });

    it('should throw on negative limit', () => {
      expect(() => builder.limit(-1)).toThrow(SQLInjectionError);
    });

    it('should allow zero limit', () => {
      builder.select(['*']).from('users').limit(0);

      expect(builder.toSQL()).toBe('SELECT * FROM `users` LIMIT 0');
    });
  });

  describe('offset()', () => {
    it('should build OFFSET clause', () => {
      builder.select(['*']).from('users').offset(20);

      expect(builder.toSQL()).toBe('SELECT * FROM `users` OFFSET 20');
    });

    it('should throw on negative offset', () => {
      expect(() => builder.offset(-1)).toThrow(SQLInjectionError);
    });
  });

  describe('join()', () => {
    it('should build INNER JOIN', () => {
      builder.select(['*']).from('users').join('INNER', 'posts', 'posts.userId = users.id');

      expect(builder.toSQL()).toBe(
        'SELECT * FROM `users` INNER JOIN `posts` ON posts.userId = users.id'
      );
    });

    it('should build LEFT JOIN', () => {
      builder.select(['*']).from('users').join('LEFT', 'posts', 'posts.userId = users.id');

      expect(builder.toSQL()).toBe(
        'SELECT * FROM `users` LEFT JOIN `posts` ON posts.userId = users.id'
      );
    });

    it('should build JOIN with alias', () => {
      builder.select(['*']).from('users', 'u').join('INNER', 'posts', 'p.userId = u.id', 'p');

      expect(builder.toSQL()).toBe(
        'SELECT * FROM `users` AS `u` INNER JOIN `posts` AS `p` ON p.userId = u.id'
      );
    });

    it('should build CROSS JOIN without ON', () => {
      builder.select(['*']).from('users').join('CROSS', 'posts');

      expect(builder.toSQL()).toBe('SELECT * FROM `users` CROSS JOIN `posts`');
    });
  });

  describe('insertInto()', () => {
    it('should build INSERT INTO clause', () => {
      builder.insertInto('users', ['name', 'email']);

      expect(builder.toSQL()).toBe('INSERT INTO `users` (`name`, `email`)');
    });
  });

  describe('values()', () => {
    it('should build VALUES for single row', () => {
      builder.insertInto('users', ['name', 'email']).values([['John', 'john@example.com']]);

      const result = builder.build();
      expect(result.sql).toContain('VALUES');
      expect(result.params).toEqual(['John', 'john@example.com']);
    });

    it('should build VALUES for multiple rows', () => {
      builder.insertInto('users', ['name', 'email']).values([
        ['John', 'john@example.com'],
        ['Jane', 'jane@example.com'],
      ]);

      const result = builder.build();
      expect(result.params).toEqual(['John', 'john@example.com', 'Jane', 'jane@example.com']);
    });
  });

  describe('update()', () => {
    it('should build UPDATE clause', () => {
      builder.update('users');

      expect(builder.toSQL()).toBe('UPDATE `users`');
    });
  });

  describe('set()', () => {
    it('should build SET clause', () => {
      builder.update('users').set({ name: 'John', email: 'john@example.com' });

      const result = builder.build();
      expect(result.sql).toContain('SET');
      expect(result.sql).toContain('`name`');
      expect(result.sql).toContain('`email`');
      expect(result.params).toContain('John');
      expect(result.params).toContain('john@example.com');
    });
  });

  describe('deleteFrom()', () => {
    it('should build DELETE FROM clause', () => {
      builder.deleteFrom('users');

      expect(builder.toSQL()).toBe('DELETE FROM `users`');
    });
  });

  describe('build()', () => {
    it('should return SQL and parameters', () => {
      builder
        .select(['*'])
        .from('users')
        .where(`id = ${builder.param(1)}`);

      const result = builder.build();
      expect(result.sql).toBe('SELECT * FROM `users` WHERE id = {param0:Int32}');
      expect(result.params).toEqual([1]);
    });
  });

  describe('reset()', () => {
    it('should reset builder state', () => {
      builder.select(['*']).from('users').param(1);
      builder.reset();

      expect(builder.toSQL()).toBe('');
      expect(builder.getParams()).toEqual([]);
    });
  });
});

describe('createSQLBuilder()', () => {
  it('should create new SQLBuilder instance', () => {
    const builder = createSQLBuilder();

    expect(builder).toBeInstanceOf(SQLBuilder);
  });
});

describe('buildSelect()', () => {
  it('should build basic SELECT query', () => {
    const result = buildSelect('users', {});

    expect(result.sql).toBe('SELECT * FROM `users`');
    expect(result.params).toEqual([]);
  });

  it('should build SELECT with specific fields', () => {
    const result = buildSelect('users', { fields: ['id', 'name'] });

    expect(result.sql).toBe('SELECT `id`, `name` FROM `users`');
  });

  it('should build SELECT with WHERE', () => {
    const result = buildSelect('users', { where: { id: 1, active: true } });

    expect(result.sql).toContain('WHERE');
    expect(result.params).toContain(1);
  });

  it('should build SELECT with ORDER BY', () => {
    const result = buildSelect('users', { orderBy: { name: 'ASC', age: 'DESC' } });

    expect(result.sql).toContain('ORDER BY');
    expect(result.sql).toContain('`name` ASC');
    expect(result.sql).toContain('`age` DESC');
  });

  it('should build SELECT with LIMIT and OFFSET', () => {
    const result = buildSelect('users', { limit: 10, offset: 20 });

    expect(result.sql).toContain('LIMIT 10');
    expect(result.sql).toContain('OFFSET 20');
  });

  it('should build complete SELECT query', () => {
    const result = buildSelect('users', {
      fields: ['id', 'name'],
      where: { active: true },
      orderBy: { name: 'ASC' },
      limit: 10,
      offset: 0,
    });

    expect(result.sql).toContain('SELECT');
    expect(result.sql).toContain('WHERE');
    expect(result.sql).toContain('ORDER BY');
    expect(result.sql).toContain('LIMIT');
    expect(result.sql).toContain('OFFSET');
  });
});

describe('buildInsert()', () => {
  it('should build INSERT for single record', () => {
    const result = buildInsert('users', { name: 'John', email: 'john@example.com' });

    expect(result.sql).toContain('INSERT INTO `users`');
    expect(result.sql).toContain('(`name`, `email`)');
    expect(result.sql).toContain('VALUES');
    expect(result.params).toEqual(['John', 'john@example.com']);
  });

  it('should build INSERT for multiple records', () => {
    const result = buildInsert('users', [
      { name: 'John', email: 'john@example.com' },
      { name: 'Jane', email: 'jane@example.com' },
    ]);

    expect(result.sql).toContain('INSERT INTO `users`');
    expect(result.params).toHaveLength(4);
  });

  it('should throw on empty data', () => {
    expect(() => buildInsert('users', [])).toThrow(SQLInjectionError);
  });
});

describe('buildUpdate()', () => {
  it('should build UPDATE query', () => {
    const result = buildUpdate('users', { name: 'John' }, { id: 1 });

    expect(result.sql).toContain('UPDATE `users`');
    expect(result.sql).toContain('SET');
    expect(result.sql).toContain('WHERE');
    expect(result.params).toContain('John');
    expect(result.params).toContain(1);
  });

  it('should handle multiple SET fields', () => {
    const result = buildUpdate('users', { name: 'John', email: 'john@example.com' }, { id: 1 });

    expect(result.params).toContain('John');
    expect(result.params).toContain('john@example.com');
    expect(result.params).toContain(1);
  });

  it('should handle multiple WHERE conditions', () => {
    const result = buildUpdate('users', { name: 'John' }, { id: 1, active: true });

    expect(result.sql).toContain('AND');
  });

  it('should handle empty WHERE', () => {
    const result = buildUpdate('users', { name: 'John' }, {});

    expect(result.sql).not.toContain('WHERE');
  });
});

describe('buildDelete()', () => {
  it('should build DELETE query', () => {
    const result = buildDelete('users', { id: 1 });

    expect(result.sql).toBe('DELETE FROM `users` WHERE `id` = {param0:Int32}');
    expect(result.params).toEqual([1]);
  });

  it('should handle multiple WHERE conditions', () => {
    const result = buildDelete('users', { id: 1, active: false });

    expect(result.sql).toContain('AND');
    expect(result.params).toHaveLength(2);
  });

  it('should handle empty WHERE', () => {
    const result = buildDelete('users', {});

    expect(result.sql).toBe('DELETE FROM `users`');
    expect(result.params).toEqual([]);
  });
});

describe('raw()', () => {
  it('should create raw expression', () => {
    const expr = raw('NOW()');

    expect(expr._brand).toBe('RawExpression');
    expect(expr.sql).toBe('NOW()');
  });

  it('should create raw expression with values', () => {
    const expr = raw('id IN (?, ?)', [1, 2]);

    expect(expr.values).toEqual([1, 2]);
  });
});

describe('escapeString()', () => {
  it('should escape single quotes', () => {
    const escaped = escapeString("O'Brien");

    expect(escaped).toBe("O''Brien");
  });

  it('should handle multiple quotes', () => {
    const escaped = escapeString("It's a 'test'");

    expect(escaped).toBe("It''s a ''test''");
  });

  it('should not modify strings without quotes', () => {
    const escaped = escapeString('normal string');

    expect(escaped).toBe('normal string');
  });
});

describe('buildCreateTable()', () => {
  it('should build basic CREATE TABLE', () => {
    const sql = buildCreateTable('users', { id: 'UInt32', name: 'String' });

    expect(sql).toContain('CREATE TABLE');
    expect(sql).toContain('`users`');
    expect(sql).toContain('`id` UInt32');
    expect(sql).toContain('`name` String');
  });

  it('should build CREATE TABLE IF NOT EXISTS', () => {
    const sql = buildCreateTable('users', { id: 'UInt32' }, { ifNotExists: true });

    expect(sql).toContain('IF NOT EXISTS');
  });

  it('should include ENGINE', () => {
    const sql = buildCreateTable('users', { id: 'UInt32' }, { engine: 'MergeTree()' });

    expect(sql).toContain('ENGINE = MergeTree()');
  });

  it('should include ORDER BY', () => {
    const sql = buildCreateTable('users', { id: 'UInt32' }, { orderBy: ['id'] });

    expect(sql).toContain('ORDER BY (`id`)');
  });

  it('should include PARTITION BY', () => {
    const sql = buildCreateTable('users', { id: 'UInt32' }, { partitionBy: 'toYYYYMM(date)' });

    expect(sql).toContain('PARTITION BY toYYYYMM(date)');
  });

  it('should include PRIMARY KEY', () => {
    const sql = buildCreateTable('users', { id: 'UInt32' }, { primaryKey: ['id'] });

    expect(sql).toContain('PRIMARY KEY (`id`)');
  });
});

describe('buildDropTable()', () => {
  it('should build DROP TABLE', () => {
    const sql = buildDropTable('users');

    expect(sql).toBe('DROP TABLE `users`');
  });

  it('should build DROP TABLE IF EXISTS', () => {
    const sql = buildDropTable('users', true);

    expect(sql).toBe('DROP TABLE IF EXISTS `users`');
  });
});
