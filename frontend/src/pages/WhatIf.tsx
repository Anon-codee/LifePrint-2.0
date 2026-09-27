
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Check,
  Info,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

import { api } from "../api/client";
import { useUser } from "../context/UserContext";

type InputKey =
  | "sleep_hours"
  | "hydration_liters"
  | "stress"
  | "activity_steps"
  | "caffeine";

type OutcomeKey =
  | "headache"
  | "bp_elevation"
  | "fatigue"
  | "dehydration_risk"
  | "poor_sleep"
  | "stress_overload"
  | "recovery_deterioration";

type Inputs = Record<InputKey, number>;

type OutcomeResult = {
  current: number;
  simulated: number;
  difference_percentage_points: number;
};

type SimulationResponse = {
  user_id: string;
  current_inputs: Inputs;
  simulated_inputs: Inputs;
  changed_inputs: string[] | Record<string, unknown>;
  outcomes: Record<OutcomeKey, OutcomeResult>;
  disclaimer?: string;
};

type TodayResponse = {
  baseline?: Record<
    string,
    {
      current?: number;
      baseline?: number;
    }
  >;
};

const INPUTS: {
  key: InputKey;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}[] = [
  {
    key: "sleep_hours",
    label: "Sleep",
    description: "Hours of sleep",
    min: 0,
    max: 12,
    step: 0.1,
    unit: "h",
  },
  {
    key: "hydration_liters",
    label: "Hydration",
    description: "Daily water intake",
    min: 0,
    max: 6,
    step: 0.1,
    unit: "L",
  },
  {
    key: "stress",
    label: "Stress",
    description: "Self-reported stress level",
    min: 0,
    max: 10,
    step: 0.1,
    unit: "/10",
  },
  {
    key: "activity_steps",
    label: "Activity",
    description: "Daily steps",
    min: 0,
    max: 30000,
    step: 100,
    unit: "steps",
  },
  {
    key: "caffeine",
    label: "Caffeine",
    description: "Daily servings",
    min: 0,
    max: 10,
    step: 1,
    unit: "servings",
  },
];

const OUTCOMES: {
  key: OutcomeKey;
  label: string;
  shortLabel: string;
}[] = [
  {
    key: "headache",
    label: "Headache",
    shortLabel: "Headache",
  },
  {
    key: "bp_elevation",
    label: "BP Elevation",
    shortLabel: "BP Elevation",
  },
  {
    key: "fatigue",
    label: "Fatigue",
    shortLabel: "Fatigue",
  },
  {
    key: "dehydration_risk",
    label: "Dehydration Risk",
    shortLabel: "Dehydration",
  },
  {
    key: "poor_sleep",
    label: "Poor Sleep",
    shortLabel: "Poor Sleep",
  },
  {
    key: "stress_overload",
    label: "Stress Overload",
    shortLabel: "Stress Overload",
  },
  {
    key: "recovery_deterioration",
    label: "Recovery Deterioration",
    shortLabel: "Recovery",
  },
];

const FALLBACK_INPUTS: Inputs = {
  sleep_hours: 7,
  hydration_liters: 2,
  stress: 5,
  activity_steps: 7000,
  caffeine: 2,
};

const COLORS = {
  forest: "#355B46",
  green: "#518469",
  sage: "#DCE9DD",
  terracotta: "#C57960",
  slate: "#859187",
};

function formatInput(key: InputKey, value: number) {
  if (key === "activity_steps") {
    return Math.round(value).toLocaleString();
  }

  if (key === "caffeine") {
    return Math.round(value).toString();
  }

  return value.toFixed(1);
}

function formatDifference(value: number) {
  if (Math.abs(value) < 0.05) {
    return "0.0 pp";
  }

  return `${value > 0 ? "+" : ""}${value.toFixed(1)} pp`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getCurrentInputs(
  response: TodayResponse
): Inputs {
  const result = { ...FALLBACK_INPUTS };

  for (const config of INPUTS) {
    const value = response.baseline?.[config.key]?.current;

    if (typeof value === "number" && Number.isFinite(value)) {
      result[config.key] = clamp(
        value,
        config.min,
        config.max
      );
    }
  }

  return result;
}

function getDifferenceColor(difference: number) {
  if (difference > 0.05) return COLORS.terracotta;
  if (difference < -0.05) return COLORS.green;
  return COLORS.slate;
}

function OutcomeBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  const safeValue = clamp(value, 0, 100);

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs text-[#859187]">
          {label}
        </span>

        <span className="text-sm font-semibold text-[#35483B]">
          {safeValue.toFixed(1)}%
        </span>
      </div>

      <div className="h-2.5 overflow-hidden rounded-full bg-[#EDF2EC]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${safeValue}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

function OutcomeCard({
  label,
  result,
  selected,
  onClick,
}: {
  label: string;
  result: OutcomeResult;
  selected: boolean;
  onClick: () => void;
}) {
  const difference = result.difference_percentage_points;
  const differenceColor = getDifferenceColor(difference);

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full rounded-2xl border p-5 text-left transition-all duration-200",
        selected
          ? "border-[#A6C5AD] bg-[#F4F8F2] shadow-[0_4px_18px_rgba(46,87,57,0.06)]"
          : "border-[#E3EAE2] bg-white hover:border-[#B9CFBD] hover:bg-[#FAFCF9]",
      ].join(" ")}
    >
      <div className="mb-5 flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-[#34473A]">
          {label}
        </h3>

        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{
            color: differenceColor,
            backgroundColor:
              difference > 0.05
                ? "#FBEEE8"
                : difference < -0.05
                  ? "#E8F3EA"
                  : "#EEF2ED",
          }}
        >
          {formatDifference(difference)}
        </span>
      </div>

      <div className="space-y-4">
        <OutcomeBar
          label="Current"
          value={result.current}
          color="#9AA79E"
        />

        <OutcomeBar
          label="Simulated"
          value={result.simulated}
          color={COLORS.forest}
        />
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-[#E5ECE4] pt-3">
        <span className="text-xs text-[#89978B]">
          View comparison
        </span>

        <ArrowRight className="h-4 w-4 text-[#6D9477]" />
      </div>
    </button>
  );
}

export default function WhatIf() {
  const { selectedUserId } = useUser();

  const [initialInputs, setInitialInputs] =
    useState<Inputs | null>(null);

  const [inputs, setInputs] = useState<Inputs | null>(null);

  const [selectedOutcome, setSelectedOutcome] =
    useState<OutcomeKey>("headache");

  const [simulation, setSimulation] =
    useState<SimulationResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestId = useRef(0);

  // Load the user's latest recorded values.
  useEffect(() => {
    let active = true;

    requestId.current += 1;

    setLoading(true);
    setInitialInputs(null);
    setInputs(null);
    setSimulation(null);
    setError(null);

    if (!selectedUserId) {
      setLoading(false);
      return;
    }

    async function load() {
      try {
        const today: TodayResponse =
          await api.getTodayHealth(selectedUserId!);

        if (!active) return;

        const current = getCurrentInputs(today);

        setInitialInputs(current);
        setInputs(current);
      } catch (err) {
        if (!active) return;

        console.error(err);
        setError("Unable to load your current health inputs.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [selectedUserId]);

  // Automatically run the simulation after inputs change.
  useEffect(() => {
    if (!selectedUserId || !inputs) return;

    let active = true;
    const currentRequest = ++requestId.current;

    setSimulating(true);

    const timeout = window.setTimeout(async () => {
      try {
        const response: SimulationResponse =
          await api.simulateWhatIfV2(
            selectedUserId,
            inputs
          );

        if (
          !active ||
          currentRequest !== requestId.current
        ) {
          return;
        }

        setSimulation(response);
        setError(null);
      } catch (err) {
        if (
          !active ||
          currentRequest !== requestId.current
        ) {
          return;
        }

        console.error(err);
        setError("Simulation failed. Please try again.");
      } finally {
        if (
          active &&
          currentRequest === requestId.current
        ) {
          setSimulating(false);
        }
      }
    }, 350);

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  }, [inputs, selectedUserId]);

  const changedInputs = useMemo(() => {
    if (!inputs || !initialInputs) return [];

    return INPUTS.filter(
      (config) =>
        Math.abs(
          inputs[config.key] -
            initialInputs[config.key]
        ) > 0.001
    );
  }, [inputs, initialInputs]);

  const selectedResult =
    simulation?.outcomes?.[selectedOutcome];

  const selectedLabel =
    OUTCOMES.find(
      (outcome) => outcome.key === selectedOutcome
    )?.label ?? "Health outcome";

  function updateInput(key: InputKey, value: number) {
    setInputs((previous) =>
      previous
        ? {
            ...previous,
            [key]: value,
          }
        : previous
    );
  }

  function resetInputs() {
    if (initialInputs) {
      setInputs({ ...initialInputs });
    }
  }

  if (loading || !inputs) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 pb-12">
        <div className="h-16 w-80 animate-pulse rounded-xl bg-[#E8F0E7]" />

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="h-[440px] animate-pulse rounded-2xl bg-[#EDF2EC]" />
          <div className="h-[440px] animate-pulse rounded-2xl bg-[#EDF2EC]" />
        </div>

        {error && (
          <p className="text-sm text-[#B96F5B]">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-7 pb-12 text-[#304439]">
      {/* Page introduction */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF2E9]">
              <Sparkles className="h-5 w-5 text-[#456E53]" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  What-If Simulator
                </h1>

                <span className="rounded-full border border-[#D9E8D8] bg-[#F3F8F1] px-2.5 py-1 text-xs font-medium text-[#50755A]">
                  2.0
                </span>
              </div>

              <p className="mt-1 text-sm text-[#819087]">
                Explore hypothetical changes to your
                daily health inputs.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={resetInputs}
          disabled={changedInputs.length === 0}
          className="inline-flex items-center gap-2 rounded-xl border border-[#DFE8DE] bg-white px-4 py-2.5 text-sm font-medium text-[#476A51] transition-colors hover:bg-[#F2F7F0] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw className="h-4 w-4" />
          Reset changes
        </button>
      </div>

      {/* Main layout */}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_370px]">
        {/* Selected outcome */}
        <section className="rounded-2xl border border-[#E2E9E1] bg-white p-5 shadow-[0_5px_25px_rgba(35,68,45,0.035)] sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#91A096]">
                Selected outcome
              </p>

              <h2 className="mt-2 text-2xl font-semibold text-[#304439]">
                {selectedLabel}
              </h2>
            </div>

            <select
              aria-label="Select outcome"
              value={selectedOutcome}
              onChange={(event) =>
                setSelectedOutcome(
                  event.target.value as OutcomeKey
                )
              }
              className="min-w-[190px] rounded-xl border border-[#DCE7DC] bg-[#FAFCF9] px-4 py-3 text-sm font-medium text-[#3B5943] outline-none focus:border-[#8EAF96]"
            >
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

          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#E3EAE2] bg-[#F8FAF7] p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#87958A]">
                Current estimate
              </p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight text-[#35483B]">
                  {selectedResult
                    ? selectedResult.current.toFixed(1)
                    : "—"}
                </span>

                <span className="text-xl text-[#89978B]">
                  %
                </span>
              </div>

              <p className="mt-3 text-xs text-[#91A096]">
                Based on recorded inputs
              </p>
            </div>

            <div className="rounded-2xl border border-[#D8E8D8] bg-[#EDF5EC] p-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-[#64816B]">
                Simulated estimate
              </p>

              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-semibold tracking-tight text-[#355B46]">
                  {selectedResult
                    ? selectedResult.simulated.toFixed(1)
                    : "—"}
                </span>

                <span className="text-xl text-[#6F9678]">
                  %
                </span>
              </div>

              <p className="mt-3 text-xs text-[#7C9881]">
                Based on adjusted inputs
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[#E6ECE5] pt-6">
            <div>
              <p className="text-sm text-[#829185]">
                Difference from current estimate
              </p>

              {selectedResult ? (
                <div
                  className="mt-2 flex items-center gap-2"
                  style={{
                    color: getDifferenceColor(
                      selectedResult.difference_percentage_points
                    ),
                  }}
                >
                  {selectedResult.difference_percentage_points >
                  0.05 ? (
                    <ArrowUpRight className="h-5 w-5" />
                  ) : selectedResult.difference_percentage_points <
                    -0.05 ? (
                    <ArrowDownRight className="h-5 w-5" />
                  ) : (
                    <ArrowRight className="h-5 w-5" />
                  )}

                  <span className="text-2xl font-semibold">
                    {formatDifference(
                      selectedResult.difference_percentage_points
                    )}
                  </span>
                </div>
              ) : (
                <p className="mt-2 text-xl text-[#A2AEA4]">
                  —
                </p>
              )}
            </div>

            {simulating ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-[#F2F6F0] px-3 py-2 text-xs text-[#698571]">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#B9CFBD] border-t-[#456E53]" />
                Recalculating
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-[#EAF4E9] px-3 py-2 text-xs font-medium text-[#518469]">
                <Check className="h-3.5 w-3.5" />
                Up to date
              </span>
            )}
          </div>
        </section>

        {/* Controls */}
        <section className="rounded-2xl border border-[#E2E9E1] bg-white p-5 shadow-[0_5px_25px_rgba(35,68,45,0.035)] sm:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF2E9]">
              <SlidersHorizontal className="h-5 w-5 text-[#456E53]" />
            </div>

            <div>
              <h2 className="text-lg font-semibold">
                Adjust your routine
              </h2>

              <p className="mt-0.5 text-xs text-[#91A096]">
                Changes update the estimates automatically.
              </p>
            </div>
          </div>

          <div className="mt-7 space-y-7">
            {INPUTS.map((config) => {
              const value = inputs[config.key];
              const original =
                initialInputs?.[config.key] ?? value;

              const changed =
                Math.abs(value - original) > 0.001;

              return (
                <div key={config.key}>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <label
                        htmlFor={`input-${config.key}`}
                        className="text-sm font-semibold text-[#3B5141]"
                      >
                        {config.label}
                      </label>

                      <p className="mt-1 text-xs text-[#94A197]">
                        {config.description}
                      </p>
                    </div>

                    <div
                      className={[
                        "rounded-xl px-3 py-2 text-sm font-semibold",
                        changed
                          ? "bg-[#E7F1E6] text-[#355B46]"
                          : "bg-[#F3F6F1] text-[#667A6B]",
                      ].join(" ")}
                    >
                      {formatInput(config.key, value)}
                      <span className="ml-1 text-xs font-normal">
                        {config.unit}
                      </span>
                    </div>
                  </div>

                  <input
                    id={`input-${config.key}`}
                    type="range"
                    min={config.min}
                    max={config.max}
                    step={config.step}
                    value={value}
                    onChange={(event) =>
                      updateInput(
                        config.key,
                        Number(event.target.value)
                      )
                    }
                    className="h-2 w-full cursor-pointer accent-[#456E53]"
                  />

                  <div className="mt-2 flex items-center justify-between text-[11px] text-[#A0ADA2]">
                    <span>
                      {formatInput(
                        config.key,
                        config.min
                      )}
                    </span>

                    <span>
                      Original:{" "}
                      {formatInput(
                        config.key,
                        original
                      )}
                    </span>

                    <span>
                      {formatInput(
                        config.key,
                        config.max
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-7 rounded-xl border border-[#E1EADF] bg-[#F6F9F4] p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#7D9480]">
              Modified inputs
            </p>

            {changedInputs.length === 0 ? (
              <p className="mt-2 text-sm text-[#91A096]">
                No changes yet. Move a slider to
                explore a scenario.
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                {changedInputs.map((config) => (
                  <span
                    key={config.key}
                    className="rounded-full border border-[#D7E7D6] bg-white px-3 py-1.5 text-xs font-medium text-[#4B7656]"
                  >
                    {config.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* All outcomes */}
      <section className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            All health outcomes
          </h2>

          <p className="mt-1 text-sm text-[#819087]">
            Compare current and simulated estimates
            across all seven outcomes.
          </p>
        </div>

        {simulation ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {OUTCOMES.map((outcome) => {
              const result =
                simulation.outcomes?.[outcome.key];

              if (!result) return null;

              return (
                <OutcomeCard
                  key={outcome.key}
                  label={outcome.label}
                  result={result}
                  selected={
                    selectedOutcome === outcome.key
                  }
                  onClick={() =>
                    setSelectedOutcome(outcome.key)
                  }
                />
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-[#E2E9E1] bg-white p-10 text-center text-sm text-[#819087]">
            Calculating your outcome estimates...
          </div>
        )}
      </section>

      {error && (
        <div className="rounded-xl border border-[#EBCFC4] bg-[#FFF5F0] p-4 text-sm text-[#AE6955]">
          {error}
        </div>
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-[#DFE9DD] bg-[#F2F7F0] p-5">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#60886A]" />

        <div>
          <h3 className="text-sm font-semibold text-[#456E53]">
            About these estimates
          </h3>

          <p className="mt-1 text-xs leading-relaxed text-[#7E9281]">
            {simulation?.disclaimer ??
              "LifePrint uses synthetic research data. Simulated changes are model estimates, not evidence of causation or clinically validated health predictions."}
          </p>
        </div>
      </div>
    </div>
  );
}