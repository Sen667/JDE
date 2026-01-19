import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Get user from JWT
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid user token');
    }

    const { action, dossierId, targetWorldCode } = await req.json();

    console.log(`Transfer action: ${action} for dossier ${dossierId} to ${targetWorldCode}`);

    // Handle different actions
    switch (action) {
      case 'initiate_transfer':
        return await initiateTransfer(supabase, user.id, dossierId, targetWorldCode);
      
      case 'get_transfer_history':
        return await getTransferHistory(supabase, dossierId);
      
      case 'check_transfer_eligibility':
        return await checkTransferEligibility(supabase, dossierId, targetWorldCode);
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Error in transfer-dossier function:', error);
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

async function initiateTransfer(supabase: any, userId: string, dossierId: string, targetWorldCode: string) {
  console.log(`Initiating transfer of dossier ${dossierId} to ${targetWorldCode}`);

  // 1. Get source dossier with world info
  const { data: sourceDossier, error: dossierError } = await supabase
    .from('dossiers')
    .select(`
      *,
      world:worlds!inner(id, code, name),
      client_info:dossier_client_info(*)
    `)
    .eq('id', dossierId)
    .single();

  if (dossierError || !sourceDossier) {
    throw new Error(`Source dossier not found: ${dossierError?.message}`);
  }

  console.log(`Source dossier from world: ${sourceDossier.world.code}`);

  // 2. Get target world
  const { data: targetWorld, error: worldError } = await supabase
    .from('worlds')
    .select('*')
    .eq('code', targetWorldCode)
    .single();

  if (worldError || !targetWorld) {
    throw new Error(`Target world not found: ${worldError?.message}`);
  }

  console.log(`Target world: ${targetWorld.name}`);

  // 3. Determine transfer type
  const transferType = `${sourceDossier.world.code.toLowerCase()}_to_${targetWorldCode.toLowerCase()}`;

  // 4. Create transfer record
  const { data: transfer, error: transferError } = await supabase
    .from('dossier_transfers')
    .insert({
      source_dossier_id: dossierId,
      source_world_id: sourceDossier.world.id,
      target_world_id: targetWorld.id,
      transfer_type: transferType,
      transfer_status: 'in_progress',
      transferred_by: userId,
      metadata: {
        source_world_code: sourceDossier.world.code,
        target_world_code: targetWorldCode,
        source_title: sourceDossier.title,
      }
    })
    .select()
    .single();

  if (transferError) {
    throw new Error(`Failed to create transfer record: ${transferError.message}`);
  }

  console.log(`Transfer record created: ${transfer.id}`);

  try {
    // 5. Create new dossier in target world
    const { data: newDossier, error: newDossierError } = await supabase
      .from('dossiers')
      .insert({
        world_id: targetWorld.id,
        owner_id: userId,
        title: `[Transfert ${sourceDossier.world.code}] ${sourceDossier.title}`,
        status: 'nouveau',
        tags: sourceDossier.tags ? [...sourceDossier.tags, `transfert-${sourceDossier.world.code}`] : [`transfert-${sourceDossier.world.code}`],
      })
      .select()
      .single();

    if (newDossierError) {
      throw new Error(`Failed to create new dossier: ${newDossierError.message}`);
    }

    console.log(`New dossier created: ${newDossier.id}`);

    // 6. Copy client info if exists
    if (sourceDossier.client_info && sourceDossier.client_info.length > 0) {
      const clientInfo = sourceDossier.client_info[0];
      const { error: clientError } = await supabase
        .from('dossier_client_info')
        .insert({
          dossier_id: newDossier.id,
          client_type: clientInfo.client_type,
          nom: clientInfo.nom,
          prenom: clientInfo.prenom,
          telephone: clientInfo.telephone,
          email: clientInfo.email,
          adresse_sinistre: clientInfo.adresse_sinistre,
          type_sinistre: clientInfo.type_sinistre,
          compagnie_assurance: clientInfo.compagnie_assurance,
          numero_police: clientInfo.numero_police,
          date_sinistre: clientInfo.date_sinistre,
          metadata: { ...clientInfo.metadata, transferred_from: dossierId }
        });

      if (clientError) {
        console.error('Failed to copy client info:', clientError);
      } else {
        console.log('Client info copied successfully');
      }
    }

    // 7. Initialize workflow for target world with auto-completion for DBCS
    const { data: workflowTemplate, error: templateError } = await supabase
      .from('workflow_templates')
      .select(`
        id,
        steps:workflow_steps(id, step_number, step_type, name, metadata)
      `)
      .eq('world_id', targetWorld.id)
      .eq('is_active', true)
      .order('version', { ascending: false })
      .limit(1)
      .single();

    if (!templateError && workflowTemplate && workflowTemplate.steps) {
      console.log(`Initializing workflow with ${workflowTemplate.steps.length} steps`);
      
      const sortedSteps = workflowTemplate.steps.sort((a: any, b: any) => a.step_number - b.step_number);
      const firstStep = sortedSteps[0];
      const secondStep = sortedSteps[1];
      
      if (firstStep) {
        // Check if first step should be auto-completed (for DBCS reception)
        const shouldAutoComplete = firstStep.metadata?.auto_complete === true;
        
        if (shouldAutoComplete) {
          console.log('Auto-completing first step for DBCS');
          
          // Mark first step as completed
          await supabase
            .from('dossier_workflow_progress')
            .insert({
              dossier_id: newDossier.id,
              workflow_step_id: firstStep.id,
              status: 'completed',
              started_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
              completed_by: userId,
              notes: 'Réception automatique lors du transfert depuis JDMO',
              form_data: { transferred_from_world: sourceDossier.world.code }
            });

          // Log in history
          await supabase
            .from('dossier_workflow_history')
            .insert({
              dossier_id: newDossier.id,
              workflow_step_id: firstStep.id,
              user_id: userId,
              metadata: {
                auto_completed: true,
                reason: 'Réception automatique lors du transfert',
                source_world: sourceDossier.world.code
              }
            });

          // Add comment about auto-completion
          await supabase
            .from('dossier_comments')
            .insert({
              dossier_id: newDossier.id,
              user_id: userId,
              comment_type: 'system',
              content: `Étape "${firstStep.name || 'Réception'}" complétée automatiquement lors du transfert.`
            });

          // Activate second step if exists
          if (secondStep) {
            console.log('Activating second step');
            await supabase
              .from('dossier_workflow_progress')
              .insert({
                dossier_id: newDossier.id,
                workflow_step_id: secondStep.id,
                status: 'in_progress',
                started_at: new Date().toISOString(),
                form_data: { transferred_from_world: sourceDossier.world.code }
              });
          }
        } else {
          // Normal workflow initialization - first step pending
          await supabase
            .from('dossier_workflow_progress')
            .insert({
              dossier_id: newDossier.id,
              workflow_step_id: firstStep.id,
              status: 'pending',
              form_data: { transferred_from_world: sourceDossier.world.code }
            });
        }
      }
    }

    // 8. Create transfer comment in source dossier
    await supabase
      .from('dossier_comments')
      .insert({
        dossier_id: dossierId,
        user_id: userId,
        comment_type: 'system',
        content: `Dossier transféré vers ${targetWorld.name} (${targetWorldCode})`,
        metadata: {
          transfer_id: transfer.id,
          target_dossier_id: newDossier.id,
          target_world: targetWorldCode
        }
      });

    // 9. Create creation comment in new dossier
    await supabase
      .from('dossier_comments')
      .insert({
        dossier_id: newDossier.id,
        user_id: userId,
        comment_type: 'system',
        content: `Dossier créé par transfert depuis ${sourceDossier.world.name} (${sourceDossier.world.code})`,
        metadata: {
          transfer_id: transfer.id,
          source_dossier_id: dossierId,
          source_world: sourceDossier.world.code
        }
      });

    // 10. Copy attachments
    const { data: attachments } = await supabase
      .from('dossier_attachments')
      .select('*')
      .eq('dossier_id', dossierId);

    if (attachments && attachments.length > 0) {
      console.log(`Found ${attachments.length} attachments to copy`);
      for (const attachment of attachments) {
        await supabase
          .from('dossier_attachments')
          .insert({
            dossier_id: newDossier.id,
            file_name: attachment.file_name,
            file_type: attachment.file_type,
            file_size: attachment.file_size,
            storage_path: attachment.storage_path,
            document_type: attachment.document_type,
            uploaded_by: userId,
            metadata: { ...attachment.metadata, copied_from_transfer: transfer.id }
          });
      }
      console.log('Attachments metadata copied');
    }

    // 11. Copy appointments and notify assigned users
    const { data: appointments } = await supabase
      .from('appointments')
      .select('*')
      .eq('dossier_id', dossierId);

    const notifiedUsers = new Set<string>();

    if (appointments && appointments.length > 0) {
      console.log(`Found ${appointments.length} appointments to copy`);
      for (const appointment of appointments) {
        await supabase
          .from('appointments')
          .insert({
            dossier_id: newDossier.id,
            user_id: appointment.user_id,
            world_id: targetWorld.id,
            title: appointment.title,
            description: appointment.description,
            start_time: appointment.start_time,
            end_time: appointment.end_time,
            status: appointment.status,
            appointment_type: appointment.appointment_type,
            workflow_step_id: appointment.workflow_step_id
          });

        // Track user for notification (if not the one doing the transfer)
        if (appointment.user_id !== userId) {
          notifiedUsers.add(appointment.user_id);
        }
      }
      console.log('Appointments copied');

      // Send notifications to users with appointments
      if (notifiedUsers.size > 0) {
        console.log(`Sending notifications to ${notifiedUsers.size} users`);
        const notificationPromises = Array.from(notifiedUsers).map(notifiedUserId =>
          supabase.from('notifications').insert({
            user_id: notifiedUserId,
            type: 'dossier_transfer',
            title: 'Dossier transféré',
            message: `Le dossier "${sourceDossier.title}" a été transféré vers ${targetWorld.name}. Vos rendez-vous ont été copiés.`,
            related_id: newDossier.id
          })
        );
        await Promise.all(notificationPromises);
        console.log('Notifications sent');
      }
    }

    // 12. Copy existing comments (excluding system comments)
    const { data: comments } = await supabase
      .from('dossier_comments')
      .select('*')
      .eq('dossier_id', dossierId)
      .neq('comment_type', 'system');

    if (comments && comments.length > 0) {
      console.log(`Found ${comments.length} comments to copy`);
      for (const comment of comments) {
        await supabase
          .from('dossier_comments')
          .insert({
            dossier_id: newDossier.id,
            user_id: comment.user_id,
            comment_type: comment.comment_type,
            content: comment.content,
            metadata: { ...comment.metadata, copied_from_transfer: transfer.id, original_date: comment.created_at }
          });
      }
      console.log('Comments copied');
    }

    // 13. Update transfer record as completed
    await supabase
      .from('dossier_transfers')
      .update({
        target_dossier_id: newDossier.id,
        transfer_status: 'completed',
        completed_at: new Date().toISOString(),
        metadata: {
          ...transfer.metadata,
          new_dossier_id: newDossier.id,
          attachments_copied: attachments?.length || 0,
          appointments_copied: appointments?.length || 0,
          comments_copied: comments?.length || 0
        }
      })
      .eq('id', transfer.id);

    console.log('Transfer completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        transfer_id: transfer.id,
        new_dossier_id: newDossier.id,
        message: `Dossier transféré avec succès vers ${targetWorld.name}`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    // If anything fails, mark transfer as failed
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await supabase
      .from('dossier_transfers')
      .update({
        transfer_status: 'failed',
        error_message: errorMessage
      })
      .eq('id', transfer.id);

    throw error;
  }
}

async function getTransferHistory(supabase: any, dossierId: string) {
  const { data, error } = await supabase
    .from('dossier_transfers')
    .select(`
      *,
      source_world:worlds!dossier_transfers_source_world_id_fkey(code, name),
      target_world:worlds!dossier_transfers_target_world_id_fkey(code, name),
      transferred_by_profile:profiles!dossier_transfers_transferred_by_fkey(display_name)
    `)
    .or(`source_dossier_id.eq.${dossierId},target_dossier_id.eq.${dossierId}`)
    .order('transferred_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get transfer history: ${error.message}`);
  }

  return new Response(
    JSON.stringify({ transfers: data }),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

async function checkTransferEligibility(supabase: any, dossierId: string, targetWorldCode: string) {
  // Get source dossier
  const { data: dossier, error: dossierError } = await supabase
    .from('dossiers')
    .select(`
      *,
      world:worlds!inner(code)
    `)
    .eq('id', dossierId)
    .single();

  if (dossierError) {
    throw new Error('Dossier not found');
  }

  const sourceCode = dossier.world.code;
  const eligible = {
    can_transfer: false,
    reason: '',
    allowed_transfers: [] as string[]
  };

  // Define transfer rules
  if (sourceCode === 'JDE') {
    eligible.allowed_transfers = ['JDMO', 'DBCS'];
    eligible.can_transfer = ['JDMO', 'DBCS'].includes(targetWorldCode);
  } else if (sourceCode === 'JDMO') {
    eligible.allowed_transfers = ['DBCS'];
    eligible.can_transfer = targetWorldCode === 'DBCS';
  } else if (sourceCode === 'DBCS') {
    eligible.can_transfer = false;
    eligible.reason = 'Les dossiers DBCS ne peuvent pas être transférés';
  }

  if (!eligible.can_transfer && !eligible.reason) {
    eligible.reason = `Transfert de ${sourceCode} vers ${targetWorldCode} non autorisé`;
  }

  return new Response(
    JSON.stringify(eligible),
    { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}
