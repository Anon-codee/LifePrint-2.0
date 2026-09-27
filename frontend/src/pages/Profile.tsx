
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BrainCircuit,
  ChevronDown,
  ChevronRight,
  Clock3,
  HeartPulse,
  Info,
  Shield,
  TrendingUp,
} from "lucide-react";

import { api } from "../api/client";
import { useUser } from "../context/UserContext";

type SignalStats = {
  current: number;
  baseline: number;
  deviation_percent: number;
  trend: string;
  trend_change: number;
  volatility: number;
  history_days: number;
};

type BaselineResponse = {
  user_id: string;
  date: string;
  baseline_window_days: number;
  signals: Record<string, SignalStats>;
};

type Pattern = {
  signal: string;
  direction: "above" | "below";
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

type SignalConfig = {
  key: string;
  label: string;
  unit: string;
  decimals: number;
};

const SIGNAL_GROUPS: {
  title: string;
  description: string;
  signals: SignalConfig[];
}[] = [
  {
    title: "Daily habits",
    description: "Sleep, hydration, movement and caffeine.",
    signals: [
      {
        key: "sleep_hours",
        label: "Sleep",
        unit: "h",
        decimals: 1,
      },
      {
        key: "hydration_liters",
        label: "Hydration",
        unit: "L",
        decimals: 1,
      },
      {
        key: "stress",
        label: "Stress",
        unit: "/10",
        decimals: 1,
      },
      {
        key: "activity_steps",
        label: "Activity",
        unit: "steps",
        decimals: 0,
      },
      {
        key: "caffeine",
        label: "Caffeine",
        unit: "servings",
        decimals: 1,
      },
    ],
  },
  {
    title: "Vital measurements",
    description: "Heart rate, blood pressure and temperature.",
    signals: [
      {
        key: "heart_rate",
        label: "Heart rate",
        unit: "bpm",
        decimals: 0,
      },
      {
        key: "resting_hr",
        label: "Resting heart rate",
        unit: "bpm",
        decimals: 0,
      },
      {
        key: "systolic_bp",
        label: "Systolic BP",
        unit: "mmHg",
        decimals: 0,
      },
      {
        key: "diastolic_bp",
        label: "Diastolic BP",
        unit: "mmHg",
        decimals: 0,
      },
      {
        key: "temperature_c",
        label: "Temperature",
        unit: "°C",
        decimals: 1,
      },
      {
        key: "weight_kg",
        label: "Weight",
        unit: "kg",
        decimals: 1,
      },
    ],
  },
  {
    title: "Energy and recovery",
    description: "Daily energy expenditure and recovery indicators.",
    signals: [
      {
        key: "calories",
        label: "Calories",
        unit: "kcal",
        decimals: 0,
      },
      {
        key: "sleep_quality",
        label: "Sleep quality",
        unit: "/100",
        decimals: 0,
      },
      {
        key: "recovery",
        label: "Recovery",
        unit: "/100",
        decimals: 0,
      },
    ],
  },
];

const OUTCOME_LABELS: Record<string, string> = {
  headache: "Headache",
  bp_elevation: "BP elevation",
  fatigue: "Fatigue",
  dehydration_risk: "Dehydration risk",
  poor_sleep: "Poor sleep",
  stress_overload: "Stress overload",
  recovery_deterioration: "Recovery deterioration",
};

const SIGNAL_LABELS = Object.fromEntries(
  SIGNAL_GROUPS.flatMap((group) =>
    group.signals.map((signal) => [
      signal.key,
      signal.label,
    ])
  )
);

function prettyLabel(value: string) {
  return (
    SIGNAL_LABELS[value] ??
    OUTCOME_LABELS[value] ??
    value
      .replace(/_/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function formatValue(
  value: number | undefined,
  decimals = 1
) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value)
  ) {
    return "—";
  }

  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function getTrendText(trend: string) {
  switch (trend.toLowerCase()) {
    case "increasing":
    case "rising":
    case "up":
      return "Increasing";

    case "decreasing":
    case "falling":
    case "down":
      return "Decreasing";

    case "stable":
      return "Stable";

    default:
      return prettyLabel(trend || "Unknown");
  }
}

function SignalCard({
  config,
  stats,
}: {
  config: SignalConfig;
  stats?: SignalStats;
}) {
  const deviation = stats?.deviation_percent ?? 0;
  const hasDeviation =
    typeof stats?.deviation_percent === "number";

  return (
    <div className="rounded-2xl border border-[#E3EAE2] bg-white p-5 transition-colors hover:border-[#BDD2C0]">
      <div className="mb-5 flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-[#6F8073]">
          {config.label}
        </p>

        {hasDeviation && (
          <span
            className={[
              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
              Math.abs(deviation) < 5
                ? "bg-[#EEF3EC] text-[#708575]"
                : "bg-[#F4EEE5] text-[#AD8050]",
            ].join(" ")}
          >
            {deviation > 0 ? "+" : ""}
            {deviation.toFixed(1)}%
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-[29px] font-semibold tracking-tight text-[#304A38]">
          {formatValue(stats?.current, config.decimals)}
        </span>

        <span className="text-xs text-[#8B9B8F]">
          {config.unit}
        </span>
      </div>

      <div className="mt-5 border-t border-[#EDF1EB] pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-[#91A095]">
            Personal baseline
          </span>

          <span className="text-xs font-semibold text-[#536B58]">
            {formatValue(stats?.baseline, config.decimals)}
            {" "}
            {config.unit}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-xs text-[#91A095]">
            Recent trend
          </span>

          <span className="text-xs font-medium text-[#63816B]">
            {getTrendText(stats?.trend ?? "")}
          </span>
        </div>
      </div>
    </div>
  );
}

function PatternCard({
  pattern,
}: {
  pattern: Pattern;
}) {
  const difference =
    pattern.difference_percentage_points;

  const higher = difference > 0;

  return (
    <div className="rounded-xl border border-[#E3EAE2] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#354B3B]">
            {prettyLabel(pattern.signal)}
          </p>

          <p className="mt-1 text-xs text-[#8A9A8E]">
            {pattern.direction === "above"
              ? "Above"
              : "Below"}{" "}
            personal baseline by at least{" "}
            {pattern.baseline_deviation_threshold}
          </p>
        </div>

        <span
          className={[
            "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold",
            higher
              ? "bg-[#FAEDE7] text-[#B9755D]"
              : "bg-[#E8F3E9] text-[#4D8762]",
          ].join(" ")}
        >
          {higher ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" />
          )}

          {higher ? "+" : ""}
          {difference.toFixed(1)} pp
        </span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-[#F4F8F2] p-4">
          <p className="text-xs text-[#849587]">
            Condition days
          </p>

          <p className="mt-2 text-2xl font-semibold text-[#355B46]">
            {pattern.event_rate_exposed.toFixed(1)}%
          </p>

          <p className="mt-1 text-[11px] text-[#8B9C8D]">
            {pattern.exposed_event_count} events
            {" / "}
            {pattern.exposed_days} days
          </p>
        </div>

        <div className="rounded-xl bg-[#F7F8F5] p-4">
          <p className="text-xs text-[#849587]">
            Comparison days
          </p>

          <p className="mt-2 text-2xl font-semibold text-[#526456]">
            {pattern.event_rate_comparison.toFixed(1)}%
          </p>

          <p className="mt-1 text-[11px] text-[#8B9C8D]">
            {pattern.comparison_event_count} events
            {" / "}
            {pattern.comparison_days} days
          </p>
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-[#8B9B8E]">
        Observed {pattern.lag_days} day
        {pattern.lag_days === 1 ? "" : "s"} later.
        This is an association, not evidence of causation.
      </p>
    </div>
  );
}

export default function Profile() {
  const { selectedUserId } = useUser();

  const [baseline, setBaseline] =
    useState<BaselineResponse | null>(null);

  const [patterns, setPatterns] =
    useState<PatternsResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedGroups, setExpandedGroups] =
    useState<string[]>([
      "Daily habits",
      "Vital measurements",
      "Energy and recovery",
    ]);

  const [selectedOutcome, setSelectedOutcome] =
    useState<string>("all");

  const [showAllPatterns, setShowAllPatterns] =
    useState(false);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);
    setBaseline(null);
    setPatterns(null);

    if (!selectedUserId) {
      setLoading(false);
      return;
    }

    async function fetchProfile() {
      try {
        const [baselineResponse, patternsResponse] =
          await Promise.all([
            api.getBaseline(selectedUserId!),
            api.getPatterns(selectedUserId!),
          ]);

        if (!active) return;

        setBaseline(baselineResponse);
        setPatterns(patternsResponse);
      } catch (err) {
        if (!active) return;

        console.error(err);
        setError("Unable to load your health profile.");
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchProfile();

    return () => {
      active = false;
    };
  }, [selectedUserId]);

  const sortedPatterns = useMemo(() => {
    return [...(patterns?.patterns ?? [])].sort(
      (a, b) =>
        Math.abs(b.difference_percentage_points) -
        Math.abs(a.difference_percentage_points)
    );
  }, [patterns]);

  const availableOutcomes = useMemo(() => {
    return Array.from(
      new Set(sortedPatterns.map((pattern) => pattern.outcome))
    ).sort();
  }, [sortedPatterns]);

  const filteredPatterns = useMemo(() => {
    const matching =
      selectedOutcome === "all"
        ? sortedPatterns
        : sortedPatterns.filter(
            (pattern) =>
              pattern.outcome === selectedOutcome
          );

    return showAllPatterns
      ? matching
      : matching.slice(0, 6);
  }, [
    selectedOutcome,
    sortedPatterns,
    showAllPatterns,
  ]);

  const matchingPatternCount =
    selectedOutcome === "all"
      ? sortedPatterns.length
      : sortedPatterns.filter(
          (pattern) =>
            pattern.outcome === selectedOutcome
        ).length;

  function toggleGroup(title: string) {
    setExpandedGroups((previous) =>
      previous.includes(title)
        ? previous.filter((item) => item !== title)
        : [...previous, title]
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 pb-12">
        <div className="h-24 animate-pulse rounded-2xl bg-[#EAF0E9]" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="h-48 animate-pulse rounded-2xl bg-[#EDF2EC]"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !baseline || !patterns) {
    return (
      <div className="rounded-2xl border border-[#EBCFC4] bg-[#FFF7F2] p-6 text-sm text-[#AC705D]">
        {error ?? "Profile data is unavailable."}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-10 pb-12 text-[#304439]">
      {/* Profile overview */}
      <section className="overflow-hidden rounded-[22px] border border-[#DFE9DE] bg-white">
        <div className="flex flex-col justify-between gap-6 p-7 sm:flex-row sm:items-center">
          <div className="flex items-center gap-5">
            <div className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-2xl bg-[#E8F1E7]">
              <Shield className="h-8 w-8 text-[#456E53]" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8CA08F]">
                Personal health profile
              </p>

              <h1 className="mt-1 text-[30px] font-semibold tracking-tight text-[#2E4937]">
                {selectedUserId}
              </h1>

              <p className="mt-1 text-sm text-[#859588]">
                Your health signals and discovered patterns
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl bg-[#F3F7F1] px-5 py-4">
              <div className="flex items-center gap-2 text-xs text-[#849587]">
                <Clock3 className="h-3.5 w-3.5" />
                Recorded history
              </div>

              <p className="mt-2 text-2xl font-semibold text-[#355B46]">
                {patterns.days_available}
                <span className="ml-1 text-xs font-normal text-[#8B9B8E]">
                  days
                </span>
              </p>
            </div>

            <div className="rounded-xl bg-[#F3F7F1] px-5 py-4">
              <div className="flex items-center gap-2 text-xs text-[#849587]">
                <Activity className="h-3.5 w-3.5" />
                Health signals
              </div>

              <p className="mt-2 text-2xl font-semibold text-[#355B46]">
                {Object.keys(baseline.signals ?? {}).length}
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-[#E8EEE6] bg-[#F8FAF6] px-7 py-3">
          <p className="text-xs text-[#819183]">
            Latest record: {baseline.date}
            <span className="mx-2 text-[#C1CCC0]">•</span>
            Baselines use the preceding{" "}
            {baseline.baseline_window_days} days
          </p>
        </div>
      </section>

      {/* Personal baselines */}
      <section className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-[#527B5C]" />

            <h2 className="text-xl font-semibold tracking-tight">
              Your personal baseline
            </h2>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-[#87978A]">
            Your latest recorded measurements compared
            with your recent personal history.
          </p>
        </div>

        <div className="space-y-4">
          {SIGNAL_GROUPS.map((group) => {
            const expanded =
              expandedGroups.includes(group.title);

            return (
              <div
                key={group.title}
                className="overflow-hidden rounded-2xl border border-[#E2E9E1] bg-[#FBFCFA]"
              >
                <button
                  type="button"
                  onClick={() =>
                    toggleGroup(group.title)
                  }
                  className="flex w-full items-center justify-between gap-4 p-5 text-left transition-colors hover:bg-[#F4F8F2] sm:px-6"
                >
                  <div>
                    <h3 className="text-base font-semibold text-[#35503D]">
                      {group.title}
                    </h3>

                    <p className="mt-1 text-xs text-[#8B9A8D]">
                      {group.description}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <span className="rounded-full bg-[#EAF2E9] px-3 py-1 text-xs font-medium text-[#63816B]">
                      {group.signals.length} signals
                    </span>

                    {expanded ? (
                      <ChevronDown className="h-5 w-5 text-[#78907D]" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-[#78907D]" />
                    )}
                  </div>
                </button>

                {expanded && (
                  <div className="grid gap-4 border-t border-[#E8EEE6] p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-5">
                    {group.signals.map((config) => (
                      <SignalCard
                        key={config.key}
                        config={config}
                        stats={
                          baseline.signals?.[config.key]
                        }
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Pattern discovery */}
      <section className="space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-[#527B5C]" />

              <h2 className="text-xl font-semibold tracking-tight">
                What LifePrint has discovered
              </h2>
            </div>

            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#87978A]">
              Exploratory associations between changes
              in your health signals and outcomes
              recorded the following day.
            </p>
          </div>

          <div className="rounded-xl border border-[#DCE8DA] bg-[#F1F7EF] px-4 py-3">
            <p className="text-xs text-[#7C947F]">
              Discovered patterns
            </p>

            <p className="mt-1 text-2xl font-semibold text-[#355B46]">
              {patterns.patterns_found}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#E2E9E1] bg-white p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#719278]" />

            <span className="text-sm font-medium text-[#607563]">
              Filter findings
            </span>
          </div>

          <select
            aria-label="Filter by health outcome"
            value={selectedOutcome}
            onChange={(event) => {
              setSelectedOutcome(event.target.value);
              setShowAllPatterns(false);
            }}
            className="min-w-[190px] rounded-xl border border-[#DFE8DD] bg-[#F8FAF7] px-4 py-2.5 text-sm font-medium text-[#45644D] outline-none focus:border-[#9FBEA4]"
          >
            <option value="all">
              All outcomes
            </option>

            {availableOutcomes.map((outcome) => (
              <option
                key={outcome}
                value={outcome}
              >
                {prettyLabel(outcome)}
              </option>
            ))}
          </select>
        </div>

        {filteredPatterns.length > 0 ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {filteredPatterns.map((pattern, index) => (
                <div key={`${pattern.signal}-${pattern.outcome}-${pattern.direction}-${index}`}>
                  <div className="mb-2 px-1">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#829687]">
                      {prettyLabel(pattern.outcome)}
                    </span>
                  </div>

                  <PatternCard pattern={pattern} />
                </div>
              ))}
            </div>

            {matchingPatternCount > 6 && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() =>
                    setShowAllPatterns((previous) => !previous)
                  }
                  className="rounded-xl border border-[#DCE8DA] bg-white px-5 py-3 text-sm font-semibold text-[#456E53] transition-colors hover:bg-[#F2F7F0]"
                >
                  {showAllPatterns
                    ? "Show fewer findings"
                    : `Show all ${matchingPatternCount} findings`}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl border border-[#E2E9E1] bg-white px-6 py-12 text-center">
            <BrainCircuit className="mx-auto h-8 w-8 text-[#A7BAA9]" />

            <h3 className="mt-4 font-semibold text-[#4E6654]">
              No patterns found
            </h3>

            <p className="mt-2 text-sm text-[#91A095]">
              There are no findings for this outcome
              with the current observation requirements.
            </p>
          </div>
        )}
      </section>

      {/* Research disclaimer */}
      <div className="flex items-start gap-3 rounded-2xl border border-[#DDE9DA] bg-[#F2F7F0] p-5">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-[#638B6C]" />

        <div>
          <h3 className="text-sm font-semibold text-[#456E53]">
            About your health profile
          </h3>

          <p className="mt-1 text-xs leading-relaxed text-[#7C9180]">
            LifePrint is a synthetic-data research
            prototype. Personal baselines describe
            recorded measurements, while discovered
            patterns are exploratory associations.
            They are not clinically validated and
            do not establish causation.
          </p>
        </div>
      </div>
    </div>
  );
}