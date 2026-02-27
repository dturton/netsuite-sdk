/**
 * Fluent builder for constructing SuiteQL queries with basic value escaping.
 *
 * @example
 * ```ts
 * import { suiteql } from 'netsuite-sdk';
 *
 * const sql = suiteql()
 *   .select('c.id', 'c.companyname', 'c.email')
 *   .from('customer', 'c')
 *   .leftJoin('transaction t', 'c.id = t.entity')
 *   .whereEquals('c.isinactive', 'F')
 *   .whereNotNull('c.email')
 *   .groupBy('c.id', 'c.companyname', 'c.email')
 *   .orderBy('c.companyname', 'ASC')
 *   .build();
 * ```
 */
export class SuiteQLBuilder {
  private _select: string[] = [];
  private _from = '';
  private _joins: string[] = [];
  private _where: string[] = [];
  private _groupBy: string[] = [];
  private _orderBy: string[] = [];
  private _having: string[] = [];

  /** Add columns to SELECT clause */
  select(...columns: string[]): this {
    this._select.push(...columns);
    return this;
  }

  /** Set the FROM table, with optional alias */
  from(table: string, alias?: string): this {
    this._from = alias ? `${table} ${alias}` : table;
    return this;
  }

  /** Add a JOIN clause */
  join(table: string, condition: string, type: 'INNER' | 'LEFT' | 'RIGHT' = 'INNER'): this {
    this._joins.push(`${type} JOIN ${table} ON ${condition}`);
    return this;
  }

  /** Add a LEFT JOIN clause */
  leftJoin(table: string, condition: string): this {
    return this.join(table, condition, 'LEFT');
  }

  /** Add a RIGHT JOIN clause */
  rightJoin(table: string, condition: string): this {
    return this.join(table, condition, 'RIGHT');
  }

  /** Add a raw WHERE condition */
  where(condition: string): this {
    this._where.push(condition);
    return this;
  }

  /** Add a WHERE column = value condition. Values are escaped. */
  whereEquals(column: string, value: string | number | boolean): this {
    this._where.push(`${column} = ${escapeValue(value)}`);
    return this;
  }

  /** Add a WHERE column != value condition. Values are escaped. */
  whereNotEquals(column: string, value: string | number | boolean): this {
    this._where.push(`${column} != ${escapeValue(value)}`);
    return this;
  }

  /** Add a WHERE column IN (...) condition. Values are escaped. */
  whereIn(column: string, values: (string | number)[]): this {
    const escaped = values.map(escapeValue);
    this._where.push(`${column} IN (${escaped.join(', ')})`);
    return this;
  }

  /** Add a WHERE column IS NULL condition */
  whereNull(column: string): this {
    this._where.push(`${column} IS NULL`);
    return this;
  }

  /** Add a WHERE column IS NOT NULL condition */
  whereNotNull(column: string): this {
    this._where.push(`${column} IS NOT NULL`);
    return this;
  }

  /** Add a WHERE column BETWEEN start AND end condition. Values are escaped. */
  whereBetween(column: string, start: string | number, end: string | number): this {
    this._where.push(`${column} BETWEEN ${escapeValue(start)} AND ${escapeValue(end)}`);
    return this;
  }

  /** Add a WHERE column LIKE pattern condition. Value is escaped. */
  whereLike(column: string, pattern: string): this {
    this._where.push(`${column} LIKE ${escapeValue(pattern)}`);
    return this;
  }

  /** Add columns to GROUP BY clause */
  groupBy(...columns: string[]): this {
    this._groupBy.push(...columns);
    return this;
  }

  /** Add a HAVING condition (used with GROUP BY) */
  having(condition: string): this {
    this._having.push(condition);
    return this;
  }

  /** Add a column to ORDER BY clause */
  orderBy(column: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this._orderBy.push(`${column} ${direction}`);
    return this;
  }

  /** Build the SQL string. Throws if SELECT or FROM is missing. */
  build(): string {
    if (this._select.length === 0) {
      throw new Error('SuiteQLBuilder: SELECT clause is required');
    }
    if (!this._from) {
      throw new Error('SuiteQLBuilder: FROM clause is required');
    }

    const parts: string[] = [
      `SELECT ${this._select.join(', ')}`,
      `FROM ${this._from}`,
    ];

    if (this._joins.length > 0) {
      parts.push(this._joins.join(' '));
    }

    if (this._where.length > 0) {
      parts.push(`WHERE ${this._where.join(' AND ')}`);
    }

    if (this._groupBy.length > 0) {
      parts.push(`GROUP BY ${this._groupBy.join(', ')}`);
    }

    if (this._having.length > 0) {
      parts.push(`HAVING ${this._having.join(' AND ')}`);
    }

    if (this._orderBy.length > 0) {
      parts.push(`ORDER BY ${this._orderBy.join(', ')}`);
    }

    return parts.join(' ');
  }

  /** Alias for build() */
  toString(): string {
    return this.build();
  }
}

/** Escape a value for safe inclusion in a SuiteQL query */
function escapeValue(value: string | number | boolean): string {
  if (typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') {
    return value ? "'T'" : "'F'";
  }
  // Escape single quotes by doubling them
  const escaped = value.replace(/'/g, "''");
  return `'${escaped}'`;
}

/** Factory function for creating a new SuiteQL query builder */
export function suiteql(): SuiteQLBuilder {
  return new SuiteQLBuilder();
}
