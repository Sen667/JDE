import { useMemo, useState, useEffect } from "react";
import {
  MessageCircle,
  FileText,
  CalendarClock,
  CheckSquare,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  Loader2,
  MessageSquare,
  Calendar,
  ListTodo,
  User,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { dossierAPI } from "@/integrations/laravel/api";
import { supabase } from "@/integrations/laravel/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import WorkflowStepDetails from "./WorkflowStepDetails";
import { AddCommentDialog } from "./AddCommentDialog";
import { AddTaskDialog } from "./AddTaskDialog";
import { AddAppointmentDialog } from "./AddAppointmentDialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { UnifiedItemDialog } from "./UnifiedItemDialog";

/**
 * Étape principale de la timeline
 */
type StepStatus = "completed" | "in_progress" | "pending" | "blocked";

type Step = {
  id: string;
  order: number;
  name: string;
  description: string | null;
  step_type: string;
  status: StepStatus;
  completed_at: string | null;
  started_at: string | null;
  // Additional workflow properties
  form_fields?: any[];
  metadata?: any;
  requires_decision?: boolean;
  is_optional?: boolean;
  can_loop_back?: boolean;
  next_step_id?: string;
  decision_yes_next_step_id?: string;
  decision_no_next_step_id?: string;
  // Rollback properties
  rollback_reason?: string;
  rolled_back_at?: string;
  rolled_back_by?: string;
  rollback_count?: number;
};

/**
 * Élément intermédiaire entre deux étapes
 */
type TimelineItemType = "comment" | "document" | "task" | "appointment" | "annotation";

type TimelineItem = {
  id: string;
  type: TimelineItemType;
  title: string;
  content: string;
  createdAt: string;
  createdById: string;
  fromUser: string;
  fromUserAvatar?: string;
  toUser?: string;
  toUserAvatar?: string;
  afterStepId: string;
  metadata?: any;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  assignedToId?: string;
  startTime?: string;
  endTime?: string;
};

interface CaseTimelineProps {
  dossierId: string;
  steps: any[];
  progress: any[];
  onUpdate: () => void;
  world?: string;
}

/**
 * Utils
 */
function formatDate(dateString: string) {
  const d = new Date(dateString);
  return format(d, "d MMM yyyy, HH:mm", { locale: fr });
}

function getStepColors(status: StepStatus, world?: string) {
  const worldCode = world?.toUpperCase();

  switch (status) {
    case "completed":
      // JDE: fuchsia, JDMO: teal, DBCS: cyan
      if (worldCode === "JDE") {
        return {
          badgeBg: "bg-fuchsia-500",
          badgeRing: "ring-fuchsia-100",
          chipBg: "bg-fuchsia-50",
          chipText: "text-fuchsia-700",
        };
      } else if (worldCode === "JDMO") {
        return {
          badgeBg: "bg-teal-500",
          badgeRing: "ring-teal-100",
          chipBg: "bg-teal-50",
          chipText: "text-teal-700",
        };
      } else if (worldCode === "DBCS") {
        return {
          badgeBg: "bg-cyan-500",
          badgeRing: "ring-cyan-100",
          chipBg: "bg-cyan-50",
          chipText: "text-cyan-700",
        };
      }
      return {
        badgeBg: "bg-emerald-500",
        badgeRing: "ring-emerald-100",
        chipBg: "bg-emerald-50",
        chipText: "text-emerald-700",
      };
    case "in_progress":
      // Indigo pour tous les mondes
      return {
        badgeBg: "bg-indigo-500",
        badgeRing: "ring-indigo-100",
        chipBg: "bg-indigo-50",
        chipText: "text-indigo-700",
      };
    case "blocked":
      // JDE: amber, JDMO/DBCS: rose
      if (worldCode === "JDE") {
        return {
          badgeBg: "bg-amber-600",
          badgeRing: "ring-amber-100",
          chipBg: "bg-amber-50",
          chipText: "text-amber-700",
        };
      }
      return {
        badgeBg: "bg-rose-600",
        badgeRing: "ring-rose-100",
        chipBg: "bg-rose-50",
        chipText: "text-rose-700",
      };
    default:
      return {
        badgeBg: "bg-slate-300",
        badgeRing: "ring-slate-100",
        chipBg: "bg-slate-50",
        chipText: "text-slate-600",
      };
  }
}

function getWorldBackgroundClass(world?: string) {
  switch (world?.toLowerCase()) {
    case 'jde':
      return 'bg-red-50/50 dark:bg-red-950/20';
    case 'jdmo':
      return 'bg-orange-50/50 dark:bg-orange-950/20';
    case 'dbcs':
      return 'bg-green-50/50 dark:bg-green-950/20';
    default:
      return 'bg-slate-50/50 dark:bg-slate-950/20';
  }
}

function getItemIcon(type: TimelineItemType) {
  switch (type) {
    case "comment":
      return <MessageCircle className="w-4 h-4" />;
    case "document":
      return <FileText className="w-4 h-4" />;
    case "task":
      return <CheckSquare className="w-4 h-4" />;
    case "appointment":
      return <CalendarClock className="w-4 h-4" />;
    case "annotation":
      return <MessageCircle className="w-4 h-4" />;
    default:
      return <MessageCircle className="w-4 h-4" />;
  }
}

function getTaskStatusColors(status?: string) {
  switch (status) {
    case "todo":
      return {
        bg: "bg-slate-100",
        text: "text-slate-700",
        border: "border-slate-300",
        icon: "text-slate-600"
      };
    case "in_progress":
      return {
        bg: "bg-blue-100",
        text: "text-blue-700",
        border: "border-blue-300",
        icon: "text-blue-600"
      };
    case "done":
      return {
        bg: "bg-green-100",
        text: "text-green-700",
        border: "border-green-300",
        icon: "text-green-600"
      };
    case "cancelled":
      return {
        bg: "bg-red-100",
        text: "text-red-700",
        border: "border-red-300",
        icon: "text-red-600"
      };
    default:
      return {
        bg: "bg-slate-100",
        text: "text-slate-700",
        border: "border-slate-300",
        icon: "text-slate-600"
      };
  }
}

function getTaskStatusLabel(status?: string) {
  switch (status) {
    case "todo": return "À faire";
    case "in_progress": return "En cours";
    case "done": return "Terminée";
    case "cancelled": return "Annulée";
    default: return "À faire";
  }
}

function getTaskStatusIcon(status?: string) {
  switch (status) {
    case "todo": return "○";
    case "in_progress": return "⏳";
    case "done": return "✓";
    case "cancelled": return "✗";
    default: return "○";
  }
}

function getItemColors(type: TimelineItemType, world?: string) {
  const worldCode = world?.toUpperCase();

  switch (type) {
    case "comment":
      // JDE: rose, JDMO: amber, DBCS: violet
      if (worldCode === "JDE") {
        return {
          bg: "bg-rose-50",
          text: "text-rose-700",
          border: "border-rose-200",
        };
      } else if (worldCode === "JDMO") {
        return {
          bg: "bg-amber-50",
          text: "text-amber-700",
          border: "border-amber-200",
        };
      } else if (worldCode === "DBCS") {
        return {
          bg: "bg-violet-50",
          text: "text-violet-700",
          border: "border-violet-200",
        };
      }
      return {
        bg: "bg-orange-50",
        text: "text-orange-700",
        border: "border-orange-200",
      };
    case "document":
      return {
        bg: "bg-purple-50",
        text: "text-purple-700",
        border: "border-purple-200",
      };
    case "task":
      return {
        bg: "bg-blue-50",
        text: "text-blue-700",
        border: "border-blue-200",
      };
    case "appointment":
      // JDE: violet, JDMO: teal, DBCS: cyan
      if (worldCode === "JDE") {
        return {
          bg: "bg-violet-50",
          text: "text-violet-700",
          border: "border-violet-200",
        };
      } else if (worldCode === "JDMO") {
        return {
          bg: "bg-teal-50",
          text: "text-teal-700",
          border: "border-teal-200",
        };
      } else if (worldCode === "DBCS") {
        return {
          bg: "bg-cyan-50",
          text: "text-cyan-700",
          border: "border-cyan-200",
        };
      }
      return {
        bg: "bg-green-50",
        text: "text-green-700",
        border: "border-green-200",
      };
    case "annotation":
      return {
        bg: "bg-pink-50",
        text: "text-pink-700",
        border: "border-pink-200",
      };
    default:
      return {
        bg: "bg-slate-50",
        text: "text-slate-700",
        border: "border-slate-200",
      };
  }
}

function getItemTypeLabel(type: TimelineItemType) {
  const labels: Record<TimelineItemType, string> = {
    comment: "Commentaire",
    document: "Document",
    task: "Tâche",
    appointment: "RDV",
    annotation: "Note",
  };
  return labels[type];
}

// Fallback workflow step utilities - COMPLETE JDE 16-STEP WORKFLOW
function getFallbackStepName(stepIndex: number): string {
  const names: Record<number, string> = {
    1: "Réception du dossier",
    2: "Analyse initiale",
    3: "Envoi Convention/Mandat",
    4: "Convention signée?",
    5: "Relance convention",
    6: "Planification reconnaissance/expertise",
    7: "Réalisation reconnaissance",
    8: "Rédaction rapport d'expertise",
    9: "Envoi rapport au client",
    10: "Validation client?",
    11: "Modifications rapport",
    12: "Préparation EDP CONTENU",
    13: "Mise en cause assurance",
    14: "Suivi négociation indemnisation",
    15: "Accord indemnisation?",
    16: "Versement indemnité"
  };
  return names[stepIndex] || `Étape ${stepIndex}`;
}

function getFallbackStepDescription(stepIndex: number): string {
  const descriptions: Record<number, string> = {
    1: "Réception initiale et création du dossier dans le système",
    2: "Vérification de la complétude du dossier et des informations reçues",
    3: "Envoi de la convention ou du mandat au client pour signature",
    4: "Décision: Vérification de la réception de la convention signée",
    5: "Relance du client pour obtenir la convention signée",
    6: "Organisation du rendez-vous pour la reconnaissance des dégâts",
    7: "Visite sur place et constatation des dégâts",
    8: "Rédaction et validation du rapport d'expertise détaillé",
    9: "Transmission du rapport d'expertise au client",
    10: "Décision: Le client valide-t-il le rapport et les préconisations?",
    11: "Modifications du rapport suite aux remarques du client",
    12: "Préparation de l'état des pertes et dommages",
    13: "Envoi de la mise en cause et du dossier à la compagnie d'assurance",
    14: "Suivi des échanges avec l'assurance et négociation de l'indemnisation",
    15: "Décision: Un accord a-t-il été trouvé avec l'assurance?",
    16: "Vérification du versement de l'indemnité au client"
  };
  return descriptions[stepIndex] || 'Description non disponible';
}

function getFallbackStepFormFields(stepIndex: number): any[] {
  const formFields: Record<number, any[]> = {
    1: [ // Réception du dossier
      {"name": "date_reception", "type": "date", "label": "Date de réception", "required": true},
      {"name": "origine", "type": "select", "label": "Origine du dossier", "options": ["Email", "Téléphone", "Courrier", "Plateforme"], "required": true}
    ],
    2: [ // Analyse initiale
      {"name": "complet", "type": "select", "label": "Dossier complet?", "options": ["Oui", "Non - Documents manquants", "Non - Informations manquantes"], "required": true},
      {"name": "priorite", "type": "select", "label": "Priorité", "options": ["Normale", "Urgente", "Très urgente"], "required": true}
    ],
    3: [ // Envoi Convention/Mandat
      {"name": "type_document", "type": "select", "label": "Type de document", "options": ["Convention", "Mandat"], "required": true},
      {"name": "mode_envoi", "type": "select", "label": "Mode d'envoi", "options": ["Email", "Courrier", "Plateforme signature électronique"], "required": true}
    ],
    4: [], // Convention signée? (Decision step - no form fields)
    5: [ // Relance convention
      {"name": "type_relance", "type": "select", "label": "Type de relance", "options": ["Email", "Téléphone", "SMS"], "required": true},
      {"name": "nombre_relances", "type": "number", "label": "Nombre de relances effectuées", "required": true}
    ],
    6: [ // Planification reconnaissance/expertise
      {"name": "date_rdv", "type": "date", "label": "Date du RDV", "required": true},
      {"name": "expert_assigne", "type": "text", "label": "Expert assigné", "required": true},
      {"name": "lieu_rdv", "type": "textarea", "label": "Lieu du rendez-vous", "required": true}
    ],
    7: [ // Réalisation reconnaissance
      {"name": "date_realisation", "type": "date", "label": "Date de réalisation", "required": true},
      {"name": "constats", "type": "textarea", "label": "Constats effectués", "required": true}
    ],
    8: [ // Rédaction rapport d'expertise
      {"name": "montant_estime", "type": "number", "label": "Montant estimé des travaux (€)", "required": true},
      {"name": "delai_travaux", "type": "text", "label": "Délai estimé des travaux", "required": true}
    ],
    9: [ // Envoi rapport au client
      {"name": "mode_envoi", "type": "select", "label": "Mode d'envoi", "options": ["Email", "Courrier", "Remise en main propre"], "required": true}
    ],
    10: [], // Validation client? (Decision step - no form fields)
    11: [ // Modifications rapport
      {"name": "modifications", "type": "textarea", "label": "Modifications demandées", "required": true}
    ],
    12: [ // Préparation EDP CONTENU
      {"name": "type_edp", "type": "select", "label": "Type EDP", "options": ["Standard", "Détaillé", "Simplifié"], "required": true}
    ],
    13: [ // Mise en cause assurance
      {"name": "compagnie", "type": "text", "label": "Compagnie d'assurance", "required": true},
      {"name": "numero_sinistre", "type": "text", "label": "Numéro de sinistre", "required": true}
    ],
    14: [ // Suivi négociation indemnisation
      {"name": "statut_negociation", "type": "select", "label": "Statut", "options": ["En attente", "En cours", "Offre reçue", "Contre-proposition"], "required": true},
      {"name": "montant_propose", "type": "number", "label": "Montant proposé (€)", "required": false}
    ],
    15: [], // Accord indemnisation? (Decision step - no form fields)
    16: [ // Versement indemnité
      {"name": "montant_verse", "type": "number", "label": "Montant versé (€)", "required": true},
      {"name": "date_versement", "type": "date", "label": "Date de versement", "required": true}
    ]
  };
  return formFields[stepIndex] || [];
}

// -----------------
// Composants
// -----------------

export default function CaseTimeline({ dossierId, steps, progress, onUpdate, world }: CaseTimelineProps) {
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStep, setSelectedStep] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeStepForAction, setActiveStepForAction] = useState<string | null>(null);
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TimelineItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Fusionner seulement les steps qui ont du progress (étapes créées) pour créer les étapes enrichies
  const enrichedSteps: Step[] = useMemo(() => {
    // First, create enriched steps with their actual step numbers
    const enrichedStepsWithRealOrder = progress.map((prog) => {
      // Check if this is a fallback step (created programmatically)
      const isFallbackStep = typeof prog.workflow_step_id === 'string' && prog.workflow_step_id.startsWith('fallback-step-');
      let stepData = null;

      if (!isFallbackStep) {
        // Try to find real database step - handle both string and number comparison
        stepData = steps.find((s) => s.id == prog.workflow_step_id); // Loose equality handles type differences
      } else {
        // Handle fallback steps with programmatic defaults
        const stepIndex = parseInt(prog.workflow_step_id.split('-')[2]);
        stepData = {
          id: prog.workflow_step_id,
          step_number: stepIndex,
          name: getFallbackStepName(stepIndex),
          description: getFallbackStepDescription(stepIndex),
          step_type: 'action',
          form_fields: getFallbackStepFormFields(stepIndex),
          metadata: '{}',
          requires_decision: false,
          is_optional: false,
          can_loop_back: false,
          next_step_id: stepIndex < 3 ? `fallback-step-${stepIndex + 1}` : null, // Only for first 2 steps
          decision_yes_next_step_id: null,
          decision_no_next_step_id: null
        };
      }

      // Extract step number safely for sorting
      const getStepOrder = () => {
        if (isFallbackStep) {
          return parseInt(prog.workflow_step_id.split('-')[2]) || 1;
        }
        return stepData?.step_number || 1;
      };

      const enrichedStep = {
        // CRITICAL: ID must EXACTLY match workflow_step_id without any modification
        id: prog.workflow_step_id,
        order: getStepOrder(),
        name: stepData?.name || getFallbackStepName(getStepOrder()) || 'Étape inconnue',
        description: stepData?.description || 'Description non disponible',
        step_type: stepData?.step_type || 'action',
        // Parse form_fields from JSON string if needed
        form_fields: isFallbackStep
          ? getFallbackStepFormFields(getStepOrder())
          : (Array.isArray(stepData?.form_fields)
             ? stepData.form_fields
             : (typeof stepData?.form_fields === 'string'
                ? JSON.parse(stepData.form_fields || '[]')
                : stepData?.form_fields || [])),
        // Include metadata as well
        metadata: stepData?.metadata || {},
        requires_decision: stepData?.requires_decision || false,
        is_optional: stepData?.is_optional || false,
        can_loop_back: stepData?.can_loop_back || false,
        next_step_id: stepData?.next_step_id || null,
        decision_yes_next_step_id: stepData?.decision_yes_next_step_id || null,
        decision_no_next_step_id: stepData?.decision_no_next_step_id || null,
        status: prog?.status || "pending",
        completed_at: prog?.completed_at || null,
        started_at: prog?.started_at || null,
      };

      return enrichedStep;
    }).sort((a, b) => a.order - b.order);

    // Now reassign display order starting from 1 for the UI (no sorting needed)
    return enrichedStepsWithRealOrder.map((step, index) => ({
      ...step,
      order: index + 1, // Display order starts from 1
    }));
  }, [steps, progress]);

  // Trouver l'étape actuellement en cours pour les boutons rapides
  const currentInProgressStep = useMemo(() => {
    return enrichedSteps.find(step => step.status === 'in_progress');
  }, [enrichedSteps]);

  useEffect(() => {
    // Force clear ALL previous data when dossierId changes to prevent ANY stale data
    setTimelineItems([]);
    setSelectedStep(null);
    setActiveStepForAction(null);
    setSelectedItem(null);
    setCurrentUserId(undefined);
    setIsSuperAdmin(false);
    setLoading(true);

    const timer = setTimeout(() => {
      fetchTimelineItems();
      fetchUserInfo();
    }, 200); // Longer delay to ensure parent component has fully updated with new props

    // TODO: Implement Laravel real-time subscriptions
    // For WebSocket/Socket.io integration with Laravel Broadcasting
    // Comments, attachments, tasks, appointments, annotations real-time updates

    return () => {
      clearTimeout(timer);
      // Cleanup WebSocket connections when needed
    };
  }, [dossierId]); // Only trigger on dossierId changes to prevent stale data

  const fetchTimelineItems = async () => {
    try {
      setLoading(true);
      console.log(`🚀 fetchTimelineItems: Fetching for dossier ${dossierId}`);

      // DISPATCH EVENT AFTER successful operations, not before

      // Use Laravel APIs instead of direct Supabase calls - APIs already filter by dossier_id
      const allItems: TimelineItem[] = [];
      const startTime = Date.now();

      // Fetch comments using Laravel API
      try {
        const commentsResponse = await fetch(`/api/dossiers/${dossierId}/comments`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Accept': 'application/json',
          },
        });
        if (commentsResponse.ok) {
          const commentsData = await commentsResponse.json();
          commentsData?.comments?.forEach((c: any) => {
            allItems.push({
              id: c.id,
              type: "comment",
              title: c.comment_type === "comment" ? "Commentaire" : "Note système",
              content: c.content,
              createdAt: c.created_at,
              createdById: c.user_id,
              fromUser: c.user?.profile?.display_name || c.user?.name || "Utilisateur",
              fromUserAvatar: c.user?.profile?.avatar_url || undefined,
              afterStepId: c.workflow_step_id || enrichedSteps[0]?.id || "",
            });
          });
        }
      } catch (e) {
        console.warn('Failed to fetch comments:', e);
      }

      // Fetch documents using Laravel API
      try {
        const docsResponse = await fetch(`/api/dossiers/${dossierId}/attachments`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Accept': 'application/json',
          },
        });
        if (docsResponse.ok) {
          const docsData = await docsResponse.json();
          docsData?.attachments?.forEach((d: any) => {
            allItems.push({
              id: d.id,
              type: "document",
              title: d.file_name,
              content: `Document ajouté (${d.document_type || "non spécifié"})`,
              createdAt: d.created_at,
              createdById: d.uploaded_by,
              fromUser: d.uploader?.display_name || d.uploader?.name || "Utilisateur",
              fromUserAvatar: d.uploader?.profile?.avatar_url || undefined,
              afterStepId: d.workflow_step_id || findAfterStepId(d.created_at, enrichedSteps),
            });
          });
        }
      } catch (e) {
        console.warn('Failed to fetch documents:', e);
      }

      // Fetch tasks using Laravel API
      try {
        const tasksResponse = await fetch(`/api/dossiers/${dossierId}/tasks`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Accept': 'application/json',
          },
        });
        if (tasksResponse.ok) {
          const tasksData = await tasksResponse.json();
          tasksData?.tasks?.forEach((t: any) => {
            allItems.push({
              id: t.id,
              type: "task",
              title: t.title,
              content: t.description || "Aucune description",
              description: t.description || undefined,
              status: t.status,
              priority: t.priority,
              dueDate: t.due_date || undefined,
              createdAt: t.created_at,
              createdById: t.created_by,
              assignedToId: t.assigned_to || undefined,
              fromUser: t.creator?.display_name || t.creator?.name || "Système",
              fromUserAvatar: t.creator?.avatar_url || undefined,
              toUser: t.assignee?.display_name || t.assignee?.name,
              toUserAvatar: t.assignee?.avatar_url || undefined,
              afterStepId: t.workflow_step_id || enrichedSteps[0]?.id || "",
            });
          });
        }
      } catch (e) {
        console.warn('Failed to fetch tasks:', e);
      }

      // Fetch appointments using Laravel API
      try {
        const appointmentsResponse = await fetch(`/api/dossiers/${dossierId}/appointments`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
            'Accept': 'application/json',
          },
        });
        if (appointmentsResponse.ok) {
          const appointmentsData = await appointmentsResponse.json();
          appointmentsData?.appointments?.forEach((a: any) => {
            allItems.push({
              id: a.id,
              type: "appointment",
              title: a.title,
              content: a.description || `RDV le ${format(new Date(a.start_time), "dd/MM à HH:mm", { locale: fr })}`,
              description: a.description, // Added for proper appointment dialog display
              status: a.status, // Add status field for proper timeline display
              createdAt: a.start_time,
              createdById: a.created_by,
              fromUser: a.creator?.name || "Système", // Creator (who created it)
              fromUserAvatar: a.creator?.avatar_url || undefined,
              toUser: a.user?.name, // Assigned user (who it's for)
              toUserAvatar: a.user?.profile?.avatar_url,
              startTime: a.start_time,
              endTime: a.end_time,
              afterStepId: a.workflow_step_id || enrichedSteps[0]?.id || "",
            });
          });
        }
      } catch (e) {
        console.warn('Failed to fetch appointments:', e);
      }

      console.log(`📊 Timeline items for ${dossierId}: ${allItems.length} items`);

      // Sort reverse chronologically (newest first at top, oldest at bottom)
      allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setTimelineItems(allItems);
    } catch (error) {
      console.error("Error fetching timeline items:", error);
    } finally {
      setLoading(false);
    }
  };

  // Déterminer après quelle étape un événement doit être affiché
  const findAfterStepId = (eventDate: string, steps: Step[]): string => {
    const eventTime = new Date(eventDate).getTime();
    
    // Trouver la dernière étape complétée avant cet événement
    let afterStepId = steps[0]?.id || "";
    
    for (const step of steps) {
      if (step.started_at) {
        const stepTime = new Date(step.started_at).getTime();
        if (stepTime <= eventTime) {
          afterStepId = step.id;
        }
      }
    }
    
    return afterStepId;
  };

  // Récupérer les informations de l'utilisateur actuel
  const fetchUserInfo = async () => {
    try {
      const userAPI = (await import('@/integrations/laravel/api')).userAPI;
      const userInfo = await userAPI.getProfile();

      if (userInfo?.user) {
        setCurrentUserId(userInfo.user.id);

        // For superadmin check, we'll use a simple fallback for now
        // TODO: Implement proper role checking with Laravel API
        setIsSuperAdmin(userInfo.user.roles?.some?.((role: any) => role.name === 'super-admin') || false);
      }
    } catch (error) {
      console.warn('Failed to fetch user info:', error);
      // Fallback to default values
      setCurrentUserId(undefined);
      setIsSuperAdmin(false);
    }
  };

  // Gérer le clic sur une carte
  const handleCardClick = (item: TimelineItem) => {
    setSelectedItem(item);
    setEditDialogOpen(true);
  };

  // Callback pour rafraîchir après modification
  const handleItemUpdated = () => {
    fetchTimelineItems();
    onUpdate();
  };

  /**
   * Regrouper les items par afterStepId
   */
  const itemsByStep = useMemo(() => {
    const map: Record<string, TimelineItem[]> = {};
    for (const item of timelineItems) {
      if (!map[item.afterStepId]) {
        map[item.afterStepId] = [];
      }
      map[item.afterStepId].push(item);
    }
    return map;
  }, [timelineItems]);

  const handleStepComplete = async (stepId: string, formData?: Record<string, any> | FormData) => {
    setIsSubmitting(true);
    try {
      // Check if formData is FormData (contains files)
      const isFormData = formData instanceof FormData;

      let requestBody: any;
      let headers: Record<string, string> = {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      };

      if (isFormData) {
        // Use FormData as-is for file uploads
        requestBody = formData;
        // Add required fields to FormData
        requestBody.append('dossier_id', dossierId);
        requestBody.append('workflow_step_id', stepId);
        requestBody.append('notes', 'Étape complétée');
        requestBody.append('decision', '');
        // Don't set Content-Type header - let browser set it for FormData
      } else {
        // Regular JSON request
        headers['Content-Type'] = 'application/json';
        requestBody = JSON.stringify({
          dossier_id: dossierId,
          workflow_step_id: stepId,
          notes: formData?.notes || 'Étape complétée',
          decision: null, // Regular completion without decision
          form_data: formData, // Include the form data with radio button selections
        });
      }

      const response = await fetch(`/api/dossiers/${dossierId}/workflow/complete-step`, {
        method: 'POST',
        headers: headers,
        body: requestBody,
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Workflow completed successfully:", data);
        toast.success("Étape complétée avec succès");
        setSelectedStep(null);

        // DISPATCH EVENT AFTER SUCCESSFUL STEP COMPLETION
        window.dispatchEvent(new CustomEvent('dossierWorkflowUpdated'));

        // Force immediate refresh of workflow data
        console.log("Triggering timeline refresh after step completion");
        if (onUpdate && typeof onUpdate === 'function') {
          console.log("onUpdate function is available, calling it");
          await onUpdate();
        } else {
          console.log("onUpdate function not available", { onUpdate: onUpdate });
        }

        // Force local component refresh to show updated steps
        console.log("Force refreshing enriched steps after completion");
        fetchTimelineItems(); // Re-fetch timeline items too

        // Add a small delay and force UI refresh
        setTimeout(() => {
          console.log("Delayed refresh UI update");
        }, 100);
      } else {
        // Handle error responses that might not be JSON
        let errorMessage = 'Erreur lors de la validation de l\'étape';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.log("Workflow error JSON:", errorData);
        } catch (jsonError) {
          // If not JSON, try to get text
          try {
            const errorText = await response.text();
            console.log("Workflow error HTML/Other:", errorText.substring(0, 500));
            errorMessage = `Erreur serveur: ${response.status}`;
          } catch (textError) {
            console.log("Could not read error response");
          }
        }
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error("Error completing step:", error);
      toast.error(error.message || "Erreur lors de la validation de l'étape");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStepDecision = async (
    stepId: string,
    decision: boolean,
    notes: string,
    formData?: Record<string, any>
  ) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/dossiers/${dossierId}/workflow/complete-step`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dossier_id: dossierId,
          workflow_step_id: stepId,
          notes: notes || `Décision "${decision ? "Oui" : "Non"}" prise`,
          decision: decision, // Send the decision choice (true/false)
          form_data: formData, // Include any form data if present
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log("Workflow decision recorded successfully:", data);
        toast.success(`Décision "${decision ? "Oui" : "Non"}" enregistrée avec succès`);
        setSelectedStep(null);

        // DISPATCH EVENT AFTER SUCCESSFUL DECISION
        window.dispatchEvent(new CustomEvent('dossierWorkflowUpdated'));

        // Force immediate refresh of workflow data
        console.log("Triggering timeline refresh after decision");
        if (onUpdate && typeof onUpdate === 'function') {
          console.log("onUpdate function is available, calling it");
          await onUpdate();
        } else {
          console.log("onUpdate function not available", { onUpdate: onUpdate });
        }

        // Force local component refresh to show updated steps
        console.log("Force refreshing enriched steps after decision");
        fetchTimelineItems(); // Re-fetch timeline items too

        // Add a small delay and force UI refresh
        setTimeout(() => {
          console.log("Delayed refresh UI update");
        }, 100);
      } else {
        // Handle error responses that might not be JSON
        let errorMessage = 'Erreur lors de l\'enregistrement de la décision';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.log("Decision error JSON:", errorData);
        } catch (jsonError) {
          // If not JSON, try to get text
          try {
            const errorText = await response.text();
            console.log("Decision error HTML/Other:", errorText.substring(0, 500));
            errorMessage = `Erreur serveur: ${response.status}`;
          } catch (textError) {
            console.log("Could not read error response");
          }
        }
        throw new Error(errorMessage);
      }
    } catch (error: any) {
      console.error("Error processing decision:", error);
      toast.error(error.message || "Erreur lors de la prise de décision");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Trouver les informations complètes de l'étape sélectionnée depuis enrichedSteps (qui a les form_fields parsés)
  const selectedStepFull = selectedStep
    ? enrichedSteps.find((s) => s.id === selectedStep.id)
    : null;
  const selectedProgress = selectedStep
    ? progress.find((p) => p.workflow_step_id === selectedStep.id)
    : null;

  // Déterminer les étapes suivantes
  const nextSteps = selectedStepFull
    ? {
        next: selectedStepFull.next_step_id
          ? steps.find((s) => s.id === selectedStepFull.next_step_id)
          : null,
        yes: selectedStepFull.decision_yes_next_step_id
          ? steps.find((s) => s.id === selectedStepFull.decision_yes_next_step_id)
          : null,
        no: selectedStepFull.decision_no_next_step_id
          ? steps.find((s) => s.id === selectedStepFull.decision_no_next_step_id)
          : null,
      }
    : { next: null, yes: null, no: null };

  const handleOpenCommentDialog = (stepId: string) => {
    setActiveStepForAction(stepId);
    setShowCommentDialog(true);
  };

  const handleOpenTaskDialog = (stepId: string) => {
    setActiveStepForAction(stepId);
    setShowTaskDialog(true);
  };

  const handleOpenAppointmentDialog = (stepId: string) => {
    setActiveStepForAction(stepId);
    setShowAppointmentDialog(true);
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 pt-14 pb-6 md:pt-16 md:pb-8 relative">
      {/* Boutons d'actions rapides en haut à droite (position absolue) */}
      <div className="absolute top-0 right-4 flex gap-2 z-10">
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleOpenCommentDialog(currentInProgressStep?.id || enrichedSteps[0]?.id)}
          disabled={!currentInProgressStep && enrichedSteps.length === 0}
          className="gap-1.5"
        >
          <MessageSquare className="w-4 h-4" />
          Commentaire
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleOpenAppointmentDialog(currentInProgressStep?.id || enrichedSteps[0]?.id)}
          disabled={!currentInProgressStep && enrichedSteps.length === 0}
          className="gap-1.5"
        >
          <Calendar className="w-4 h-4" />
          RDV
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleOpenTaskDialog(currentInProgressStep?.id || enrichedSteps[0]?.id)}
          disabled={!currentInProgressStep && enrichedSteps.length === 0}
          className="gap-1.5"
        >
          <ListTodo className="w-4 h-4" />
          Tâche
        </Button>
      </div>

      <AddCommentDialog
        open={showCommentDialog}
        onOpenChange={setShowCommentDialog}
        dossierId={dossierId}
        workflowStepId={activeStepForAction || undefined}
        onCommentCreated={() => {
          fetchTimelineItems();
          onUpdate();
        }}
      />

      <AddTaskDialog
        open={showTaskDialog}
        onOpenChange={setShowTaskDialog}
        dossierId={dossierId}
        workflowStepId={activeStepForAction || undefined}
        onTaskCreated={() => {
          fetchTimelineItems();
          onUpdate();
        }}
      />

      <AddAppointmentDialog
        open={showAppointmentDialog}
        onOpenChange={setShowAppointmentDialog}
        dossierId={dossierId}
        workflowStepId={activeStepForAction || undefined}
        onAppointmentCreated={() => {
          fetchTimelineItems();
          onUpdate();
        }}
      />

      <div className="relative">
        {/* Ligne verticale principale */}
        <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2">
          <div className="w-px h-full bg-gradient-to-b from-primary/30 via-slate-200 to-primary/30" />
        </div>

        <div className="space-y-10">
          {/* Inverser l'ordre pour l'affichage (étape 1 en bas, dernière en haut) */}
          {/* Filtrer pour montrer toutes les étapes du workflow (complétées, en cours, pending, bloquées) */}
          {[...enrichedSteps]
            .filter((step) =>
              step.status === "completed" ||
              step.status === "in_progress" ||
              step.status === "pending" ||
              step.status === "blocked"
            )
            .reverse()
            .map((step, index) => {
            const stepItems = itemsByStep[step.id] || [];

            return (
              <div key={step.id} className="space-y-6">
                {/* Détails de l'étape sélectionnée - affiché juste au-dessus */}
                {selectedStep?.id === step.id && selectedStepFull && (
                  <div className="mb-6">
                    {(() => {
                      console.log("🚀 Opening step details:", {
                        stepId: selectedStepFull.id,
                        stepName: selectedStepFull.name,
                        formFieldsCount: selectedStepFull.form_fields?.length || 0,
                        formFields: selectedStepFull.form_fields,
                        hasFormFields: Array.isArray(selectedStepFull.form_fields)
                      });
                      return null;
                    })()}
                    <WorkflowStepDetails
                      step={selectedStepFull}
                      progress={selectedProgress}
                      onComplete={handleStepComplete}
                      onDecision={handleStepDecision}
                      isSubmitting={isSubmitting}
                      nextSteps={nextSteps}
                      onClose={() => setSelectedStep(null)}
                    />
                  </div>
                )}

                {/* Segment intermédiaire entre l'étape précédente et celle-ci (au-dessus) */}
                {stepItems.length > 0 && (
                  <BetweenSegment 
                    key={`segment-${step.id}-${stepItems.map(i => i.id).join('-')}`}
                    items={stepItems} 
                    onCardClick={handleCardClick} 
                    currentUserId={currentUserId}
                    world={world}
                  />
                )}

                {/* Étape principale */}
                <StepCard
                  step={step} 
                  stepId={`step-${step.id}`}
                  onClick={() => {
                    setSelectedStep(step);
                    // Scroll vers l'étape après un court délai pour laisser le temps au détail de s'afficher
                    setTimeout(() => {
                      const stepElement = document.getElementById(`step-${step.id}`);
                      if (stepElement) {
                        const elementTop = stepElement.getBoundingClientRect().top + window.scrollY;
                        const offset = 150; // Décalage depuis le haut pour voir le détail
                        window.scrollTo({ top: elementTop - offset, behavior: 'smooth' });
                      }
                    }, 100);
                  }}
                  onAddComment={() => handleOpenCommentDialog(step.id)}
                  onAddTask={() => handleOpenTaskDialog(step.id)}
                  onAddAppointment={() => handleOpenAppointmentDialog(step.id)}
                  world={world}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Dialog universel pour éditer/supprimer les éléments */}
      <UnifiedItemDialog
        item={selectedItem}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onItemUpdated={handleItemUpdated}
        currentUserId={currentUserId}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  );
}

/**
 * Card d'une étape principale
 */
function StepCard({ 
  step, 
  stepId,
  onClick, 
  onAddComment, 
  onAddTask, 
  onAddAppointment,
  world
}: { 
  step: Step;
  stepId: string;
  onClick: () => void;
  onAddComment: () => void;
  onAddTask: () => void;
  onAddAppointment: () => void;
  world?: string;
}) {
  const colors = getStepColors(step.status, world);

  const getStatusLabel = (status: StepStatus, step: Step) => {
    if (step?.rolled_back_at) {
      return "Rollbackée";
    }
    switch (status) {
      case "completed":
        return "Étape complétée";
      case "in_progress":
        return "En cours";
      case "blocked":
        return "Bloquée";
      default:
        return "À venir";
    }
  };

  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case "in_progress":
        return <Clock className="w-3.5 h-3.5" />;
      case "blocked":
        return <Clock className="w-3.5 h-3.5" />;
      default:
        return <Clock className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div id={stepId} className="relative flex justify-center">
      {/* pastille numérotée */}
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full ${colors.badgeBg} text-white shadow-lg ring-4 ${colors.badgeRing} z-10`}
      >
        <span className="text-sm font-semibold">{step.order}</span>
      </div>

      <div className="w-full md:w-3/4">
        <button
          onClick={onClick}
          className="w-full bg-card border border-border rounded-2xl shadow-sm px-4 py-4 md:px-6 md:py-5 hover:shadow-md hover:border-primary/50 transition-all duration-200 cursor-pointer text-left"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h3 className="text-sm md:text-base font-semibold text-card-foreground">
                {step.name}
              </h3>
              {step.description && (
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  {step.description}
                </p>
              )}
            </div>
            <div className="flex flex-col items-start md:items-end gap-1">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${colors.chipBg} ${colors.chipText}`}
              >
                {getStatusIcon(step.status)}
                {getStatusLabel(step.status, step)}
              </span>
              {(step.completed_at || step.started_at) && (
                <p className="text-[11px] text-muted-foreground">
                  {formatDate(step.completed_at || step.started_at!)}
                </p>
              )}
            </div>
          </div>
        </button>

        {/* Boutons d'action */}
        <div className="flex items-center justify-center gap-2 mt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onAddComment();
            }}
            className="text-xs h-8"
          >
            <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
            Commentaire
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onAddAppointment();
            }}
            className="text-xs h-8"
          >
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
            RDV
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              onAddTask();
            }}
            className="text-xs h-8"
          >
            <ListTodo className="w-3.5 h-3.5 mr-1.5" />
            Tâche
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Segment intermédiaire entre deux étapes :
 * Affiche les événements en escalier selon leur timestamp
 */
function BetweenSegment({ items, onCardClick, currentUserId, world }: { items: TimelineItem[]; onCardClick: (item: TimelineItem) => void; currentUserId?: string; world?: string }) {
  const [expanded, setExpanded] = useState(() => false);
  const MAX_VISIBLE = 6;

  // Trier tous les items par date (plus récent en premier)
  const sortedItems = [...items].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Créer une clé unique basée sur les IDs des items pour détecter tout changement
  const itemsKey = items.map(i => i.id).sort().join(',');
  
  // Réinitialiser l'état expanded quand les items changent
  useEffect(() => {
    setExpanded(false);
  }, [itemsKey]);

  const visibleItems = expanded || sortedItems.length <= MAX_VISIBLE
    ? sortedItems
    : sortedItems.slice(0, MAX_VISIBLE);

  const hiddenCount = sortedItems.length > MAX_VISIBLE ? sortedItems.length - MAX_VISIBLE : 0;

  // Calculer l'espacement vertical en fonction du temps écoulé
  const getVerticalSpacing = (currentItem: TimelineItem, previousItem?: TimelineItem) => {
    if (!previousItem) return 0;
    
    const currentTime = new Date(currentItem.createdAt).getTime();
    const previousTime = new Date(previousItem.createdAt).getTime();
    const timeDiff = currentTime - previousTime;
    
    // Convert time difference to hours
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    
    // Min spacing: 12px, Max spacing: 80px
    // Scale based on time difference (0-24 hours range)
    const minSpacing = 12;
    const maxSpacing = 80;
    const spacing = Math.min(maxSpacing, minSpacing + (hoursDiff * 2));
    
    return spacing;
  };

  return (
    <div className="relative min-h-[80px]">
      {/* Ligne verticale centrale entre les étapes */}
      <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 z-0">
        <div className="w-px h-full border-l border-dashed border-slate-300" />
      </div>

      <div className="relative z-10">
        {visibleItems.map((item, idx) => {
          // Ma carte = droite, Carte des autres = gauche
          const side = item.createdById === currentUserId ? "right" : "left";
          const previousItem = idx > 0 ? visibleItems[idx - 1] : undefined;
          const marginTop = getVerticalSpacing(item, previousItem);

          return (
            <div 
              key={item.id} 
              style={{ marginTop: idx === 0 ? '8px' : `${marginTop}px` }}
            >
              <SideItemCard
                item={item}
                positionIndex={idx}
                side={side}
                onCardClick={onCardClick}
                world={world}
              />
            </div>
          );
        })}

        {hiddenCount > 0 && (
          <div className="flex justify-center mt-4">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
            >
              {expanded
                ? "Masquer les éléments"
                : `Afficher ${hiddenCount} élément(s) de plus`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Card latérale reliée à la timeline (gauche ou droite)
 */
function SideItemCard({
  item,
  positionIndex,
  side,
  onCardClick,
  world,
}: {
  item: TimelineItem;
  positionIndex: number;
  side: "left" | "right";
  onCardClick: (item: TimelineItem) => void;
  world?: string;
}) {
  const colors = getItemColors(item.type, world);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Déterminer si l'item est terminé based on proper status
  const isCompleted =
    (item.type === 'task' && item.status === 'done') ||
    (item.type === 'task' && item.status === 'cancelled') ||
    (item.type === 'appointment' && item.status !== 'scheduled');

  const handleQuickStatusUpdate = async (newStatus: string) => {
    if (!item || item.type !== 'task') return;

    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/tasks/${item.id}/quick-status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (response.ok) {
        // Update the item status locally
        item.status = newStatus;
        // Optionally trigger timeline refresh or show toast
        window.location.reload(); // Simple refresh for now
      } else {
        console.error('Failed to update task status');
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleQuickAppointmentStatusUpdate = async (newStatus: string) => {
    if (!item || item.type !== 'appointment') return;

    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/appointments/${item.id}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (response.ok) {
        // Update the item status locally
        item.status = newStatus;
        // Refresh timeline to show updated status
        window.location.reload(); // Simple refresh for now
      } else {
        console.error('Failed to update appointment status');
      }
    } catch (error) {
      console.error('Error updating appointment status:', error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (side === "left") {
    return (
      <div className="flex justify-end">
        <div className="relative pr-8 md:pr-12 max-w-md w-full md:w-[calc(50%-2rem)]">
          <div
            onClick={() => onCardClick(item)}
            className={`relative overflow-visible bg-card border ${colors.border} rounded-xl shadow-sm px-3 py-2.5 md:px-4 md:py-3 hover:shadow-md transition-all cursor-pointer hover:scale-[1.02] ${isCompleted ? 'opacity-60' : ''}`}
          >
            {/* Photo de profil débordante en haut à droite */}
            {item.fromUser && (
              <div className="absolute -top-3 -right-3 z-30">
                <Avatar className="h-10 w-10 ring-2 ring-background shadow-md">
                  <AvatarImage 
                    src={item.type === 'task' && item.toUserAvatar ? item.toUserAvatar : item.fromUserAvatar} 
                    alt={item.type === 'task' && item.toUser ? item.toUser : item.fromUser} 
                  />
                  <AvatarFallback className="text-xs bg-muted">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </div>
            )}

            {/* Header : Badge type et nom + Badge "Terminé" */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} text-[11px] font-medium`}
                >
                  {getItemIcon(item.type)}
                  <span>{getItemTypeLabel(item.type)}</span>
                </span>
                {isCompleted && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-medium">
                    <CheckCircle2 className="h-3 w-3" />
                    Terminé
                  </span>
                )}
              </div>
              {item.fromUser && (
                <div className="text-[10px] font-medium text-muted-foreground flex items-center gap-1 pr-8">
                  <span className="truncate max-w-[120px]">{item.fromUser}</span>
                  {item.toUser && (
                    <>
                      <ArrowRightLeft className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate max-w-[120px]">{item.toUser}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Contenu */}
            <h4 className="text-xs md:text-sm font-bold text-card-foreground mb-1">
              {item.title}
            </h4>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              {item.content}
            </p>

          {/* Quick status buttons for tasks */}
          {item.type === 'task' && (
            <div className="flex flex-wrap gap-2 mt-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(249, 250, 251, 0)' }}>
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 w-full">
                Statut:
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickStatusUpdate('todo');
                }}
                disabled={isUpdatingStatus}
                className={`px-3 py-1.5 text-xs font-bold rounded-full border-2 transition-all duration-200 ${
                  item.status === 'todo'
                    ? 'bg-slate-600 text-white border-slate-600 shadow-md ring-2 ring-slate-300'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50 hover:border-slate-400'
                } disabled:opacity-50`}
                title="Marquer comme à faire"
              >
                {item.status === 'todo' && <span className="mr-1">✓</span>}
                À faire
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickStatusUpdate('in_progress');
                }}
                disabled={isUpdatingStatus}
                className={`px-3 py-1.5 text-xs font-bold rounded-full border-2 transition-all duration-200 ${
                  item.status === 'in_progress'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
                    : 'bg-white text-blue-600 border-blue-300 hover:bg-blue-50 hover:border-blue-400'
                } disabled:opacity-50`}
                title="Marquer comme en cours"
              >
                {item.status === 'in_progress' && <span className="mr-1">✓</span>}
                En cours
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickStatusUpdate('done');
                }}
                disabled={isUpdatingStatus}
                className={`px-3 py-1.5 text-xs font-bold rounded-full border-2 transition-all duration-200 ${
                  item.status === 'done'
                    ? 'bg-green-600 text-white border-green-600 shadow-md ring-2 ring-green-300'
                    : 'bg-white text-green-600 border-green-300 hover:bg-green-50 hover:border-green-400'
                } disabled:opacity-50`}
                title="Marquer comme terminée"
              >
                {item.status === 'done' && <span className="mr-1">✓</span>}
                Terminée
              </button>
            </div>
          )}



            {/* Date en bas à droite */}
            <div className="flex justify-end mt-2">
              <span className="text-[10px] text-muted-foreground">
                {formatDate(item.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="relative pl-8 md:pl-12 max-w-md w-full md:w-[calc(50%-2rem)]">
        <div
          onClick={() => onCardClick(item)}
          className={`relative overflow-visible bg-card border ${colors.border} rounded-xl shadow-sm px-3 py-2.5 md:px-4 md:py-3 hover:shadow-md transition-all cursor-pointer hover:scale-[1.02] ${isCompleted ? 'opacity-60' : ''}`}
        >
            {/* Photo de profil débordante en haut à droite */}
            {item.fromUser && (
              <div className="absolute -top-3 -right-3 z-30">
                <Avatar className="h-10 w-10 ring-2 ring-background shadow-md">
                  <AvatarImage 
                    src={item.type === 'task' && item.toUserAvatar ? item.toUserAvatar : item.fromUserAvatar} 
                    alt={item.type === 'task' && item.toUser ? item.toUser : item.fromUser} 
                  />
                  <AvatarFallback className="text-xs bg-muted">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              </div>
            )}

          {/* Header : Badge type et nom + Badge "Terminé" */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${colors.bg} ${colors.text} text-[11px] font-medium`}
              >
                {getItemIcon(item.type)}
                <span>{getItemTypeLabel(item.type)}</span>
              </span>
              {isCompleted && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-medium">
                  <CheckCircle2 className="h-3 w-3" />
                  Terminé
                </span>
              )}
            </div>
            {item.fromUser && (
              <div className="text-[10px] font-medium text-muted-foreground flex items-center gap-1 pr-8">
                <span className="truncate max-w-[120px]">{item.fromUser}</span>
                {item.toUser && (
                  <>
                    <ArrowRightLeft className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate max-w-[120px]">{item.toUser}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Contenu */}
          <h4 className="text-xs md:text-sm font-bold text-card-foreground mb-1">
            {item.title}
          </h4>
          <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
            {item.content}
          </p>

          {/* Quick status buttons for tasks */}
          {item.type === 'task' && (
            <div className="flex flex-wrap gap-1 mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickStatusUpdate('todo');
                }}
                disabled={isUpdatingStatus}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-all duration-200 ${
                  item.status === 'todo'
                    ? 'bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                    : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                } disabled:opacity-50`}
                title="Marquer comme à faire"
              >
                À faire
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickStatusUpdate('in_progress');
                }}
                disabled={isUpdatingStatus}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-all duration-200 ${
                  item.status === 'in_progress'
                    ? 'bg-blue-100 text-blue-800 border-blue-300 shadow-sm'
                    : 'bg-white text-blue-500 border-blue-200 hover:bg-blue-50 hover:text-blue-700'
                } disabled:opacity-50`}
                title="Marquer comme en cours"
              >
                En cours
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickStatusUpdate('done');
                }}
                disabled={isUpdatingStatus}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-all duration-200 ${
                  item.status === 'done'
                    ? 'bg-green-100 text-green-800 border-green-300 shadow-sm'
                    : 'bg-white text-green-500 border-green-200 hover:bg-green-50 hover:text-green-700'
                } disabled:opacity-50`}
                title="Marquer comme terminée"
              >
                Terminée
              </button>
            </div>
          )}

          {/* Date en bas à droite */}
          <div className="flex justify-end mt-2">
            <span className="text-[10px] text-muted-foreground">
              {formatDate(item.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
