
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useUser } from '../context/UserContext';
import { Card, CardContent } from '../components/ui/Card';
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BrainCircuit,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  HeartPulse,
  Info,
  Minus,
  Shield,
} from 'lucide-react';

type BaselineSignal = {
  current: number | null;
  baseline: number | null;
  deviation_percent: number | null;
  trend: string;
  trend_change: number | null;
  volatility: number | null;
  history_days: number;
};

type BaselineResponse = {
  user_id: string;
  date: string;
  baseline_window_days: number;
  signals: Record<string, BaselineSignal>;
};

type Pattern = {
  signal: string;
  direction: 'above' | 'below';
  outcome: string;
  exposed_days: number;
  comparison_days: number;
  exposed_event_count: number;
  comparison_event_count: number;
  event_rate_exposed: number;
  event_rate_comparison: number;
  difference_percentage_points: number;
  baseline_deviation_threshold: string;
  lag_days: number;
};

type PatternsResponse = {
  user_id: string;
  days_available: number;
  patterns_found: number;
  patterns: Pattern[];
};

type Metric = {
  key: string;
  label: string;
  unit: string;
  decimals: number;
};

const GROUPS: {
  title: string;
  description: string;
  metrics: Metric[];
}[] = [
  {
    title: 'Lifestyle & Routine',
    description: 'Daily habits and activity',
    metrics: [
      { key: 'sleep_hours', label: 'Sleep', unit: 'h', decimals: 1 },
      { key: 'hydration_liters', label: 'Hydration', unit: 'L', decimals: 1 },
      { key: 'stress', label: 'Stress', unit: '/10', decimals: 1 },
      { key: 'activity_steps', label: 'Activity', unit: 'steps', decimals: 0 },
      { key: 'caffeine', label: 'Caffeine', unit: 'servings', decimals: 1 },
    ],
  },
  {
    title: 'Vital Signs',
    description: 'Recorded physiological measurements',
    metrics: [
      { key: 'heart_rate', label: 'Heart Rate', unit: 'bpm', decimals: 0 },
      { key: 'resting_hr', label: 'Resting Heart Rate', unit: 'bpm', decimals: 0 },
      { key: 'systolic_bp', label: 'Systolic BP', unit: 'mmHg', decimals: 0 },
      { key: 'diastolic_bp', label: 'Diastolic BP', unit: 'mmHg', decimals: 0 },
      { key: 'temperature_c', label: 'Temperature', unit: '°C', decimals: 1 },
    ],
  },
  {
    title: 'Body & Recovery',
    description: 'Body measurements and recovery indicators',
    metrics: [
      { key: 'weight_kg', label: 'Weight', unit: 'kg', decimals: 1 },
      { key: 'calories', label: 'Calories', unit: 'kcal', decimals: 0 },
      { key: 'sleep_quality', label: 'Sleep Quality', unit: '', decimals: 1 },
      { key: 'recovery', label: 'Recovery', unit: '', decimals: 1 },
    ],
  },
];

const METRICS = GROUPS.flatMap(group => group.metrics);

const OUTCOMES: Record<string, string> = {
  headache: 'Headache',
  bp_elevation: 'BP Elevation',
  fatigue: 'Fatigue',
  dehydration_risk: 'Dehydration Risk',
  poor_sleep: 'Poor Sleep',
  stress_overload: 'Stress Overload',
  recovery_deterioration: 'Recovery Deterioration',
};

function labelFor(key: string): string {
  return (
    METRICS.find(metric => metric.key === key)?.label ||
    OUTCOMES[key] ||
    key.replace(/_/g, ' ')
  );
}

function formatNumber(
  value: number | null | undefined,
  decimals = 1
): string {
  if (value == null || !Number.isFinite(value)) return '—';

  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatMetric(
  value: number | null | undefined,
  metric: Metric
): string {
  const formatted = formatNumber(value, metric.decimals);

  return formatted === '—'
    ? formatted
    : `${formatted}${metric.unit ? ` ${metric.unit}` : ''}`;
}

function signed(
  value: number | null | undefined,
  suffix = '%'
): string {
  if (value == null || !Number.isFinite(value)) return '—';

  return `${value > 0 ? '+' : ''}${value.toFixed(1)}${suffix}`;
}

function formatDate(value?: string): string {
  if (!value) return 'Unavailable';

  const [year, month, day] = value
    .slice(0, 10)
    .split('-')
    .map(Number);

  if (!year || !month || !day) return 'Unavailable';

  return new Date(year, month - 1, day).toLocaleDateString(
    'en-US',
    { month: 'short', day: 'numeric', year: 'numeric' }
  );
}

function TrendIndicator({ trend }: { trend?: string }) {
  const normalized = (trend || '').toLowerCase();

  if (
    normalized.includes('increas') ||
    normalized.includes('rising') ||
    normalized === 'up'
  ) {
    return (
      <span className="flex items-center gap-1 text-xs text-blue-400">
        <ArrowUpRight className="h-3.5 w-3.5" />
        Increasing
      </span>
    );
  }

  if (
    normalized.includes('decreas') ||
    normalized.includes('falling') ||
    normalized === 'down'
  ) {
    return (
      <span className="flex items-center gap-1 text-xs text-violet-400">
        <ArrowDownRight className="h-3.5 w-3.5" />
        Decreasing
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-xs text-slate-400">
      <Minus className="h-3.5 w-3.5" />
      {trend || 'Unavailable'}
    </span>
  );
}

function MetricCard({
  metric,
  signal,
}: {
  metric: Metric;
  signal?: BaselineSignal;
}) {
  return (
    <Card className="border-slate-800 bg-slate-900/80 transition-colors hover:border-violet-500/30">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-300">
            {metric.label}
          </p>

          {signal?.deviation_percent != null && (
            <span className="rounded-full bg-violet-500/10 px-2 py-1 text-xs text-violet-300">
              {signed(signal.deviation_percent)}
            </span>
          )}
        </div>

        <p className="mt-4 text-2xl font-semibold text-slate-100">
          {formatMetric(signal?.current, metric)}
        </p>

        <div className="mt-5 space-y-3 border-t border-slate-800 pt-4">
          <div className="flex justify-between gap-2 text-xs">
            <span className="text-slate-500">
              Personal baseline
            </span>
            <span className="text-slate-300">
              {formatMetric(signal?.baseline, metric)}
            </span>
          </div>

          <div className="flex justify-between gap-2">
            <span className="text-xs text-slate-500">
              Recent trend
            </span>
            <TrendIndicator trend={signal?.trend} />
          </div>

          <div className="flex justify-between gap-2 text-xs">
            <span className="text-slate-500">
              Volatility
            </span>
            <span className="text-slate-300">
              {formatNumber(signal?.volatility, 2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Each outcome contains one or two findings:
// one for below-baseline days and one for above-baseline days.
type OutcomeGroup = {
  outcome: string;
  findings: Pattern[];
};

type SignalGroup = {
  signal: string;
  outcomes: OutcomeGroup[];
  findingCount: number;
  maxDifference: number;
};

function groupPatterns(patterns: Pattern[]): SignalGroup[] {
  const signalMap = new Map<
    string,
    Map<string, Pattern[]>
  >();

  for (const pattern of patterns) {
    if (!signalMap.has(pattern.signal)) {
      signalMap.set(pattern.signal, new Map());
    }

    const outcomeMap = signalMap.get(pattern.signal)!;

    if (!outcomeMap.has(pattern.outcome)) {
      outcomeMap.set(pattern.outcome, []);
    }

    outcomeMap.get(pattern.outcome)!.push(pattern);
  }

  return Array.from(signalMap.entries())
    .map(([signal, outcomeMap]) => {
      const outcomes = Array.from(outcomeMap.entries())
        .map(([outcome, findings]) => ({
          outcome,
          findings: [...findings].sort(
            (a, b) =>
              Math.abs(b.difference_percentage_points) -
              Math.abs(a.difference_percentage_points)
          ),
        }))
        .sort(
          (a, b) =>
            Math.max(
              ...b.findings.map(item =>
                Math.abs(item.difference_percentage_points)
              )
            ) -
            Math.max(
              ...a.findings.map(item =>
                Math.abs(item.difference_percentage_points)
              )
            )
        );

      const allFindings = outcomes.flatMap(
        outcome => outcome.findings
      );

      return {
        signal,
        outcomes,
        findingCount: allFindings.length,
        maxDifference: Math.max(
          0,
          ...allFindings.map(item =>
            Math.abs(item.difference_percentage_points)
          )
        ),
      };
    })
    .sort((a, b) => b.maxDifference - a.maxDifference);
}

function EvidenceCard({ pattern }: { pattern: Pattern }) {
  const [showEvidence, setShowEvidence] = useState(false);

  const higher = pattern.difference_percentage_points > 0;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-200">
            {pattern.direction === 'below'
              ? 'Below personal baseline'
              : 'Above personal baseline'}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            At least {pattern.baseline_deviation_threshold}{' '}
            from baseline
          </p>
        </div>

        <div className="text-right">
          <span
            className={`inline-block rounded-full px-3 py-1.5 text-xs font-semibold ${
              higher
                ? 'bg-amber-500/10 text-amber-300'
                : 'bg-emerald-500/10 text-emerald-300'
            }`}
          >
            {signed(
              pattern.difference_percentage_points,
              ' pp'
            )}
          </span>

          <p className="mt-1 text-xs text-slate-500">
            {higher
              ? 'Higher observed frequency'
              : 'Lower observed frequency'}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-3">
          <p className="text-xs text-slate-500">
            When condition occurred
          </p>

          <p className="mt-2 text-xl font-semibold text-violet-300">
            {formatNumber(pattern.event_rate_exposed)}%
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {pattern.exposed_event_count} events /{' '}
            {pattern.exposed_days} days
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
          <p className="text-xs text-slate-500">
            Comparison days
          </p>

          <p className="mt-2 text-xl font-semibold text-slate-200">
            {formatNumber(pattern.event_rate_comparison)}%
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {pattern.comparison_event_count} events /{' '}
            {pattern.comparison_days} days
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowEvidence(!showEvidence)}
        className="mt-4 flex w-full items-center justify-between border-t border-slate-800 pt-3 text-xs text-slate-400 hover:text-violet-300"
      >
        {showEvidence ? 'Hide details' : 'View evidence'}

        {showEvidence ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      {showEvidence && (
        <div className="mt-3 space-y-2 text-xs text-slate-400">
          <div className="flex justify-between gap-3">
            <span>Next-day lag</span>
            <span>{pattern.lag_days} day(s)</span>
          </div>

          <div className="flex justify-between gap-3">
            <span>Exposed observations</span>
            <span>{pattern.exposed_days}</span>
          </div>

          <div className="flex justify-between gap-3">
            <span>Comparison observations</span>
            <span>{pattern.comparison_days}</span>
          </div>

          <p className="pt-2 leading-relaxed text-slate-500">
            This comparison is exploratory. It does not
            establish that the signal caused the outcome.
          </p>
        </div>
      )}
    </div>
  );
}

function SignalPatternGroup({
  group,
  defaultOpen,
}: {
  group: SignalGroup;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className="overflow-hidden border-slate-800 bg-slate-900/80">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-slate-800/40"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-500/20 bg-violet-500/10">
            <Activity className="h-5 w-5 text-violet-400" />
          </div>

          <div>
            <h3 className="text-base font-semibold text-slate-100">
              {labelFor(group.signal)}
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              {group.outcomes.length}{' '}
              {group.outcomes.length === 1
                ? 'associated outcome'
                : 'associated outcomes'}
              {' · '}
              {group.findingCount}{' '}
              {group.findingCount === 1
                ? 'finding'
                : 'findings'}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden rounded-full bg-violet-500/10 px-3 py-1.5 text-xs text-violet-300 sm:inline-block">
            Up to {formatNumber(group.maxDifference)} pp
          </span>

          {open ? (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          )}
        </div>
      </button>

      {open && (
        <CardContent className="space-y-6 border-t border-slate-800 p-5">
          {group.outcomes.map(outcomeGroup => (
            <section key={outcomeGroup.outcome}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <HeartPulse className="h-4 w-4 text-violet-400" />

                <h4 className="text-sm font-semibold text-slate-200">
                  {labelFor(outcomeGroup.outcome)}
                </h4>

                <span className="text-xs text-slate-500">
                  — next-day association
                </span>
              </div>

              <div
                className={`grid gap-3 ${
                  outcomeGroup.findings.length > 1
                    ? 'md:grid-cols-2'
                    : 'grid-cols-1'
                }`}
              >
                {outcomeGroup.findings.map(pattern => (
                  <EvidenceCard
                    key={`${pattern.signal}-${pattern.outcome}-${pattern.direction}`}
                    pattern={pattern}
                  />
                ))}
              </div>
            </section>
          ))}
        </CardContent>
      )}
    </Card>
  );
}

export default function Profile() {
  const { selectedUserId } = useUser();

  const [baseline, setBaseline] =
    useState<BaselineResponse | null>(null);

  const [patterns, setPatterns] =
    useState<PatternsResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [outcomeFilter, setOutcomeFilter] =
    useState('all');

  const [showAllGroups, setShowAllGroups] =
    useState(false);

  useEffect(() => {
    let active = true;

    async function fetchData() {
      setLoading(true);
      setError(null);
      setBaseline(null);
      setPatterns(null);

      if (!selectedUserId) {
        setLoading(false);
        return;
      }

      try {
        const [baselineResponse, patternsResponse] =
          await Promise.all([
            api.getBaseline(selectedUserId),
            api.getPatterns(selectedUserId),
          ]);

        if (!active) return;

        // The Profile requires the upgraded API contracts.
        if (
          !baselineResponse?.signals ||
          !Array.isArray(patternsResponse?.patterns)
        ) {
          throw new Error(
            'The backend returned the legacy API format. ' +
            'Check that the 2.0 routers are registered first.'
          );
        }

        setBaseline(baselineResponse);
        setPatterns(patternsResponse);
      } catch (err) {
        if (!active) return;

        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : 'Could not load your health profile.'
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchData();

    return () => {
      active = false;
    };
  }, [selectedUserId]);

  const signalGroups = useMemo(() => {
    const allPatterns = patterns?.patterns || [];

    const filtered =
      outcomeFilter === 'all'
        ? allPatterns
        : allPatterns.filter(
            pattern => pattern.outcome === outcomeFilter
          );

    return groupPatterns(filtered);
  }, [patterns, outcomeFilter]);

  const visibleGroups = showAllGroups
    ? signalGroups
    : signalGroups.slice(0, 4);

  const availableSignals = METRICS.filter(
    metric => baseline?.signals?.[metric.key] != null
  ).length;

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-28 animate-pulse rounded-xl bg-slate-800/50" />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div
              key={index}
              className="h-44 animate-pulse rounded-xl bg-slate-800/50"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!baseline || !patterns) {
    return (
      <Card className="border-slate-800 bg-slate-900">
        <CardContent className="flex items-center gap-3 p-6">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />

          <p className="text-sm text-slate-300">
            {error || 'Select a user to view their profile.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-9 pb-12">

      {/* PROFILE HEADER */}

      <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/30 p-6 md:p-8">
        <div className="flex flex-wrap items-center gap-5">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/30 bg-violet-500/10">
            <Shield className="h-8 w-8 text-violet-400" />
          </div>

          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-100">
                {selectedUserId}
              </h1>

              <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
                Health Profile 2.0
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-400">
              Personal baselines, recent trends and
              discovered health associations.
            </p>

            <div className="mt-5 flex flex-wrap gap-5 text-xs text-slate-500">
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {patterns.days_available} days of history
              </span>

              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                {availableSignals} signals
              </span>

              <span className="flex items-center gap-2">
                <BrainCircuit className="h-4 w-4" />
                {patterns.patterns.length} findings
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs text-slate-500">
              Latest record
            </p>

            <p className="mt-1 text-sm font-medium text-slate-200">
              {formatDate(baseline.date)}
            </p>
          </div>
        </div>
      </section>

      {/* PERSONAL BASELINE */}

      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <HeartPulse className="h-5 w-5 text-violet-400" />

          <div>
            <h2 className="text-xl font-semibold text-slate-100">
              Your Personal Baseline
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Current measurements compared with your
              recent {baseline.baseline_window_days}-day baseline.
            </p>
          </div>
        </div>

        {GROUPS.map(group => (
          <div key={group.title} className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-300">
                {group.title}
              </h3>

              <p className="mt-1 text-xs text-slate-500">
                {group.description}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {group.metrics.map(metric => (
                <MetricCard
                  key={metric.key}
                  metric={metric}
                  signal={baseline.signals[metric.key]}
                />
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* DISCOVERED PATTERNS */}

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <BrainCircuit className="h-5 w-5 text-violet-400" />

              <h2 className="text-xl font-semibold text-slate-100">
                What LifePrint Has Learned
              </h2>
            </div>

            <p className="mt-2 text-sm text-slate-500">
              Findings grouped by health signal and
              next-day outcome. Expand a signal to
              explore its evidence.
            </p>
          </div>

          <select
            aria-label="Filter patterns by outcome"
            value={outcomeFilter}
            onChange={event => {
              setOutcomeFilter(event.target.value);
              setShowAllGroups(false);
            }}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-200 outline-none focus:border-violet-500"
          >
            <option value="all">All outcomes</option>

            {Object.entries(OUTCOMES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* COMPACT SUMMARY */}

        <div className="grid grid-cols-2 gap-4">
          <Card className="border-slate-800 bg-slate-900/80">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Health Signals With Findings
              </p>

              <p className="mt-3 text-3xl font-semibold text-violet-300">
                {signalGroups.length}
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                Findings in This View
              </p>

              <p className="mt-3 text-3xl font-semibold text-slate-100">
                {signalGroups.reduce(
                  (sum, group) => sum + group.findingCount,
                  0
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {signalGroups.length === 0 ? (
          <Card className="border-slate-800 bg-slate-900/80">
            <CardContent className="py-12 text-center">
              <BrainCircuit className="mx-auto mb-4 h-8 w-8 text-slate-600" />

              <p className="text-sm text-slate-300">
                No findings for this outcome.
              </p>

              <p className="mt-2 text-xs text-slate-500">
                Try another outcome filter.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-3">
              {visibleGroups.map((group, index) => (
                <SignalPatternGroup
                  key={`${selectedUserId}-${outcomeFilter}-${group.signal}`}
                  group={group}
                  defaultOpen={index === 0}
                />
              ))}
            </div>

            {signalGroups.length > 4 && (
              <button
                type="button"
                onClick={() => setShowAllGroups(!showAllGroups)}
                className="mx-auto flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-5 py-3 text-sm font-medium text-slate-300 transition hover:border-violet-500/50 hover:text-violet-300"
              >
                {showAllGroups
                  ? 'Show fewer signals'
                  : `View all ${signalGroups.length} signals`}

                {showAllGroups ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            )}
          </>
        )}
      </section>

      {/* DISCLAIMER */}

      <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />

        <p className="text-xs leading-relaxed text-slate-500">
          LifePrint currently uses expanded synthetic
          health data. These findings are exploratory
          associations from multiple comparisons, not
          clinical predictions or evidence of causation.
          Percentage-point differences describe observed
          event frequencies, not changes in individual
          medical risk.
        </p>
      </div>
    </div>
  );
}