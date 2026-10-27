import { describe, expect, it } from 'vitest';
import { splitSqlStatements } from '../sql/statements';
describe('SQL statement boundaries', () => {
  it('supports several statements on the same line', () => {
    expect(
      splitSqlStatements('CREATE TABLE x(a INT); INSERT INTO x VALUES (1); SELECT * FROM x;'),
    ).toEqual(['CREATE TABLE x(a INT)', 'INSERT INTO x VALUES (1)', 'SELECT * FROM x']);
  });
  it('keeps semicolons and escaped quotes inside string literals', () => {
    expect(splitSqlStatements("SELECT 'it''s; correct' AS x; SELECT 2;")).toEqual([
      "SELECT 'it''s; correct' AS x",
      'SELECT 2',
    ]);
    expect(splitSqlStatements('SELECT "a;b" FROM x; SELECT $$x;y$$;')).toEqual([
      'SELECT "a;b" FROM x',
      'SELECT $$x;y$$',
    ]);
  });
  it('handles nested block comments and skips comment-only fragments', () => {
    expect(
      splitSqlStatements('-- example;\n/* x /* y; */ z */; SELECT 1 /* ; */; -- tail;'),
    ).toEqual(['SELECT 1 /* ; */']);
  });
  it('preserves dollar tags, escape strings and an unfinished statement for the SQL engine to report', () => {
    expect(splitSqlStatements("SELECT $text$a;b$text$; SELECT E'it\\'s;x';")).toEqual([
      'SELECT $text$a;b$text$',
      "SELECT E'it\\'s;x'",
    ]);
    expect(splitSqlStatements("SELECT 'unfinished; text")).toEqual(["SELECT 'unfinished; text"]);
  });
});
