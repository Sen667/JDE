<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\Controller;
use App\Models\World;
use App\Models\Dossier;
use Illuminate\Http\Request;

class WorldController extends Controller
{
    public function index(Request $request)
    {
        // Super-admins can see all worlds for user management, others only see their access
        if ($request->user()->hasRole('super-admin')) {
            $worlds = World::with('permissions')->get();
        } else {
            $worlds = $request->user()->worldAccess()->with('permissions')->get();
        }

        return response()->json([
            'worlds' => $worlds->map(function ($world) {
                return [
                    'id' => $world->id,
                    'code' => $world->code,
                    'name' => $world->name,
                    'description' => $world->description,
                    'theme_colors' => $world->theme_colors,
                    'permissions' => $world->permissions->pluck('key'),
                    'dossiers_count' => $world->dossiers()->count(),
                ];
            })
        ]);
    }

    public function show(Request $request, World $world)
    {
        // Check if user has access to this world
        if (!$request->user()->hasWorldAccess($world->code)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $world->load('permissions');

        return response()->json([
            'world' => [
                'id' => $world->id,
                'code' => $world->code,
                'name' => $world->name,
                'description' => $world->description,
                'theme_colors' => $world->theme_colors,
                'permissions' => $world->permissions->pluck('key'),
            ]
        ]);
    }

    public function dossiers(Request $request, World $world)
    {
        // Check if user has access to this world
        if (!$request->user()->hasWorldAccess($world->code)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $perPage = $request->get('per_page', 15);
        $status = $request->get('status');
        $search = $request->get('search');

        $query = Dossier::where('world_id', $world->id);

        if ($status) {
            $query->where('status', $status);
        }

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'ilike', "%{$search}%")
                  ->orWhere('reference', 'ilike', "%{$search}%");
            });
        }

        $dossiers = $query->with(['owner.profile', 'clientInfo'])
                          ->orderBy('created_at', 'desc')
                          ->paginate($perPage);

        return response()->json([
            'dossiers' => $dossiers->map(function ($dossier) {
                return [
                    'id' => $dossier->id,
                    'reference' => $dossier->reference,
                    'title' => $dossier->title,
                    'status' => $dossier->status,
                    'tags' => $dossier->tags,
                    'owner' => [
                        'id' => $dossier->owner->id,
                        'name' => $dossier->owner->name,
                        'email' => $dossier->owner->email,
                    ],
                    'client_info' => $dossier->clientInfo ? [
                        'nom' => $dossier->clientInfo->nom,
                        'prenom' => $dossier->clientInfo->prenom,
                        'client_type' => $dossier->clientInfo->client_type,
                    ] : null,
                    'created_at' => $dossier->created_at,
                    'updated_at' => $dossier->updated_at,
                ];
            }),
            'pagination' => [
                'current_page' => $dossiers->currentPage(),
                'last_page' => $dossiers->lastPage(),
                'per_page' => $dossiers->perPage(),
                'total' => $dossiers->total(),
            ]
        ]);
    }
}
