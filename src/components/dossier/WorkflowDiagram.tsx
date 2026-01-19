import { useCallback, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { CheckCircle2, Circle, Clock, XCircle, AlertCircle } from 'lucide-react';

interface WorkflowStep {
  id: string;
  step_number: number;
  name: string;
  description: string;
  step_type: string;
  requires_decision: boolean;
  next_step_id: string | null;
  decision_yes_next_step_id: string | null;
  decision_no_next_step_id: string | null;
  parallel_steps: string[] | null;
  can_loop_back: boolean | null;
}

interface WorkflowProgress {
  id: string;
  workflow_step_id: string;
  status: string;
  completed_at: string | null;
}

interface WorkflowDiagramProps {
  steps: WorkflowStep[];
  progress: WorkflowProgress[];
}

const getNodeColor = (status: string | undefined) => {
  switch (status) {
    case 'completed':
      return 'hsl(var(--primary))';
    case 'in_progress':
      return 'hsl(var(--accent))';
    case 'blocked':
      return 'hsl(var(--destructive))';
    case 'pending':
    default:
      return 'hsl(var(--muted))';
  }
};

const getStatusIcon = (status: string | undefined) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-4 h-4" />;
    case 'in_progress':
      return <Clock className="w-4 h-4" />;
    case 'blocked':
      return <XCircle className="w-4 h-4" />;
    case 'pending':
    default:
      return <Circle className="w-4 h-4" />;
  }
};

const getStepTypeIcon = (stepType: string) => {
  switch (stepType) {
    case 'decision':
      return '❓';
    case 'document_generation':
      return '📄';
    case 'data_entry':
      return '✍️';
    case 'appointment':
      return '📅';
    case 'approval':
      return '✅';
    case 'external_form':
      return '🌐';
    case 'task_creation':
      return '📋';
    case 'review':
      return '👁️';
    case 'quality_control':
      return '🔍';
    case 'archiving':
      return '📦';
    case 'notification':
      return '📧';
    case 'milestone':
      return '🎯';
    case 'checklist':
      return '☑️';
    default:
      return '⚡';
  }
};

const CustomNode = ({ data }: any) => {
  return (
    <div
      className="px-4 py-3 rounded-lg border-2 shadow-lg min-w-[200px] max-w-[250px]"
      style={{
        backgroundColor: `${data.color}20`,
        borderColor: data.color,
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{data.typeIcon}</span>
          <span className="font-bold text-foreground">{data.stepNumber}</span>
        </div>
        <div style={{ color: data.color }}>
          {data.statusIcon}
        </div>
      </div>
      <div className="font-semibold text-sm text-foreground mb-1">{data.label}</div>
      <div className="flex flex-col gap-1 mt-2">
        {data.isDecision && (
          <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-3 h-3" />
            <span>Décision</span>
          </div>
        )}
        {data.canLoopBack && (
          <div className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
            <span>🔄</span>
            <span>Boucle</span>
          </div>
        )}
      </div>
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

const WorkflowDiagram = ({ steps, progress }: WorkflowDiagramProps) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!steps || steps.length === 0) return;

    // Create nodes
    const newNodes: Node[] = steps.map((step, index) => {
      const stepProgress = progress.find(p => p.workflow_step_id === step.id);
      const status = stepProgress?.status;

      // Calculate position (simple layout)
      const x = (index % 4) * 300;
      const y = Math.floor(index / 4) * 200;

      return {
        id: step.id,
        type: 'custom',
        position: { x, y },
        data: {
          label: step.name,
          stepNumber: step.step_number,
          status,
          color: getNodeColor(status),
          statusIcon: getStatusIcon(status),
          typeIcon: getStepTypeIcon(step.step_type),
          isDecision: step.requires_decision,
          canLoopBack: step.can_loop_back,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });

    // Create edges
    const newEdges: Edge[] = [];
    
    steps.forEach((step) => {
      const isActive = progress.find(p => p.workflow_step_id === step.id)?.status === 'in_progress';
      
      // Regular next step (only if not a decision step)
      if (step.next_step_id && !step.requires_decision) {
        // Check if this is a loop back edge
        const targetStep = steps.find(s => s.id === step.next_step_id);
        const isLoopBack = targetStep && targetStep.step_number < step.step_number;
        
        newEdges.push({
          id: `${step.id}-${step.next_step_id}`,
          source: step.id,
          target: step.next_step_id,
          type: 'smoothstep',
          animated: isActive,
          style: { 
            stroke: isLoopBack ? 'hsl(var(--chart-2))' : 'hsl(var(--muted-foreground))',
            strokeDasharray: isLoopBack ? '5,5' : undefined
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: isLoopBack ? 'hsl(var(--chart-2))' : 'hsl(var(--muted-foreground))',
          },
          label: isLoopBack ? '🔄 Retour' : undefined,
          labelStyle: isLoopBack ? { fill: 'hsl(var(--chart-2))', fontWeight: 600 } : undefined,
          labelBgStyle: isLoopBack ? { fill: 'hsl(var(--background))' } : undefined,
        });
      }

      // Decision branches
      if (step.requires_decision) {
        if (step.decision_yes_next_step_id) {
          const yesTarget = steps.find(s => s.id === step.decision_yes_next_step_id);
          const isYesLoopBack = yesTarget && yesTarget.step_number < step.step_number;
          
          newEdges.push({
            id: `${step.id}-yes-${step.decision_yes_next_step_id}`,
            source: step.id,
            target: step.decision_yes_next_step_id,
            type: 'smoothstep',
            animated: isActive,
            label: isYesLoopBack ? '✓ OUI (↩️)' : '✓ OUI',
            style: { 
              stroke: 'hsl(var(--jde-primary))',
              strokeDasharray: isYesLoopBack ? '5,5' : undefined
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: 'hsl(var(--jde-primary))',
            },
            labelStyle: { fill: 'hsl(var(--jde-primary))', fontWeight: 700, fontSize: 12 },
            labelBgStyle: { fill: 'hsl(var(--background))' },
          });
        }

        if (step.decision_no_next_step_id) {
          const noTarget = steps.find(s => s.id === step.decision_no_next_step_id);
          const isNoLoopBack = noTarget && noTarget.step_number < step.step_number;
          
          newEdges.push({
            id: `${step.id}-no-${step.decision_no_next_step_id}`,
            source: step.id,
            target: step.decision_no_next_step_id,
            type: 'smoothstep',
            animated: isActive,
            label: isNoLoopBack ? '✗ NON (↩️)' : '✗ NON',
            style: { 
              stroke: 'hsl(var(--destructive))',
              strokeDasharray: isNoLoopBack ? '5,5' : undefined
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: 'hsl(var(--destructive))',
            },
            labelStyle: { fill: 'hsl(var(--destructive))', fontWeight: 700, fontSize: 12 },
            labelBgStyle: { fill: 'hsl(var(--background))' },
          });
        }
      }

      // Parallel steps
      if (step.parallel_steps && step.parallel_steps.length > 0) {
        step.parallel_steps.forEach((parallelStepId) => {
          newEdges.push({
            id: `${step.id}-parallel-${parallelStepId}`,
            source: step.id,
            target: parallelStepId,
            type: 'smoothstep',
            animated: progress.find(p => p.workflow_step_id === step.id)?.status === 'in_progress',
            label: '⚡ Parallèle',
            style: { stroke: 'hsl(var(--accent))', strokeDasharray: '5,5' },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: 'hsl(var(--accent))',
            },
            labelStyle: { fill: 'hsl(var(--accent))', fontWeight: 600 },
            labelBgStyle: { fill: 'hsl(var(--background))' },
          });
        });
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [steps, progress, setNodes, setEdges]);

  return (
    <div className="w-full h-[600px] border rounded-lg bg-background">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => node.data.color}
          maskColor="hsl(var(--background) / 0.8)"
        />
      </ReactFlow>
    </div>
  );
};

export default WorkflowDiagram;
