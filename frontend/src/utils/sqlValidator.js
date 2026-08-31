import alasql from 'alasql';

const bannedFunctions = {
  'NOW': 'GETDATE',
  'LENGTH': 'LEN',
  'IFNULL': 'ISNULL',
  'NVL': 'ISNULL',
  'CURDATE': 'GETDATE',
  'SYSDATE': 'GETDATE',
  'SUBSTR': 'SUBSTRING'
};

function hasBannedFunction(expr) {
  if (!expr || typeof expr !== 'object') return false;
  if (expr.funcid) {
    const fid = expr.funcid.toUpperCase();
    if (bannedFunctions[fid]) return { func: fid, replacement: bannedFunctions[fid] };
  }
  for (const key of Object.keys(expr)) {
    const val = expr[key];
    if (typeof val === 'object' && val !== null) {
      const res = hasBannedFunction(val);
      if (res) return res;
    }
  }
  return false;
}

function findUnaggregatedColumnIds(expr, list = new Set()) {
  if (!expr || typeof expr !== 'object') return list;
  if (expr.aggregatorid) return list;
  if (expr.columnid && expr.columnid !== '*') list.add(expr.columnid.toLowerCase());
  for (const key of Object.keys(expr)) {
    const val = expr[key];
    if (typeof val === 'object' && val !== null) findUnaggregatedColumnIds(val, list);
  }
  return list;
}

function hasAggregatorRecursive(expr) {
  if (!expr || typeof expr !== 'object') return false;
  if (expr.aggregatorid) return true;
  for (const key of Object.keys(expr)) {
    const val = expr[key];
    if (typeof val === 'object' && val !== null) {
      if (hasAggregatorRecursive(val)) return true;
    }
  }
  return false;
}

function hasStarRecursive(expr) {
  if (!expr || typeof expr !== 'object') return false;
  if (expr.aggregatorid) return false;
  if (expr.columnid === '*') return true;
  for (const key of Object.keys(expr)) {
    const val = expr[key];
    if (typeof val === 'object' && val !== null) {
      if (hasStarRecursive(val)) return true;
    }
  }
  return false;
}

export const validateSqlQuery = (sqlQuery) => {
  const ast = alasql.parse(sqlQuery);
  if (!ast || !ast.statements || ast.statements.length === 0) return;
  
  for (const stmt of ast.statements) {
    // MS SQL Validation: Block LIMIT
    if (stmt.limit) {
      throw new Error(`DBMS SQL standard error: LIMIT is not a valid MS SQL Server keyword. Use SELECT TOP N instead.`);
    }

    // MS SQL Validation: Block non-TSQL functions
    const banned = hasBannedFunction(stmt);
    if (banned) {
      throw new Error(`DBMS SQL standard error: '${banned.func}()' is not a recognized built-in function name in MS SQL Server. Use ${banned.replacement}() instead.`);
    }
    
    // Grouping Constraints
    if (stmt.columns) {
      const hasAggregator = stmt.columns.some(hasAggregatorRecursive);
      const hasStar = stmt.columns.some(hasStarRecursive);
      
      const groupByColumns = new Set();
      if (stmt.group && stmt.group.length > 0) {
        for (const g of stmt.group) findUnaggregatedColumnIds(g, groupByColumns);
      }
      
      const selectUnaggregated = new Set();
      for (const col of stmt.columns) findUnaggregatedColumnIds(col, selectUnaggregated);

      const orderUnaggregated = new Set();
      if (stmt.order && stmt.order.length > 0) {
        for (const o of stmt.order) findUnaggregatedColumnIds(o, orderUnaggregated);
      }

      const havingUnaggregated = new Set();
      if (stmt.having) {
        findUnaggregatedColumnIds(stmt.having, havingUnaggregated);
      }
      
      if (stmt.group && stmt.group.length > 0) {
        if (hasStar) {
          throw new Error(`DBMS SQL standard error: Cannot use SELECT * with GROUP BY.`);
        }

        for (const col of selectUnaggregated) {
          if (!groupByColumns.has(col)) {
            throw new Error(`DBMS SQL standard error: Column "${col}" in SELECT list is not in GROUP BY clause and contains nonaggregated column.`);
          }
        }

        for (const col of orderUnaggregated) {
          if (!groupByColumns.has(col)) {
            throw new Error(`DBMS SQL standard error: Column "${col}" in ORDER BY is not in GROUP BY clause and is not aggregated.`);
          }
        }

        for (const col of havingUnaggregated) {
          if (!groupByColumns.has(col)) {
            throw new Error(`DBMS SQL standard error: Column "${col}" in HAVING clause is not in GROUP BY clause and is not aggregated.`);
          }
        }
      } else if (hasAggregator) {
        if (selectUnaggregated.size > 0) {
          const list = Array.from(selectUnaggregated).join(', ');
          throw new Error(`DBMS SQL standard error: Mixing aggregate functions and nonaggregated columns (${list}) without GROUP BY is not allowed.`);
        }
        if (orderUnaggregated.size > 0) {
          const list = Array.from(orderUnaggregated).join(', ');
          throw new Error(`DBMS SQL standard error: Column "${list}" in ORDER BY must be aggregated when there is no GROUP BY.`);
        }
      }
    }
  }
};
