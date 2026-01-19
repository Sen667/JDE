import { useState } from 'react';
import { dossierAPI } from '@/integrations/laravel/api';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';
import { Check, Circle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import WorkflowStepDetails from './WorkflowStepDetails';

interface VerticalWorkflowTimelineProps {
  steps: any[];
  progress: any[];
  dossierId: string;
  onUpdate: () => void;
}

const VerticalWorkflowTimeline = ({ steps, progress, dossierId, onUpdate }: VerticalWorkflowTimelineProps) => {
  const { user } = useAuthStore();
  const [selectedStep, setSelectedStep] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getStepProgress = (stepId: string) => {
    return progress.find((p) => p.workflow_step_id === stepId);
  };

  const getSelectedStepData = () => {
    return steps.find(s => s.id === selectedStep);
  };

  const getNextStepInfo = (step: any) => {
    if (step.requires_decision) {
      return {
        yes: steps.find(s => s.id === step.decision_yes_next_step_id),
        no: steps.find(s => s.id === step.decision_no_next_step_id)
      };
    }
    return {
      next: steps.find(s => s.id === step.next_step_id)
    };
  };

  const getStepColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500 border-green-500 text-white';
      case 'in_progress':
        return 'bg-blue-500 border-blue-500 text-white animate-pulse';
      case 'blocked':
        return 'bg-red-500 border-red-500 text-white';
      case 'skipped':
        return 'bg-gray-400 border-gray-400 text-white';
      default:
        return 'bg-muted border-border text-muted-foreground';
    }
  };

  const getStepIcon = (status?: string) => {
    if (status === 'completed') {
      return <Check className="h-5 w-5" />;
    }
    if (status === 'blocked') {
      return <AlertCircle className="h-5 w-5" />;
    }
    return <Circle className="h-5 w-5" />;
  };

  const handleStepClick = (stepId: string) => {
    setSelectedStep(selectedStep === stepId ? null : stepId);
  };

  const handleCompleteStep = async (stepId: string, stepFormData?: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      // TODO: Implement Laravel workflow step completion API
      // await dossierAPI.completeWorkflowStep(dossierId, stepId, stepFormData);

      toast.success('Étape complétée avec succès (API implémention en attente)');
      setSelectedStep(null);
      onUpdate();
    } catch (error: any) {
      console.error('Error completing step:', error);
      toast.error('Erreur lors de la complétion de l\'étape');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecision = async (stepId: string, decision: boolean, notes: string, stepFormData?: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      // TODO: Implement Laravel workflow decision API
      // await dossierAPI.recordWorkflowDecision(dossierId, stepId, decision, notes, stepFormData);

      toast.success(`Décision "${decision ? 'OUI' : 'NON'}" enregistrée (API implémention en attente)`);
      setSelectedStep(null);
      onUpdate();
    } catch (error: any) {
      console.error('Error recording decision:', error);
      toast.error('Erreur lors de l\'enregistrement de la décision');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedStepData = getSelectedStepData();
  const selectedStepProgress = selectedStep ? getStepProgress(selectedStep) : null;

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const progressRecord = getStepProgress(step.id);
        const isActive = selectedStep === step.id;
        const isLast = index === steps.length - 1;

        return (
          <div key={step.id} className="relative">
            {/* Vertical Line */}
            {!isLast && (
              <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-border">
                {progressRecord?.status === 'completed' && (
                  <div className="w-full bg-green-500 animate-progress-line" />
                )}
              </div>
            )}

            {/* Step Row */}
            <div className="flex gap-4">
              {/* Circle */}
              <button
                onClick={() => handleStepClick(step.id)}
                className={cn(
                  "relative flex-shrink-0 h-12 w-12 rounded-full border-2 flex items-center justify-center transition-all duration-300 hover:scale-110",
                  getStepColor(progressRecord?.status),
                  isActive && "ring-4 ring-primary/20 scale-110"
                )}
              >
                {getStepIcon(progressRecord?.status)}
                {progressRecord?.status === 'in_progress' && (
                  <span className="absolute -inset-1 rounded-full border-2 border-blue-500 animate-pulse-ring" />
                )}
              </button>

              {/* Step Info */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-base truncate">
                      {step.step_number}. {step.name}
                    </h4>
                    {step.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {step.description}
                      </p>
                    )}
                  </div>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                    progressRecord?.status === 'completed' && "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
                    progressRecord?.status === 'in_progress' && "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
                    progressRecord?.status === 'blocked' && "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
                    progressRecord?.status === 'skipped' && "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300",
                    !progressRecord?.status && "bg-muted text-muted-foreground"
                  )}>
                    {progressRecord?.status === 'completed' && 'Complété'}
                    {progressRecord?.status === 'in_progress' && 'En cours'}
                    {progressRecord?.status === 'blocked' && 'Bloqué'}
                    {progressRecord?.status === 'skipped' && 'Ignoré'}
                    {!progressRecord?.status && 'En attente'}
                  </span>
                </div>

                {/* Details Panel */}
                {isActive && selectedStepData && (
                  <div className="mt-4 animate-slide-in-right">
                    <WorkflowStepDetails
                      step={selectedStepData}
                      progress={selectedStepProgress}
                      onComplete={handleCompleteStep}
                      onDecision={handleDecision}
                      isSubmitting={isSubmitting}
                      nextSteps={getNextStepInfo(selectedStepData)}
                      onClose={() => setSelectedStep(null)}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default VerticalWorkflowTimeline;
