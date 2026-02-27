import { describe, it, expect } from 'vitest';
import { SuiteQLBuilder, suiteql } from '../../suiteql/query-builder.js';

describe('SuiteQLBuilder', () => {
  it('builds a simple SELECT query', () => {
    const sql = suiteql()
      .select('id', 'companyname')
      .from('customer')
      .build();

    expect(sql).toBe('SELECT id, companyname FROM customer');
  });

  it('supports table alias', () => {
    const sql = suiteql()
      .select('c.id')
      .from('customer', 'c')
      .build();

    expect(sql).toBe('SELECT c.id FROM customer c');
  });

  it('supports WHERE conditions', () => {
    const sql = suiteql()
      .select('id')
      .from('customer')
      .where("status = 'active'")
      .build();

    expect(sql).toBe("SELECT id FROM customer WHERE status = 'active'");
  });

  it('combines multiple WHERE conditions with AND', () => {
    const sql = suiteql()
      .select('id')
      .from('customer')
      .where("status = 'active'")
      .where('id > 100')
      .build();

    expect(sql).toBe("SELECT id FROM customer WHERE status = 'active' AND id > 100");
  });

  it('supports whereEquals with string value (escaped)', () => {
    const sql = suiteql()
      .select('id')
      .from('customer')
      .whereEquals('companyname', "O'Reilly")
      .build();

    expect(sql).toBe("SELECT id FROM customer WHERE companyname = 'O''Reilly'");
  });

  it('supports whereEquals with number value', () => {
    const sql = suiteql()
      .select('id')
      .from('customer')
      .whereEquals('id', 123)
      .build();

    expect(sql).toBe('SELECT id FROM customer WHERE id = 123');
  });

  it('supports whereEquals with boolean (T/F)', () => {
    const sql = suiteql()
      .select('id')
      .from('customer')
      .whereEquals('isinactive', false)
      .build();

    expect(sql).toBe("SELECT id FROM customer WHERE isinactive = 'F'");
  });

  it('supports whereNotEquals', () => {
    const sql = suiteql()
      .select('id')
      .from('customer')
      .whereNotEquals('status', 'inactive')
      .build();

    expect(sql).toBe("SELECT id FROM customer WHERE status != 'inactive'");
  });

  it('supports whereIn', () => {
    const sql = suiteql()
      .select('id')
      .from('customer')
      .whereIn('id', [1, 2, 3])
      .build();

    expect(sql).toBe('SELECT id FROM customer WHERE id IN (1, 2, 3)');
  });

  it('supports whereIn with strings', () => {
    const sql = suiteql()
      .select('id')
      .from('customer')
      .whereIn('type', ['customer', 'vendor'])
      .build();

    expect(sql).toBe("SELECT id FROM customer WHERE type IN ('customer', 'vendor')");
  });

  it('supports whereNull and whereNotNull', () => {
    const sql = suiteql()
      .select('id')
      .from('customer')
      .whereNotNull('email')
      .whereNull('phone')
      .build();

    expect(sql).toBe('SELECT id FROM customer WHERE email IS NOT NULL AND phone IS NULL');
  });

  it('supports whereBetween', () => {
    const sql = suiteql()
      .select('id')
      .from('transaction')
      .whereBetween('id', 100, 200)
      .build();

    expect(sql).toBe('SELECT id FROM transaction WHERE id BETWEEN 100 AND 200');
  });

  it('supports whereLike', () => {
    const sql = suiteql()
      .select('id')
      .from('customer')
      .whereLike('email', '%@example.com')
      .build();

    expect(sql).toBe("SELECT id FROM customer WHERE email LIKE '%@example.com'");
  });

  it('supports JOIN', () => {
    const sql = suiteql()
      .select('c.id', 't.tranid')
      .from('customer', 'c')
      .join('transaction t', 'c.id = t.entity')
      .build();

    expect(sql).toBe(
      'SELECT c.id, t.tranid FROM customer c INNER JOIN transaction t ON c.id = t.entity',
    );
  });

  it('supports LEFT JOIN', () => {
    const sql = suiteql()
      .select('c.id')
      .from('customer', 'c')
      .leftJoin('transaction t', 'c.id = t.entity')
      .build();

    expect(sql).toBe(
      'SELECT c.id FROM customer c LEFT JOIN transaction t ON c.id = t.entity',
    );
  });

  it('supports GROUP BY', () => {
    const sql = suiteql()
      .select('email', 'COUNT(*) AS cnt')
      .from('transaction')
      .groupBy('email')
      .build();

    expect(sql).toBe('SELECT email, COUNT(*) AS cnt FROM transaction GROUP BY email');
  });

  it('supports HAVING', () => {
    const sql = suiteql()
      .select('email', 'COUNT(*) AS cnt')
      .from('transaction')
      .groupBy('email')
      .having('COUNT(*) > 5')
      .build();

    expect(sql).toBe(
      'SELECT email, COUNT(*) AS cnt FROM transaction GROUP BY email HAVING COUNT(*) > 5',
    );
  });

  it('supports ORDER BY', () => {
    const sql = suiteql()
      .select('id', 'companyname')
      .from('customer')
      .orderBy('companyname', 'ASC')
      .orderBy('id', 'DESC')
      .build();

    expect(sql).toBe(
      'SELECT id, companyname FROM customer ORDER BY companyname ASC, id DESC',
    );
  });

  it('builds a complex query with all clauses', () => {
    const sql = suiteql()
      .select('c.id', 'c.companyname', 'COUNT(t.id) AS order_count')
      .from('customer', 'c')
      .leftJoin('transaction t', 'c.id = t.entity')
      .whereEquals('c.isinactive', false)
      .whereNotNull('c.email')
      .groupBy('c.id', 'c.companyname')
      .having('COUNT(t.id) > 0')
      .orderBy('order_count', 'DESC')
      .build();

    expect(sql).toBe(
      "SELECT c.id, c.companyname, COUNT(t.id) AS order_count " +
      "FROM customer c " +
      "LEFT JOIN transaction t ON c.id = t.entity " +
      "WHERE c.isinactive = 'F' AND c.email IS NOT NULL " +
      "GROUP BY c.id, c.companyname " +
      "HAVING COUNT(t.id) > 0 " +
      "ORDER BY order_count DESC",
    );
  });

  it('throws if SELECT is missing', () => {
    expect(() => suiteql().from('customer').build()).toThrow('SELECT clause is required');
  });

  it('throws if FROM is missing', () => {
    expect(() => suiteql().select('id').build()).toThrow('FROM clause is required');
  });

  it('toString() is an alias for build()', () => {
    const builder = suiteql().select('id').from('customer');
    expect(builder.toString()).toBe(builder.build());
  });
});
