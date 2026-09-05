import {
  useCallback, useMemo, useState, useDeferredValue, useTransition,
} from 'react';
import { useApiRequest } from '../hooks/useApiRequest';
import { walletApi } from '../api/endpoints';
import { isError, isSuccess } from '../types/async';
import { filterTransactions, paginate, type OperationFilter } from '../utils/collections';
import { TransactionFilters } from '../components/transactions/TransactionFilters';
import { TransactionList } from '../components/transactions/TransactionList';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';

const PER_PAGE = 10;

export default function TransactionsPage() {
  // Fetch a reasonably large window once; search/filter/paginate happen
  // client-side from here. (A production app with thousands of rows per
  // customer would instead push search/filter to the server — this is a
  // deliberate scope choice for a demo dataset, not a hook decision.)
  const fetchAll = useCallback((signal: AbortSignal) => walletApi.transactions({ perPage: 200 }, signal), []);
  const { state } = useApiRequest(fetchAll, []);

  const [search, setSearch] = useState('');
  const [operation, setOperation] = useState<OperationFilter>('all');
  const [page, setPage] = useState(1);

  /**
   * PERFORMANCE: useDeferredValue.
   * `search` updates on every keystroke (see TransactionFilters — it's a
   * fully synchronous controlled input, deliberately not debounced). If the
   * *filtered list* were recomputed and re-rendered synchronously from that
   * same fast-changing value, a large-enough transaction list would make
   * typing itself feel laggy, because React couldn't paint the next
   * keystroke in the input until it finished re-rendering the list for the
   * previous one.
   *
   * `useDeferredValue(search)` gives us a second copy of the value that
   * "lags behind" under load: React renders with the last-known deferred
   * value first (keeping the input snappy), then re-renders again with the
   * fresh one in the background as soon as it can. This is strictly better
   * here than a hand-rolled `setTimeout` debounce, because it adapts to
   * actual rendering cost on the user's device instead of a guessed fixed
   * delay — on a fast machine typing feels instant either way, but on a
   * slow one useDeferredValue degrades gracefully instead of compounding a
   * fixed delay on top of already-slow rendering.
   */
  const deferredSearch = useDeferredValue(search);

  /**
   * PERFORMANCE: useTransition for pagination.
   * Changing pages swaps which slice of (now-filtered) transactions render.
   * Marking that state update as a transition tells React it's not urgent
   * — if the user rapidly clicks through pages, React can drop intermediate
   * renders rather than queuing all of them, and `isPending` lets us show a
   * subtle "updating…" affordance instead of the page silently freezing on
   * a heavier render.
   */
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(
    () => (isSuccess(state) ? filterTransactions(state.data, deferredSearch, operation) : []),
    [state, deferredSearch, operation],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageItems = useMemo(() => paginate(filtered, page, PER_PAGE), [filtered, page]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1); // a new search invalidates the current page position
  };

  const handleOperationChange = (value: OperationFilter) => {
    setOperation(value);
    setPage(1);
  };

  const goToPage = (next: number) => {
    startTransition(() => setPage(next));
  };

  return (
    <div className="transactions-page">
      <Card
        title="Transactions"
        action={(
          <TransactionFilters
            search={search}
            onSearchChange={handleSearchChange}
            operation={operation}
            onOperationChange={handleOperationChange}
          />
        )}
      >
        {state.status === 'loading' && <Spinner label="Loading transactions…" />}
        {isError(state) && <Alert variant="error">{state.error.message}</Alert>}
        {isSuccess(state) && (
          <>
            <div className={isPending ? 'transaction-table-wrapper--pending' : undefined}>
              <TransactionList transactions={pageItems} />
            </div>
            <div className="pagination">
              <Button
                type="button"
                variant="secondary"
                disabled={page <= 1}
                onClick={() => goToPage(page - 1)}
              >
                Previous
              </Button>
              <span className="pagination__status">
                Page {page} of {pageCount}
                {isPending && ' · updating…'}
              </span>
              <Button
                type="button"
                variant="secondary"
                disabled={page >= pageCount}
                onClick={() => goToPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
