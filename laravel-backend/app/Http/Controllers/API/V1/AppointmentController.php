<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\Controller;
use App\Models\Appointment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class AppointmentController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->get('per_page', 15);
        $status = $request->get('status');
        $startDate = $request->get('start_date');

        $query = Appointment::with(['user.profile', 'creator.profile']);

        if (!$request->user()->hasRole('superadmin')) {
        $worldIds = $request->user()->worldAccess()->pluck('worlds.id');
            $query->whereIn('world_id', $worldIds);
        }

        if ($status) {
            $query->where('status', $status);
        }

        if ($startDate) {
            $query->where('start_time', '>=', $startDate);
        }

        $appointments = $query->orderBy('start_time', 'desc')->paginate($perPage);

        return response()->json([
            'appointments' => $appointments->map(function ($appointment) {
                return [
                    'id' => $appointment->id,
                    'title' => $appointment->title,
                    'description' => $appointment->description,
                    'start_time' => $appointment->start_time,
                    'end_time' => $appointment->end_time,
                    'status' => $appointment->status,
                    'user' => $appointment->user ? [
                        'id' => $appointment->user->id,
                        'name' => $appointment->user->name,
                        'email' => $appointment->user->email,
                    ] : null,
                    'creator' => $appointment->creator ? [
                        'id' => $appointment->creator->id,
                        'name' => $appointment->creator->name,
                        'email' => $appointment->creator->email,
                    ] : null,
                    'created_at' => $appointment->created_at,
                    'updated_at' => $appointment->updated_at,
                ];
            }),
            'pagination' => [
                'current_page' => $appointments->currentPage(),
                'last_page' => $appointments->lastPage(),
                'per_page' => $appointments->perPage(),
                'total' => $appointments->total(),
            ]
        ]);
    }

    public function show(Request $request, Appointment $appointment)
    {
        if (!$request->user()->can('view', $appointment)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $appointment->load(['user.profile', 'creator.profile']);

        return response()->json([
            'appointment' => [
                'id' => $appointment->id,
                'title' => $appointment->title,
                'description' => $appointment->description,
                'start_time' => $appointment->start_time,
                'end_time' => $appointment->end_time,
                'status' => $appointment->status,
                'user' => $appointment->user,
                'creator' => $appointment->creator,
                'workflow_step_id' => $appointment->workflow_step_id,
                'created_at' => $appointment->created_at,
                'updated_at' => $appointment->updated_at,
            ]
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_time' => 'required|date',
            'end_time' => 'nullable|date|after_or_equal:start_time',
            'user_id' => 'required|exists:users,id',
        ]);

        $appointment = new Appointment();
        $appointment->id = (string) \Illuminate\Support\Str::uuid();
        $appointment->title = $request->title;
        $appointment->description = $request->description;
        $appointment->start_time = $request->start_time;
        $appointment->end_time = $request->end_time ?: $request->start_time;
        $appointment->user_id = $request->user_id;
        $appointment->world_id = $request->world_id;
        $appointment->created_by = $request->user()->id;
        $appointment->status = 'scheduled';
        $appointment->appointment_type = 'standard';
        $appointment->save();

        return response()->json([
            'message' => 'Appointment created successfully',
            'appointment' => $appointment
        ], 201);
    }

    public function update(Request $request, Appointment $appointment)
    {
        // Check permissions for updating the appointment
        $canUpdate = false;

        if ($request->user()->id === $appointment->created_by) {
            $canUpdate = true;
        } elseif ($appointment->user_id && $request->user()->id === $appointment->user_id) {
            $canUpdate = true;
        }

        if ($appointment->dossier_id) {
            $dossier = \App\Models\Dossier::find($appointment->dossier_id);
            if ($dossier && $dossier->owner_id === $request->user()->id) {
                $canUpdate = true;
            }
        }

        if (!$canUpdate) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_time' => 'required|date',
            'end_time' => 'nullable|date|after_or_equal:start_time',
            'user_id' => 'sometimes|exists:users,id',
        ]);

        $updateData = [
            'title' => $request->title,
            'description' => $request->description,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
        ];

        // Only allow updating user assignment if the current user created the appointment
        if ($request->has('user_id') && $request->user()->id === $appointment->created_by) {
            $updateData['user_id'] = $request->user_id ?: $request->user()->id;
        }

        $appointment->update($updateData);
        $appointment->load(['user.profile', 'creator.profile']);

        return response()->json([
            'message' => 'Rendez-vous mis à jour avec succès',
            'appointment' => [
                'id' => $appointment->id,
                'title' => $appointment->title,
                'description' => $appointment->description,
                'start_time' => $appointment->start_time,
                'end_time' => $appointment->end_time,
                'status' => $appointment->status,
                'user_id' => $appointment->user_id,
                'created_by' => $appointment->created_by,
                'user' => $appointment->user ? [
                    'id' => $appointment->user->id,
                    'name' => $appointment->user->name,
                    'email' => $appointment->user->email,
                    'display_name' => $appointment->user->profile?->display_name ?? $appointment->user->name,
                    'avatar_url' => $appointment->user->profile?->avatar_url,
                ] : null,
                'creator' => $appointment->creator ? [
                    'id' => $appointment->creator->id,
                    'name' => $appointment->creator->name,
                    'email' => $appointment->creator->email,
                    'display_name' => $appointment->creator->profile?->display_name ?? $appointment->creator->name,
                    'avatar_url' => $appointment->creator->profile?->avatar_url,
                ] : null,
                'created_at' => $appointment->created_at,
                'updated_at' => $appointment->updated_at,
            ]
        ]);
    }

    public function updateStatus(Request $request, Appointment $appointment)
    {
        if ($request->user()->id !== $appointment->user_id && $request->user()->id !== $appointment->created_by && !$request->user()->can('update', $appointment)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'status' => 'required|in:scheduled,confirmed,completed,cancelled',
        ]);

        $appointment->update(['status' => $request->status]);

        return response()->json([
            'message' => 'Appointment status updated successfully',
            'appointment' => [
                'id' => $appointment->id,
                'status' => $appointment->status,
                'title' => $appointment->title,
            ]
        ]);
    }

    public function destroy(Request $request, Appointment $appointment)
    {
        if (!$request->user()->can('delete', $appointment)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $appointment->delete();

        return response()->json([
            'message' => 'Appointment deleted successfully'
        ]);
    }

    public function myAppointments(Request $request)
    {
        $perPage = $request->get('per_page', 15);
        $status = $request->get('status');

        $query = Appointment::where('user_id', $request->user()->id)
                           ->orWhere('created_by', $request->user()->id);

        if ($status) {
            $query->where('status', $status);
        }

        $appointments = $query->orderBy('start_time', 'asc')->paginate($perPage);

        return response()->json([
            'appointments' => $appointments->items(),
            'pagination' => [
                'current_page' => $appointments->currentPage(),
                'last_page' => $appointments->lastPage(),
                'per_page' => $appointments->perPage(),
                'total' => $appointments->total(),
            ]
        ]);
    }

    public function createDossierAppointment(Request $request, $dossierId)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_time' => 'required|date',
            'end_time' => 'nullable|date|after_or_equal:start_time',
            'user_id' => 'nullable|exists:users,id',
            'workflow_step_id' => 'nullable|exists:workflow_steps,id',
        ]);

        $dossier = \App\Models\Dossier::findOrFail($dossierId);


        if (!$request->user()->hasRole('superadmin')) {
            $userWorldIds = $request->user()->worldAccess()->pluck('worlds.id')->toArray();
            if (!in_array($dossier->world_id, $userWorldIds) && $request->user()->id !== $dossier->owner_id) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        if ($request->user_id && $request->user_id !== $request->user()->id) {
            if (!$request->user()->hasRole('superadmin')) {
                $assignee = \App\Models\User::find($request->user_id);
                if ($assignee) {
                    $assigneeWorldIds = $assignee->worldAccess()->pluck('worlds.id')->toArray();
                    if (!in_array($dossier->world_id, $assigneeWorldIds)) {
                        return response()->json(['message' => 'Cannot assign to this user - no access to world'], 403);
                    }
                }
            }
        }

        // Get workflow step details to populate world_id and dossier relationship
        $worldId = null;
        if ($request->workflow_step_id) {
            $workflowStep = \App\Models\WorkflowStep::find($request->workflow_step_id);
            if ($workflowStep) {
                $worldId = $workflowStep->world_id;
            }
        }

        $appointment = new Appointment();
        $appointment->id = (string) \Illuminate\Support\Str::uuid();
        $appointment->title = $request->title;
        $appointment->description = $request->description;
        $appointment->start_time = $request->start_time;
        $appointment->end_time = $request->end_time ?: $request->start_time;
        $appointment->user_id = $request->user_id ?: $request->user()->id;
        $appointment->created_by = $request->user()->id;
        $appointment->world_id = $worldId ?: $dossier->world_id;
        $appointment->dossier_id = $dossierId;
        $appointment->workflow_step_id = $request->workflow_step_id;
        $appointment->status = 'scheduled';
        $appointment->appointment_type = 'standard';
        $appointment->save();

        $appointment->load(['user.profile', 'creator.profile']);

        return response()->json([
            'message' => 'Rendez-vous créé avec succès',
            'appointment' => [
                'id' => $appointment->id,
                'title' => $appointment->title,
                'description' => $appointment->description,
                'start_time' => $appointment->start_time,
                'end_time' => $appointment->end_time,
                'status' => $appointment->status,
                'user_id' => $appointment->user_id,
                'created_by' => $appointment->created_by,
                'workflow_step_id' => $appointment->workflow_step_id,
                'user' => [
                    'id' => $appointment->user->id,
                    'name' => $appointment->user->name,
                    'email' => $appointment->user->email,
                    'display_name' => $appointment->user->profile?->display_name ?? $appointment->user->name,
                    'avatar_url' => $appointment->user->profile?->avatar_url,
                ],
                'created_at' => $appointment->created_at,
            ]
        ], 201);
    }

    public function getDossierAppointments(Request $request, $dossierId)
    {
        $dossier = \App\Models\Dossier::findOrFail($dossierId);

        // Check if user has access to the dossier world
        if (!$request->user()->hasRole('superadmin')) {
            $userWorldIds = $request->user()->worldAccess()->pluck('worlds.id')->toArray();
            if (!in_array($dossier->world_id, $userWorldIds) && $request->user()->id !== $dossier->owner_id) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        $appointments = Appointment::where('dossier_id', $dossierId)
                                  ->with(['user.profile', 'creator.profile'])
                                  ->orderBy('start_time', 'desc')
                                  ->get();

        return response()->json([
            'appointments' => $appointments->map(function ($appointment) {
                return [
                    'id' => $appointment->id,
                    'title' => $appointment->title,
                    'description' => $appointment->description,
                    'start_time' => $appointment->start_time,
                    'end_time' => $appointment->end_time,
                    'status' => $appointment->status,
                    'workflow_step_id' => $appointment->workflow_step_id,
                    'user_id' => $appointment->user_id,
                    'created_by' => $appointment->created_by,
                    'creator' => $appointment->creator ? [
                        'id' => $appointment->creator->id,
                        'name' => $appointment->creator->name,
                        'email' => $appointment->creator->email,
                        'display_name' => $appointment->creator->profile?->display_name ?? $appointment->creator->name,
                        'avatar_url' => $appointment->creator->profile?->avatar_url,
                    ] : null,
                    'user' => [
                        'id' => $appointment->user->id,
                        'name' => $appointment->user->name,
                        'email' => $appointment->user->email,
                        'display_name' => $appointment->user->profile?->display_name ?? $appointment->user->name,
                        'avatar_url' => $appointment->user->profile?->avatar_url,
                    ],
                    'created_at' => $appointment->created_at,
                ];
            })
        ]);
    }
}
