import { useId } from 'react';
import type { OperationFilter } from '../../utils/collections';

interface TransactionFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  operation: OperationFilter;
  onOperationChange: (value: OperationFilter) => void;
}

const OPERATIONS: OperationFilter[] = ['all', 'deposit', 'withdrawal', 'transfer', 'reversal'];

/**
 * Deliberately a plain controlled input — `onSearchChange` updates state on
 * every keystroke with no debounce and no memoization here. That's correct:
 * see TransactionsPage for why the *input* stays fully synchronous while
 * the expensive filtering it triggers is deferred instead.
 */
export function TransactionFilters({
  search, onSearchChange, operation, onOperationChange,
}: TransactionFiltersProps) {
  const searchId = useId();
  const operationId = useId();

  return (
    <div className="transaction-filters">
      <label htmlFor={searchId} className="field">
        <span className="field__label">Search</span>
        <input
          id={searchId}
          type="search"
          className="field__input"
          placeholder="Reference or account number"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>
      <label htmlFor={operationId} className="field">
        <span className="field__label">Type</span>
        <select
          id={operationId}
          className="field__input"
          value={operation}
          onChange={(event) => onOperationChange(event.target.value as OperationFilter)}
        >
          {OPERATIONS.map((op) => (
            <option key={op} value={op}>
              {op === 'all' ? 'All types' : op}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
