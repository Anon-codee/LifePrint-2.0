
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
} from "@xyflow/react";
import type {
  Node,
  Edge,
  NodeProps,
  NodeMouseHandler,
  EdgeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import {
  Activity,
  ArrowRight,
  Info,
  Network,
  RefreshCw,
} from "lucide-react";

import { api } from "../api/client";
import { useUser } from "../context/UserContext";

type GraphNode = {
  id: string;
  label: string;
  type: "signal" | "outcome";
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  direction: "above" | "below";
  relationship:
    | "higher_next_day_event_frequency"
    | "lower_next_day_event_frequency";
  difference_percentage_points: number;
  exposed_event_rate: number;
  comparison_event_rate: number;
  observations: number;
  lag_days: number;
};

type GraphResponse = {
  user_id: string;
  description: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  node_count: number;
  edge_count: number;
};

type HealthNodeData = {
  label: string;
  nodeType: "signal" | "outcome";
  focused?: boolean;
  dimmed?: boolean;
};

type HealthFlowNode = Node<HealthNodeData>;
type HealthFlowEdge = Edge<GraphEdge>;

const COLORS = {
  forest: "#355B46",
  sage: "#8FAF98",
  lightSage: "#EFF5EE",
  lavender: "#F1EDF8",
  purple: "#76618F",
  amber: "#C58C43",
  green: "#659A78",
  text: "#2E4035",
  muted: "#819087",
  border: "#E2E9E1",
};

function prettyLabel(value: string) {
  return value
    .replace(/^(signal|outcome):/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getEdgeColor(edge: GraphEdge) {
  return edge.relationship === "higher_next_day_event_frequency"
    ? COLORS.amber
    : COLORS.green;
}

function HealthNode({ data }: NodeProps<HealthFlowNode>) {
  const isSignal = data.nodeType === "signal";

  return (
    <div
      className={[
        "min-w-[180px] rounded-2xl border px-4 py-3",
        "transition-all duration-300 cursor-pointer",
        isSignal
          ? "border-[#D7E5D6] bg-white"
          : "border-[#E5DDEF] bg-[#F7F4FA]",
        data.focused
          ? "ring-2 ring-[#8FAF98] shadow-lg"
          : "shadow-[0_4px_18px_rgba(38,62,45,0.05)]",
        data.dimmed ? "opacity-30" : "opacity-100",
      ].join(" ")}
    >
      {!isSignal && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-2.5 !w-2.5 !border-2 !border-white !bg-[#76618F]"
        />
      )}

      <div className="flex items-center gap-3">
        <div
          className={
            isSignal
              ? "rounded-xl bg-[#EAF2E9] p-2"
              : "rounded-xl bg-[#EAE3F3] p-2"
          }
        >
          <Activity
            className={
              isSignal
                ? "h-4 w-4 text-[#456E53]"
                : "h-4 w-4 text-[#76618F]"
            }
          />
        </div>

        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-[#91A096]">
            {isSignal ? "Health signal" : "Outcome"}
          </p>

          <p className="mt-1 text-sm font-semibold text-[#304439]">
            {data.label}
          </p>
        </div>
      </div>

      {isSignal && (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-2.5 !w-2.5 !border-2 !border-white !bg-[#456E53]"
        />
      )}
    </div>
  );
}

const nodeTypes = {
  health: HealthNode,
};

function createLayout(graph: GraphResponse) {
  const signals = graph.nodes.filter(
    (node) => node.type === "signal"
  );

  const outcomes = graph.nodes.filter(
    (node) => node.type === "outcome"
  );

  const rowHeight = 125;
  const totalRows = Math.max(
    signals.length,
    outcomes.length
  );

  const signalOffset =
    ((totalRows - signals.length) * rowHeight) / 2;

  const outcomeOffset =
    ((totalRows - outcomes.length) * rowHeight) / 2;

  const flowNodes: HealthFlowNode[] = [
    ...signals.map((node, index) => ({
      id: node.id,
      type: "health",
      position: {
        x: 50,
        y: signalOffset + index * rowHeight,
      },
      data: {
        label: prettyLabel(node.label),
        nodeType: "signal" as const,
      },
      draggable: true,
    })),

    ...outcomes.map((node, index) => ({
      id: node.id,
      type: "health",
      position: {
        x: 650,
        y: outcomeOffset + index * rowHeight,
      },
      data: {
        label: prettyLabel(node.label),
        nodeType: "outcome" as const,
      },
      draggable: true,
    })),
  ];

  const flowEdges: HealthFlowEdge[] = graph.edges.map(
    (edge) => {
      const color = getEdgeColor(edge);

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "default",
        animated: true,
        style: {
          stroke: color,
          strokeWidth: Math.min(
            3,
            1.3 +
              Math.abs(
                edge.difference_percentage_points
              ) /
                35
          ),
          strokeOpacity: 0.65,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color,
          width: 13,
          height: 13,
        },
        data: edge,
      };
    }
  );

  return { flowNodes, flowEdges };
}

export default function GraphPage() {
  const { selectedUserId } = useUser();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [graph, setGraph] =
    useState<GraphResponse | null>(null);

  const [nodes, setNodes, onNodesChange] =
    useNodesState<HealthFlowNode>([]);

  const [edges, setEdges, onEdgesChange] =
    useEdgesState<HealthFlowEdge>([]);

  const [selectedEdge, setSelectedEdge] =
    useState<GraphEdge | null>(null);

  const [focusedNodeId, setFocusedNodeId] =
    useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadGraph() {
      setLoading(true);
      setError(null);
      setGraph(null);
      setSelectedEdge(null);
      setFocusedNodeId(null);
      setNodes([]);
      setEdges([]);

      if (!selectedUserId) {
        setLoading(false);
        return;
      }

      try {
        const response: GraphResponse =
          await api.getGraphV2(selectedUserId);

        if (!active) return;

        const { flowNodes, flowEdges } =
          createLayout(response);

        setGraph(response);
        setNodes(flowNodes);
        setEdges(flowEdges);
      } catch (err) {
        if (!active) return;

        console.error(err);
        setError("Unable to load the health graph.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadGraph();

    return () => {
      active = false;
    };
  }, [selectedUserId, setNodes, setEdges]);

  const onNodeClick: NodeMouseHandler<HealthFlowNode> =
    useCallback((_event, node) => {
      setFocusedNodeId((previous) =>
        previous === node.id ? null : node.id
      );
      setSelectedEdge(null);
    }, []);

  const onEdgeClick: EdgeMouseHandler<HealthFlowEdge> =
    useCallback((_event, edge) => {
      if (!edge.data) return;

      setSelectedEdge(edge.data);
      setFocusedNodeId(null);
    }, []);

  const onPaneClick = useCallback(() => {
    setFocusedNodeId(null);
    setSelectedEdge(null);
  }, []);

  const connectedIds = useMemo(() => {
    const result = new Set<string>();

    if (!focusedNodeId) return result;

    result.add(focusedNodeId);

    edges.forEach((edge) => {
      if (edge.source === focusedNodeId) {
        result.add(edge.target);
      }

      if (edge.target === focusedNodeId) {
        result.add(edge.source);
      }
    });

    return result;
  }, [edges, focusedNodeId]);

  const displayNodes = useMemo(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          focused: node.id === focusedNodeId,
          dimmed:
            focusedNodeId !== null &&
            !connectedIds.has(node.id),
        },
      })),
    [nodes, focusedNodeId, connectedIds]
  );

  const displayEdges = useMemo(
    () =>
      edges.map((edge) => {
        const highlighted =
          edge.source === focusedNodeId ||
          edge.target === focusedNodeId ||
          selectedEdge?.id === edge.id;

        const hasSelection =
          focusedNodeId !== null ||
          selectedEdge !== null;

        const dimmed = hasSelection && !highlighted;

        const difference =
          edge.data?.difference_percentage_points ?? 0;

        const color = edge.data
          ? getEdgeColor(edge.data)
          : COLORS.muted;

        return {
          ...edge,
          animated: !dimmed,
          label: highlighted
            ? `${difference > 0 ? "+" : ""}${difference.toFixed(1)} pp`
            : undefined,
          labelStyle: {
            fill: COLORS.text,
            fontSize: 12,
            fontWeight: 600,
          },
          labelBgStyle: {
            fill: "#FFFFFF",
            fillOpacity: 0.98,
          },
          labelBgPadding: [6, 4] as [number, number],
          labelBgBorderRadius: 6,
          style: {
            ...edge.style,
            stroke: color,
            strokeWidth: highlighted
              ? 3.5
              : edge.style?.strokeWidth,
            strokeOpacity: dimmed
              ? 0.08
              : highlighted
                ? 1
                : 0.65,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color,
            width: 13,
            height: 13,
          },
        };
      }),
    [edges, focusedNodeId, selectedEdge]
  );

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-14 w-72 animate-pulse rounded-xl bg-[#EAF0E9]" />
        <div className="h-[650px] animate-pulse rounded-2xl bg-[#F0F4EF]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-[#E6D6C5] bg-[#FFF9F1] p-6 text-[#946D3D]">
        {error}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10 text-[#304439]">
      <div>
        <div className="flex items-center gap-3">
          <Network className="h-6 w-6 text-[#456E53]" />

          <h1 className="text-2xl font-semibold tracking-tight">
            Personal Health Graph
          </h1>
        </div>

        <p className="mt-2 text-sm text-[#819087]">
          Explore relationships discovered in your
          health history.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {[
          {
            label: "Health signals",
            value:
              graph?.nodes.filter(
                (node) => node.type === "signal"
              ).length ?? 0,
          },
          {
            label: "Health outcomes",
            value:
              graph?.nodes.filter(
                (node) => node.type === "outcome"
              ).length ?? 0,
          },
          {
            label: "Connections",
            value: graph?.edge_count ?? 0,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-[#E2E9E1] bg-white p-5 shadow-sm"
          >
            <p className="text-sm text-[#819087]">
              {item.label}
            </p>

            <p className="mt-2 text-3xl font-semibold text-[#355B46]">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-[#728277]">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-[#8FAF98]" />
          Health signal
        </div>

        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-[#B5A2CE]" />
          Health outcome
        </div>

        <div className="flex items-center gap-2">
          <span className="h-0.5 w-6 bg-[#C58C43]" />
          Higher observed frequency
        </div>

        <div className="flex items-center gap-2">
          <span className="h-0.5 w-6 bg-[#659A78]" />
          Lower observed frequency
        </div>
      </div>

      <p className="text-sm text-[#819087]">
        Click a node to highlight its connections,
        or click a line to inspect its evidence.
      </p>

      <div className="flex flex-col gap-5 lg:flex-row">
        <div className="relative h-[700px] min-w-0 flex-1 overflow-hidden rounded-2xl border border-[#E2E9E1] bg-white">
          {nodes.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-[#819087]">
              No connections found for this user.
            </div>
          ) : (
            <ReactFlow
              nodes={displayNodes}
              edges={displayEdges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onNodeClick={onNodeClick}
              onEdgeClick={onEdgeClick}
              onPaneClick={onPaneClick}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.25}
              maxZoom={1.5}
              proOptions={{ hideAttribution: true }}
            >
              <Background
                color="#DCE6DC"
                gap={18}
                size={1}
              />

              <Controls />
            </ReactFlow>
          )}
        </div>

        <div className="w-full shrink-0 lg:w-[310px]">
          <div className="rounded-2xl border border-[#E2E9E1] bg-white p-5 shadow-sm">
            {selectedEdge ? (
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#819087]">
                    Selected relationship
                  </p>

                  <h2 className="mt-2 text-lg font-semibold">
                    {prettyLabel(selectedEdge.source)}
                  </h2>

                  <div className="my-2 flex items-center gap-2 text-[#8FAF98]">
                    <ArrowRight className="h-4 w-4" />
                    <span className="text-xs">
                      Next-day association
                    </span>
                  </div>

                  <h3 className="font-semibold">
                    {prettyLabel(selectedEdge.target)}
                  </h3>
                </div>

                <div className="rounded-xl bg-[#F5F8F3] p-4">
                  <p className="text-sm text-[#819087]">
                    Signal condition
                  </p>

                  <p className="mt-1 font-medium">
                    {selectedEdge.direction === "above"
                      ? "Above personal baseline"
                      : "Below personal baseline"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-[#E2E9E1] p-3">
                    <p className="text-xs text-[#819087]">
                      Condition days
                    </p>

                    <p className="mt-2 text-2xl font-semibold text-[#355B46]">
                      {selectedEdge.exposed_event_rate.toFixed(1)}%
                    </p>
                  </div>

                  <div className="rounded-xl border border-[#E2E9E1] p-3">
                    <p className="text-xs text-[#819087]">
                      Other days
                    </p>

                    <p className="mt-2 text-2xl font-semibold">
                      {selectedEdge.comparison_event_rate.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="border-t border-[#E2E9E1] pt-4">
                  <p className="text-sm text-[#819087]">
                    Difference in observed frequency
                  </p>

                  <p
                    className="mt-1 text-2xl font-semibold"
                    style={{
                      color: getEdgeColor(selectedEdge),
                    }}
                  >
                    {selectedEdge.difference_percentage_points > 0
                      ? "+"
                      : ""}
                    {selectedEdge.difference_percentage_points.toFixed(1)}
                    <span className="ml-1 text-sm">
                      pp
                    </span>
                  </p>

                  <p className="mt-3 text-xs leading-relaxed text-[#819087]">
                    Based on {selectedEdge.observations} observations
                    with a {selectedEdge.lag_days}-day lag.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedEdge(null)}
                  className="flex items-center gap-2 text-sm font-medium text-[#456E53] hover:underline"
                >
                  <RefreshCw className="h-4 w-4" />
                  Clear selection
                </button>
              </div>
            ) : focusedNodeId ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#819087]">
                  Selected node
                </p>

                <h2 className="text-xl font-semibold">
                  {prettyLabel(focusedNodeId)}
                </h2>

                <p className="text-sm leading-relaxed text-[#819087]">
                  Its connections are highlighted on
                  the graph. Select a line to see the
                  underlying comparison.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF2E9]">
                  <Info className="h-5 w-5 text-[#456E53]" />
                </div>

                <h2 className="text-lg font-semibold">
                  Explore your graph
                </h2>

                <p className="text-sm leading-relaxed text-[#819087]">
                  Select a health signal or an outcome
                  to explore its connections. Click a
                  connection to compare the observed
                  event frequencies.
                </p>

                <div className="rounded-xl bg-[#F5F8F3] p-4 text-xs leading-relaxed text-[#728277]">
                  These are exploratory associations
                  from synthetic data. They do not
                  establish causation or provide a
                  clinical assessment.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-[#E2E9E1] bg-[#F5F8F3] p-4 text-xs leading-relaxed text-[#819087]">
        <Info className="mr-2 inline h-4 w-4" />
        LifePrint is a synthetic-data research prototype.
        Its discovered relationships are exploratory and
        are not clinically validated.
      </div>
    </div>
  );
}