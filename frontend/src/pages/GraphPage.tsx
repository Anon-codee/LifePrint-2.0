
import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../api/client';
import { useUser } from '../context/UserContext';
import { Card, CardContent } from '../components/ui/Card';

import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';

import type {
  Node,
  Edge,
  NodeProps,
  NodeMouseHandler,
  EdgeMouseHandler,
} from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import {
  Activity,
  BrainCircuit,
  Info,
  Network,
  ArrowRight,
  AlertCircle,
  Sparkles,
  MousePointer2,
} from 'lucide-react';

// ==================================================
// TYPES
// ==================================================

type GraphNode = {
  id: string;
  label: string;
  type: 'signal' | 'outcome';
};

type GraphEdge = {
  id: string;
  source: string;
  target: string;
  direction: 'above' | 'below';
  relationship:
    | 'higher_next_day_event_frequency'
    | 'lower_next_day_event_frequency';
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
  nodeType: 'signal' | 'outcome';
  focused?: boolean;
  dimmed?: boolean;
};

type HealthFlowNode = Node<HealthNodeData>;

type HealthFlowEdge = Edge<GraphEdge>;

// ==================================================
// HELPERS
// ==================================================

function prettyLabel(value: string) {
  return value
    .replace(/^(signal|outcome):/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getEdgeColor(edge: GraphEdge) {
  return edge.relationship ===
    'higher_next_day_event_frequency'
    ? '#f59e0b'
    : '#10b981';
}

// ==================================================
// CUSTOM GLOWING NODES
// ==================================================

function HealthNode({
  data,
}: NodeProps<HealthFlowNode>) {
  const isSignal = data.nodeType === 'signal';

  const baseClasses =
    'relative min-w-[175px] rounded-xl border px-5 py-4 ' +
    'transition-all duration-300 cursor-pointer';

  const signalClasses =
    'border-blue-500/50 bg-slate-900 ' +
    'shadow-[0_0_22px_rgba(59,130,246,0.18)] ' +
    'hover:shadow-[0_0_35px_rgba(59,130,246,0.45)]';

  const outcomeClasses =
    'border-violet-500/50 bg-violet-950/70 ' +
    'shadow-[0_0_22px_rgba(139,92,246,0.18)] ' +
    'hover:shadow-[0_0_35px_rgba(139,92,246,0.45)]';

  const focusedClasses = isSignal
    ? 'border-blue-300 shadow-[0_0_40px_rgba(59,130,246,0.65)]'
    : 'border-violet-300 shadow-[0_0_40px_rgba(139,92,246,0.65)]';

  return (
    <div
      className={[
        baseClasses,
        isSignal ? signalClasses : outcomeClasses,
        data.focused ? focusedClasses : '',
        data.dimmed ? 'opacity-35' : 'opacity-100',
      ].join(' ')}
    >
      {!isSignal && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-2.5 !w-2.5 !border-2 !border-violet-400 !bg-slate-950"
        />
      )}

      <div className="flex items-center gap-3">
        <div
          className={
            isSignal
              ? 'rounded-lg bg-blue-500/15 p-2'
              : 'rounded-lg bg-violet-500/15 p-2'
          }
        >
          {isSignal ? (
            <Activity className="h-4 w-4 text-blue-400" />
          ) : (
            <BrainCircuit className="h-4 w-4 text-violet-400" />
          )}
        </div>

        <div>
          <p className="text-[10px] uppercase tracking-wider text-slate-500">
            {isSignal ? 'Health signal' : 'Outcome'}
          </p>

          <p className="mt-1 text-sm font-medium text-slate-100">
            {data.label}
          </p>
        </div>
      </div>

      {isSignal && (
        <Handle
          type="source"
          position={Position.Right}
          className="!h-2.5 !w-2.5 !border-2 !border-blue-400 !bg-slate-950"
        />
      )}
    </div>
  );
}

const nodeTypes = {
  health: HealthNode,
};

// ==================================================
// GRAPH LAYOUT
// ==================================================

function createLayout(graph: GraphResponse) {
  const signals = graph.nodes.filter(
    (node) => node.type === 'signal'
  );

  const outcomes = graph.nodes.filter(
    (node) => node.type === 'outcome'
  );

  // More space between columns gives curved
  // connections room to spread out.
  const rowHeight = 125;
  const leftX = 50;
  const rightX = 650;

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
      type: 'health',
      position: {
        x: leftX,
        y: signalOffset + index * rowHeight,
      },
      data: {
        label: prettyLabel(node.label),
        nodeType: 'signal' as const,
      },
      draggable: true,
    })),

    ...outcomes.map((node, index) => ({
      id: node.id,
      type: 'health',
      position: {
        x: rightX,
        y: outcomeOffset + index * rowHeight,
      },
      data: {
        label: prettyLabel(node.label),
        nodeType: 'outcome' as const,
      },
      draggable: true,
    })),
  ];

  const flowEdges: HealthFlowEdge[] =
    graph.edges.map((edge) => {
      const color = getEdgeColor(edge);

      const difference = Math.abs(
        edge.difference_percentage_points
      );

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,

        // Bezier curves instead of angular connections.
        type: 'default',

        // Animated flowing dashes.
        animated: true,

        // Hide labels until an edge is selected.
        // This reduces clutter considerably.
        label: undefined,

        style: {
          stroke: color,
          strokeWidth: Math.min(
            3,
            1.3 + difference / 35
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
    });

  return {
    flowNodes,
    flowEdges,
  };
}

// ==================================================
// MAIN PAGE
// ==================================================

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

  // ----------------------------------------------
  // FETCH GRAPH
  // ----------------------------------------------

  useEffect(() => {
    let mounted = true;

    async function fetchGraph() {
      if (!selectedUserId) {
        setGraph(null);
        setNodes([]);
        setEdges([]);
        setSelectedEdge(null);
        setFocusedNodeId(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setSelectedEdge(null);
      setFocusedNodeId(null);
      setGraph(null);

      try {
        const response: GraphResponse =
          await api.getGraphV2(selectedUserId);

        if (!mounted) return;

        const { flowNodes, flowEdges } =
          createLayout(response);

        setGraph(response);
        setNodes(flowNodes);

        // All connections remain visible.
        setEdges(flowEdges);
      } catch (err) {
        if (!mounted) return;

        console.error('Graph error:', err);

        setError(
          'Failed to load your personal health graph.'
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchGraph();

    return () => {
      mounted = false;
    };
  }, [selectedUserId, setNodes, setEdges]);

  // ----------------------------------------------
  // INTERACTIONS
  // ----------------------------------------------

  const onNodeClick: NodeMouseHandler<HealthFlowNode> =
    useCallback((_event, node) => {
      setFocusedNodeId((previous) =>
        previous === node.id ? null : node.id
      );

      setSelectedEdge(null);
    }, []);

  const onEdgeClick: EdgeMouseHandler<HealthFlowEdge> =
    useCallback((_event, edge) => {
      if (edge.data) {
        setSelectedEdge(edge.data);
        setFocusedNodeId(null);
      }
    }, []);

  const onPaneClick = useCallback(() => {
    setSelectedEdge(null);
    setFocusedNodeId(null);
  }, []);

  // ----------------------------------------------
  // VISUAL FOCUS
  // ----------------------------------------------

  const highlightedNodeIds = useMemo(() => {
    if (!focusedNodeId) return new Set<string>();

    const connected = new Set<string>([
      focusedNodeId,
    ]);

    edges.forEach((edge) => {
      if (edge.source === focusedNodeId) {
        connected.add(edge.target);
      }

      if (edge.target === focusedNodeId) {
        connected.add(edge.source);
      }
    });

    return connected;
  }, [focusedNodeId, edges]);

  const displayNodes = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        focused: node.id === focusedNodeId,
        dimmed:
          focusedNodeId !== null &&
          !highlightedNodeIds.has(node.id),
      },
    }));
  }, [
    nodes,
    focusedNodeId,
    highlightedNodeIds,
  ]);

  const displayEdges = useMemo(() => {
    return edges.map((edge) => {
      const isConnected =
        edge.source === focusedNodeId ||
        edge.target === focusedNodeId;

      const isSelected =
        selectedEdge?.id === edge.id;

      const hasFocus =
        focusedNodeId !== null ||
        selectedEdge !== null;

      const isHighlighted =
        isConnected || isSelected;

      const dimmed =
        hasFocus && !isHighlighted;

      const edgeData = edge.data;
      const color = edgeData
        ? getEdgeColor(edgeData)
        : '#64748b';

      const difference = Math.abs(
        edgeData?.difference_percentage_points ?? 0
      );

      return {
        ...edge,

        // Unrelated edges remain visible,
        // but only connected edges animate
        // when something is selected.
        animated: !dimmed,

        label: isHighlighted
          ? `${
              (edgeData?.difference_percentage_points ?? 0) >= 0
                ? '+'
                : '−'
            }${difference.toFixed(1)} pp`
          : undefined,

        labelStyle: {
          fill: '#f8fafc',
          fontSize: 12,
          fontWeight: 600,
        },

        labelBgStyle: {
          fill: '#0f172a',
          fillOpacity: 0.95,
        },

        labelBgPadding: [6, 4] as [number, number],
        labelBgBorderRadius: 6,

        style: {
          ...edge.style,
          stroke: color,
          strokeWidth: isHighlighted
            ? 3.5
            : edge.style?.strokeWidth,
          strokeOpacity: dimmed
            ? 0.07
            : isHighlighted
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
    });
  }, [edges, focusedNodeId, selectedEdge]);

  // ----------------------------------------------
  // LOADING / ERROR
  // ----------------------------------------------

  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-16 w-80 animate-pulse rounded-xl bg-slate-800/50" />

        <div className="h-[650px] animate-pulse rounded-2xl bg-slate-800/50" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-6">
          <AlertCircle className="h-5 w-5 text-amber-400" />

          <p className="text-sm text-slate-300">
            {error}
          </p>
        </CardContent>
      </Card>
    );
  }

  // ----------------------------------------------
  // PAGE
  // ----------------------------------------------

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-8">

      {/* HEADER */}

      <div>
        <div className="flex items-center gap-3">
          <Network className="h-6 w-6 text-indigo-400" />

          <h1 className="text-2xl font-semibold text-slate-100">
            Personal Health Graph
          </h1>

          <span className="flex items-center gap-1 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs text-indigo-300">
            <Sparkles className="h-3 w-3" />
            Live network
          </span>
        </div>

        <p className="mt-2 text-sm text-slate-400">
          Explore animated connections between
          your health signals and observed next-day outcomes.
        </p>
      </div>

      {/* SUMMARY */}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">
              Connected health signals
            </p>

            <p className="mt-2 text-3xl font-semibold text-blue-400">
              {graph?.nodes.filter(
                (node) => node.type === 'signal'
              ).length ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">
              Connected outcomes
            </p>

            <p className="mt-2 text-3xl font-semibold text-violet-400">
              {graph?.nodes.filter(
                (node) => node.type === 'outcome'
              ).length ?? 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs text-slate-500">
              Discovered connections
            </p>

            <p className="mt-2 text-3xl font-semibold text-slate-100">
              {graph?.edge_count ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* LEGEND */}

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-blue-500" />
          Health signal
        </div>

        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-violet-500" />
          Health outcome
        </div>

        <div className="flex items-center gap-2">
          <span className="h-0.5 w-6 bg-amber-500" />
          Higher event frequency
        </div>

        <div className="flex items-center gap-2">
          <span className="h-0.5 w-6 bg-emerald-500" />
          Lower event frequency
        </div>
      </div>

      {/* INTERACTION INSTRUCTION */}

      <div className="flex items-center gap-2 text-sm text-slate-400">
        <MousePointer2 className="h-4 w-4 text-indigo-400" />

        {focusedNodeId ? (
          <p>
            Highlighting connections for{' '}
            <span className="font-medium text-slate-200">
              {prettyLabel(focusedNodeId)}
            </span>
            . Click the background to reset.
          </p>
        ) : selectedEdge ? (
          <p>
            Relationship selected. Click the
            background to see the full network.
          </p>
        ) : (
          <p>
            Click a node to highlight its connections,
            or click an arrow to explore its evidence.
          </p>
        )}
      </div>

      {/* GRAPH + DETAILS */}

      <div className="flex flex-col gap-6 lg:flex-row">

        <div className="relative h-[700px] min-w-0 flex-1 overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
          {nodes.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
              <Network className="h-10 w-10 text-slate-600" />

              <h3 className="text-lg font-medium text-slate-300">
                No connections discovered
              </h3>

              <p className="max-w-sm text-sm text-slate-500">
                This user's history did not produce
                any connections meeting the current
                graph criteria.
              </p>
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
              fitViewOptions={{
                padding: 0.2,
                maxZoom: 1.2,
              }}
              minZoom={0.25}
              maxZoom={1.8}
              nodesConnectable={false}
              className="bg-slate-950"
            >
              <Background
                color="#334155"
                gap={24}
                size={1}
              />

              <Controls
                className="!border-slate-700 !bg-slate-800 !shadow-lg"
              />
            </ReactFlow>
          )}

          <div className="pointer-events-none absolute bottom-4 left-4 right-4 max-w-sm rounded-lg border border-slate-800 bg-slate-900/90 p-3 backdrop-blur-sm">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />

              <p className="text-xs leading-relaxed text-slate-400">
                Animated connections represent exploratory
                associations from synthetic data, not
                proven causal or medical relationships.
              </p>
            </div>
          </div>
        </div>

        {/* DETAILS PANEL */}

        <div className="w-full shrink-0 lg:w-80">
          {selectedEdge ? (
            <Card className="h-full">
              <CardContent className="p-6">

                <h3 className="mb-6 text-lg font-medium text-slate-100">
                  Connection Details
                </h3>

                <div className="mb-6 flex items-center gap-2 text-sm">
                  <span className="font-medium text-blue-400">
                    {prettyLabel(selectedEdge.source)}
                  </span>

                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-500" />

                  <span className="font-medium text-violet-400">
                    {prettyLabel(selectedEdge.target)}
                  </span>
                </div>

                <div className="space-y-6">

                  <div>
                    <p className="mb-1 text-xs text-slate-500">
                      Observed condition
                    </p>

                    <p className="text-sm text-slate-200">
                      {prettyLabel(selectedEdge.source)}{' '}
                      {selectedEdge.direction} the
                      personal baseline
                    </p>
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-slate-500">
                      Observed relationship
                    </p>

                    <p
                      className={
                        selectedEdge.relationship ===
                        'higher_next_day_event_frequency'
                          ? 'text-sm font-medium text-amber-400'
                          : 'text-sm font-medium text-emerald-400'
                      }
                    >
                      {selectedEdge.relationship ===
                      'higher_next_day_event_frequency'
                        ? 'Higher next-day event frequency'
                        : 'Lower next-day event frequency'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-slate-800/60 p-3">
                      <p className="mb-2 text-xs text-slate-500">
                        Exposed days
                      </p>

                      <p className="text-2xl font-semibold text-slate-100">
                        {selectedEdge.exposed_event_rate.toFixed(1)}%
                      </p>
                    </div>

                    <div className="rounded-lg bg-slate-800/60 p-3">
                      <p className="mb-2 text-xs text-slate-500">
                        Other days
                      </p>

                      <p className="text-2xl font-semibold text-slate-100">
                        {selectedEdge.comparison_event_rate.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-slate-500">
                      Difference
                    </p>

                    <p className="text-xl font-semibold text-slate-100">
                      {selectedEdge.difference_percentage_points > 0
                        ? '+'
                        : ''}
                      {selectedEdge.difference_percentage_points.toFixed(1)}
                      {' '}percentage points
                    </p>
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-slate-500">
                      Observations
                    </p>

                    <p className="text-sm text-slate-300">
                      {selectedEdge.observations} compared days
                    </p>
                  </div>

                  <div>
                    <p className="mb-1 text-xs text-slate-500">
                      Time relationship
                    </p>

                    <p className="text-sm text-slate-300">
                      Outcome observed{' '}
                      {selectedEdge.lag_days}{' '}
                      day{selectedEdge.lag_days !== 1 ? 's' : ''}{' '}
                      later
                    </p>
                  </div>

                </div>

                <div className="mt-8 border-t border-slate-800 pt-5">
                  <div className="flex items-start gap-2">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />

                    <p className="text-xs leading-relaxed text-slate-500">
                      Event-rate differences are
                      descriptive and may be affected
                      by other variables or chance.
                    </p>
                  </div>
                </div>

              </CardContent>
            </Card>
          ) : (
            <Card className="flex min-h-[250px] items-center justify-center border-dashed border-slate-800 bg-slate-900/50">
              <CardContent className="p-8 text-center">
                <Network className="mx-auto mb-4 h-9 w-9 text-indigo-400/60" />

                <h3 className="mb-2 text-sm font-medium text-slate-300">
                  Explore the network
                </h3>

                <p className="text-sm leading-relaxed text-slate-500">
                  Select a node to illuminate its
                  connections. Click an animated
                  relationship to view its evidence.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}