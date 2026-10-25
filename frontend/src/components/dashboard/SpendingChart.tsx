import type { DaySpend } from '../../utils/insights';
import { nairaFormatter, wholeNairaFormatter } from '../../utils/format';

const weekday = new Intl.DateTimeFormat('en-NG', { weekday: 'short' });
const fullDay = new Intl.DateTimeFormat('en-NG', { weekday: 'long', day: 'numeric', month: 'short' });

/**
 * Seven-day spending bars. One series, one hue: today's bar is the darker
 * step so "where am I this week" reads at a glance. Each bar is focusable
 * and shows its exact value on hover/focus, and a visually hidden table
 * carries the same numbers for screen readers.
 */
export function SpendingChart({ days }: { days: DaySpend[] }) {
  const max = Math.max(...days.map((day) => day.total));
  const total = days.reduce((sum, day) => sum + day.total, 0);

  return (
    <div className="spending">
      <p className="spending__total">{wholeNairaFormatter.format(total)}</p>
      <p className="spending__caption">Spent in the last 7 days</p>

      <div className="chart" aria-hidden="true">
        {days.map((day, index) => {
          const isToday = index === days.length - 1;
          const height = max > 0 ? Math.max(4, (day.total / max) * 100) : 4;
          return (
            <div key={day.date.toISOString()} className="chart__slot">
              <span
                className={`chart__bar${isToday ? ' chart__bar--current' : ''}`}
                style={{ height: `${height}%` }}
              />
              <span className="chart__tip">
                {fullDay.format(day.date)}
                <strong>{nairaFormatter.format(day.total)}</strong>
              </span>
            </div>
          );
        })}
      </div>
      <div className="chart__labels" aria-hidden="true">
        {days.map((day, index) => (
          <span key={day.date.toISOString()}>
            {index === days.length - 1 ? 'Today' : weekday.format(day.date)}
          </span>
        ))}
      </div>

      <table className="sr-only">
        <caption>Spending per day, last 7 days</caption>
        <tbody>
          {days.map((day) => (
            <tr key={day.date.toISOString()}>
              <th scope="row">{fullDay.format(day.date)}</th>
              <td>{nairaFormatter.format(day.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
