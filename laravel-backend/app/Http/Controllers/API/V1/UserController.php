<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Str;
use Illuminate\Validation\ValidationException;
use App\Models\User;

class UserController extends Controller
{
    public function profile(Request $request)
    {
        $user = $request->user();
        return response()->json([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'roles' => $user->roles->pluck('name'),
            'worlds' => $user->worldAccess,
            'profile' => $user->profile,
        ]);
    }

    public function updateProfile(Request $request)
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $request->user()->id,
        ]);

        $user = $request->user();
        $user->update($request->only(['name', 'email']));


        if ($user->profile()) {
            $user->profile()->update($request->only(['email']));
        } else {
            $user->profile()->create([
                'id' => (string) \Illuminate\Support\Str::uuid(),
                'email' => $request->email ?? $user->email,
                'display_name' => $request->name ?? $user->name,
            ]);
        }

        return response()->json([
            'message' => 'Profile updated successfully',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->roles->pluck('name'),
                'worlds' => $user->worldAccess,
            ],
        ]);
    }

    public function getUsersByWorld(Request $request, $worldCode)
    {

        if (!$request->user()->hasWorldAccess($worldCode)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $users = User::whereHas('worldAccess', function ($query) use ($worldCode) {
            $query->whereHas('world', function ($q) use ($worldCode) {
                $q->where('code', $worldCode);
            });
        })->with(['profile', 'roles', 'worldAccess.world'])->get();

        return response()->json([
            'users' => $users->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'profile' => $user->profile ? [
                        'id' => $user->profile->id,
                        'display_name' => $user->profile->display_name,
                        'avatar_url' => $user->profile->avatar_url,
                    ] : null,
                    'roles' => $user->roles->pluck('name'),
                    'worlds' => $user->worldAccess->map(function ($access) {
                        return [
                            'world_id' => $access->world_id,
                        ];
                    })
                ];
            })
        ]);
    }

    public function getAssignableUsers(Request $request)
    {

        $users = User::with(['profile', 'roles', 'worldAccess'])->get();

        return response()->json([
            'users' => $users->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'profile' => $user->profile ? [
                        'id' => $user->profile->id,
                        'display_name' => $user->profile->display_name,
                        'avatar_url' => $user->profile->avatar_url,
                    ] : null,
                    'roles' => $user->roles->pluck('name'),
                    'worlds' => $user->worldAccess->map(function ($access) {
                        return [
                            'world_id' => $access->world_id,
                        ];
                    })
                ];
            })
        ]);
    }

    public function getRoles(Request $request)
    {
        $roles = \App\Models\Role::all();

        return response()->json([
            'roles' => $roles->map(function ($role) {
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'display_name' => $role->display_name ?? $role->name,
                ];
            })
        ]);
    }

    public function removeRoleFromUser(Request $request, User $user)
    {
        $request->validate([
            'role' => 'required|string'
        ]);

        $role = \App\Models\Role::where('name', $request->role)->first();
        if (!$role) {
            return response()->json(['message' => 'Role not found'], 404);
        }

        $user->roles()->detach($role->id);

        return response()->json([
            'message' => 'Role removed successfully',
            'user' => $user->load('roles')
        ]);
    }

    public function getUsersWithRoles(Request $request)
    {
        $users = User::with(['profile', 'roles', 'worldAccess.world'])->paginate(25);

        return response()->json([
            'users' => $users->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'profile' => $user->profile ? [
                        'id' => $user->profile->id,
                        'display_name' => $user->profile->display_name,
                        'avatar_url' => $user->profile->avatar_url,
                    ] : null,
                    'roles' => $user->roles->pluck('name'),
                    'worlds' => $user->worldAccess->map(function ($access) {
                        return [
                            'id' => $access->world->id,
                            'code' => $access->world->code,
                            'name' => $access->world->name,
                        ];
                    })
                ];
            }),
            'pagination' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ]
        ]);
    }


    public function index(Request $request)
    {
        $query = User::with(['profile', 'roles', 'worldAccess']);
        if ($request->has('role')) {
            $query->whereHas('roles', function ($q) use ($request) {
                $q->where('name', $request->role);
            });
        }
        $users = $query->paginate($request->get('per_page', 25));

        return response()->json([
            'users' => $users->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'profile' => $user->profile ? [
                        'display_name' => $user->profile->display_name,
                    ] : null,
                    'roles' => $user->roles->pluck('name'),
                    'worldAccess' => $user->worldAccess
                ];
            }),
            'pagination' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
                'from' => $users->firstItem(),
                'to' => $users->lastItem(),
            ]
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|min:8|confirmed',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
        ]);

        $user->profile()->create([
            'email' => $request->email,
            'display_name' => $request->name,
        ]);

        if ($request->has('role')) {
            $role = \Spatie\Permission\Models\Role::where('name', $request->role)->first();
            if ($role) {
                $user->assignRole($role);
            }
        }

        return response()->json([
            'message' => 'User created successfully',
            'user' => $user->load(['roles', 'worldAccess'])
        ], 201);
    }

    public function show(User $user)
    {
        return response()->json($user->load(['roles', 'worldAccess', 'profile']));
    }

    public function update(Request $request, User $user)
    {
        $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
        ]);

        $user->update($request->only(['name', 'email']));

        return response()->json([
            'message' => 'User updated successfully',
            'user' => $user->load(['roles', 'worldAccess'])
        ]);
    }

    public function updateRole(Request $request, User $user)
    {
        $request->validate([
            'role' => 'required|string'
        ]);

        $role = \Spatie\Permission\Models\Role::where('name', $request->role)->first();
        if (!$role) {
            return response()->json(['message' => 'Role not found'], 404);
        }

        // Remove all existing roles and assign the new one
        $user->roles()->detach();
        $user->assignRole($role);

        return response()->json([
            'message' => 'User role updated successfully',
            'user' => $user->load('roles')
        ]);
    }

    public function updateWorldAccess(Request $request, User $user)
    {
        $request->validate([
            'world_ids' => 'required|array',
            'world_ids.*' => 'exists:worlds,id'
        ]);

        $user->worldAccess()->sync($request->world_ids);

        return response()->json([
            'message' => 'User world access updated successfully',
            'user' => $user->load('worldAccess')
        ]);
    }

    public function destroy(User $user)
    {
        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully'
        ]);
    }

    public function analytics(Request $request)
    {
        $usersByRole = User::with('roles')
            ->get()
            ->flatMap->roles
            ->groupBy('name')
            ->map()->count();

        $usersByWorld = \DB::table('user_world_access')
            ->join('worlds', 'user_world_access.world_id', '=', 'worlds.id')
            ->select('worlds.name', \DB::raw('count(*) as count'))
            ->groupBy('worlds.name')
            ->pluck('count', 'worlds.name');

        $totalUsers = User::count();
        $recentlyActive = User::where('updated_at', '>', now()->subDays(7))->count();

        return response()->json([
            'total_users' => $totalUsers,
            'recently_active' => $recentlyActive,
            'users_by_role' => $usersByRole,
            'users_by_world' => $usersByWorld,
        ]);
    }

    public function auditLogs(Request $request)
    {
        $query = \DB::table('audit_logs')
            ->when($request->has('user_id'), fn($q) => $q->where('user_id', $request->user_id))
            ->when($request->has('action'), fn($q) => $q->where('action', $request->action))
            ->when($request->has('world_code'), fn($q) => $q->where('world_code', $request->world_code))
            ->orderBy('created_at', 'desc');

        $logs = $query->paginate($request->get('per_page', 25));

        return response()->json($logs);
    }

    public function getUsersWithWorldAccess(Request $request)
    {
        $users = User::with(['profile', 'worldAccess'])->paginate(25);

        return response()->json([
            'users' => $users->map(function ($user) {
                return [
                    'id' => $user->id,
                    'email' => $user->email,
                    'display_name' => $user->profile?->display_name,
                    'worlds' => $user->worldAccess
                ];
            }),
            'pagination' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ]
        ]);
    }

    public function createRole(Request $request)
    {
        $request->validate([
            'name' => 'required|string|unique:roles,name',
            'display_name' => 'nullable|string',
        ]);

        $role = \Spatie\Permission\Models\Role::create([
            'name' => $request->name,
            'guard_name' => 'web'
        ]);

        if ($request->display_name) {
            $role->display_name = $request->display_name;
            $role->save();
        }

        return response()->json([
            'message' => 'Role created successfully',
            'role' => [
                'id' => $role->id,
                'name' => $role->name,
                'display_name' => $role->display_name,
            ]
        ], 201);
    }

    public function updateRoleDetails(Request $request, $roleId)
    {
        $request->validate([
            'name' => 'sometimes|string|unique:roles,name,' . $roleId,
            'display_name' => 'nullable|string',
            'permissions' => 'nullable|array',
            'permissions.*' => 'exists:permissions,id'
        ]);

        $role = \Spatie\Permission\Models\Role::findOrFail($roleId);

        if ($request->has('name')) {
            $role->name = $request->name;
        }

        if ($request->has('display_name')) {
            $role->display_name = $request->display_name;
        }

        $role->save();

        if ($request->has('permissions')) {
            $role->syncPermissions($request->permissions);
        }

        return response()->json([
            'message' => 'Role updated successfully',
            'role' => [
                'id' => $role->id,
                'name' => $role->name,
                'display_name' => $role->display_name,
                'permissions' => $role->permissions->pluck('key'),
            ]
        ]);
    }

    public function deleteRole(Request $request, $roleId)
    {
        $role = \Spatie\Permission\Models\Role::findOrFail($roleId);

        // Don't allow deleting roles that have users
        if ($role->users()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete role that has users assigned'
            ], 400);
        }

        $role->delete();

        return response()->json([
            'message' => 'Role deleted successfully'
        ]);
    }

    public function getAllRoles(Request $request)
    {
        $roles = \Spatie\Permission\Models\Role::with('permissions')->orderBy('name')->get();

        return response()->json([
            'roles' => $roles->map(function ($role) {
                return [
                    'id' => $role->id,
                    'name' => $role->name,
                    'display_name' => $role->display_name,
                    'permissions' => $role->permissions->pluck('key'),
                    'user_count' => $role->users()->count(),
                ];
            })
        ]);
    }

    public function getAllPermissions(Request $request)
    {
        $permissions = \Spatie\Permission\Models\Permission::orderBy('name')->get();

        return response()->json([
            'permissions' => $permissions->map(function ($permission) {
                return [
                    'id' => $permission->id,
                    'name' => $permission->name,
                    'key' => $permission->name,
                    'display_name' => $permission->name,
                ];
            })
        ]);
    }

    public function addUserWorldAccess(Request $request, User $user, $worldId)
    {
        $request->validate([
            'world_id' => 'exists:worlds,id'
        ]);

        $exist = \DB::table('user_world_access')
            ->where('user_id', $user->id)
            ->where('world_id', $worldId)
            ->first();

        if ($exist) {
            return response()->json(['message' => 'World access already exists'], 409);
        }

        \DB::table('user_world_access')->insert([
            'user_id' => $user->id,
            'world_id' => $worldId,
            'created_at' => now(),
            'updated_at' => now()
        ]);

        return response()->json([
            'message' => 'World access added successfully',
            'user' => $user->load('worldAccess')
        ]);
    }

    public function removeUserWorldAccess(Request $request, User $user, $worldId)
    {
        \DB::table('user_world_access')
            ->where('user_id', $user->id)
            ->where('world_id', $worldId)
            ->delete();

        return response()->json([
            'message' => 'World access removed successfully',
            'user' => $user->load('worldAccess')
        ]);
    }
}
