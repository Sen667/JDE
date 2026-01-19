import { useState } from 'react';
import { dossierAPI } from '@/integrations/laravel/api';
import { useAuthStore } from '@/lib/store';
import { toast } from 'sonner';
import WorkflowStepCircle from './WorkflowStepCircle';
import WorkflowStepDetails from './WorkflowStepDetails';

interface HorizontalWorkflowTimelineProps {
  steps: any[];
  progress: any[];
  dossierId: string;
  onUpdate: () => void;
}

const HorizontalWorkflowTimeline = ({ steps, progress, dossierId, onUpdate }: HorizontalWorkflowTimelineProps) => {
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

  const getDecisionPath = (decisionStep: any) => {
    const decisionProgress = getStepProgress(decisionStep.id);
    if (!decisionProgress || decisionProgress.status !== 'completed') {
      return null;
    }

    // Check which path was taken based on workflow history
    // This is a simplified check - in practice you'd check the decision field
    // For now, we'll determine based on which subsequent steps were completed
    const yesStep = steps.find(s => s.id === decisionStep.decision_yes_next_step_id);
    const noStep = steps.find(s => s.id === decisionStep.decision_no_next_step_id);

    const yesProgress = yesStep ? getStepProgress(yesStep.id) : null;
    const noProgress = noStep ? getStepProgress(noStep.id) : null;

    // If yes path has progress, it was chosen
    if (yesProgress && (yesProgress.status === 'completed' || yesProgress.status === 'in_progress')) {
      return { chosen: 'yes', yes: yesStep, no: noStep };
    }
    // If no path has progress, it was chosen
    if (noProgress && (noProgress.status === 'completed' || noProgress.status === 'in_progress')) {
      return { chosen: 'no', yes: yesStep, no: noStep };
    }

    return { chosen: null, yes: yesStep, no: noStep };
  };

  const isStepInChosenPath = (stepId: string, decisionStep: any) => {
    const path = getDecisionPath(decisionStep);
    if (!path || !path.chosen) return true; // Show all if no decision made yet

    if (path.chosen === 'yes') {
      return stepId === path.yes?.id;
    } else {
      return stepId === path.no?.id;
    }
  };

  const hasDocumentGeneration = (step: any) => {
    if (!step.auto_actions) return false;
    try {
      const actions = JSON.parse(step.auto_actions);
      return Array.isArray(actions) && actions.some(action =>
        action.type === 'generate_document' && action.documentType
      );
    } catch {
      return false;
    }
  };

  const handleStepClick = (stepId: string) => {
    const progressRecord = getStepProgress(stepId);
    if (progressRecord?.status === 'completed') {
      // Allow viewing completed steps
      setSelectedStep(selectedStep === stepId ? null : stepId);
    } else {
      setSelectedStep(selectedStep === stepId ? null : stepId);
    }
  };

  const handleCompleteStep = async (stepId: string, stepFormData?: Record<string, any>) => {
    setIsSubmitting(true);
    try {
      // Prepare the data to send to the backend
      const completionData: any = {
        workflow_step_id: stepId,
        notes: stepFormData?.notes || '',
      };

      // Add form data if provided (for document generation steps)
      if (stepFormData && Object.keys(stepFormData).length > 0) {
        completionData.form_data = stepFormData;
      }

      // Call the backend API to complete the workflow step
      await dossierAPI.completeWorkflowStep(dossierId, completionData);

      toast.success('Étape complétée avec succès');
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
      // Prepare the data to send to the backend
      const decisionData: any = {
        workflow_step_id: stepId,
        decision: decision,
        notes: notes || '',
      };

      // Add form data if provided
      if (stepFormData && Object.keys(stepFormData).length > 0) {
        decisionData.form_data = stepFormData;
      }

      // Call the backend API to record the workflow decision
      await dossierAPI.completeWorkflowStep(dossierId, decisionData);

      toast.success(`Décision "${decision ? 'OUI' : 'NON'}" enregistrée`);
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

  // Group steps by decision branches for better visualization
  const renderTimeline = () => {
    const renderedSteps = new Set<string>();
    const decisionBranches: any[] = [];

    return (
      <div className="relative w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        <div className="flex flex-col gap-8 px-4 py-2">
          {/* Main timeline */}
          <div className="flex items-center gap-4">
            {steps.map((step, index) => {
              const progressRecord = getStepProgress(step.id);
              const isActive = selectedStep === step.id;
              const isLast = index === steps.length - 1;

              // Skip steps that are in non-chosen decision branches
              if (step.requires_decision) {
                const path = getDecisionPath(step);
                if (path && path.chosen) {
                  // This step is a decision point, render it normally
                }
              } else {
                // Check if this step is in a non-chosen branch
                const precedingDecisions = steps.slice(0, index).filter(s => s.requires_decision);
                const isInChosenPath = precedingDecisions.every(decisionStep =>
                  isStepInChosenPath(step.id, decisionStep)
                );

                if (!isInChosenPath) {
                  // Render as faded/non-chosen branch
                  return (
                    <div key={step.id} className="opacity-50">
                      <WorkflowStepCircle
                        step={step}
                        progress={progressRecord}
                        isActive={false}
                        onClick={() => handleStepClick(step.id)}
                        isLast={isLast}
                        isOptional={step.is_optional}
                        isSkipped={progressRecord?.status === 'skipped'}
                        showDocumentGeneration={hasDocumentGeneration(step)}
                      />
                    </div>
                  );
                }
              }

              renderedSteps.add(step.id);

              return (
                <WorkflowStepCircle
                  key={step.id}
                  step={step}
                  progress={progressRecord}
                  isActive={isActive}
                  onClick={() => handleStepClick(step.id)}
                  isLast={isLast}
                  isOptional={step.is_optional}
                  isSkipped={progressRecord?.status === 'skipped'}
                  showDocumentGeneration={hasDocumentGeneration(step)}
                />
              );
            })}
          </div>

          {/* Decision branches visualization */}
          {steps.filter(step => step.requires_decision).map(decisionStep => {
            const path = getDecisionPath(decisionStep);
            if (!path) return null;

            return (
              <div key={`branches-${decisionStep.id}`} className="ml-8 border-l-2 border-dashed border-muted pl-8">
                <div className="text-xs text-muted-foreground mb-2 font-medium">
                  Branches depuis: {decisionStep.name}
                </div>

                {/* Yes branch */}
                {path.yes && (
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                      <div className={`w-3 h-3 rounded-full ${path.chosen === 'yes' ? 'bg-green-500' : 'bg-muted'}`} />
                      <span className={`font-medium ${path.chosen === 'yes' ? 'text-green-700' : 'text-muted-foreground'}`}>
                        OUI
                      </span>
                    </div>
                    <WorkflowStepCircle
                      step={path.yes}
                      progress={getStepProgress(path.yes.id)}
                      isActive={selectedStep === path.yes.id}
                      onClick={() => handleStepClick(path.yes.id)}
                      isLast={false}
                      isOptional={path.yes.is_optional}
                      isSkipped={getStepProgress(path.yes.id)?.status === 'skipped'}
                      showDocumentGeneration={hasDocumentGeneration(path.yes)}
                    />
                    {/* Show subsequent steps in this branch */}
                    {steps
                      .filter(s => s.id !== path.yes.id && !renderedSteps.has(s.id))
                      .slice(0, 3) // Limit to avoid clutter
                      .map(step => (
                        <div key={step.id} className="opacity-75">
                          <WorkflowStepCircle
                            step={step}
                            progress={getStepProgress(step.id)}
                            isActive={false}
                            onClick={() => handleStepClick(step.id)}
                            isLast={false}
                          />
                        </div>
                      ))
                    }
                  </div>
                )}

                {/* No branch */}
                {path.no && (
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <div className={`w-3 h-3 rounded-full ${path.chosen === 'no' ? 'bg-red-500' : 'bg-muted'}`} />
                      <span className={`font-medium ${path.chosen === 'no' ? 'text-red-700' : 'text-muted-foreground'}`}>
                        NON
                      </span>
                    </div>
                    <WorkflowStepCircle
                      step={path.no}
                      progress={getStepProgress(path.no.id)}
                      isActive={selectedStep === path.no.id}
                      onClick={() => handleStepClick(path.no.id)}
                      isLast={false}
                      isOptional={path.no.is_optional}
                      isSkipped={getStepProgress(path.no.id)?.status === 'skipped'}
                      showDocumentGeneration={hasDocumentGeneration(path.no)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 relative">
      {/* Horizontal Timeline with Decision Branches */}
      {renderTimeline()}

      {/* Details Panel */}
      {selectedStep && selectedStepData && (
        <WorkflowStepDetails
          step={selectedStepData}
          progress={selectedStepProgress}
          onComplete={handleCompleteStep}
          onDecision={handleDecision}
          isSubmitting={isSubmitting}
          nextSteps={getNextStepInfo(selectedStepData)}
          onClose={() => setSelectedStep(null)}
        />
      )}
    </div>
  );
};

export default HorizontalWorkflowTimeline;
