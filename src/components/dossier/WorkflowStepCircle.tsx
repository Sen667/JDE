import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  Circle,
  Clock,
  XCircle,
  FileText,
  Send,
  HelpCircle,
  Calendar,
  Clipboard,
  GitBranch,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowStepCircleProps {
  step: any;
  progress: any;
  isActive: boolean;
  onClick: () => void;
  isLast: boolean;
  isOptional?: boolean;
  isSkipped?: boolean;
  showDocumentGeneration?: boolean;
}

const WorkflowStepCircle = ({ step, progress, isActive, onClick, isLast, isOptional = false, isSkipped = false, showDocumentGeneration = false }: WorkflowStepCircleProps) => {
  const getStepColor = (status: string) => {
    const colors = {
      completed: 'bg-green-500 border-green-500 text-white',
      in_progress: 'bg-blue-500 border-blue-500 text-white',
      pending: 'bg-background border-muted-foreground text-muted-foreground',
      blocked: 'bg-red-500 border-red-500 text-white',
      skipped: 'bg-muted border-muted text-muted-foreground',
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getStepIcon = (stepType: string) => {
    const icons: Record<string, any> = {
      action: Clipboard,
      decision: HelpCircle,
      document: FileText,
      meeting: Calendar,
      notification: Send,
    };
    return icons[stepType] || Circle;
  };

  const Icon = getStepIcon(step.step_type);
  const status = progress?.status || 'pending';
  const colorClass = getStepColor(status);
  const isCompleted = status === 'completed';
  const isInProgress = status === 'in_progress';

  // Handle optional and skipped step styling
  const isOptionalSkipped = isOptional && (isSkipped || status === 'skipped');
  const finalColorClass = isOptionalSkipped
    ? 'bg-muted border-muted text-muted-foreground opacity-60'
    : colorClass;

  return (
    <div className="flex items-center">
      {/* Step Circle Container */}
      <div className="flex flex-col items-center gap-2 min-w-[120px]">
        {/* Status Badge */}
        <div className="h-6 flex items-center justify-center gap-1">
          {isOptional && (
            <Badge variant="outline" className="text-xs px-2 py-0 border-dashed">
              Optionnel
            </Badge>
          )}
          {step.requires_decision && (
            <Badge variant="secondary" className="text-xs px-2 py-0">
              <GitBranch className="h-3 w-3 mr-1" />
              Décision
            </Badge>
          )}
          {showDocumentGeneration && (
            <Badge variant="default" className="text-xs px-2 py-0 bg-blue-500 hover:bg-blue-600">
              <FileText className="h-3 w-3 mr-1" />
              Génère doc
            </Badge>
          )}
        </div>

        {/* Circle */}
        <div
          onClick={onClick}
          className={cn(
            'relative w-12 h-12 rounded-full border-3 flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-110 hover:shadow-lg',
            finalColorClass,
            isActive && 'ring-4 ring-primary ring-offset-2 scale-110',
            isInProgress && 'animate-pulse-ring'
          )}
        >
          {isCompleted ? (
            <CheckCircle2 className="h-6 w-6" />
          ) : (
            <div className="flex flex-col items-center">
              <span className="text-sm font-bold">{step.step_number}</span>
            </div>
          )}
          
          {/* Type Icon Overlay */}
          <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-1 border border-border">
            <Icon className="h-3 w-3" />
          </div>
        </div>

        {/* Step Name */}
        <div className="text-center">
          <p className="text-xs font-medium line-clamp-2 max-w-[100px]">
            {step.name}
          </p>
        </div>
      </div>

      {/* Connection Line */}
      {!isLast && (
        <div className="flex-1 h-0.5 bg-muted mx-2 min-w-[60px] relative">
          {isCompleted && (
            <div className="absolute inset-0 bg-primary animate-progress-line" />
          )}
        </div>
      )}
    </div>
  );
};

export default WorkflowStepCircle;
