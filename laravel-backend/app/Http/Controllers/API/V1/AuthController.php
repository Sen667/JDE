<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        \Log::info('AuthController@login: Starting login process', [
            'email' => $request->email,
            'has_password' => !empty($request->password),
        ]);

        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        \Log::info('AuthController@login: Validation passed, looking up user');

        try {
            $user = User::where('email', $request->email)->first();

            if (!$user) {
                \Log::warning('AuthController@login: User not found', ['email' => $request->email]);
                throw ValidationException::withMessages([
                    'email' => ['The provided credentials are incorrect.'],
                ]);
            }

            \Log::info('AuthController@login: User found, checking password', [
                'user_id' => $user->id,
                'user_email' => $user->email,
                'password_hash_exists' => !empty($user->password),
            ]);

            if (!Hash::check($request->password, $user->password)) {
                \Log::warning('AuthController@login: Password check failed for user', [
                    'user_id' => $user->id,
                    'user_email' => $user->email,
                ]);
                throw ValidationException::withMessages([
                    'email' => ['The provided credentials are incorrect.'],
                ]);
            }

            \Log::info('AuthController@login: Password check passed, creating token');


            $token = $user->createToken('api-token')->plainTextToken;

            \Log::info('AuthController@login: Token created', [
                'user_id' => $user->id,
                'token_prefix' => substr($token, 0, 10) . '...'
            ]);

            $worlds = null;
            $roles = null;

            try {
                \Log::info('AuthController@login: Loading relationships');
                $worlds = $user->worldAccess;
                $roles = $user->roles;
                \Log::info('AuthController@login: Relationships loaded', [
                    'worlds_count' => $worlds ? $worlds->count() : 0,
                    'roles_count' => $roles ? $roles->count() : 0,
                ]);
            } catch (\Exception $e) {
                \Log::error('AuthController@login: Error loading relationships', [
                    'error' => $e->getMessage(),
                    'trace' => $e->getTraceAsString()
                ]);
                // Continue with login even if relationships fail
                $worlds = collect();
                $roles = collect();
            }

            \Log::info('AuthController@login: Returning successful response');

            $response = response()->json([
                'message' => 'Login successful',
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'worlds' => $worlds,
                    'roles' => $roles ? $roles->pluck('name') : [],
                ],
                'token' => $token,
            ]);

            // Explicitly set CORS headers to ensure they work
            $response->headers->set('Access-Control-Allow-Origin', '*');
            $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
            $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-CSRF-TOKEN');

            return $response;
        } catch (\Exception $e) {
            \Log::error('AuthController@login: Unexpected error', [
                'email' => $request->email,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw $e;
        }
    }

    public function register(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|min:8|confirmed',
            'world' => 'nullable|in:JDE,JDMO,DBCS',
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

        if ($user->roles->isEmpty()) {
            $viewerRole = \App\Models\Role::where('name', 'viewer')->first();
            if ($viewerRole) {
                $user->assignRole($viewerRole);
            }
        }

        if ($request->world && !empty($world = \App\Models\World::where('code', $request->world)->first())) {
            $user->worldAccess()->attach($world->id);
        }

        $token = $user->createToken('api-token')->plainTextToken;

        return response()->json([
            'message' => 'Registration successful',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'worlds' => $user->worldAccess->pluck('code'),
                'roles' => $user->roles->pluck('name'),
            ],
            'token' => $token,
        ], 201);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logged out successfully'
        ]);
    }

    public function user(Request $request)
    {
        return response()->json([
            'user' => [
                'id' => $request->user()->id,
                'name' => $request->user()->name,
                'email' => $request->user()->email,
                'worlds' => $request->user()->worldAccess->pluck('code'),
                'roles' => $request->user()->roles->pluck('name'),
                'profile' => $request->user()->profile,
            ]
        ]);
    }
}
