import type { DailyStat } from '../../stores/progress'
import { dayKey } from '../../services/learning/xp'

/** Exercises per day for the last 14 days: correct (solid) and attempted (light). Text alternative in a table. */
export function ActivityChart({ daily, goal, now }: { daily: Record<string, DailyStat>; goal: number; now: number }) {
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now)
    d.setDate(d.getDate() - (13 - i))
    const key = dayKey(d)
    return { key, label: d.toLocaleDateString('en-GB', { weekday: 'narrow' }), stat: daily[key] ?? { items: 0, correct: 0, xp: 0 } }
  })
  const max = Math.max(goal, ...days.map((d) => d.stat.items), 1)
  const W = 14 * 24
  const H = 120
  const y = (v: number) => H - 18 - (v / max) * (H - 30)
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-36 w-full" role="img" aria-label="Exercises per day for the last two weeks">
        <line x1={0} x2={W} y1={y(goal)} y2={y(goal)} stroke="var(--border-strong)" strokeDasharray="4 4" />
        <text x={W - 2} y={y(goal) - 4} textAnchor="end" fontSize={9} fill="var(--text-muted)">
          goal {goal}
        </text>
        {days.map((d, i) => {
          const x = i * 24 + 5
          return (
            <g key={d.key}>
              <rect x={x} width={14} y={y(d.stat.items)} height={H - 18 - y(d.stat.items)} rx={3} fill="var(--primary-soft)" />
              <rect x={x} width={14} y={y(d.stat.correct)} height={H - 18 - y(d.stat.correct)} rx={3} fill="var(--primary)" />
              <text x={x + 7} y={H - 5} textAnchor="middle" fontSize={9} fill="var(--text-muted)">
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
      <figcaption className="sr-only">
        <table>
          <thead>
            <tr>
              <th>Day</th>
              <th>Exercises</th>
              <th>Correct</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.key}>
                <td>{d.key}</td>
                <td>{d.stat.items}</td>
                <td>{d.stat.correct}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  )
}
