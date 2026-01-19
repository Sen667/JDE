<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\Controller;
use App\Models\Task;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->get('per_page', 15);
        $status = $request->get('status');
        $assignedTo = $request->get('assigned_to');
        $worldId = $request->get('world_id');

        $query = Task::with(['assignee.profile', 'creator.profile', 'world']);

        // Filter by worlds user has access to
        if (!$request->user()->hasRole('superadmin')) {
            $worldIds = $request->user()->worldAccess()->pluck('worlds.id');
            $query->whereIn('world_id', $worldIds);
        }

        if ($status) {
            $query->where('status', $status);
        }

        if ($assignedTo) {
            $query->where('assigned_to', $assignedTo);
        }

        if ($worldId) {
            $query->where('world_id', $worldId);
        }

        $tasks = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'tasks' => $tasks->map(function ($task) {
                return [
                    'id' => $task->id,
                    'title' => $task->title,
                    'description' => $task->description,
                    'status' => $task->status,
                    'priority' => $task->priority,
                    'due_date' => $task->due_date,
                    'assignee' => $task->assignee ? [
                        'id' => $task->assignee->id,
                        'name' => $task->assignee->name,
                        'email' => $task->assignee->email,
                    ] : null,
                    'creator' => [
                        'id' => $task->creator->id,
                        'name' => $task->creator->name,
                        'email' => $task->creator->email,
                    ],
                    'world' => [
                        'id' => $task->world->id,
                        'code' => $task->world->code,
                        'name' => $task->world->name,
                    ],
                    'created_at' => $task->created_at,
                    'updated_at' => $task->updated_at,
                ];
            }),
            'pagination' => [
                'current_page' => $tasks->currentPage(),
                'last_page' => $tasks->lastPage(),
                'per_page' => $tasks->perPage(),
                'total' => $tasks->total(),
            ]
        ]);
    }

    public function show(Request $request, Task $task)
    {
        if (!$request->user()->can('view', $task)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $task->load(['assignee.profile', 'creator.profile', 'world']);

        return response()->json([
            'task' => [
                'id' => $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'status' => $task->status,
                'priority' => $task->priority,
                'due_date' => $task->due_date,
                'assignee' => $task->assignee,
                'creator' => $task->creator,
                'world' => $task->world,
                'workflow_step_id' => $task->workflow_step_id,
                'created_at' => $task->created_at,
                'updated_at' => $task->updated_at,
            ]
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'required|in:low,medium,high,urgent',
            'assigned_to' => 'required|exists:users,id',
            'world_id' => 'required|exists:worlds,id',
            'dossier_id' => 'nullable|exists:dossiers,id',
            'due_date' => 'nullable|date',
        ]);

        if (!$request->user()->hasWorldAccess(\App\Models\World::find($request->world_id)->code)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($request->dossier_id) {
            $dossier = \App\Models\Dossier::find($request->dossier_id);
            if (!$request->user()->canAccessDossier($dossier)) {
                return response()->json(['message' => 'Unauthorized to create tasks for this dossier'], 403);
            }
        }

        $task = Task::create([
            'id' => (string) \Illuminate\Support\Str::uuid(),
            'title' => $request->title,
            'description' => $request->description,
            'priority' => $request->priority,
            'assigned_to' => $request->assigned_to,
            'created_by' => $request->user()->id,
            'world_id' => $request->world_id,
            'dossier_id' => $request->dossier_id,
            'due_date' => $request->due_date,
        ]);

        return response()->json([
            'message' => 'Task created successfully',
            'task' => $task
        ], 201);
    }

    public function update(Request $request, Task $task)
    {
        if (!$request->user()->can('update', $task)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'required|in:low,medium,high,urgent',
            'assigned_to' => 'required|exists:users,id',
            'due_date' => 'nullable|date',
        ]);

        $task->update($request->only(['title', 'description', 'priority', 'assigned_to', 'due_date']));

        return response()->json([
            'message' => 'Task updated successfully',
            'task' => $task
        ]);
    }

    public function updateStatus(Request $request, Task $task)
    {
        // Allow status updates if user is assigned to the task or has update permission
        if ($request->user()->id !== $task->assigned_to && $request->user()->id !== $task->created_by && !$request->user()->can('update', $task)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'status' => 'required|in:todo,in_progress,done,cancelled',
        ]);

        $task->update(['status' => $request->status]);

        return response()->json([
            'message' => 'Task status updated successfully',
            'task' => [
                'id' => $task->id,
                'status' => $task->status,
                'title' => $task->title,
                'description' => $task->description,
            ]
        ]);
    }

    public function quickStatusUpdate(Request $request, Task $task)
    {
        if ($request->user()->id !== $task->assigned_to && $request->user()->id !== $task->created_by && !$request->user()->can('update', $task)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'status' => 'required|in:todo,in_progress,done,cancelled',
        ]);

        $task->update(['status' => $request->status]);

        return response()->json([
            'message' => 'Task status updated successfully',
            'task' => [
                'id' => $task->id,
                'status' => $task->status,
            ]
        ]);
    }

    public function destroy(Request $request, Task $task)
    {
        if (!$request->user()->can('delete', $task)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $task->delete();

        return response()->json([
            'message' => 'Task deleted successfully'
        ]);
    }

    public function myTasks(Request $request)
    {
        $perPage = $request->get('per_page', 15);
        $status = $request->get('status');

        $query = Task::where('assigned_to', $request->user()->id)
                    ->with(['creator.profile', 'world']);

        if ($status) {
            $query->where('status', $status);
        }

        $tasks = $query->orderBy('due_date', 'asc')->paginate($perPage);

        return response()->json([
            'tasks' => $tasks->items(),
            'pagination' => [
                'current_page' => $tasks->currentPage(),
                'last_page' => $tasks->lastPage(),
                'per_page' => $tasks->perPage(),
                'total' => $tasks->total(),
            ]
        ]);
    }

    public function createDossierTask(Request $request, $dossierId)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => 'required|in:low,medium,high',
            'assigned_to' => 'nullable|exists:users,id',
            'due_date' => 'nullable|date',
            'workflow_step_id' => 'nullable|exists:workflow_steps,id',
        ]);

        $dossier = \App\Models\Dossier::findOrFail($dossierId);

        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $task = new Task();
        $task->id = (string) \Illuminate\Support\Str::uuid();
        $task->title = $request->title;
        $task->description = $request->description;
        $task->priority = $request->priority;
        $task->assigned_to = $request->assigned_to ?: $request->user()->id;
        $task->created_by = $request->user()->id;
        $task->world_id = $dossier->world_id;
        $task->dossier_id = $dossierId;
        $task->workflow_step_id = $request->workflow_step_id;
        $task->due_date = $request->due_date;
        $task->save();

        // If due_date is provided and user requested appointment creation, create one
        if ($request->due_date && $request->create_appointment) {
            $appointment = new \App\Models\Appointment();
            $appointment->id = (string) \Illuminate\Support\Str::uuid();
            $appointment->title = $task->title;
            $appointment->description = $task->description;
            $appointment->start_time = $request->due_date;
            $appointment->end_time = $request->due_date; // same as start_time
            $appointment->status = 'scheduled';
            $appointment->user_id = $task->assigned_to;
            $appointment->created_by = $request->user()->id;
            $appointment->world_id = $task->world_id;
            $appointment->dossier_id = $dossierId;
            $appointment->workflow_step_id = $task->workflow_step_id;
            $appointment->appointment_type = 'standard';
            $appointment->save();
        }

        $task->load(['assignee.profile', 'creator.profile', 'world']);

        return response()->json([
            'message' => 'Dossier task created successfully',
            'task' => [
                'id' => $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'status' => $task->status,
                'priority' => $task->priority,
                'due_date' => $task->due_date,
                'assigned_to' => $task->assigned_to,
                'created_by' => $task->created_by,
                'world_id' => $task->world_id,
                'workflow_step_id' => $task->workflow_step_id,
                'assignee' => [
                    'id' => $task->assignee->id,
                    'name' => $task->assignee->name,
                    'email' => $task->assignee->email,
                    'display_name' => $task->assignee->profile?->display_name ?? $task->assignee->name,
                    'avatar_url' => $task->assignee->profile?->avatar_url,
                ],
                'created_at' => $task->created_at,
            ]
        ], 201);
    }

    public function getDossierTasks(Request $request, $dossierId)
    {
        $dossier = \App\Models\Dossier::findOrFail($dossierId);

        if (!$request->user()->canAccessDossier($dossier)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Primary: Get tasks directly linked to this dossier
        // Fallback: Get tasks linked via workflow steps (legacy)
        $tasks = Task::where(function ($query) use ($dossierId, $dossier) {
                $query->where('dossier_id', $dossierId) // New direct dossier linking
                      ->orWhere(function ($q) use ($dossier) {
                          // Legacy fallback for tasks without dossier_id
                          $workflowStepIds = $dossier->workflowProgress()->pluck('workflow_step_id')->toArray();
                          $q->whereNull('dossier_id') // Must be NULL (not linked to other dossiers)
                            ->where('world_id', $dossier->world_id)
                            ->whereIn('workflow_step_id', $workflowStepIds);
                      });
            })
            ->with(['assignee.profile', 'creator.profile', 'world'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'tasks' => $tasks->map(function ($task) {
                return [
                    'id' => $task->id,
                    'title' => $task->title,
                    'description' => $task->description,
                    'status' => $task->status,
                    'priority' => $task->priority,
                    'due_date' => $task->due_date,
                    'workflow_step_id' => $task->workflow_step_id,
                    'assigned_to' => $task->assigned_to,
                    'created_by' => $task->created_by,
                    'creator' => [
                        'id' => $task->creator->id,
                        'name' => $task->creator->name,
                        'email' => $task->creator->email,
                        'display_name' => $task->creator->profile?->display_name ?? $task->creator->name,
                        'avatar_url' => $task->creator->profile?->avatar_url,
                    ],
                    'assignee' => [
                        'id' => $task->assignee->id,
                        'name' => $task->assignee->name,
                        'email' => $task->assignee->email,
                        'display_name' => $task->assignee->profile?->display_name ?? $task->assignee->name,
                        'avatar_url' => $task->assignee->profile?->avatar_url,
                    ],
                    'created_at' => $task->created_at,
                ];
            })
        ]);
    }
}
