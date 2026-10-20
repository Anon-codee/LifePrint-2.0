
import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDashboardData } from '../hooks/useDashboardData';
import { useUser } from '../context/UserContext';
import { Card, CardContent } from '../components/ui/Card';

import {
  Moon,
  Droplets,
  Activity,
  Coffee,
  BrainCircuit,
  ArrowDown,
  ArrowUp,
  AlertCircle,
  Flame,
  HeartPulse,
  Gauge,
  Thermometer,
  Scale,
  Zap,
  TrendingUp,
  Info,
} from 'lucide-react';

import {
  LineChart,
  Line,
  Tooltip,
  ResponsiveContainer,
  XAxis,
} from 'recharts';

import { cn } from '../lib/utils';

// --------------------------------------------------
// Configuration
// --------------------------------------------------

const METRICS_CONFIG = {
  sleep_hours: {
    label: 'Sleep',
    unit: 'h',
    icon: Moon,
    inverse: false,
  },
  hydration_liters: {
    label: 'Hydration',
    unit: 'L',
    icon: Droplets,
    inverse: false,
  },
  stress: {
    label: 'Stress',
    unit: '/10',
    icon: BrainCircuit,
    inverse: true,
  },
  activity_steps: {
    label: 'Activity',
    unit: 'steps',
    icon: Activity,
    inverse: false,
  },
  caffeine: {
    label: 'Caffeine',
    unit: 'servings',
    icon: Coffee,
    inverse: true,
  },
  heart_rate: {
    label: 'Heart Rate',
    unit: 'bpm',
    icon: HeartPulse,
    inverse: null,
  },
  resting_hr: {
    label: 'Resting HR',
    unit: 'bpm',
    icon: HeartPulse,
    inverse: null,
  },
  systolic_bp: {
    label: 'Systolic BP',
    unit: 'mmHg',
    icon: Gauge,
    inverse: null,
  },
  diastolic_bp: {
    label: 'Diastolic BP',
    unit: 'mmHg',
    icon: Gauge,
    inverse: null,
  },
  weight_kg: {
    label: 'Weight',
    unit: 'kg',
    icon: Scale,
    inverse: null,
  },
  temperature_c: {
    label: 'Temperature',
    unit: '°C',
    icon: Thermometer,
    inverse: null,
  },
  calories: {
    label: 'Calories',
    unit: 'kcal',
    icon: Flame,
    inverse: null,
  },
  sleep_quality: {
    label: 'Sleep Quality',
    unit: '/10',
    icon: Moon,
    inverse: false,
  },
  recovery: {
    label: 'Recovery',
    unit: '/100',
    icon: Zap,
    inverse: false,
  },
} as const;

type MetricKey = keyof typeof METRICS_CONFIG;

type BaselineMetric = {
  current: number;
  baseline: number;
  deviation_percent: number | null;
  trend: string;
  trend_change: number;
  volatility: number;
  history_days: number;
};

const PRIMARY_METRICS: MetricKey[] = [
  'sleep_hours',
  'hydration_liters',
  'stress',
  'activity_steps',
  'caffeine',
];

const ADDITIONAL_METRICS: MetricKey[] = [
  'heart_rate',
  'resting_hr',
  'systolic_bp',
  'diastolic_bp',
  'weight_kg',
  'temperature_c',
  'calories',
  'sleep_quality',
  'recovery',
];

const OUTCOMES = [
  { key: 'headache', label: 'Headache' },
  { key: 'bp_elevation', label: 'BP Elevation' },
  { key: 'fatigue', label: 'Fatigue' },
  { key: 'dehydration_risk', label: 'Dehydration Risk' },
  { key: 'poor_sleep', label: 'Poor Sleep' },
  { key: 'stress_overload', label: 'Stress Overload' },
  {
    key: 'recovery_deterioration',
    label: 'Recovery Deterioration',
  },
];

function formatMetric(value: number, key: string) {
  if (!Number.isFinite(value)) return '—';

  if (key === 'activity_steps' || key === 'calories') {
    return Math.round(value).toLocaleString();
  }

  return value.toFixed(1);
}

function formatLabel(value: string) {
  return value.replace(/_/g, ' ');
}

// --------------------------------------------------
// Metric Card
// --------------------------------------------------

function MetricCard({
  metricKey,
  metric,
}: {
  metricKey: MetricKey;
  metric: BaselineMetric;
}) {
  const config = METRICS_CONFIG[metricKey];
  const Icon = config.icon;

  const deviation = metric.deviation_percent ?? 0;
  const isNegative = deviation < 0;
  const isNeutral = Math.abs(deviation) < 5;

  // Some metrics, such as BP and weight, cannot
  // be classified as good/bad using direction alone.
  const isBad =
    config.inverse === null
      ? false
      : config.inverse
        ? deviation > 0
        : deviation < 0;

  const deviationColor = isNeutral
    ? 'text-slate-400 bg-slate-800'
    : config.inverse === null
      ? 'text-blue-400 bg-blue-400/10'
      : isBad
        ? 'text-amber-400 bg-amber-400/10'
        : 'text-emerald-400 bg-emerald-400/10';

  return (
    <Card className="group relative overflow-hidden transition-all hover:border-slate-700 hover:bg-slate-800/50">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="p-2 bg-slate-800 rounded-lg group-hover:bg-slate-700 transition-colors">
            <Icon className="w-5 h-5 text-slate-300" />
          </div>

          <div
            className={cn(
              'text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1',
              deviationColor
            )}
          >
            {isNegative ? (
              <ArrowDown className="w-3 h-3" />
            ) : (
              <ArrowUp className="w-3 h-3" />
            )}

            {Math.abs(deviation).toFixed(1)}%
          </div>
        </div>

        <h4 className="text-slate-400 text-sm font-medium mb-1">
          {config.label}
        </h4>

        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-semibold text-slate-100">
            {formatMetric(metric.current, metricKey)}
          </span>

          <span className="text-slate-500 text-sm">
            {config.unit}
          </span>
        </div>

        <div className="mt-4 text-xs text-slate-500 flex justify-between border-t border-slate-800/50 pt-3">
          <span>Personal baseline</span>

          <span className="text-slate-400 font-medium">
            {formatMetric(metric.baseline, metricKey)}{' '}
            {config.unit}
          </span>
        </div>

        <div className="mt-2 text-xs text-slate-500 flex justify-between">
          <span>Trend</span>

          <span className="text-slate-400 capitalize">
            {metric.trend}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// --------------------------------------------------
// Prediction Card
// --------------------------------------------------

function PredictionCard({
  label,
  value,
}: {
  label: string;
  value: number | undefined;
}) {
  const valid =
    typeof value === 'number' && Number.isFinite(value);

  const percentage = valid
    ? Math.max(0, Math.min(100, value))
    : 0;

  return (
    <Card className="hover:border-slate-700 transition-colors">
      <CardContent className="p-5">
        <p className="text-sm text-slate-400 mb-4">
          {label}
        </p>

        <div className="text-3xl font-semibold text-slate-100">
          {valid ? `${percentage.toFixed(1)}%` : '—'}
        </div>

        <div className="h-2 bg-slate-800 rounded-full mt-5 overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>

        <p className="text-xs text-slate-500 mt-3">
          Experimental model estimate
        </p>
      </CardContent>
    </Card>
  );
}

// --------------------------------------------------
// Main Dashboard
// --------------------------------------------------

export default function Dashboard() {
  const { data, loading, error } = useDashboardData();
  const { twinStatus } = useUser();

  const timeline = data?.timeline ?? [];

  const sortedTimeline = useMemo(() => {
    return [...timeline].sort(
      (a: any, b: any) =>
        new Date(a.date).getTime() -
        new Date(b.date).getTime()
    );
  }, [timeline]);

  // Latest 14 days for trend charts.
  const last14Days = useMemo(() => {
    return sortedTimeline.slice(-14);
  }, [sortedTimeline]);

  const last7Days = useMemo(() => {
    return sortedTimeline.slice(-7);
  }, [sortedTimeline]);

  // Prototype consistency rule.
  const streak = useMemo(() => {
    let count = 0;

    for (const day of [...sortedTimeline].reverse()) {
      if (
        day.sleep_hours >= 6 &&
        day.hydration_liters >= 1.5
      ) {
        count++;
      } else {
        break;
      }
    }

    return count;
  }, [sortedTimeline]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="h-24 bg-slate-800/50 rounded-xl animate-pulse" />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((item) => (
            <Card
              key={item}
              className="h-40 animate-pulse bg-slate-800/50"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="max-w-3xl mx-auto">
        <CardContent className="p-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400" />

          <div>
            <h3 className="text-slate-100 font-medium">
              Dashboard unavailable
            </h3>

            <p className="text-sm text-slate-400 mt-1">
              {error}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.today) {
    return (
      <div className="text-slate-400 p-6">
        No health data available.
      </div>
    );
  }

  const { today } = data;

  const baseline = today.baseline ?? {};
  const predictions = today.predicted_states ?? {};
  const explanations = today.prediction_explanations ?? {};
  const patterns = today.top_patterns ?? [];

  const overallState = today.overall_health_state ?? 'unknown';

  const stateStyles: Record<string, string> = {
    stable: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
    monitor: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    attention: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  };

  const stateStyle =
    stateStyles[overallState] ??
    'text-slate-400 bg-slate-800 border-slate-700';

  // Support either an array of factors or an object
  // containing a "factors" array.
  const headacheExplanation = explanations.headache;

  const headacheFactors = Array.isArray(headacheExplanation)
    ? headacheExplanation
    : headacheExplanation?.factors ?? [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">

      {/* ======================================
          HEADER
      ====================================== */}

      <section>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-slate-100">
              Today's Health
            </h1>

            <p className="text-sm text-slate-400 mt-1">
              {today.date
                ? new Date(
                    `${today.date}T12:00:00`
                  ).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Latest recorded data'}
              {' '}• Personalized health intelligence
            </p>
          </div>

          <div
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-xl border capitalize font-medium text-sm',
              stateStyle
            )}
          >
            <HeartPulse className="w-4 h-4" />
            {overallState}
          </div>
        </div>

        {/* Overall health state */}

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-60" />

          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div>
                <p className="text-sm text-slate-400 mb-2">
                  Overall Health State
                </p>

                <h2 className="text-4xl font-light text-slate-100 capitalize">
                  {overallState}
                </h2>

                <p className="text-sm text-slate-400 mt-3 max-w-xl">
                  Based on deviations from your personal
                  30-day baseline. This is a prototype
                  dashboard indicator, not a clinical assessment.
                </p>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-6 py-5 min-w-44">
                <p className="text-xs text-slate-400 mb-2">
                  Notable deviations
                </p>

                <div className="text-4xl font-semibold text-slate-100">
                  {today.notable_deviation_count ?? 0}
                </div>

                <p className="text-xs text-slate-500 mt-2">
                  From your usual levels
                </p>
              </div>
            </div>

            {(today.notable_deviations ?? []).length > 0 && (
              <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-slate-800">
                {today.notable_deviations.map(
                  (item: any) => (
                    <div
                      key={item.signal}
                      className="bg-amber-400/5 border border-amber-400/10 rounded-lg px-4 py-3"
                    >
                      <p className="text-xs text-slate-400 capitalize">
                        {formatLabel(item.signal)}
                      </p>

                      <p className="text-lg font-medium text-amber-400 mt-1">
                        {item.deviation_percent > 0 ? '+' : ''}
                        {item.deviation_percent.toFixed(1)}%
                      </p>

                      <p className="text-xs text-slate-500 mt-1 capitalize">
                        {item.trend}
                      </p>
                    </div>
                  )
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* ======================================
          CONDITION-SPECIFIC DIGITAL TWIN (LifePrint 3.0)
      ====================================== */}
      {twinStatus && (
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-semibold text-slate-100">
                  {twinStatus.condition?.name || 'Cardiovascular & BP Monitoring'}
                </h2>
              </div>
              <p className="text-sm text-slate-400">
                {twinStatus.condition?.tagline || 'Autonomic Stability & Arterial Load'} • Condition-Specific Digital Twin
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-400/20 bg-blue-400/10 text-blue-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
              Synthetic Research Twin
            </div>
          </div>

          {/* Data Availability & Limitations Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="text-slate-300 font-medium">Data Availability:</span>
                <span>{twinStatus.data_availability?.total_days_recorded} total days recorded</span>
                <span>•</span>
                <span>{twinStatus.data_availability?.historical_training_days} historical days modeled</span>
                <span>•</span>
                <span>{twinStatus.data_availability?.baseline_window_days}-day rolling baseline window</span>
              </div>
              <span className="text-slate-500 text-[11px] italic">
                {twinStatus.data_availability?.limitations_note}
              </span>
            </div>
            {twinStatus.data_availability?.freshness_note && (
              <p className="text-[11px] text-slate-500 border-t border-slate-800/60 pt-2">
                <span className="text-slate-400 font-medium">Data Freshness Reference: </span>
                {twinStatus.data_availability.freshness_note}
              </p>
            )}
          </div>

          {/* Condition Primary Biometrics Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
                Condition Primary Biometrics
              </h3>
              <span className="text-xs text-slate-500">
                Prioritized for {twinStatus.condition?.name}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {twinStatus.primary_signals?.map((sig: any) => {
                const isPos = (sig.deviation_percent ?? 0) > 0;
                const isFlagged = sig.exploratory_flag?.active;
                return (
                  <Card key={sig.signal} className="relative overflow-hidden border-slate-800 bg-slate-900/80">
                    {isFlagged && (
                      <div className="absolute top-0 right-0 left-0 h-0.5 bg-amber-400" />
                    )}
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <span className="text-xs font-medium text-slate-400">
                          {sig.label}
                        </span>
                        <span
                          className={cn(
                            'text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-0.5',
                            (sig.deviation_percent ?? 0) === 0
                              ? 'text-slate-400 bg-slate-800'
                              : isPos
                                ? 'text-amber-400 bg-amber-400/10'
                                : 'text-blue-400 bg-blue-400/10'
                          )}
                        >
                          {isPos ? '+' : ''}
                          {(sig.deviation_percent ?? 0).toFixed(1)}%
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold text-slate-100">
                          {typeof sig.current === 'number'
                            ? sig.signal === 'activity_steps'
                              ? Math.round(sig.current).toLocaleString()
                              : sig.current.toFixed(1)
                            : '—'}
                        </span>
                        <span className="text-xs text-slate-500">{sig.unit}</span>
                      </div>

                      <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">30d Baseline:</span>
                          <span className="text-slate-300 font-medium">
                            {typeof sig.baseline === 'number'
                              ? sig.signal === 'activity_steps'
                                ? Math.round(sig.baseline).toLocaleString()
                                : sig.baseline.toFixed(1)
                              : '—'}{' '}
                            {sig.unit}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Trend:</span>
                          <span className="capitalize text-slate-300">{sig.trend}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1">
                          <span className="text-slate-500">Status:</span>
                          <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                            {sig.baseline_status || 'provisional'}
                          </span>
                        </div>
                      </div>

                      {sig.persistent_deviation?.detected && (
                        <div className="text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20 leading-tight">
                          <span className="font-semibold block mb-0.5">Persistent Shift Detected</span>
                          Sustained {sig.persistent_deviation.direction} over {sig.persistent_deviation.consecutive_days}d ({sig.persistent_deviation.average_deviation_percent > 0 ? '+' : ''}{sig.persistent_deviation.average_deviation_percent}%)
                        </div>
                      )}

                      {isFlagged && !sig.persistent_deviation?.detected && (
                        <div className="text-[10px] text-amber-400/90 bg-amber-400/10 px-2 py-1 rounded border border-amber-400/20">
                          10% baseline deviation (research indicator)
                        </div>
                      )}

                      {sig.user_reference_range?.configured && (
                        <div className="text-[10px] text-slate-400 bg-slate-800/50 px-2 py-1 rounded">
                          Ref: {sig.user_reference_range.range.min}–{sig.user_reference_range.range.max} {sig.unit}
                          <span className="block text-[9px] text-slate-500 italic mt-0.5">
                            Self-selected reference marker
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Condition Model Target & What-If Spotlight */}
          {twinStatus.synthetic_model_estimate && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Synthetic Model Estimate Card */}
              <Card className="md:col-span-2 border-slate-800 bg-slate-900/80">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="p-1 rounded bg-blue-500/10 text-blue-400">
                          <Gauge className="w-4 h-4" />
                        </span>
                        <h4 className="text-base font-semibold text-slate-100">
                          Synthetic {twinStatus.synthetic_model_estimate.target_label} Model Estimate
                        </h4>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Experimental Random Forest probability for current synthetic state
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-3xl font-bold text-slate-100">
                        {twinStatus.synthetic_model_estimate.synthetic_probability_percent !== null
                          ? `${twinStatus.synthetic_model_estimate.synthetic_probability_percent.toFixed(1)}%`
                          : '—'}
                      </div>
                      <span className="text-xs text-slate-400 capitalize">
                        {twinStatus.synthetic_model_estimate.exploratory_frequency_band?.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-5">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, Math.max(0, twinStatus.synthetic_model_estimate.synthetic_probability_percent ?? 0))}%`,
                      }}
                    />
                  </div>

                  {/* Contributing Factors */}
                  {twinStatus.synthetic_model_estimate.contributing_factors?.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-medium text-slate-400 mb-2">
                        Top Model Feature Importances for this Estimate:
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {twinStatus.synthetic_model_estimate.contributing_factors.slice(0, 3).map((f: any) => (
                          <div key={f.feature} className="p-2 rounded bg-slate-800/40 border border-slate-700/50 text-xs">
                            <span className="text-slate-300 capitalize">{f.feature.replace(/_/g, ' ')}</span>
                            <span className="float-right text-slate-400 font-mono">{(f.importance * 100).toFixed(0)}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-slate-500 italic border-t border-slate-800 pt-3">
                    {twinStatus.synthetic_model_estimate.disclaimer}
                  </p>
                </CardContent>
              </Card>

              {/* What-If Action Link Card */}
              <Card className="border-slate-800 bg-gradient-to-br from-slate-900 to-slate-850 flex flex-col justify-between">
                <CardContent className="p-6 flex flex-col h-full justify-between">
                  <div>
                    <div className="p-2 w-fit rounded-lg bg-emerald-500/10 text-emerald-400 mb-3">
                      <Zap className="w-5 h-5" />
                    </div>
                    <h4 className="text-base font-semibold text-slate-100 mb-2">
                      Simulate Condition Levers
                    </h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Test hypothetical modifications to daily routine (stress, activity, sleep, caffeine)
                      and observe simulated changes in BP elevation model output.
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800">
                    <Link
                      to="/what-if"
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm py-2.5 px-4 transition-colors shadow-sm"
                    >
                      Open What-If Simulator
                      <ArrowUp className="w-4 h-4 rotate-45" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Condition-Aware Structured Insights */}
          {twinStatus.condition_insights?.insights?.length > 0 && (
            <Card className="border-slate-800 bg-slate-900/60">
              <CardContent className="p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-4">
                  <div>
                    <h4 className="text-base font-semibold text-slate-100">
                      Condition-Aware Digital Twin Insights
                    </h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Adaptive observations prioritized for {twinStatus.condition?.name}
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-500 italic max-w-sm text-right hidden sm:block">
                    {twinStatus.condition_insights.categorization_guide}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {twinStatus.condition_insights.insights.map((ins: any, idx: number) => {
                    const badgeStyles: Record<string, string> = {
                      deviation: "bg-amber-400/10 text-amber-400 border-amber-400/20",
                      correlation: "bg-blue-400/10 text-blue-400 border-blue-400/20",
                      model_prediction: "bg-indigo-400/10 text-indigo-400 border-indigo-400/20",
                    };
                    const badgeLabels: Record<string, string> = {
                      deviation: "Baseline Deviation",
                      correlation: "Statistical Correlation (Lag-1)",
                      model_prediction: "Synthetic Model Estimate",
                    };

                    return (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-800/80 bg-slate-800/30 p-4 space-y-2.5 transition-colors hover:border-slate-700"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={cn(
                              "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border",
                              badgeStyles[ins.insight_type] || "bg-slate-800 text-slate-400"
                            )}
                          >
                            {badgeLabels[ins.insight_type] || ins.insight_type}
                          </span>
                          <span className="text-[10px] text-slate-500 capitalize">
                            {ins.signal.replace(/_/g, " ")}
                          </span>
                        </div>

                        <h5 className="text-sm font-medium text-slate-100">
                          {ins.title}
                        </h5>

                        <p className="text-xs text-slate-300 leading-relaxed">
                          {ins.summary}
                        </p>

                        <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 space-y-1">
                          <p className="text-slate-400 leading-normal">
                            <span className="text-slate-500">Supporting Evidence: </span>
                            {ins.supporting_detail}
                          </p>
                          <p className="text-[10px] text-slate-500 italic">
                            {ins.condition_relevance}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* ======================================
          PRIMARY HEALTH METRICS
      ====================================== */}

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-medium text-slate-100">
            Your Daily Metrics
          </h2>

          <p className="text-sm text-slate-400 mt-1">
            Current values compared with your personal baseline
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {PRIMARY_METRICS.map((key) => {
            const metric = baseline[key];

            if (!metric) return null;

            return (
              <MetricCard
                key={key}
                metricKey={key}
                metric={metric}
              />
            );
          })}
        </div>
      </section>

      {/* ======================================
          ADDITIONAL HEALTH SIGNALS
      ====================================== */}

      <section>
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-blue-400" />

          <h2 className="text-lg font-medium text-slate-100">
            Personal Baseline 2.0
          </h2>
        </div>

        <p className="text-sm text-slate-400 mb-5">
          Additional signals, trends and deviations
          from your historical averages.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {ADDITIONAL_METRICS.map((key) => {
            const metric = baseline[key];

            if (!metric) return null;

            return (
              <MetricCard
                key={key}
                metricKey={key}
                metric={metric}
              />
            );
          })}
        </div>
      </section>

      {/* ======================================
          SEVEN PREDICTIONS
      ====================================== */}

      <section>
        <div className="flex items-center gap-2 mb-2">
          <BrainCircuit className="w-5 h-5 text-indigo-400" />

          <h2 className="text-lg font-medium text-slate-100">
            Health Intelligence Engine
          </h2>
        </div>

        <p className="text-sm text-slate-400 mb-5">
          Seven experimental estimates based on
          your latest recorded health signals.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {OUTCOMES.map((outcome) => (
            <PredictionCard
              key={outcome.key}
              label={outcome.label}
              value={predictions[outcome.key]}
            />
          ))}
        </div>
      </section>

      {/* ======================================
          EXPLANATIONS AND PATTERNS
      ====================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Model explanation */}

        <Card className="relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500 opacity-50" />

          <CardContent className="p-6 md:p-8">
            <h3 className="text-slate-100 font-medium mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-400" />
              Headache Model Factors
            </h3>

            <p className="text-xs text-slate-500 mb-6">
              Features used by the experimental model
            </p>

            {headacheFactors.length === 0 ? (
              <p className="text-sm text-slate-400">
                No feature importance data available.
              </p>
            ) : (
              <div className="space-y-5">
                {headacheFactors.slice(0, 5).map(
                  (factor: any, index: number) => {
                    const importance =
                      Number(factor.importance) || 0;

                    return (
                      <div key={`${factor.feature}-${index}`}>
                        <div className="flex justify-between gap-3 text-xs mb-2">
                          <span className="text-slate-300 capitalize">
                            {formatLabel(factor.feature)}
                          </span>

                          <span className="text-slate-500">
                            {(importance * 100).toFixed(1)}%
                          </span>
                        </div>

                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500/70 rounded-full"
                            style={{
                              width: `${Math.min(
                                100,
                                importance * 100
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-start gap-2">
              <Info className="w-4 h-4 text-slate-500 shrink-0" />

              <p className="text-xs text-slate-500">
                Feature importance describes the model
                overall. It does not establish which
                factors caused an individual's outcome.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pattern discovery */}

        <Card className="bg-gradient-to-br from-indigo-950/40 to-slate-900 border-indigo-900/30">
          <CardContent className="p-6 md:p-8">
            <h3 className="text-slate-100 font-medium mb-2 flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-indigo-400" />
              What LifePrint Noticed
            </h3>

            <p className="text-xs text-slate-500 mb-6">
              Patterns discovered in your historical data
            </p>

            {patterns.length === 0 ? (
              <p className="text-slate-400 text-sm">
                No patterns met the current discovery criteria.
              </p>
            ) : (
              <div className="space-y-5">
                {patterns.slice(0, 3).map(
                  (pattern: any, index: number) => {
                    const difference =
                      Number(
                        pattern.difference_percentage_points
                      ) || 0;

                    return (
                      <div
                        key={`${pattern.signal}-${pattern.outcome}-${index}`}
                        className="pb-5 border-b border-indigo-900/30 last:border-0 last:pb-0"
                      >
                        <p className="text-sm text-slate-200 leading-relaxed">
                          When your{' '}
                          <span className="text-indigo-400 font-medium capitalize">
                            {formatLabel(pattern.signal)}
                          </span>{' '}
                          was {pattern.direction} your
                          usual level, next-day{' '}
                          <span className="text-slate-100 font-medium capitalize">
                            {formatLabel(pattern.outcome)}
                          </span>{' '}
                          occurred on{' '}
                          <span className="text-indigo-300 font-medium">
                            {pattern.event_rate_exposed}%
                          </span>{' '}
                          of those days.
                        </p>

                        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-slate-500">
                          <span>
                            Other days:{' '}
                            {pattern.event_rate_comparison}%
                          </span>

                          <span>
                            Difference:{' '}
                            {difference > 0 ? '+' : ''}
                            {difference.toFixed(1)} pp
                          </span>

                          <span>
                            {pattern.exposed_days} exposed days
                          </span>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            )}

            <p className="text-xs text-slate-500 mt-6">
              Exploratory associations from synthetic data,
              not proven causal relationships.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ======================================
          CONSISTENCY AND TRENDS
      ====================================== */}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Consistency streak */}

        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <h3 className="text-slate-400 font-medium mb-1">
              Health Consistency
            </h3>

            <p className="text-xs text-slate-500 mb-6">
              Recent sleep and hydration consistency
            </p>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <Flame className="w-6 h-6 text-orange-500" />
              </div>

              <div>
                <div className="text-2xl font-semibold text-slate-100">
                  {streak}{' '}
                  <span className="text-sm font-normal text-slate-400">
                    days
                  </span>
                </div>

                <div className="text-xs text-slate-500">
                  Current streak
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center gap-1">
              {last7Days.map((day: any, index: number) => {
                const isConsistent =
                  day.sleep_hours >= 6 &&
                  day.hydration_liters >= 1.5;

                const dayName = new Date(
                  `${String(day.date).slice(0, 10)}T12:00:00`
                ).toLocaleDateString('en-US', {
                  weekday: 'narrow',
                });

                return (
                  <div
                    key={`${day.date}-${index}`}
                    className="flex flex-col items-center gap-2"
                  >
                    <span className="text-[10px] text-slate-500">
                      {dayName}
                    </span>

                    <div
                      className={cn(
                        'w-6 h-8 rounded-md flex items-center justify-center text-sm transition-colors',
                        isConsistent
                          ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                          : 'bg-slate-800 text-slate-600'
                      )}
                    >
                      {isConsistent ? '🔥' : '·'}
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-500 mt-5">
              Prototype rule: at least 6 hours of sleep
              and 1.5 L of hydration.
            </p>
          </CardContent>
        </Card>

        {/* Trend charts */}

        <Card className="lg:col-span-3">
          <CardContent className="p-6">
            <h3 className="text-slate-400 font-medium mb-1">
              Recent Trends
            </h3>

            <p className="text-xs text-slate-500 mb-6">
              Your last 14 recorded days
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  key: 'sleep_hours',
                  label: 'Sleep',
                  unit: 'h',
                },
                {
                  key: 'stress',
                  label: 'Stress',
                  unit: '/10',
                },
                {
                  key: 'hydration_liters',
                  label: 'Hydration',
                  unit: 'L',
                },
              ].map((metric) => (
                <div key={metric.key}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-slate-400">
                      {metric.label}
                    </span>

                    <span className="text-xs text-slate-500">
                      {metric.unit}
                    </span>
                  </div>

                  <div className="h-36 w-full">
                    <ResponsiveContainer
                      width="100%"
                      height="100%"
                    >
                      <LineChart data={last14Days}>
                        <XAxis
                          dataKey="date"
                          hide
                        />

                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0f172a',
                            border: '1px solid #1e293b',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          labelStyle={{
                            color: '#94a3b8',
                          }}
                          itemStyle={{
                            color: '#f8fafc',
                          }}
                          formatter={(value: any) => [
                            Number(value).toFixed(1),
                            metric.label,
                          ]}
                        />

                        <Line
                          type="monotone"
                          dataKey={metric.key}
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{
                            r: 4,
                            fill: '#60a5fa',
                          }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ======================================
          DISCLAIMER
      ====================================== */}

      <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-slate-800/30 border border-slate-800">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />

        <p className="text-xs text-slate-500 leading-relaxed">
          LifePrint is a synthetic-data research prototype.
          Its predictions, health states and discovered
          associations have not been clinically validated
          and should not be used for medical decisions.
        </p>
      </div>

    </div>
  );
}