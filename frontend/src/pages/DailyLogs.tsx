
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useUser } from '../context/UserContext';
import { Card, CardContent } from '../components/ui/Card';
import {
  Activity,
  AlertCircle,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Filter,
  HeartPulse,
  Info,
  Search,
} from 'lucide-react';

type HealthDay = {
  date: string;
  [key: string]: string | number | null | undefined;
};

type Signal = {
  key: string;
  label: string;
  unit: string;
  decimals: number;
};

type Outcome = {
  key: string;
  label: string;
};

const SIGNAL_GROUPS: {
  title: string;
  signals: Signal[];
}[] = [
  {
    title: 'Lifestyle & Daily Routine',
    signals: [
      {
        key: 'sleep_hours',
        label: 'Sleep',
        unit: 'h',
        decimals: 1,
      },
      {
        key: 'hydration_liters',
        label: 'Hydration',
        unit: 'L',
        decimals: 1,
      },
      {
        key: 'stress',
        label: 'Stress',
        unit: '/10',
        decimals: 1,
      },
      {
        key: 'activity_steps',
        label: 'Activity',
        unit: 'steps',
        decimals: 0,
      },
      {
        key: 'caffeine',
        label: 'Caffeine',
        unit: 'servings',
        decimals: 1,
      },
    ],
  },
  {
    title: 'Vital Signs',
    signals: [
      {
        key: 'heart_rate',
        label: 'Heart Rate',
        unit: 'bpm',
        decimals: 0,
      },
      {
        key: 'resting_hr',
        label: 'Resting Heart Rate',
        unit: 'bpm',
        decimals: 0,
      },
      {
        key: 'systolic_bp',
        label: 'Systolic BP',
        unit: 'mmHg',
        decimals: 0,
      },
      {
        key: 'diastolic_bp',
        label: 'Diastolic BP',
        unit: 'mmHg',
        decimals: 0,
      },
      {
        key: 'temperature_c',
        label: 'Temperature',
        unit: '°C',
        decimals: 1,
      },
    ],
  },
  {
    title: 'Body & Recovery',
    signals: [
      {
        key: 'weight_kg',
        label: 'Weight',
        unit: 'kg',
        decimals: 1,
      },
      {
        key: 'calories',
        label: 'Calories',
        unit: 'kcal',
        decimals: 0,
      },
      {
        key: 'sleep_quality',
        label: 'Sleep Quality',
        unit: '',
        decimals: 1,
      },
      {
        key: 'recovery',
        label: 'Recovery',
        unit: '',
        decimals: 1,
      },
    ],
  },
];

const OUTCOMES: Outcome[] = [
  { key: 'headache', label: 'Headache' },
  { key: 'bp_elevation', label: 'BP Elevation' },
  { key: 'fatigue', label: 'Fatigue' },
  {
    key: 'dehydration_risk',
    label: 'Dehydration Risk',
  },
  { key: 'poor_sleep', label: 'Poor Sleep' },
  {
    key: 'stress_overload',
    label: 'Stress Overload',
  },
  {
    key: 'recovery_deterioration',
    label: 'Recovery Deterioration',
  },
];

const ALL_SIGNALS = SIGNAL_GROUPS.flatMap(
  (group) => group.signals
);

function getNumber(
  day: HealthDay,
  key: string
): number | null {
  const raw = day[key];

  if (
    raw === null ||
    raw === undefined ||
    raw === ''
  ) {
    return null;
  }

  const value = Number(raw);

  return Number.isFinite(value) ? value : null;
}

function formatMetric(
  day: HealthDay,
  signal: Signal
): string {
  const value = getNumber(day, signal.key);

  if (value === null) return '—';

  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: signal.decimals,
    maximumFractionDigits: signal.decimals,
  });

  return signal.unit
    ? `${formatted} ${signal.unit}`
    : formatted;
}

function isRecordedEvent(
  day: HealthDay,
  key: string
): boolean {
  return getNumber(day, key) === 1;
}

function getEvents(day: HealthDay): Outcome[] {
  return OUTCOMES.filter((outcome) =>
    isRecordedEvent(day, outcome.key)
  );
}

function formatDate(
  value: string,
  options: Intl.DateTimeFormatOptions
): string {
  // Parse YYYY-MM-DD as a local calendar date.
  const datePart = value.slice(0, 10);
  const [year, month, day] = datePart
    .split('-')
    .map(Number);

  const date = new Date(year, month - 1, day);

  return date.toLocaleDateString('en-US', options);
}

function dateTimestamp(value: string): number {
  const [year, month, day] = value
    .slice(0, 10)
    .split('-')
    .map(Number);

  return Date.UTC(year, month - 1, day);
}

function LogRow({ day }: { day: HealthDay }) {
  const [expanded, setExpanded] = useState(false);

  const events = getEvents(day);

  const knownOutcomes = OUTCOMES.filter(
    (outcome) =>
      getNumber(day, outcome.key) !== null
  );

  const allOutcomesKnown =
    knownOutcomes.length === OUTCOMES.length;

  const dateLabel = formatDate(day.date, {
    month: 'short',
    day: 'numeric',
  });

  const fullDate = formatDate(day.date, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <Card className="overflow-hidden border-slate-800 bg-slate-900/80 transition-colors hover:border-slate-700">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        className="flex w-full flex-wrap items-center gap-4 px-5 py-5 text-left transition-colors hover:bg-slate-800/30"
      >
        <div className="text-slate-500">
          {expanded ? (
            <ChevronDown className="h-5 w-5" />
          ) : (
            <ChevronRight className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-20">
          <p className="font-semibold text-slate-100">
            {dateLabel}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {day.date.slice(0, 4)}
          </p>
        </div>

        <div className="grid flex-1 grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <p className="text-xs text-slate-500">
              Sleep
            </p>
            <p className="mt-1 text-slate-200">
              {formatMetric(
                day,
                ALL_SIGNALS[0]
              )}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">
              Hydration
            </p>
            <p className="mt-1 text-slate-200">
              {formatMetric(
                day,
                ALL_SIGNALS[1]
              )}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">
              Stress
            </p>
            <p className="mt-1 text-slate-200">
              {formatMetric(
                day,
                ALL_SIGNALS[2]
              )}
            </p>
          </div>

          <div>
            <p className="text-xs text-slate-500">
              Activity
            </p>
            <p className="mt-1 text-slate-200">
              {formatMetric(
                day,
                ALL_SIGNALS[3]
              )}
            </p>
          </div>
        </div>

        <div className="w-full md:w-40 md:text-right">
          {events.length > 0 ? (
            <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
              {events.length} recorded{' '}
              {events.length === 1
                ? 'event'
                : 'events'}
            </span>
          ) : allOutcomesKnown ? (
            <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              No recorded events
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-400">
              Partial outcome data
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <CardContent className="space-y-8 border-t border-slate-800 bg-slate-950/30 p-6">
          <div>
            <h3 className="text-base font-semibold text-slate-100">
              {fullDate}
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Detailed recorded health measurements
            </p>
          </div>

          {SIGNAL_GROUPS.map((group) => (
            <section key={group.title}>
              <h4 className="mb-4 text-xs font-semibold uppercase tracking-widest text-slate-400">
                {group.title}
              </h4>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {group.signals.map((signal) => (
                  <div
                    key={signal.key}
                    className="rounded-xl border border-slate-800 bg-slate-900/80 p-4"
                  >
                    <p className="text-xs text-slate-500">
                      {signal.label}
                    </p>

                    <p className="mt-2 text-lg font-semibold text-slate-100">
                      {formatMetric(day, signal)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ))}

          <section>
            <div className="mb-4 flex items-center gap-2">
              <HeartPulse className="h-4 w-4 text-violet-400" />

              <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Recorded Health Outcomes
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {OUTCOMES.map((outcome) => {
                const recorded = getNumber(
                  day,
                  outcome.key
                );

                const occurred = recorded === 1;

                return (
                  <div
                    key={outcome.key}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 ${
                      occurred
                        ? 'border-amber-500/30 bg-amber-500/5'
                        : 'border-slate-800 bg-slate-900/60'
                    }`}
                  >
                    <span className="text-sm text-slate-300">
                      {outcome.label}
                    </span>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        occurred
                          ? 'bg-amber-500/10 text-amber-400'
                          : recorded === 0
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-slate-800 text-slate-500'
                      }`}
                    >
                      {occurred
                        ? 'Recorded'
                        : recorded === 0
                          ? 'Not recorded'
                          : 'Unavailable'}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />

            <p className="text-xs leading-relaxed text-slate-500">
              These entries reflect the dataset's
              recorded measurements and outcome flags.
              They are not model predictions or
              medical diagnoses.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function DailyLogs() {
  const { selectedUserId } = useUser();

  const [timeline, setTimeline] = useState<
    HealthDay[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<
    string | null
  >(null);

  const [range, setRange] = useState('30');

  const [outcomeFilter, setOutcomeFilter] =
    useState('all');

  const [search, setSearch] = useState('');

  useEffect(() => {
    let active = true;

    async function fetchLogs() {
      setLoading(true);
      setError(null);
      setTimeline([]);

      if (!selectedUserId) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.getTimeline(
          selectedUserId
        );

        if (!active) return;

        const records: HealthDay[] =
          response.timeline ?? [];

        const sorted = [...records].sort(
          (a, b) =>
            dateTimestamp(b.date) -
            dateTimestamp(a.date)
        );

        setTimeline(sorted);
      } catch (err) {
        if (!active) return;

        console.error(err);

        setError(
          'Unable to load daily health records.'
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchLogs();

    return () => {
      active = false;
    };
  }, [selectedUserId]);

  const filteredTimeline = useMemo(() => {
    if (timeline.length === 0) return [];

    // Use the newest available record as the
    // reference date. This also works for
    // historical demo datasets.
    const latestDate = dateTimestamp(
      timeline[0].date
    );

    const earliestAllowed =
      range === 'all'
        ? -Infinity
        : latestDate -
          (Number(range) - 1) *
            24 *
            60 *
            60 *
            1000;

    return timeline.filter((day) => {
      if (
        dateTimestamp(day.date) <
        earliestAllowed
      ) {
        return false;
      }

      if (outcomeFilter === 'any') {
        if (getEvents(day).length === 0) {
          return false;
        }
      } else if (outcomeFilter !== 'all') {
        if (
          !isRecordedEvent(
            day,
            outcomeFilter
          )
        ) {
          return false;
        }
      }

      if (search.trim()) {
        const query = search
          .trim()
          .toLowerCase();

        const searchableDate = formatDate(
          day.date,
          {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          }
        ).toLowerCase();

        if (
          !day.date.includes(query) &&
          !searchableDate.includes(query)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    timeline,
    range,
    outcomeFilter,
    search,
  ]);

  const totalEventDays =
    filteredTimeline.filter(
      (day) => getEvents(day).length > 0
    ).length;

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-12">
      {/* PAGE INTRO */}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <CalendarDays className="h-6 w-6 text-violet-400" />

            <h1 className="text-2xl font-semibold text-slate-100">
              Daily Health History
            </h1>

            <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
              2.0
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-400">
            Explore your measurements and
            recorded health outcomes over time.
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
          <p className="text-xs text-slate-500">
            Available history
          </p>

          <p className="mt-1 text-xl font-semibold text-slate-100">
            {timeline.length}
            <span className="ml-2 text-sm font-normal text-slate-500">
              records
            </span>
          </p>
        </div>
      </div>

      {/* SUMMARY */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-slate-800 bg-slate-900/80">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2 text-slate-500">
              <CalendarDays className="h-4 w-4" />

              <span className="text-xs uppercase tracking-wider">
                Visible Records
              </span>
            </div>

            <p className="text-3xl font-semibold text-slate-100">
              {filteredTimeline.length}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2 text-slate-500">
              <Activity className="h-4 w-4" />

              <span className="text-xs uppercase tracking-wider">
                Days With Recorded Events
              </span>
            </div>

            <p className="text-3xl font-semibold text-amber-400">
              {totalEventDays}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center gap-2 text-slate-500">
              <HeartPulse className="h-4 w-4" />

              <span className="text-xs uppercase tracking-wider">
                Measurements Tracked
              </span>
            </div>

            <p className="text-3xl font-semibold text-violet-300">
              14
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Across three categories
            </p>
          </CardContent>
        </Card>
      </div>

      {/* FILTERS */}

      <Card className="border-slate-800 bg-slate-900/80">
        <CardContent className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Filter className="h-4 w-4 text-violet-400" />

            <h2 className="text-sm font-medium text-slate-200">
              Filter History
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-[180px_220px_1fr]">
            <select
              aria-label="Date range"
              value={range}
              onChange={(event) =>
                setRange(event.target.value)
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200 outline-none focus:border-violet-500"
            >
              <option value="7">
                Last 7 days
              </option>

              <option value="30">
                Last 30 days
              </option>

              <option value="all">
                All history
              </option>
            </select>

            <select
              aria-label="Health outcome"
              value={outcomeFilter}
              onChange={(event) =>
                setOutcomeFilter(
                  event.target.value
                )
              }
              className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200 outline-none focus:border-violet-500"
            >
              <option value="all">
                All days
              </option>

              <option value="any">
                Any recorded event
              </option>

              {OUTCOMES.map((outcome) => (
                <option
                  key={outcome.key}
                  value={outcome.key}
                >
                  {outcome.label}
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

              <input
                type="text"
                aria-label="Search date"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search date, e.g. Sep 19..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-violet-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RECORDS */}

      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map(
            (_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-xl bg-slate-800/50"
              />
            )
          )
        ) : error ? (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-300">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        ) : filteredTimeline.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 py-16 text-center">
            <Search className="mx-auto mb-4 h-8 w-8 text-slate-600" />

            <p className="text-slate-300">
              No matching health records
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Try changing your date range or
              outcome filter.
            </p>
          </div>
        ) : (
          filteredTimeline.map((day) => (
            <LogRow
              key={day.date}
              day={day}
            />
          ))
        )}
      </div>

      {!loading &&
        !error &&
        filteredTimeline.length > 0 && (
          <p className="text-center text-xs text-slate-600">
            Showing {filteredTimeline.length}{' '}
            of {timeline.length} available
            records. Select a day to view all
            measurements and outcomes.
          </p>
        )}

      <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />

        <p className="text-xs leading-relaxed text-slate-500">
          LifePrint currently uses an expanded
          synthetic dataset for research and
          demonstration. Recorded outcome flags
          should not be interpreted as verified
          clinical diagnoses.
        </p>
      </div>
    </div>
  );
}