<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\World;
use App\Models\Dossier;
use App\Models\Task;
use App\Models\Appointment;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminController extends Controller
{
    /**
     * Get comprehensive admin dashboard analytics
     */
    public function dashboardAnalytics(Request $request)
    {
        // World metrics
        $worldMetrics = World::withCount(['dossiers', 'users' => function ($query) {
            $query->whereHas('roles', function ($roleQuery) {
                $roleQuery->whereIn('name', ['superadmin', 'admin', 'editor', 'viewer']);
            });
        }])->get()->map(function ($world) {
            $completionRate = $world->dossiers_count > 0
                ? round(($world->dossiers()->where('status', 'completed')->count() / $world->dossiers_count) * 100, 2)
                : 0;

            return [
                'code' => $world->code,
                'name' => $world->name,
                'total_dossiers' => $world->dossiers_count,
                'active_users' => $world->users_count,
                'completion_rate' => $completionRate,
                'recent_dossiers' => $world->dossiers()->latest()->take(5)->pluck('title')->toArray()
            ];
        });

        // User activity metrics
        $userMetrics = [
            'total_users' => User::count(),
            'active_users_last_7_days' => User::where('updated_at', '>=', now()->subDays(7))->count(),
            'active_users_last_30_days' => User::where('updated_at', '>=', now()->subMonth())->count(),
            'users_by_role' => DB::table('model_has_roles')
                ->join('roles', 'model_has_roles.role_id', '=', 'roles.id')
                ->select('roles.name', DB::raw('count(*) as count'))
                ->groupBy('roles.name')
                ->pluck('count', 'roles.name')->toArray()
        ];

        // Task metrics
        $taskMetrics = [
            'total_tasks' => Task::count(),
            'completed_tasks' => Task::where('status', 'done')->count(),
            'pending_tasks' => Task::whereIn('status', ['todo', 'in_progress'])->count(),
            'overdue_tasks' => Task::where('due_date', '<', now())->where('status', '!=', 'done')->count(),
            'completion_rate' => Task::count() > 0 ? round((Task::where('status', 'done')->count() / Task::count()) * 100, 2) : 0
        ];

        // Appointment metrics
        $appointmentMetrics = [
            'total_appointments' => Appointment::count(),
            'upcoming_appointments' => Appointment::where('start_date', '>=', now())->count(),
            'past_appointments' => Appointment::where('start_date', '<', now())->count(),
            'cancelled_appointments' => Appointment::where('status', 'cancelled')->count()
        ];

        // Dossier metrics
        $monthlyDossierCreation = Dossier::selectRaw('DATE_FORMAT(created_at, "%Y-%m") as month, COUNT(*) as count')
            ->where('created_at', '>=', now()->subMonths(12))
            ->groupBy('month')
            ->orderBy('month')
            ->pluck('count', 'month')
            ->toArray();

        $dossierMetrics = [
            'total_dossiers' => Dossier::count(),
            'active_dossiers' => Dossier::whereIn('status', ['in_progress', 'pending'])->count(),
            'completed_dossiers' => Dossier::where('status', 'completed')->count(),
            'transferred_dossiers' => DB::table('dossier_transfers')->distinct('dossier_id')->count(),
            'dossier_creation_trend' => $monthlyDossierCreation
        ];

        // Client metrics
        $clientMetrics = [
            'total_clients' => Client::count(),
            'clients_with_active_dossiers' => Client::whereHas('dossiers.dossier', function ($query) {
                $query->where('status', '!=', 'completed');
            })->count(),
            'recent_clients' => Client::latest()->take(5)->pluck('nom')->toArray()
        ];

        return response()->json([
            'worlds' => $worldMetrics,
            'users' => $userMetrics,
            'tasks' => $taskMetrics,
            'appointments' => $appointmentMetrics,
            'dossiers' => $dossierMetrics,
            'clients' => $clientMetrics,
            'generated_at' => now()->toISOString()
        ]);
    }

    /**
     * Get data for dashboard charts
     */
    public function dashboardCharts(Request $request)
    {
        $period = $request->get('period', '30'); // days

        // Dossier creation chart data
        $dossierChart = Dossier::selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->where('created_at', '>=', now()->subDays($period))
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->pluck('count', 'date')
            ->toArray();

        // Task completion chart data
        $taskChart = Task::selectRaw('DATE(updated_at) as date, COUNT(*) as count')
            ->where('updated_at', '>=', now()->subDays($period))
            ->where('status', 'done')
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->pluck('count', 'date')
            ->toArray();

        // User activity chart data
        $userActivityChart = DB::table('audit_logs')
            ->selectRaw('DATE(created_at) as date, COUNT(*) as count')
            ->where('created_at', '>=', now()->subDays($period))
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->pluck('count', 'date')
            ->toArray();

        return response()->json([
            'dossier_creation' => $dossierChart,
            'task_completion' => $taskChart,
            'user_activity' => $userActivityChart,
            'labels' => array_keys($dossierChart) // Use dossier creation dates as labels
        ]);
    }

    /**
     * Generate PDF reports
     */
    public function generateReport(Request $request)
    {
        $request->validate([
            'type' => 'required|in:world_summary,user_activity,dossier_status',
            'world_id' => 'nullable|exists:worlds,id',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date'
        ]);

        $startDate = $request->start_date ? $request->start_date : now()->subMonth();
        $endDate = $request->end_date ? $request->end_date : now();

        $data = [];

        switch ($request->type) {
            case 'world_summary':
                $worldId = $request->world_id;
                if (!$worldId) {
                    return response()->json(['message' => 'World ID required for world summary'], 400);
                }

                $world = World::with(['dossiers.clientInfo.client'])->findOrFail($worldId);
                $data = [
                    'type' => 'world_summary',
                    'world' => $world->name,
                    'total_dossiers' => $world->dossiers->count(),
                    'active_dossiers' => $world->dossiers->where('status', '!=', 'completed')->count(),
                    'dossiers' => $world->dossiers->take(50)->map(function ($dossier) {
                        return [
                            'id' => $dossier->id,
                            'title' => $dossier->title,
                            'status' => $dossier->status,
                            'created_at' => $dossier->created_at->format('Y-m-d'),
                            'client' => $dossier->clientInfo->client->nom ?? 'N/A'
                        ];
                    })
                ];
                break;

            case 'user_activity':
                $data = [
                    'type' => 'user_activity',
                    'users' => User::with(['worldAccess.world'])
                        ->where('updated_at', '>=', $startDate)
                        ->withCount(['dossiers' => function ($query) use ($startDate, $endDate) {
                            $query->whereBetween('created_at', [$startDate, $endDate]);
                        }])
                        ->get()
                        ->map(function ($user) {
                            return [
                                'name' => $user->name,
                                'email' => $user->email,
                                'role' => $user->roles->first()?->name ?? 'No role',
                                'worlds' => $user->worldAccess->pluck('world.code')->join(', '),
                                'dossiers_created' => $user->dossiers_count
                            ];
                        })
                ];
                break;

            case 'dossier_status':
                $data = [
                    'type' => 'dossier_status',
                    'dossiers' => Dossier::with(['world', 'clientInfo.client'])
                        ->whereBetween('created_at', [$startDate, $endDate])
                        ->orderBy('created_at', 'desc')
                        ->take(100)
                        ->get()
                        ->map(function ($dossier) {
                            return [
                                'title' => $dossier->title,
                                'status' => $dossier->status,
                                'world' => $dossier->world->name,
                                'client' => $dossier->clientInfo->client->nom ?? 'N/A',
                                'created_at' => $dossier->created_at->format('Y-m-d'),
                                'last_updated' => $dossier->updated_at->format('Y-m-d')
                            ];
                        })
                ];
                break;
        }

        // Note: In production, you'd generate an actual PDF here using libraries like TCPDF, DomPDF, etc.
        // For now, we'll return the data that would be used to generate the PDF

        return response()->json([
            'report_type' => $request->type,
            'generated_at' => now()->toISOString(),
            'date_range' => [
                'start' => $startDate,
                'end' => $endDate
            ],
            'data' => $data,
            'note' => 'PDF generation would be implemented here in production'
        ]);
    }


    public function systemHealth(Request $request)
    {
        $health = [
            'database' => $this->checkDatabaseHealth(),
            'storage' => $this->checkStorageHealth(),
            'worlds' => World::count(),
            'users' => User::count(),
            'dossiers' => Dossier::count(),
            'tasks' => Task::count(),
            'appointments' => Appointment::count(),
            'last_backup' => '2025-01-01T00:00:00Z', // This would be dynamic in production
            'uptime' => now()->diffInHours(now()->createFromTimestamp(0)), // Example
        ];

        return response()->json($health);
    }

    /**
     * CRUD operations for admins
     */
    public function worlds(Request $request)
    {
        $worlds = World::withCount(['dossiers', 'users'])->paginate(10);

        return response()->json([
            'worlds' => $worlds->map(function ($world) {
                return [
                    'id' => $world->id,
                    'code' => $world->code,
                    'name' => $world->name,
                    'description' => $world->description,
                    'theme_colors' => $world->theme_colors,
                    'dossiers_count' => $world->dossiers_count,
                    'users_count' => $world->users_count,
                    'created_at' => $world->created_at,
                    'updated_at' => $world->updated_at
                ];
            }),
            'pagination' => [
                'current_page' => $worlds->currentPage(),
                'last_page' => $worlds->lastPage(),
                'per_page' => $worlds->perPage(),
                'total' => $worlds->total(),
            ]
        ]);
    }

    /**
     * Create a new world
     */
    public function createWorld(Request $request)
    {
        $request->validate([
            'code' => 'required|string|unique:worlds,code|max:10',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'theme_colors' => 'nullable|array',
            'theme_colors.primary' => 'nullable|string',
            'theme_colors.accent' => 'nullable|string',
            'theme_colors.neutral' => 'nullable|string',
        ]);

        $world = World::create($request->all());

        return response()->json([
            'message' => 'World created successfully',
            'world' => $world
        ], 201);
    }

    /**
     * Update world details
     */
    public function updateWorld(Request $request, World $world)
    {
        $request->validate([
            'code' => 'sometimes|string|unique:worlds,code,' . $world->id . '|max:10',
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'theme_colors' => 'nullable|array',
            'theme_colors.primary' => 'nullable|string',
            'theme_colors.accent' => 'nullable|string',
            'theme_colors.neutral' => 'nullable|string',
        ]);

        $world->update($request->all());

        return response()->json([
            'message' => 'World updated successfully',
            'world' => $world
        ]);
    }

    /**
     * Delete a world (with safety checks)
     */
    public function deleteWorld(Request $request, World $world)
    {
        // Check if world has active dossiers
        if ($world->dossiers()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete world with active dossiers. Please move or delete all dossiers first.'
            ], 422);
        }

        // Check if world has users
        if ($world->users()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete world with assigned users. Please remove all user access first.'
            ], 422);
        }

        $world->delete();

        return response()->json([
            'message' => 'World deleted successfully'
        ]);
    }

    private function checkDatabaseHealth()
    {
        try {
            DB::connection()->getPdo();
            return ['status' => 'healthy', 'message' => 'Database connection successful'];
        } catch (\Exception $e) {
            return ['status' => 'error', 'message' => 'Database connection failed: ' . $e->getMessage()];
        }
    }

    private function checkStorageHealth()
    {
        try {
            $testFile = storage_path('app/test.txt');
            file_put_contents($testFile, 'test');
            unlink($testFile);
            return ['status' => 'healthy', 'message' => 'Storage is writable'];
        } catch (\Exception $e) {
            return ['status' => 'error', 'message' => 'Storage write failed: ' . $e->getMessage()];
        }
    }
}
