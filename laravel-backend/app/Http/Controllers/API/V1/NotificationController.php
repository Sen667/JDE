<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->get('per_page', 20);

        $notifications = $request->user()
            ->notifications()
            ->orderBy('created_at', 'desc')
            ->paginate($perPage);

        return response()->json([
            'notifications' => $notifications->map(function ($notification) {
                return [
                    'id' => $notification->id,
                    'title' => $notification->title,
                    'message' => $notification->message,
                    'type' => $notification->type,
                    'read' => $notification->read,
                    'data' => $notification->data,
                    'created_at' => $notification->created_at,
                    'updated_at' => $notification->updated_at,
                ];
            }),
            'pagination' => [
                'current_page' => $notifications->currentPage(),
                'last_page' => $notifications->lastPage(),
                'per_page' => $notifications->perPage(),
                'total' => $notifications->total(),
            ]
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'type' => 'required|in:task,appointment,system,dossier',
            'read' => 'boolean',
            'related_id' => 'nullable|uuid',
        ]);

        // Check if user creating notification has permission
        // For now, allow any authenticated user to create notifications

        $notification = Notification::create($request->all());

        return response()->json([
            'message' => 'Notification created successfully',
            'notification' => $notification
        ], 201);
    }

    public function show(Request $request, Notification $notification)
    {
        if ($notification->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json(['notification' => $notification]);
    }

    public function markAsRead(Request $request, Notification $notification)
    {
        if ($notification->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $notification->update(['read' => true]);

        return response()->json([
            'message' => 'Notification marked as read',
            'notification' => $notification
        ]);
    }

    public function destroy(Request $request, Notification $notification)
    {
        if ($notification->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $notification->delete();

        return response()->json(['message' => 'Notification deleted successfully']);
    }

    public function markAllAsRead(Request $request)
    {
        $request->user()->notifications()->update(['read' => true]);

        return response()->json(['message' => 'All notifications marked as read']);
    }

    // Debug method to check table structure
    public function debug()
    {
        try {
            $columns = \DB::select("DESCRIBE notifications");
            $sample = \DB::table('notifications')->first();

            return response()->json([
                'table_columns' => $columns,
                'sample_data' => $sample,
                'table_count' => \DB::table('notifications')->count(),
                'expected_structure' => [
                    'id' => 'uuid primary key',
                    'user_id' => 'bigint unsigned foreign key',
                    'title' => 'varchar(255)',
                    'message' => 'text',
                    'type' => 'enum(task, appointment, system, dossier)',
                    'read' => 'boolean default false',
                    'related_id' => 'uuid nullable',
                    'created_at' => 'timestamp',
                    'updated_at' => 'timestamp (auto)'
                ]
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
        }
    }
}
