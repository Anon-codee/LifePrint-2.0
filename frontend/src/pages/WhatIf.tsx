
import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { useUser } from '../context/UserContext';
import { Card, CardContent } from '../components/ui/Card';

import {
  Activity,
  ArrowRight,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Info,
  AlertCircle,
  Moon,
  Droplets,
  Brain,
  Footprints,
  Coffee,
} from 'lucide-react';

type InputKey =
  | 'sleep_hours'
  | 'hydration_liters'
  | 'stress'
  | 'activity_steps'
  | 'caffeine';

type Inputs = Record<InputKey, number>;

type OutcomeResult = {
  current: number;
  simulated: number;
  difference_percentage_points: number;
};

type SimulationResult = {
  user_id: string;
  date: string;
  current_inputs: Inputs;
  simulated_inputs: Inputs;
  changed_inputs: Record<
    string,
    {
      current: number;
      simulated: number;
      difference: number;
    }
  >;
  outcomes: Record<string, OutcomeResult>;
  disclaimer: string;
};

const INPUTS: {
  key: InputKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  icon: typeof Moon;
}[] = [
  {
    key: 'sleep_hours',
    label: 'Sleep',
    unit: 'hrs',
    min: 3,
    max: 12,
    step: 0.5,
    icon: Moon,
  },
  {
    key: 'hydration_liters',
    label: 'Hydration',
    unit: 'L',
    min: 0.5,
    max: 5,
    step: 0.1,
    icon: Droplets,
  },
  {
    key: 'stress',
    label: 'Stress',
    unit: '/10',
    min: 0,
    max: 10,
    step: 0.5,
    icon: Brain,
  },
  {
    key: 'activity_steps',
    label: 'Activity',
    unit: 'steps',
    min: 0,
    max: 25000,
    step: 500,
    icon: Footprints,
  },
  {
    key: 'caffeine',
    label: 'Caffeine',
    unit: 'units',
    min: 0,
    max: 8,
    step: 1,
    icon: Coffee,
  },
];

const OUTCOMES = [
  { key: 'headache', label: 'Headache' },
  { key: 'bp_elevation', label: 'BP Elevation' },
  { key: 'fatigue', label: 'Fatigue' },
  {
    key: 'dehydration_risk',
    label: 'Dehydration',
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

function formatValue(
  value: number,
  key: InputKey
) {
  if (key === 'activity_steps') {
    return Math.round(value).toLocaleString();
  }

  return value.toFixed(1);
}

function getCurrentInputs(data: any): Inputs {
  const baseline = data.baseline;

  if (!baseline) {
    throw new Error(
      'The Today endpoint did not return baseline readings.'
    );
  }

  const result = {} as Inputs;

  for (const input of INPUTS) {
    const current = baseline[input.key]?.current;

    if (
      typeof current !== 'number' ||
      !Number.isFinite(current)
    ) {
      throw new Error(
        `Missing current value: ${input.key}`
      );
    }

    result[input.key] = current;
  }

  return result;
}

export default function WhatIf() {
  const { selectedUserId } = useUser();

  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [current, setCurrent] =
    useState<Inputs | null>(null);

  const [values, setValues] =
    useState<Inputs | null>(null);

  const [result, setResult] =
    useState<SimulationResult | null>(null);

  const [selectedOutcome, setSelectedOutcome] =
    useState('headache');

  // Prevent an older API response from overwriting
  // a newer slider adjustment.
  const requestId = useRef(0);

  // ---------------------------------------------
  // LOAD CURRENT READINGS
  // ---------------------------------------------

  useEffect(() => {
    let active = true;

    async function load() {
      requestId.current += 1;

      setLoading(true);
      setError(null);
      setCurrent(null);
      setValues(null);
      setResult(null);

      if (!selectedUserId) {
        setLoading(false);
        return;
      }

      try {
        const data = await api.getTodayHealth(
          selectedUserId
        );

        if (!active) return;

        const initial = getCurrentInputs(data);

        setCurrent(initial);
        setValues(initial);
      } catch (err) {
        if (!active) return;

        console.error(err);

        setError(
          'Could not load the current health readings.'
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
      requestId.current += 1;
    };
  }, [selectedUserId]);

  // ---------------------------------------------
  // RUN SIMULATION
  // ---------------------------------------------

  useEffect(() => {
    if (!selectedUserId || !values) return;

    let active = true;
    const id = ++requestId.current;

    setSimulating(true);

    const timeout = window.setTimeout(
      async () => {
        try {
          const response: SimulationResult =
            await api.simulateWhatIfV2(
              selectedUserId,
              {
                ...values,
                activity_steps: Math.round(
                  values.activity_steps
                ),
              }
            );

          if (
            !active ||
            id !== requestId.current
          ) {
            return;
          }

          setResult(response);
          setError(null);
        } catch (err) {
          if (
            !active ||
            id !== requestId.current
          ) {
            return;
          }

          console.error(err);

          setError(
            'The simulation failed. Check that the new backend endpoint is running.'
          );
        } finally {
          if (
            active &&
            id === requestId.current
          ) {
            setSimulating(false);
          }
        }
      },
      450
    );

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [values, selectedUserId]);

  // ---------------------------------------------
  // ACTIONS
  // ---------------------------------------------

  function handleChange(
    key: InputKey,
    value: number
  ) {
    setValues((previous) =>
      previous
        ? { ...previous, [key]: value }
        : previous
    );
  }

  function reset() {
    if (!current) return;

    setValues({ ...current });
  }

  // ---------------------------------------------
  // DERIVED DATA
  // ---------------------------------------------

  const changes =
    current && values
      ? INPUTS.filter(
          (input) =>
            Math.abs(
              values[input.key] -
                current[input.key]
            ) > 0.001
        ).map((input) => ({
          ...input,
          before: current[input.key],
          after: values[input.key],
          difference:
            values[input.key] -
            current[input.key],
        }))
      : [];

  const selected =
    result?.outcomes[selectedOutcome];

  const hasChanges = changes.length > 0;

  // ---------------------------------------------
  // LOADING / ERROR
  // ---------------------------------------------

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-16 w-80 animate-pulse rounded-xl bg-slate-800/50" />
        <div className="h-[600px] animate-pulse rounded-2xl bg-slate-800/50" />
      </div>
    );
  }

  if (!current || !values) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-6">
          <AlertCircle className="h-5 w-5 text-amber-400" />

          <p className="text-sm text-slate-300">
            {error ||
              'Select a user to start the simulator.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  // ---------------------------------------------
  // PAGE
  // ---------------------------------------------

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-12">

      {/* HEADER */}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-violet-400" />

            <h1 className="text-2xl font-semibold text-slate-100">
              What-If Simulator
            </h1>

            <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
              2.0
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-400">
            Explore how hypothetical changes affect
            your model-estimated health outcomes.
          </p>
        </div>

        <button
          type="button"
          onClick={reset}
          disabled={!hasChanges}
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-violet-500/50 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw className="h-4 w-4" />
          Reset to Current
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-7 xl:grid-cols-[1fr_380px]">

        {/* LEFT: RESULTS */}

        <div className="space-y-6">

          {/* SELECTED OUTCOME */}

          <Card className="border-slate-800 bg-slate-900/80">
            <CardContent className="p-6">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Selected outcome
                  </p>

                  <h2 className="mt-1 text-xl font-semibold text-slate-100">
                    {
                      OUTCOMES.find(
                        (item) =>
                          item.key === selectedOutcome
                      )?.label
                    }
                  </h2>
                </div>

                <select
                  value={selectedOutcome}
                  onChange={(event) =>
                    setSelectedOutcome(
                      event.target.value
                    )
                  }
                  className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 outline-none focus:border-violet-500"
                >
                  {OUTCOMES.map((item) => (
                    <option
                      key={item.key}
                      value={item.key}
                    >
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-5">
                  <p className="text-xs uppercase tracking-wider text-slate-500">
                    Current estimate
                  </p>

                  <p className="mt-3 text-4xl font-semibold text-slate-200">
                    {selected
                      ? selected.current.toFixed(1)
                      : '--'}
                    <span className="ml-1 text-xl text-slate-500">
                      %
                    </span>
                  </p>
                </div>

                <div className="rounded-xl border border-violet-500/30 bg-violet-950/20 p-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-wider text-violet-300">
                      Simulated
                    </p>

                    {simulating && (
                      <div className="h-3 w-3 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-400" />
                    )}
                  </div>

                  <p className="mt-3 text-4xl font-semibold text-violet-300">
                    {selected
                      ? selected.simulated.toFixed(1)
                      : '--'}
                    <span className="ml-1 text-xl text-violet-400/70">
                      %
                    </span>
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-400">
                  Difference from current estimate
                </p>

                <span
                  className={`rounded-full px-3 py-1 text-sm font-medium ${
                    !selected ||
                    Math.abs(
                      selected.difference_percentage_points
                    ) < 0.05
                      ? 'bg-slate-800 text-slate-400'
                      : selected.difference_percentage_points < 0
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-amber-500/10 text-amber-400'
                  }`}
                >
                  {selected
                    ? `${
                        selected.difference_percentage_points >
                        0
                          ? '+'
                          : ''
                      }${selected.difference_percentage_points.toFixed(1)} pp`
                    : '--'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* ALL SEVEN OUTCOMES */}

          <Card className="border-slate-800 bg-slate-900/80">
            <CardContent className="p-6">
              <div className="mb-2 flex items-center gap-2">
                <Activity className="h-5 w-5 text-violet-400" />

                <h2 className="text-lg font-semibold text-slate-100">
                  All Health Outcomes
                </h2>
              </div>

              <p className="mb-6 text-sm text-slate-500">
                Compare the current and simulated
                model estimates for all seven outcomes.
              </p>

              <div className="space-y-6">
                {OUTCOMES.map((item) => {
                  const data =
                    result?.outcomes[item.key];

                  const currentValue =
                    data?.current ?? 0;

                  const simulatedValue =
                    data?.simulated ?? 0;

                  const difference =
                    data?.difference_percentage_points ??
                    0;

                  return (
                    <button
                      type="button"
                      key={item.key}
                      onClick={() =>
                        setSelectedOutcome(item.key)
                      }
                      className={`w-full rounded-xl border p-4 text-left transition-all ${
                        selectedOutcome === item.key
                          ? 'border-violet-500/50 bg-violet-500/5'
                          : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                      }`}
                    >
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <span className="text-sm font-medium text-slate-200">
                          {item.label}
                        </span>

                        <span
                          className={`text-xs font-medium ${
                            difference < -0.05
                              ? 'text-emerald-400'
                              : difference > 0.05
                                ? 'text-amber-400'
                                : 'text-slate-500'
                          }`}
                        >
                          {data
                            ? `${
                                difference > 0
                                  ? '+'
                                  : ''
                              }${difference.toFixed(1)} pp`
                            : '--'}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="mb-1 flex justify-between text-xs text-slate-500">
                            <span>Current</span>
                            <span>
                              {data
                                ? `${currentValue.toFixed(1)}%`
                                : '--'}
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-slate-500 transition-all duration-700"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    currentValue
                                  )
                                )}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="mb-1 flex justify-between text-xs text-slate-500">
                            <span>Simulated</span>
                            <span className="text-violet-300">
                              {data
                                ? `${simulatedValue.toFixed(1)}%`
                                : '--'}
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                            <div
                              className="h-full rounded-full bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.5)] transition-all duration-700"
                              style={{
                                width: `${Math.min(
                                  100,
                                  Math.max(
                                    0,
                                    simulatedValue
                                  )
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* CHANGES SUMMARY */}

          <Card className="border-slate-800 bg-slate-900/80">
            <CardContent className="p-6">
              <h2 className="mb-5 text-lg font-semibold text-slate-100">
                What Changed?
              </h2>

              {changes.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Adjust a slider to explore a
                  hypothetical change.
                </p>
              ) : (
                <div className="space-y-4">
                  {changes.map((change) => (
                    <div
                      key={change.key}
                      className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 last:border-0 last:pb-0"
                    >
                      <span className="text-sm text-slate-400">
                        {change.label}
                      </span>

                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-slate-500">
                          {formatValue(
                            change.before,
                            change.key
                          )}
                        </span>

                        <ArrowRight className="h-4 w-4 text-slate-600" />

                        <span className="font-semibold text-violet-300">
                          {formatValue(
                            change.after,
                            change.key
                          )}
                          {' '}
                          {change.unit}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
                <div className="flex items-start gap-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />

                  <div>
                    <p className="mb-1 text-sm font-medium text-slate-300">
                      Analytical Insight
                    </p>

                    <p className="text-sm leading-relaxed text-slate-500">
                      {changes.length === 0
                        ? 'Your simulated inputs currently match your recorded readings.'
                        : `You changed ${
                            changes.length
                          } input${
                            changes.length === 1
                              ? ''
                              : 's'
                          }. The comparison shows how the trained models respond while all other recorded measurements remain unchanged.`}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: SLIDERS */}

        <div>
          <Card className="border-slate-800 bg-slate-900/80 xl:sticky xl:top-6">
            <CardContent className="space-y-8 p-6">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-violet-500/10 p-2">
                  <SlidersHorizontal className="h-5 w-5 text-violet-400" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-slate-100">
                    Adjust Your Routine
                  </h2>

                  <p className="text-xs text-slate-500">
                    Changes update the simulation.
                  </p>
                </div>
              </div>

              {INPUTS.map((input) => {
                const Icon = input.icon;

                const value = values[input.key];

                const original =
                  current[input.key];

                const progress =
                  ((value - input.min) /
                    (input.max - input.min)) *
                  100;

                return (
                  <div
                    key={input.key}
                    className="space-y-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-violet-400" />

                        <label
                          htmlFor={input.key}
                          className="text-sm font-medium text-slate-200"
                        >
                          {input.label}
                        </label>
                      </div>

                      <span className="text-sm font-semibold text-violet-300">
                        {formatValue(
                          value,
                          input.key
                        )}
                        {' '}
                        {input.unit}
                      </span>
                    </div>

                    <input
                      id={input.key}
                      type="range"
                      min={input.min}
                      max={input.max}
                      step={input.step}
                      value={Math.min(
                        input.max,
                        Math.max(
                          input.min,
                          value
                        )
                      )}
                      onChange={(event) =>
                        handleChange(
                          input.key,
                          Number(
                            event.target.value
                          )
                        )
                      }
                      className="w-full cursor-pointer accent-violet-500"
                      style={{
                        background: `linear-gradient(to right, #8b5cf6 ${progress}%, #334155 ${progress}%)`,
                      }}
                    />

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        Current:{' '}
                        {formatValue(
                          original,
                          input.key
                        )}
                        {' '}
                        {input.unit}
                      </span>

                      <span>
                        {input.min}–{input.max}
                      </span>
                    </div>
                  </div>
                );
              })}

              <div className="border-t border-slate-800 pt-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">
                    Modified inputs
                  </span>

                  <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
                    {changes.length} / 5
                  </span>
                </div>

                <button
                  type="button"
                  onClick={reset}
                  disabled={!hasChanges}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset All Sliders
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* DISCLAIMER */}

      <div className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />

        <p className="text-xs leading-relaxed text-slate-500">
          {result?.disclaimer ||
            'This is an experimental synthetic-data simulator. Predictions are not clinically validated, and hypothetical input changes do not establish causal health effects.'}
        </p>
      </div>
    </div>
  );
}