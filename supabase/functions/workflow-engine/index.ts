import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompleteStepRequest {
  dossierId: string;
  stepId: string;
  decision?: boolean;
  notes?: string;
  formData?: Record<string, any>;
}

interface GetNextStepRequest {
  dossierId: string;
  currentStepId: string;
  decision?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { action, ...params } = await req.json();

    console.log(`[Workflow Engine] Action: ${action}`, params);

    switch (action) {
      case 'complete_step':
        return await completeStep(supabase, user.id, params as CompleteStepRequest);
      
      case 'get_next_step':
        return await getNextStep(supabase, params as GetNextStepRequest);
      
      case 'get_available_steps':
        return await getAvailableSteps(supabase, params.dossierId);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('[Workflow Engine] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function completeStep(
  supabase: any,
  userId: string,
  { dossierId, stepId, decision, notes, formData }: CompleteStepRequest
) {
  console.log(`[Complete Step] Dossier: ${dossierId}, Step: ${stepId}, FormData:`, formData);

  // 1. Get current step info
  const { data: step, error: stepError } = await supabase
    .from('workflow_steps')
    .select('*')
    .eq('id', stepId)
    .single();

  if (stepError) throw stepError;

  // 2. Determine next step based on decision
  let nextStepId = null;
  if (decision !== undefined && step.requires_decision) {
    nextStepId = decision ? step.decision_yes_next_step_id : step.decision_no_next_step_id;
  } else {
    nextStepId = step.next_step_id;
  }

  // 3. Update current step progress to completed in Supabase
  const { error: updateError } = await supabase
    .from('dossier_workflow_progress')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      completed_by: userId,
      notes: notes || null,
      decision_taken: decision !== undefined ? decision : null,
      form_data: formData || {}
    })
    .eq('dossier_id', dossierId)
    .eq('workflow_step_id', stepId);

  if (updateError) throw updateError;

  // 4. CRITICAL FIX: Also call Laravel API to save form data there for document generation
  try {
    const laravelResponse = await fetch('http://localhost:8080/api/dossiers/' + dossierId + '/workflow/complete-step', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LARAVEL_API_TOKEN') || 'fallback-token'}`, // You'll need to set this
        'X-Supabase-User-Id': userId
      },
      body: JSON.stringify({
        dossier_id: dossierId,
        workflow_step_id: stepId,
        decision: decision,
        notes: notes,
        form_data: formData
      })
    });

    if (!laravelResponse.ok) {
      const errorText = await laravelResponse.text();
      console.error('[Laravel API Error]', errorText);
      // Don't throw here - Supabase update succeeded, just log the Laravel failure
    } else {
      console.log('[Laravel API] Form data saved successfully');
    }
  } catch (laravelError) {
    console.error('[Laravel API Call Failed]', laravelError);
    // Continue with Supabase success - don't fail the whole operation
  }

  // 4. Log in workflow history
  const { error: historyError } = await supabase
    .from('dossier_workflow_history')
    .insert({
      dossier_id: dossierId,
      workflow_step_id: stepId,
      next_step_id: nextStepId,
      decision_taken: decision !== undefined ? (decision ? 'yes' : 'no') : null,
      decision_reason: notes,
      user_id: userId,
      metadata: { form_data: formData || {} }
    });

  if (historyError) throw historyError;

  // 5. Activate next step(s) if exists
  if (nextStepId) {
    const { error: activateError } = await supabase
      .from('dossier_workflow_progress')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString()
      })
      .eq('dossier_id', dossierId)
      .eq('workflow_step_id', nextStepId);

    if (activateError) console.error('Error activating next step:', activateError);
  }

  // 6. Handle parallel steps if any
  if (step.parallel_steps && step.parallel_steps.length > 0) {
    for (const parallelStepId of step.parallel_steps) {
      await supabase
        .from('dossier_workflow_progress')
        .update({
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .eq('dossier_id', dossierId)
        .eq('workflow_step_id', parallelStepId);
    }
  }

  // 7. Trigger auto-actions if configured
  if (step.auto_actions && step.auto_actions.length > 0) {
    await executeAutoActions(supabase, dossierId, step.auto_actions, userId);
  }

  // 8. Add comment to dossier
  const commentText = decision !== undefined
    ? `Étape "${step.name}" complétée avec décision: ${decision ? 'Oui' : 'Non'}${notes ? ` - ${notes}` : ''}`
    : `Étape "${step.name}" complétée${notes ? ` - ${notes}` : ''}`;

  await supabase
    .from('dossier_comments')
    .insert({
      dossier_id: dossierId,
      user_id: userId,
      content: commentText,
      comment_type: 'workflow_update'
    });

  return new Response(
    JSON.stringify({
      success: true,
      nextStepId,
      message: 'Step completed successfully'
    }),
    { 
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
}

async function getNextStep(
  supabase: any,
  { dossierId, currentStepId, decision }: GetNextStepRequest
) {
  // Get current step
  const { data: step } = await supabase
    .from('workflow_steps')
    .select('*')
    .eq('id', currentStepId)
    .single();

  if (!step) {
    return new Response(
      JSON.stringify({ nextStepId: null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Determine next step
  let nextStepId = null;
  if (decision !== undefined && step.requires_decision) {
    nextStepId = decision ? step.decision_yes_next_step_id : step.decision_no_next_step_id;
  } else {
    nextStepId = step.next_step_id;
  }

  return new Response(
    JSON.stringify({ nextStepId, parallelSteps: step.parallel_steps || [] }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getAvailableSteps(supabase: any, dossierId: string) {
  // Get all in_progress steps for this dossier
  const { data: progress } = await supabase
    .from('dossier_workflow_progress')
    .select(`
      *,
      workflow_steps:workflow_step_id (*)
    `)
    .eq('dossier_id', dossierId)
    .eq('status', 'in_progress');

  return new Response(
    JSON.stringify({ steps: progress || [] }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function executeAutoActions(
  supabase: any,
  dossierId: string,
  autoActions: any[],
  userId?: string
) {
  console.log(`[Auto Actions] Executing ${autoActions.length} actions for dossier ${dossierId}`);
  
  // Get dossier info for context
  const { data: dossier } = await supabase
    .from('dossiers')
    .select('*, worlds(*)')
    .eq('id', dossierId)
    .single();
  
  for (const action of autoActions) {
    try {
      switch (action.type) {
        case 'generate_document':
          console.log(`[Auto Action] Generate document: ${action.documentType}`);
          // TODO: Call document generator
          break;
        
        case 'send_email':
          console.log(`[Auto Action] Send email to: ${action.recipient}`);
          // TODO: Send email via Resend or similar
          break;
        
        case 'create_notification':
          // Get the user to notify (owner or specific user)
          const notifyUserId = action.userId || dossier?.owner_id || userId;
          if (notifyUserId) {
            await supabase
              .from('notifications')
              .insert({
                user_id: notifyUserId,
                type: 'workflow',
                title: action.title || 'Notification de workflow',
                message: action.message,
                related_id: dossierId
              });
          }
          break;
        
        case 'create_task':
          // Create a task for the assigned user
          const { data: assignedUser } = await supabase
            .from('profiles')
            .select('id')
            .ilike('display_name', `%${action.assignedTo}%`)
            .single();
          
          if (assignedUser && dossier) {
            await supabase
              .from('tasks')
              .insert({
                title: action.title,
                description: action.description || `Tâche créée automatiquement pour le dossier ${dossier.title}`,
                assigned_to: assignedUser.id,
                created_by: userId,
                world_id: dossier.world_id,
                status: 'todo',
                priority: action.priority || 'medium'
              });
            
            // Also create a notification
            await supabase
              .from('notifications')
              .insert({
                user_id: assignedUser.id,
                type: 'task',
                title: 'Nouvelle tâche assignée',
                message: action.title,
                related_id: dossierId
              });
          }
          break;
        
        default:
          console.log(`[Auto Action] Unknown action type: ${action.type}`);
      }
    } catch (error) {
      console.error(`[Auto Action] Error executing action:`, error);
    }
  }
}
