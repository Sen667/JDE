<?php

use App\Http\Controllers\API\V1\AuthController;
use App\Http\Controllers\API\V1\DossierController;
use App\Http\Controllers\API\V1\WorldController;
use App\Http\Controllers\API\V1\ClientController;
use App\Http\Controllers\API\V1\TaskController;
use App\Http\Controllers\API\V1\AppointmentController;
use App\Http\Controllers\API\V1\WorkflowController;
use App\Http\Controllers\API\V1\NotificationController;
use App\Http\Controllers\API\V1\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    $user = $request->user()->load(['roles']);
    return response()->json([
        'id' => $user->id,
        'name' => $user->name,
        'email' => $user->email,
        'roles' => $user->roles->pluck('name'),
        'worlds' => $user->worldAccess,
    ]);
});

// Authentication Routes - Exclude Sanctum middleware but still get /api prefix
Route::withoutMiddleware([\Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class])
     ->prefix('auth')
     ->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('register', [AuthController::class, 'register']);
    Route::post('logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
});

// Temporary debug route to test user context loading
Route::middleware(['auth:sanctum'])->get('/debug-user-context', function (Request $request) {
    try {
        $user = $request->user()->load(['roles', 'profile', 'worldAccess.world']);
        return response()->json([
            'user_id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'roles_count' => $user->roles->count(),
            'worlds_count' => $user->worldAccess->count(),
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'error' => $e->getMessage(),
            'trace' => $e->getTraceAsString()
        ], 500);
    }
});

// Protected Routes
Route::middleware(['auth:sanctum'])->group(function () {

    // User Profile
    Route::get('profile', [UserController::class, 'profile']);
    Route::put('profile', [UserController::class, 'updateProfile']);

    // Users by World (for task assignment, etc.)
    Route::get('worlds/{worldCode}/users', [UserController::class, 'getUsersByWorld']);
    Route::get('users/assignable', [UserController::class, 'getAssignableUsers']);

    // Roles management
    Route::get('roles', [UserController::class, 'getAllRoles']);
    Route::get('permissions', [UserController::class, 'getAllPermissions']);
    // Note: Role CRUD moved to admin routes group below for proper authentication

    // Worlds
    Route::apiResource('worlds', WorldController::class)->only(['index', 'show']);
    Route::get('worlds/{world}/dossiers', [WorldController::class, 'dossiers']);

    // Dossiers
    Route::apiResource('dossiers', DossierController::class);
    Route::get('dossiers/{dossier}/workflow', [DossierController::class, 'workflow']);
    Route::get('dossiers/{dossier}/timeline', [DossierController::class, 'timeline']);
    Route::post('dossiers/{dossier}/workflow/complete-step', [WorkflowController::class, 'completeWorkflowStep']);
    Route::post('dossiers/workflow/save-form-data', [WorkflowController::class, 'saveWorkflowFormData']);
    Route::get('dossiers/{dossier}/workflow/history', [DossierController::class, 'workflowHistory']);

    // Workflow
    Route::get('workflow/templates', [WorkflowController::class, 'getWorkflowTemplates']);
    Route::get('workflow/templates/{template}', [WorkflowController::class, 'getWorkflowTemplate']);
    Route::get('workflow/templates/{template}/steps', [WorkflowController::class, 'getWorkflowSteps']);
    Route::get('worlds/{worldId}/workflow-steps', [WorkflowController::class, 'getWorldWorkflowSteps']);
    Route::get('dossiers/{dossierId}/progress', [WorkflowController::class, 'getDossierProgress']);
    Route::post('dossiers/{dossierId}/workflow/create-initial-progress', [WorkflowController::class, 'createInitialProgress']);
    Route::apiResource('workflow/progress', WorkflowController::class)->parameters(['progress' => 'progress'])->only(['store', 'update']);
    Route::get('workflow/available-steps/{dossier}', [WorkflowController::class, 'getAvailableSteps']);
    Route::post('workflow/get-next-step', [WorkflowController::class, 'getNextStep']);
    Route::get('dossiers/{dossierId}/workflow/steps', [WorkflowController::class, 'getDossierWorkflowSteps']);
    Route::get('dossiers/{dossierId}/workflow/overview', [WorkflowController::class, 'getWorkflowOverview']);

    // Workflow Rollback
    Route::post('dossiers/{dossierId}/workflow/{stepId}/rollback-step', [WorkflowController::class, 'rollbackWorkflowStep']);
    Route::get('dossiers/{dossierId}/workflow/{stepId}/rollback-history', [WorkflowController::class, 'getStepRollbackHistory']);
    Route::get('dossiers/{dossierId}/workflow/{stepId}/can-rollback', [WorkflowController::class, 'canRollbackStep']);

    // Dossier Transfers
    Route::get('transfers/history/{dossier}', [DossierController::class, 'transferHistory']);
    Route::get('dossiers/{dossierId}/transfers', [WorkflowController::class, 'getDossierTransferHistory']);
    Route::post('transfers/initiate', [WorkflowController::class, 'initiateTransfer']);
    Route::get('transfers/check-eligibility', [WorkflowController::class, 'checkTransferEligibility']);

    // Dossier Management
    Route::post('dossiers/{dossier}/attachments', [DossierController::class, 'uploadAttachment']);
    Route::get('dossiers/{dossier}/attachments', [DossierController::class, 'getAttachments']);
    Route::delete('dossiers/{dossier}/attachments/{attachmentId}', [DossierController::class, 'deleteAttachment']);

    // Photo/Plan Management
    Route::get('dossiers/{dossier}/photos', [DossierController::class, 'getPhotos']);
    Route::post('dossiers/{dossier}/photos', [DossierController::class, 'uploadPhoto']);
    Route::delete('dossiers/{dossier}/photos/{photoId}', [DossierController::class, 'deletePhoto']);
    Route::get('dossiers/{dossier}/photos/{photoId}/preview', [DossierController::class, 'previewPhoto']);

    // Dossier Download
    Route::get('dossiers/{dossier}/download', [DossierController::class, 'downloadDossier']);

    // Administrative Documents
    Route::get('dossiers/{dossier}/administrative-documents', [DossierController::class, 'getAdministrativeDocuments']);
    Route::post('dossiers/{dossier}/administrative-documents/{documentType}/mark-received', [DossierController::class, 'markAdminDocumentReceived']);
    Route::post('dossiers/{dossier}/administrative-documents/{documentType}/upload', [DossierController::class, 'uploadAdminDocument']);
    Route::delete('dossiers/{dossier}/administrative-documents/{documentType}', [DossierController::class, 'removeAdminDocument']);
    Route::put('dossiers/{dossier}/administrative-documents/{documentType}/status', [DossierController::class, 'updateAdminDocumentStatus']);
    Route::get('dossiers/{dossier}/attachments/{attachmentId}/download', [DossierController::class, 'downloadAttachment']);
    Route::get('dossiers/{dossier}/attachments/{attachmentId}/preview', [DossierController::class, 'previewAttachment']);
    Route::post('dossiers/{dossier}/comments', [DossierController::class, 'addComment']);
    Route::get('dossiers/{dossier}/comments', [DossierController::class, 'comments']);
    Route::post('dossiers/{dossier}/annotations', [WorkflowController::class, 'addAnnotation']);
    Route::get('dossiers/{dossier}/annotations', [WorkflowController::class, 'annotations']);

    // Client Info
    Route::get('dossiers/{dossier}/client-info', [DossierController::class, 'getClientInfo']);
    Route::post('dossiers/{dossier}/client-info', [DossierController::class, 'updateClientInfo']);

    // Clients Management
    Route::apiResource('clients', ClientController::class);
    Route::get('worlds/{worldId}/clients', [ClientController::class, 'getByWorld']);
    Route::get('my-clients', [ClientController::class, 'myClients']);

    // Tasks
    Route::apiResource('tasks', TaskController::class);
    Route::put('tasks/{task}/status', [TaskController::class, 'updateStatus']);
    Route::patch('tasks/{task}/quick-status', [TaskController::class, 'quickStatusUpdate']);
    Route::get('my-tasks', [TaskController::class, 'myTasks']);
    Route::post('dossiers/{dossierId}/tasks', [TaskController::class, 'createDossierTask']);
    Route::get('dossiers/{dossierId}/tasks', [TaskController::class, 'getDossierTasks']);

    // Appointments
    Route::apiResource('appointments', AppointmentController::class);
    Route::get('my-appointments', [AppointmentController::class, 'myAppointments']);
    Route::put('appointments/{appointment}/status', [AppointmentController::class, 'updateStatus']);
    Route::post('dossiers/{dossierId}/appointments', [AppointmentController::class, 'createDossierAppointment']);
    Route::get('dossiers/{dossierId}/appointments', [AppointmentController::class, 'getDossierAppointments']);

    // Notifications
    Route::apiResource('notifications', NotificationController::class)->only(['index', 'store', 'show', 'destroy']);
    Route::put('notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
    Route::post('notifications/mark-all-read', [NotificationController::class, 'markAllAsRead']);

    // Admin Routes (require admin role)
    Route::middleware(['role:super-admin'])->prefix('admin')->group(function () {
        // Enhanced Admin Analytics
        Route::get('dashboard-analytics', [AdminController::class, 'dashboardAnalytics']);
        Route::get('dashboard-charts', [AdminController::class, 'dashboardCharts']);
        Route::post('reports/generate', [AdminController::class, 'generateReport']);
        Route::get('system-health', [AdminController::class, 'systemHealth']);

        // World Management
        Route::get('worlds', [AdminController::class, 'worlds']);
        Route::post('worlds', [AdminController::class, 'createWorld']);
        Route::put('worlds/{world}', [AdminController::class, 'updateWorld']);
        Route::delete('worlds/{world}', [AdminController::class, 'deleteWorld']);

        // User Management (using existing UserController methods)
        Route::get('users/with-world-access', [UserController::class, 'getUsersWithWorldAccess']);
        Route::put('users/{user}/world-access', [UserController::class, 'updateWorldAccess']);
        Route::post('users/{user}/world-access/{worldId}', [UserController::class, 'addUserWorldAccess']);
        Route::delete('users/{user}/world-access/{worldId}', [UserController::class, 'removeUserWorldAccess']);
        Route::put('users/{user}/role', [UserController::class, 'updateRole']);

        // Role management (CRUD operations requiring admin access)
        Route::post('roles', [UserController::class, 'createRole']);
        Route::put('roles/{roleId}', [UserController::class, 'updateRoleDetails']);
        Route::delete('roles/{roleId}', [UserController::class, 'deleteRole']);

        // apiResource must come AFTER custom routes to avoid conflicts
        Route::apiResource('users', UserController::class)->parameters(['users' => 'user']);

        // Legacy analytics (will be replaced by new AdminController analytics)
        Route::get('analytics', [UserController::class, 'analytics']);
        Route::get('audit-logs', [UserController::class, 'auditLogs']);
    });
});
