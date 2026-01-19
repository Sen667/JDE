import { useEffect, useState } from 'react';
import { dossierAPI } from '@/integrations/laravel/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, MessageSquare, TrendingUp, User, MapPin, DollarSign, Clock, AlertCircle, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import CaseTimeline from './CaseTimeline';
import TimelineTab from './TimelineTab';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';

interface OverviewTabProps {
  dossierId: string;
  worldId: string;
}

interface ClientInfo {
  client_type: string;
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  adresse_sinistre: string;
  type_sinistre: string;
  date_sinistre: string;
  compagnie_assurance: string;
  numero_police: string;
}

interface WorkflowStep {
  id: string;
  name: string;
  step_number: number;
  step_type: string;
  form_fields?: any[];
}

interface WorkflowProgress {
  id: string;
  dossier_id: string;
  workflow_step_id: string;
  status: string;
  started_at: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

const OverviewTab = ({ dossierId, worldId }: OverviewTabProps) => {
  const [stats, setStats] = useState({
    totalSteps: 0,
    completedSteps: 0,
    documentsCount: 0,
    commentsCount: 0,
    appointmentsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
  const [progress, setProgress] = useState<WorkflowProgress[]>([]);
  const [workflowLoading, setWorkflowLoading] = useState(true);
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [dossierDetails, setDossierDetails] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
  const initData = async () => {
    // Get basic dossier data first
    await fetchOverviewData();

    // Then get workflow data and update stats together
    await fetchWorkflowData();
    // fetchWorkflowData now calls updateProgressStats, so no need to call fetchStatsData again
  };
    initData();
  }, [dossierId]);

  const fetchOverviewData = async () => {
    try {
      // Fetch dossier details using Laravel API
      const dossierResult = await dossierAPI.getDossier(dossierId);
      const dossier = dossierResult.dossier;
      setDossierDetails(dossier);

      // Set client info from dossier relationship
      if (dossier?.client_info) {
        setClientInfo(dossier.client_info);
      }

      // Don't fetch stats here - wait for workflow data to load first
      // fetchStatsData() will be called after workflow data loads
    } catch (error) {
      console.error('Error fetching overview data:', error);
      // Set default stats
      setStats({
        totalSteps: 0,
        completedSteps: 0,
        documentsCount: 0,
        commentsCount: 0,
        appointmentsCount: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchNonWorkflowStats = async () => {
    try {
      // Fetch all stats in parallel using consistent API approach
      const [attachmentsResponse] = await Promise.all([
        dossierAPI.getAttachments(dossierId).catch(() => ({ attachments: [] }))
      ]);

      // Fetch comments and appointments separately to avoid breaking overview if one fails
      let commentsCount = 0;
      let appointmentsCount = 0;

      try {
        const commentsResponse = await fetch(`/api/dossiers/${dossierId}/comments`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (commentsResponse.ok) {
          const data = await commentsResponse.json();
          commentsCount = data.comments?.length || 0;
        }
      } catch (error) {
        console.warn('Comments API failed, using 0:', error);
        commentsCount = 0;
      }

      try {
        const appointmentsResponse = await fetch(`/api/dossiers/${dossierId}/appointments`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('auth_token')}` }
        });
        if (appointmentsResponse.ok) {
          const data = await appointmentsResponse.json();
          appointmentsCount = data.appointments?.length || 0;
        }
      } catch (error) {
        console.warn('Appointments API failed, using 0:', error);
        appointmentsCount = 0;
      }

      setStats(prev => ({
        ...prev,
        documentsCount: attachmentsResponse.attachments?.length || 0,
        commentsCount,
        appointmentsCount,
      }));
    } catch (error) {
      console.error(`Error fetching stats:`, error);
      // Keep default stats on error
    }
  };

  const updateProgressStats = (steps: WorkflowStep[], progress: WorkflowProgress[]) => {
    const completedSteps = progress.filter(p => p.status === 'completed').length;
    const totalSteps = steps.length;
    setStats(prev => ({
      ...prev,
      totalSteps,
      completedSteps,
      // Keep other stats as they are updated separately
    }));
  };

  const fetchWorkflowData = async () => {
    console.log("📊 OverviewTab fetchWorkflowData called with worldId:", worldId, "dossierId:", dossierId);
    setWorkflowLoading(true);
    try {
      // Try to fetch real workflow data first
      let realSteps: WorkflowStep[] = [];
      let realProgress: WorkflowProgress[] = [];

      if (worldId) {
        try {
          console.log("Fetching workflow data for worldId:", worldId, "dossierId:", dossierId);

          const [stepsResponse, progressResponse] = await Promise.all([
            fetch(`/api/worlds/${worldId}/workflow-steps`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                'Accept': 'application/json',
              },
            }),
            fetch(`/api/dossiers/${dossierId}/progress`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                'Accept': 'application/json',
              },
            })
          ]);

          console.log("Steps response status:", stepsResponse.status, "url:", `/api/worlds/${worldId}/workflow-steps`);
          console.log("Progress response status:", progressResponse.status, "url:", `/api/dossiers/${dossierId}/progress`);

          // CRITICAL: Force fresh progress data - never cache progress!
          console.log("🔄 MAKING FRESH PROGRESS API CALL...");
          const freshProgressResponse = await fetch(`/api/dossiers/${dossierId}/progress`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
              'Accept': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
            },
          });
          console.log("🔄 Fresh progress response received, status:", freshProgressResponse.status);
          console.log("🔄 Fresh progress response ok:", freshProgressResponse.ok);

          if (!stepsResponse.ok) {
            console.error("Steps API failed:", await stepsResponse.clone().text());
          }

          if (!progressResponse.ok) {
            console.error("Progress API failed:", await progressResponse.clone().text());
          }

          if (stepsResponse.ok) {
            const stepsData = await stepsResponse.json();
            if (stepsData?.steps && stepsData.steps.length > 0) {
              console.log("Loaded workflow steps from API:", stepsData.steps);
              // Ensure all steps have valid IDs (UUIDs or fallback with consistent naming)
              realSteps = stepsData.steps.map((step: any) => ({
                ...step,
                id: step.id || `fallback-step-${step.step_number || 1}`,
                // Parse form_fields if it's a JSON string
                form_fields: step.form_fields ?
                  (Array.isArray(step.form_fields) ? step.form_fields : JSON.parse(step.form_fields || '[]')) :
                  []
              }));
              console.log("✅ Fixed workflow steps with proper IDs:", realSteps);
            }
          }

          if (freshProgressResponse.ok) {
            const progressData = await freshProgressResponse.json();
            console.log("🔄 Loaded FRESH workflow progress from API:", progressData.progress);
            if (progressData?.progress && progressData.progress.length > 0) {
              realProgress = progressData.progress;
            }
          }
        } catch (apiError) {
          console.warn('API calls failed, using default workflow:', apiError);
        }
      }

      // Try to get real steps if API failed but might have steps in database
      if (realSteps.length === 0 && worldId) {
        try {
          // Try a direct query to get workflow steps by world
          const directResponse = await fetch(`/api/worlds/${worldId}/workflow-steps`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
              'Accept': 'application/json',
            },
          });

          if (directResponse.ok) {
            const data = await directResponse.json();
            if (data?.steps && data.steps.length > 0) {
              console.log("Direct API call successful, using real steps:", data.steps);
              realSteps = data.steps;
            }
          }
        } catch (directError) {
          console.warn("Direct API call also failed:", directError);
        }
      }

      if (realSteps.length > 0) {
        // Use real workflow data from API
        console.log("Using real workflow steps from API");
        setWorkflowSteps(realSteps);

        // If no progress exists, actually create initial progress in database
        if (realProgress.length === 0 && realSteps.length > 0) {
          const firstStep = realSteps.find(step => step.step_number === 1);
          if (firstStep) {
            console.log("📝 Creating initial progress in database for:", firstStep.name);

            try {
              // Actually create the progress record in the database via API
              const createProgressResponse = await fetch(`/api/dossiers/${dossierId}/workflow/create-initial-progress`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  dossier_id: dossierId,
                  workflow_step_id: String(firstStep.id),
                  status: 'in_progress'
                }),
              });

              if (createProgressResponse.ok) {
                const newProgressData = await createProgressResponse.json();
                console.log("✅ Actually created initial progress in database:", newProgressData.progress);
                realProgress = [newProgressData.progress];
              } else {
                console.error("❌ Failed to create initial progress:", await createProgressResponse.text());
              }
            } catch (error) {
              console.error("❌ Error creating initial progress:", error);
            }
          }
        }

        setProgress(realProgress);

        // Update progress stats with the new workflow data
        updateProgressStats(realSteps, realProgress);

        // Also fetch non-workflow stats (documents, comments, appointments) now that we have all data
        await fetchNonWorkflowStats();

        // REMOVED: All fallback hardcoded workflow steps
        // Now the frontend will only use REAL workflow steps from the database
        // If APIs return empty data, timeline won't show any workflow steps
        // This is better than showing fake hardcoded data
      } else {
        // No workflow steps found, set empty stats
        updateProgressStats([], []);
      }
    } catch (error) {
      console.error('Error fetching workflow data:', error);
      // REMOVED: Any fallback hardcoded workflow steps on errors
      // Let the system show no workflow steps instead of fake ones
      setWorkflowSteps([]);
      setProgress([]);
      updateProgressStats([], []);
    } finally {
      // Only set loading to false after all stats are loaded
      await fetchNonWorkflowStats();
      setWorkflowLoading(false);
    }
  };

  // Auto-create the first workflow step when dossier is opened for the first time
  const createInitialWorkflowStepIfNeeded = async () => {
    if (!worldId || !dossierId) return;

    try {
      // Check if any workflow progress exists for this dossier
      const progressResponse = await fetch(`/api/dossiers/${dossierId}/progress`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Accept': 'application/json',
        },
      });

      if (progressResponse.ok) {
        const progressData = await progressResponse.json();
        if (progressData?.progress && progressData.progress.length > 0) {
          // Progress already exists, don't create initial step
          return;
        }
      }

      // Get the first workflow step from the template
      const stepsResponse = await fetch(`/api/worlds/${worldId}/workflow-steps`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Accept': 'application/json',
        },
      });

      if (stepsResponse.ok) {
        const stepsData = await stepsResponse.json();
        if (stepsData?.steps && stepsData.steps.length > 0) {
          const firstStep = stepsData.steps.find((step: any) => step.step_number === 1);
          if (firstStep) {
            // Use the existing step completion API to initialize the workflow
            // This will auto-create the progress record since none exists
            try {
              const completionResponse = await fetch(`/api/dossiers/${dossierId}/workflow/complete-step`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  dossier_id: dossierId,
                  workflow_step_id: firstStep.id,
                  notes: 'Initialisation automatique du workflow',
                  decision: null,
                }),
              });

              if (completionResponse.ok) {
                console.log("✓ Auto-initialized workflow with first step:", firstStep.name);
              }
            } catch (completionError) {
              console.warn("Failed to auto-complete initial step:", completionError);
            }
          }
        }
      }
    } catch (error) {
      console.warn("Failed to auto-create initial workflow step:", error);
    }
  };

  const progressPercentage = stats.totalSteps > 0
    ? Math.round((stats.completedSteps / stats.totalSteps) * 100)
    : 0;

  if (loading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getClientTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      locataire: 'Locataire',
      proprietaire: 'Propriétaire',
      proprietaire_non_occupant: 'Propriétaire non occupant',
      professionnel: 'Professionnel',
    };
    return labels[type] || type;
  };

  const getWorldBackgroundClass = (world?: string) => {
    switch (world?.toLowerCase()) {
      case 'jde':
        return 'bg-red-50/70 dark:bg-red-950/30';
      case 'jdmo':
        return 'bg-orange-50/70 dark:bg-orange-950/30';
      case 'dbcs':
        return 'bg-green-50/70 dark:bg-green-950/30';
      default:
        return '';
    }
  };

  const getClientCardColors = (world?: string, cardType?: string) => {
    const worldCode = world?.toUpperCase();
    
    // Carte "Info Client"
    if (cardType === 'info-client') {
      if (worldCode === 'JDE') {
        return { border: 'border-l-fuchsia-500', icon: 'bg-fuchsia-500/10', iconText: 'text-fuchsia-500' };
      } else if (worldCode === 'JDMO') {
        return { border: 'border-l-teal-500', icon: 'bg-teal-500/10', iconText: 'text-teal-500' };
      } else if (worldCode === 'DBCS') {
        return { border: 'border-l-cyan-500', icon: 'bg-cyan-500/10', iconText: 'text-cyan-500' };
      }
      return { border: 'border-l-green-500', icon: 'bg-green-500/10', iconText: 'text-green-500' };
    }
    
    // Carte "Sinistre"
    if (cardType === 'sinistre') {
      if (worldCode === 'JDE') {
        return { border: 'border-l-rose-500', icon: 'bg-rose-500/10', iconText: 'text-rose-500' };
      } else if (worldCode === 'JDMO') {
        return { border: 'border-l-amber-500', icon: 'bg-amber-500/10', iconText: 'text-amber-500' };
      } else if (worldCode === 'DBCS') {
        return { border: 'border-l-violet-500', icon: 'bg-violet-500/10', iconText: 'text-violet-500' };
      }
      return { border: 'border-l-orange-500', icon: 'bg-orange-500/10', iconText: 'text-orange-500' };
    }
    
    // Carte "Assurance" (identique pour tous)
    if (cardType === 'assurance') {
      return { border: 'border-l-sky-500', icon: 'bg-sky-500/10', iconText: 'text-sky-500' };
    }
    
    // Carte "Infos Générales" (identique pour tous)
    if (cardType === 'general') {
      return { border: 'border-l-pink-500', icon: 'bg-pink-500/10', iconText: 'text-pink-500' };
    }
    
    return { border: 'border-l-gray-500', icon: 'bg-gray-500/10', iconText: 'text-gray-500' };
  };

  return (
    <div className="space-y-6 p-4">{/* Removed max-w-7xl for full width */}
      {/* En-tête du dossier avec informations client */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg mb-1">{dossierDetails?.reference || 'Chargement...'}</CardTitle>
                <CardDescription className="text-sm">
                  {clientInfo ? `${clientInfo.prenom} ${clientInfo.nom}` : 'Aucune information client'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base mb-1">Progression</CardTitle>
                    <CardDescription className="text-xs">
                      {stats.completedSteps}/{stats.totalSteps} étapes
                    </CardDescription>
                  </div>
                  <div className="text-2xl font-bold text-blue-500">{progressPercentage}%</div>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-around">
              <div className="text-center">
                <div className="text-xl font-bold text-purple-500">{stats.documentsCount}</div>
                <p className="text-xs text-muted-foreground">Docs</p>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-500">{stats.appointmentsCount}</div>
                <p className="text-xs text-muted-foreground">RDV</p>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-500">{stats.commentsCount}</div>
                <p className="text-xs text-muted-foreground">Comm.</p>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Informations détaillées en grille */}
      {clientInfo && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Informations Client */}
          <Card className={`border-l-4 ${getClientCardColors(dossierDetails?.worlds?.name, 'info-client').border}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg ${getClientCardColors(dossierDetails?.worlds?.name, 'info-client').icon} flex items-center justify-center flex-shrink-0`}>
                  <User className={`h-4 w-4 ${getClientCardColors(dossierDetails?.worlds?.name, 'info-client').iconText}`} />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-sm mb-1">Informations Client</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div>
                <p className="text-muted-foreground">Téléphone</p>
                <p className="font-medium">{clientInfo?.telephone || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Email</p>
                <p className="font-medium truncate">{clientInfo?.email || '-'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Informations Sinistre */}
          <Card className={`border-l-4 ${getClientCardColors(dossierDetails?.worlds?.name, 'sinistre').border}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg ${getClientCardColors(dossierDetails?.worlds?.name, 'sinistre').icon} flex items-center justify-center flex-shrink-0`}>
                  <AlertCircle className={`h-4 w-4 ${getClientCardColors(dossierDetails?.worlds?.name, 'sinistre').iconText}`} />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-sm mb-1">Détails Sinistre</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div>
                <p className="text-muted-foreground">Type</p>
                <p className="font-medium">{clientInfo?.type_sinistre || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Date</p>
                <p className="font-medium">
                  {clientInfo?.date_sinistre ? format(new Date(clientInfo.date_sinistre), 'dd/MM/yyyy') : '-'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Informations Assurance */}
          <Card className={`border-l-4 ${getClientCardColors(dossierDetails?.worlds?.name, 'assurance').border}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg ${getClientCardColors(dossierDetails?.worlds?.name, 'assurance').icon} flex items-center justify-center flex-shrink-0`}>
                  <Shield className={`h-4 w-4 ${getClientCardColors(dossierDetails?.worlds?.name, 'assurance').iconText}`} />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-sm mb-1">Assurance</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div>
                <p className="text-muted-foreground">Compagnie</p>
                <p className="font-medium">{clientInfo?.compagnie_assurance || '-'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">N° de police</p>
                <p className="font-medium">{clientInfo?.numero_police || '-'}</p>
              </div>
            </CardContent>
          </Card>

          {/* Informations Générales */}
          <Card className={`border-l-4 ${getClientCardColors(dossierDetails?.worlds?.name, 'general').border}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-lg ${getClientCardColors(dossierDetails?.worlds?.name, 'general').icon} flex items-center justify-center flex-shrink-0`}>
                  <Clock className={`h-4 w-4 ${getClientCardColors(dossierDetails?.worlds?.name, 'general').iconText}`} />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-sm mb-1">Infos Générales</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div>
                <p className="text-muted-foreground">Créé le</p>
                <p className="font-medium">
                  {dossierDetails?.created_at ? format(new Date(dossierDetails.created_at), 'dd/MM/yy') : '-'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Durée</p>
                <p className="font-medium">
                  {dossierDetails?.created_at
                    ? `${Math.floor((new Date().getTime() - new Date(dossierDetails.created_at).getTime()) / (1000 * 60 * 60 * 24))} j`
                    : '-'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TIMELINE ENRICHIE - ZONE PRINCIPALE CENTRALE EN GRAND */}
      {workflowLoading ? (
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              Timeline Enrichie du Dossier
            </CardTitle>
            <CardDescription>
              Historique complet avec tableau blanc interactif
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : workflowSteps.length === 0 ? (
        <Card className={`border-l-4 border-l-primary ${getWorldBackgroundClass(dossierDetails?.worlds?.name)}`}>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              Chronologie du Dossier
            </CardTitle>
            <CardDescription>
              Historique complet des activités - Documents, commentaires, tâches, rendez-vous
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <TimelineTab dossierId={dossierId} />
          </CardContent>
        </Card>
      ) : (
        <Card className={`border-l-4 border-l-primary ${getWorldBackgroundClass(dossierDetails?.worlds?.name)}`}>
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              Timeline Enrichie du Dossier
            </CardTitle>
            <CardDescription>
              Historique complet avec tableau blanc interactif - Étapes, documents, rendez-vous, annotations
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {(() => {
              console.log("🔄 Rendering CaseTimeline with:", {
                workflowStepsCount: workflowSteps.length,
                progressCount: progress.length,
                firstStep: workflowSteps[0],
                firstProgress: progress[0],
                enrichedStepsWillUpdate: workflowSteps.length > 0 && progress.length > 0
              });
              return (
                <CaseTimeline
                  key={`timeline-${dossierId}-${progress.length}-${workflowSteps.length}`}
                  dossierId={dossierId}
                  steps={workflowSteps}
                  progress={progress}
                  world={dossierDetails?.worlds?.code}
                  onUpdate={async () => {
                    console.log("🔄 CaseTimeline triggering refresh...");
                    // Force fresh data fetch - bypass any caching
                    setWorkflowSteps([]);
                    setProgress([]);
                    setStats(prev => ({ ...prev, totalSteps: 0, completedSteps: 0 }));

                    await fetchOverviewData();
                    console.log("🔄 Overview data refreshed");
                    await fetchWorkflowData();
                    console.log("🔄 Workflow data refreshed");

                    // Force immediate re-render check
                    console.log("🔄 Final state check:", {
                      workflowStepsCount: workflowSteps.length,
                      progressCount: progress.length,
                      firstProgress: progress[0],
                      secondProgress: progress[1]
                    });
                  }}
                />
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default OverviewTab;
