
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { useUser } from '../context/UserContext';
import { Card, CardContent } from '../components/ui/Card';

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceDot,
} from 'recharts';

import {
  Activity,
  AlertCircle,
  CalendarDays,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  HeartPulse,
} from 'lucide-react';

type TimelineDay = {
  date: string;
  [key: string]: string | number | null | undefined;
};

type BaselineSignal = {
  current: number | null;
  baseline: number | null;
  deviation_percent: number | null;
  trend: string;
  trend_change: number | null;
  volatility: number | null;
  history_days: number;
};

type TimelineData = {
  timeline: TimelineDay[];
  signals: Record<string, BaselineSignal>;
};

type Metric = {
  key: string;
  label: string;
  unit: string;
  decimals: number;
  category: string;
};

const METRICS: Metric[] = [
  {
    key: 'sleep_hours',
    label: 'Sleep',
    unit: 'hours',
    decimals: 1,
    category: 'Lifestyle',
  },
  {
    key: 'hydration_liters',
    label: 'Hydration',
    unit: 'L',
    decimals: 1,
    category: 'Lifestyle',
  },
  {
    key: 'stress',
    label: 'Stress',
    unit: '/10',
    decimals: 1,
    category: 'Lifestyle',
  },
  {
    key: 'activity_steps',
    label: 'Activity',
    unit: 'steps',
    decimals: 0,
    category: 'Lifestyle',
  },
  {
    key: 'caffeine',
    label: 'Caffeine',
    unit: 'servings',
    decimals: 1,
    category: 'Lifestyle',
  },
  {
    key: 'heart_rate',
    label: 'Heart Rate',
    unit: 'bpm',
    decimals: 0,
    category: 'Vital Signs',
  },
  {
    key: 'resting_hr',
    label: 'Resting Heart Rate',
    unit: 'bpm',
    decimals: 0,
    category: 'Vital Signs',
  },
  {
    key: 'systolic_bp',
    label: 'Systolic BP',
    unit: 'mmHg',
    decimals: 0,
    category: 'Vital Signs',
  },
  {
    key: 'diastolic_bp',
    label: 'Diastolic BP',
    unit: 'mmHg',
    decimals: 0,
    category: 'Vital Signs',
  },
  {
    key: 'temperature_c',
    label: 'Temperature',
    unit: '°C',
    decimals: 1,
    category: 'Vital Signs',
  },
  {
    key: 'weight_kg',
    label: 'Weight',
    unit: 'kg',
    decimals: 1,
    category: 'Body & Recovery',
  },
  {
    key: 'calories',
    label: 'Calories',
    unit: 'kcal',
    decimals: 0,
    category: 'Body & Recovery',
  },
  {
    key: 'sleep_quality',
    label: 'Sleep Quality',
    unit: '',
    decimals: 1,
    category: 'Body & Recovery',
  },
  {
    key: 'recovery',
    label: 'Recovery',
    unit: '',
    decimals: 1,
    category: 'Body & Recovery',
  },
];

const OUTCOMES = [
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

function numeric(
  value: unknown
): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null;
  }

  const result = Number(value);

  return Number.isFinite(result)
    ? result
    : null;
}

function dateKey(date: string): number {
  const [year, month, day] = date
    .slice(0, 10)
    .split('-')
    .map(Number);

  return Date.UTC(year, month - 1, day);
}

function shortDate(date: string): string {
  const [year, month, day] = date
    .slice(0, 10)
    .split('-')
    .map(Number);

  return new Date(
    year,
    month - 1,
    day
  ).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatNumber(
  value: number | null | undefined,
  metric: Metric
): string {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(value)
  ) {
    return '—';
  }

  const formatted = value.toLocaleString(
    'en-US',
    {
      minimumFractionDigits:
        metric.decimals,
      maximumFractionDigits:
        metric.decimals,
    }
  );

  return metric.unit
    ? `${formatted} ${metric.unit}`
    : formatted;
}

function TrendIcon({
  trend,
}: {
  trend?: string;
}) {
  const normalized = (
    trend || ''
  ).toLowerCase();

  if (
    normalized.includes('increas') ||
    normalized.includes('up') ||
    normalized.includes('rising')
  ) {
    return (
      <TrendingUp className="h-4 w-4 text-blue-400" />
    );
  }

  if (
    normalized.includes('decreas') ||
    normalized.includes('down') ||
    normalized.includes('falling')
  ) {
    return (
      <TrendingDown className="h-4 w-4 text-violet-400" />
    );
  }

  return (
    <Minus className="h-4 w-4 text-slate-400" />
  );
}

export default function Timeline() {
  const { selectedUserId } = useUser();

  const [data, setData] =
    useState<TimelineData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [metric, setMetric] =
    useState('sleep_hours');

  const [range, setRange] =
    useState('30');

  const [selectedOutcome, setSelectedOutcome] =
    useState('none');

  const [showBaseline, setShowBaseline] =
    useState(true);

  const [showArea, setShowArea] =
    useState(true);

  // ----------------------------------------
  // FETCH DATA
  // ----------------------------------------

  useEffect(() => {
    let active = true;

    async function fetchData() {
      setLoading(true);
      setError(null);
      setData(null);

      if (!selectedUserId) {
        setLoading(false);
        return;
      }

      try {
        const [
          timelineResponse,
          baselineResponse,
        ] = await Promise.all([
          api.getTimeline(selectedUserId),
          api.getBaseline(selectedUserId),
        ]);

        if (!active) return;

        const timeline: TimelineDay[] = [
          ...(timelineResponse.timeline || []),
        ].sort(
          (a, b) =>
            dateKey(a.date) -
            dateKey(b.date)
        );

        setData({
          timeline,
          signals:
            baselineResponse.signals || {},
        });
      } catch (err) {
        if (!active) return;

        console.error(err);

        setError(
          'Could not load the timeline or personal baseline.'
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      active = false;
    };
  }, [selectedUserId]);

  // ----------------------------------------
  // SELECTED METRIC
  // ----------------------------------------

  const selectedMetric =
    METRICS.find(
      (item) => item.key === metric
    ) || METRICS[0];

  const baselineInfo =
    data?.signals[metric];

  const baselineValue = numeric(
    baselineInfo?.baseline
  );

  // ----------------------------------------
  // FILTER TIMELINE
  // ----------------------------------------

  const chartData = useMemo(() => {
    if (
      !data ||
      data.timeline.length === 0
    ) {
      return [];
    }

    const timeline = data.timeline;

    const latestDate = dateKey(
      timeline[timeline.length - 1].date
    );

    const earliestDate =
      range === 'all'
        ? -Infinity
        : latestDate -
          (Number(range) - 1) *
            24 *
            60 *
            60 *
            1000;

    return timeline
      .filter(
        (day) =>
          dateKey(day.date) >=
          earliestDate
      )
      .map((day) => ({
        ...day,
        dateFormatted: shortDate(
          day.date
        ),
        metricValue: numeric(
          day[metric]
        ),
        event:
          selectedOutcome !== 'none' &&
          numeric(
            day[selectedOutcome]
          ) === 1,
      }));
  }, [
    data,
    metric,
    range,
    selectedOutcome,
  ]);

  // ----------------------------------------
  // STATISTICS
  // ----------------------------------------

  const stats = useMemo(() => {
    const values = chartData
      .map((day) =>
        numeric(day.metricValue)
      )
      .filter(
        (value): value is number =>
          value !== null
      );

    if (!values.length) {
      return {
        average: null,
        minimum: null,
        maximum: null,
        latest: null,
      };
    }

    return {
      average:
        values.reduce(
          (sum, value) =>
            sum + value,
          0
        ) / values.length,
      minimum: Math.min(...values),
      maximum: Math.max(...values),
      latest:
        values[values.length - 1],
    };
  }, [chartData]);

  const eventDays = chartData.filter(
    (day) => day.event
  );

  // ----------------------------------------
  // LOADING / ERROR
  // ----------------------------------------

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-16 w-80 animate-pulse rounded-xl bg-slate-800/50" />

        <div className="h-[520px] animate-pulse rounded-xl bg-slate-800/50" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="border-slate-800 bg-slate-900">
        <CardContent className="flex items-center gap-3 p-6">
          <AlertCircle className="h-5 w-5 text-amber-400" />

          <p className="text-sm text-slate-300">
            {error ||
              'Select a user to view their health timeline.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // ----------------------------------------
  // PAGE
  // ----------------------------------------

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-12">

      {/* HEADER */}

      <div>
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-violet-400" />

          <h1 className="text-2xl font-semibold text-slate-100">
            Health Timeline
          </h1>

          <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
            2.0
          </span>
        </div>

        <p className="mt-2 text-sm text-slate-400">
          Explore 14 health signals, personal
          baselines and recorded health events
          over time.
        </p>
      </div>

      {/* FILTERS */}

      <Card className="border-slate-800 bg-slate-900/80">
        <CardContent className="space-y-5 p-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

            <div>
              <label className="mb-2 block text-xs font-medium text-slate-500">
                Health Signal
              </label>

              <select
                value={metric}
                onChange={(event) =>
                  setMetric(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200 outline-none focus:border-violet-500"
              >
                {[
                  'Lifestyle',
                  'Vital Signs',
                  'Body & Recovery',
                ].map((category) => (
                  <optgroup
                    key={category}
                    label={category}
                  >
                    {METRICS.filter(
                      (item) =>
                        item.category ===
                        category
                    ).map((item) => (
                      <option
                        key={item.key}
                        value={item.key}
                      >
                        {item.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-slate-500">
                Date Range
              </label>

              <select
                value={range}
                onChange={(event) =>
                  setRange(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200 outline-none focus:border-violet-500"
              >
                <option value="7">
                  Last 7 days
                </option>

                <option value="30">
                  Last 30 days
                </option>

                <option value="90">
                  Last 90 days
                </option>

                <option value="all">
                  All history
                </option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-slate-500">
                Highlight Recorded Events
              </label>

              <select
                value={selectedOutcome}
                onChange={(event) =>
                  setSelectedOutcome(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-200 outline-none focus:border-violet-500"
              >
                <option value="none">
                  No event markers
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
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 border-t border-slate-800 pt-4">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
              <input
                type="checkbox"
                checked={showBaseline}
                onChange={(event) =>
                  setShowBaseline(
                    event.target.checked
                  )
                }
                className="accent-violet-500"
              />

              Show personal baseline
            </label>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
              <input
                type="checkbox"
                checked={showArea}
                onChange={(event) =>
                  setShowArea(
                    event.target.checked
                  )
                }
                className="accent-violet-500"
              />

              Show area shading
            </label>
          </div>
        </CardContent>
      </Card>

      {/* STAT CARDS */}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            label: 'Latest in Range',
            value: stats.latest,
          },
          {
            label: 'Range Average',
            value: stats.average,
          },
          {
            label: 'Range Minimum',
            value: stats.minimum,
          },
          {
            label: 'Range Maximum',
            value: stats.maximum,
          },
        ].map((item) => (
          <Card
            key={item.label}
            className="border-slate-800 bg-slate-900/80"
          >
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-wider text-slate-500">
                {item.label}
              </p>

              <p className="mt-3 text-xl font-semibold text-slate-100">
                {formatNumber(
                  item.value,
                  selectedMetric
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* MAIN CHART */}

      <Card className="border-slate-800 bg-slate-900/80">
        <CardContent className="p-6">
          <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-100">
                {selectedMetric.label}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {chartData.length} recorded days
                in selected range
              </p>
            </div>

            {selectedOutcome !== 'none' && (
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-300">
                {eventDays.length} highlighted{' '}
                {eventDays.length === 1
                  ? 'day'
                  : 'days'}
              </span>
            )}
          </div>

          {/* LEGEND */}

          <div className="mb-7 flex flex-wrap items-center gap-5 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-5 rounded-full bg-blue-400" />

              Recorded value
            </div>

            {showBaseline &&
              baselineValue !== null && (
                <div className="flex items-center gap-2">
                  <div className="w-5 border-t-2 border-dashed border-violet-400" />

                  Latest 30-day baseline (
                  {formatNumber(
                    baselineValue,
                    selectedMetric
                  )}
                  )
                </div>
              )}

            {selectedOutcome !== 'none' && (
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />

                Recorded event
              </div>
            )}
          </div>

          {chartData.length === 0 ? (
            <div className="flex h-[400px] items-center justify-center text-sm text-slate-500">
              No measurements available
              for this range.
            </div>
          ) : (
            <div className="h-[430px] w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <ComposedChart
                  data={chartData}
                  margin={{
                    top: 20,
                    right: 25,
                    left: 5,
                    bottom: 10,
                  }}
                >
                  <defs>
                    <linearGradient
                      id="timelineAreaV2"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#818cf8"
                        stopOpacity={0.25}
                      />

                      <stop
                        offset="100%"
                        stopColor="#818cf8"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    stroke="#334155"
                    strokeOpacity={0.35}
                    vertical={false}
                  />

                  <XAxis
                    dataKey="date"
                    tickFormatter={shortDate}
                    stroke="#64748b"
                    fontSize={12}
                    tickMargin={12}
                    minTickGap={35}
                  />

                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    width={65}
                    domain={['auto', 'auto']}
                    tickFormatter={(value) =>
                      selectedMetric.key ===
                      'activity_steps'
                        ? `${(
                            value / 1000
                          ).toFixed(0)}k`
                        : Number(
                            value
                          ).toFixed(
                            selectedMetric.decimals
                          )
                    }
                  />

                  <Tooltip
                    labelFormatter={(label) =>
                      shortDate(
                        String(label)
                      )
                    }
                    formatter={(value) => [
                      formatNumber(
                        numeric(value),
                        selectedMetric
                      ),
                      selectedMetric.label,
                    ]}
                    contentStyle={{
                      backgroundColor:
                        '#0f172a',
                      border:
                        '1px solid #334155',
                      borderRadius: '12px',
                      color: '#e2e8f0',
                    }}
                    labelStyle={{
                      color: '#94a3b8',
                    }}
                  />

                  {showBaseline &&
                    baselineValue !== null && (
                      <ReferenceLine
                        y={baselineValue}
                        stroke="#a78bfa"
                        strokeWidth={1.5}
                        strokeDasharray="5 5"
                      />
                    )}

                  {showArea && (
                    <Area
                      type="monotone"
                      dataKey="metricValue"
                      stroke="none"
                      fill="url(#timelineAreaV2)"
                      fillOpacity={1}
                      tooltipType="none"
                      legendType="none"
                      connectNulls={false}
                      isAnimationActive
                    />
                  )}

                  <Line
                    type="monotone"
                    dataKey="metricValue"
                    stroke="#818cf8"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{
                      r: 6,
                      fill: '#818cf8',
                      stroke: '#c7d2fe',
                      strokeWidth: 2,
                    }}
                    connectNulls={false}
                    isAnimationActive
                    animationDuration={800}
                  />

                  {selectedOutcome !==
                    'none' &&
                    eventDays.map((day) => {
                      const value = numeric(
                        day.metricValue
                      );

                      if (value === null) {
                        return null;
                      }

                      return (
                        <ReferenceDot
                          key={`${day.date}-${selectedOutcome}`}
                          x={day.date}
                          y={value}
                          r={5}
                          fill="#fbbf24"
                          stroke="#78350f"
                          strokeWidth={1.5}
                          ifOverflow="visible"
                        />
                      );
                    })}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          <p className="mt-5 text-xs leading-relaxed text-slate-500">
            The dashed line represents the
            latest available personal baseline,
            not a historical rolling baseline.
            Event markers show recorded outcome
            flags on the corresponding dates.
          </p>
        </CardContent>
      </Card>

      {/* BASELINE INTELLIGENCE */}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="border-slate-800 bg-slate-900/80">
          <CardContent className="p-6">
            <div className="mb-5 flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-violet-400" />

              <h3 className="text-base font-semibold text-slate-100">
                Personal Baseline
              </h3>
            </div>

            <p className="text-xs uppercase tracking-wider text-slate-500">
              Latest Baseline
            </p>

            <p className="mt-2 text-3xl font-semibold text-slate-100">
              {formatNumber(
                baselineValue,
                selectedMetric
              )}
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs text-slate-500">
                  Current Deviation
                </p>

                <p className="mt-2 text-lg font-semibold text-violet-300">
                  {baselineInfo
                    ?.deviation_percent !=
                  null
                    ? `${
                        baselineInfo
                          .deviation_percent >
                        0
                          ? '+'
                          : ''
                      }${baselineInfo.deviation_percent.toFixed(1)}%`
                    : '—'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <p className="text-xs text-slate-500">
                  Volatility
                </p>

                <p className="mt-2 text-lg font-semibold text-slate-200">
                  {baselineInfo
                    ?.volatility != null
                    ? baselineInfo.volatility.toFixed(
                        2
                      )
                    : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/80">
          <CardContent className="p-6">
            <div className="mb-5 flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-blue-400" />

              <h3 className="text-base font-semibold text-slate-100">
                Baseline Trend
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-slate-800 p-3">
                <TrendIcon
                  trend={
                    baselineInfo?.trend
                  }
                />
              </div>

              <div>
                <p className="text-lg font-semibold capitalize text-slate-200">
                  {baselineInfo?.trend ||
                    'Unavailable'}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Based on your recent
                  recorded history
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs text-slate-500">
                History Used for Baseline
              </p>

              <p className="mt-2 text-lg font-semibold text-slate-200">
                {baselineInfo
                  ?.history_days ?? '—'}{' '}
                days
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* DISCLAIMER */}

      <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />

        <p className="text-xs leading-relaxed text-slate-500">
          LifePrint currently uses expanded
          synthetic health data. Timeline
          patterns and recorded outcome
          markers are exploratory and do
          not establish medical diagnoses
          or causal relationships.
        </p>
      </div>
    </div>
  );
}