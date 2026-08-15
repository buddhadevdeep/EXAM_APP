import React, { useState, useEffect } from 'react';
import { FaLightbulb } from 'react-icons/fa';

const SmartHints = ({ sqlQuery = '' }) => {
  const [hints, setHints] = useState([]);

  useEffect(() => {
    const newHints = [];
    const upperQuery = sqlQuery.toUpperCase().trim();

    if (upperQuery.includes('SELECT') && !upperQuery.match(/SELECT\s+.+/)) {
      newHints.push('Remember to specify which columns you want to retrieve.');
    }
    if (upperQuery.includes('WHERE') && !upperQuery.match(/WHERE\s+[\w`"']+\s*(=|!=|<|>|<=|>=|LIKE|IN|IS|BETWEEN)/)) {
      newHints.push('Consider adding a comparison operator (e.g. =, <, >, LIKE).');
    }
    if (upperQuery.includes('JOIN') && !upperQuery.includes('ON')) {
      newHints.push('Ensure both tables have a matching relationship (use the ON keyword).');
    }
    if (upperQuery.includes('GROUP BY') && !upperQuery.match(/(SUM|COUNT|AVG|MIN|MAX)/)) {
      newHints.push('Aggregate functions (like COUNT, SUM, AVG) are commonly used with GROUP BY.');
    }
    if (upperQuery.includes('ORDER BY') && !upperQuery.includes('ASC') && !upperQuery.includes('DESC')) {
      newHints.push('Choose ASC (ascending) or DESC (descending) if specific ordering direction is needed.');
    }

    setHints(newHints);
  }, [sqlQuery]);

  if (hints.length === 0) return null;

  return (
    <div className="card glass-card border-warning mb-4">
      <div className="card-body">
        <h6 className="card-title text-warning d-flex align-items-center gap-2">
          <FaLightbulb /> Smart Learning Assistant Suggestions
        </h6>
        <ul className="mb-0 text-muted pl-3">
          {hints.map((hint, idx) => (
            <li key={idx} className="mb-1">{hint}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SmartHints;
