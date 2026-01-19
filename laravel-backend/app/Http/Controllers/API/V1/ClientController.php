<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\Controller;
use App\Models\DossierClientInfo;
use App\Models\World;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->get('per_page', 15);
        $search = $request->get('search');
        $worldId = $request->get('world_id');

        $query = DossierClientInfo::query(); // Show all clients (standalone + embedded)

        // Filter by worlds user has access to - DISABLED for now due to ambiguous column issue
        // if (!$request->user()->hasRole('superadmin')) {
        //     $worldIds = $request->user()->worldAccess()->pluck('id');
        //     // For now, clients are shared across worlds - all authenticated users can see all clients
        //     // Later we can implement world-based client filtering if needed
        // }

        // Search functionality
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('nom', 'like', "%{$search}%")
                  ->orWhere('prenom', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('telephone', 'like', "%{$search}%")
                  ->orWhere('adresse_sinistre', 'like', "%{$search}%");
            });
        }

        // Filter by world (for dedicated client-world relationship in future)
        if ($worldId) {
            // Implement when client-world relationship is added
        }

        $clients = $query->with(['world'])->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'clients' => $clients->map(function ($client) {
                // Manually load world relationship if not eager loaded
                if (!$client->relationLoaded('world')) {
                    $client->load('world');
                }

                return [
                    'id' => $client->id,
                    'client_type' => $client->client_type,
                    'nom' => $client->nom,
                    'prenom' => $client->prenom,
                    'telephone' => $client->telephone,
                    'email' => $client->email,
                    'adresse_sinistre' => $client->adresse_sinistre,
                    'type_sinistre' => $client->type_sinistre,
                    'date_sinistre' => $client->date_sinistre,
                    'compagnie_assurance' => $client->compagnie_assurance,
                    'numero_police' => $client->numero_police,
                    // New fields for JDE workflow Step 2
                    'date_reception' => $client->date_reception ?
                        \Carbon\Carbon::parse($client->date_reception)->format('Y-m-d') : null,
                    'origine' => $client->origine,
                    'metadata' => $client->metadata,
                    'dossiers_count' => $client->dossiers_count,
                    'world' => $client->world ? [
                        'id' => $client->world->id,
                        'code' => $client->world->code,
                        'name' => $client->world->name,
                    ] : null,
                    'created_at' => $client->created_at,
                    'updated_at' => $client->updated_at,
                ];
            }),
            'pagination' => [
                'current_page' => $clients->currentPage(),
                'last_page' => $clients->lastPage(),
                'per_page' => $clients->perPage(),
                'total' => $clients->total(),
            ]
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'client_type' => 'required|in:locataire,proprietaire,proprietaire_non_occupant,professionnel',
            'world_id' => 'nullable|string|exists:worlds,id',
            'dossier_id' => 'nullable|string|exists:dossiers,id', // Allow dossier_id in validation
            'nom' => 'required|string|max:255',
            'prenom' => 'nullable|string|max:255',
            'telephone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'adresse_client' => 'nullable|string|max:500',
            'adresse_sinistre' => 'nullable|string|max:500',
            'type_sinistre' => 'nullable|string|max:255',
            'date_sinistre' => 'nullable|date',
            'compagnie_assurance' => 'nullable|string|max:255',
            'numero_police' => 'nullable|string|max:255',
            'montant_dommage_batiment' => 'nullable|numeric|decimal:0,2',
            'nom_proprietaire' => 'nullable|string|max:255',
            'prenom_proprietaire' => 'nullable|string|max:255',
            'telephone_proprietaire' => 'nullable|string|max:20',
            'email_proprietaire' => 'nullable|email|max:255',
            'adresse_proprietaire' => 'nullable|string|max:500',
            // New fields for JDE workflow Step 2
            'date_reception' => 'nullable|date',
            'origine' => 'nullable|string|max:255',
            'metadata' => 'nullable|array',
        ]);

        $client = DossierClientInfo::create(array_merge($request->all(), [
            // Allow dossier_id from request, default to null if not provided
            'dossier_id' => $request->get('dossier_id'),
            'metadata' => $request->get('metadata', [])
        ]));

        return response()->json([
            'message' => 'Client créé avec succès',
            'client' => [
                'id' => $client->id,
                'client_type' => $client->client_type,
                'nom' => $client->nom,
                'prenom' => $client->prenom,
                'telephone' => $client->telephone,
                'email' => $client->email,
                'adresse_sinistre' => $client->adresse_sinistre,
                'type_sinistre' => $client->type_sinistre,
                'date_sinistre' => $client->date_sinistre ?
                    \Carbon\Carbon::createFromFormat('Y-m-d H:i:s', $client->date_sinistre)->format('Y-m-d') : null,
                'compagnie_assurance' => $client->compagnie_assurance,
                'numero_police' => $client->numero_police,
                // New fields for JDE workflow Step 2
                'date_reception' => $client->date_reception ?
                    \Carbon\Carbon::parse($client->date_reception)->format('Y-m-d') : null,
                'origine' => $client->origine,
                'metadata' => $client->metadata,
                'dossiers_count' => 0,
                'created_at' => $client->created_at,
                'updated_at' => $client->updated_at,
            ]
        ], 201);
    }

    public function show(Request $request, DossierClientInfo $client)
    {
        // For now, all authenticated users can view clients
        // Later we can implement world-based permissions

        $client->load(['dossier' => function ($query) {
            $query->select('id', 'title', 'status', 'world_id');
        }]);

        return response()->json([
            'client' => [
                'id' => $client->id,
                'client_type' => $client->client_type,
                'nom' => $client->nom,
                'prenom' => $client->prenom,
                'telephone' => $client->telephone,
                'email' => $client->email,
                'adresse_client' => $client->adresse_client,
                'adresse_sinistre' => $client->adresse_sinistre,
                'adresse_identique_sinistre' => $client->adresse_identique_sinistre,
                'type_sinistre' => $client->type_sinistre,
                'date_sinistre' => $client->date_sinistre ?
                    \Carbon\Carbon::parse($client->date_sinistre)->format('Y-m-d') : null,
                'compagnie_assurance' => $client->compagnie_assurance,
                'numero_police' => $client->numero_police,
                'montant_dommage_batiment' => $client->montant_dommage_batiment,
                'montant_demolition_deblayage' => $client->montant_demolition_deblayage,
                'montant_mise_conformite' => $client->montant_mise_conformite,
                'proprietaire_nom' => $client->nom_proprietaire,
                'proprietaire_prenom' => $client->prenom_proprietaire,
                'proprietaire_telephone' => $client->telephone_proprietaire,
                'proprietaire_email' => $client->email_proprietaire,
                'proprietaire_adresse' => $client->adresse_proprietaire,
                // New fields for JDE workflow Step 2
                'date_reception' => $client->date_reception ?
                    \Carbon\Carbon::parse($client->date_reception)->format('Y-m-d') : null,
                'origine' => $client->origine,
                'primary_world_id' => $client->primary_world_id,
                'metadata' => $client->metadata,
                'dossier' => $client->dossier,
                'created_at' => $client->created_at,
                'updated_at' => $client->updated_at,
            ]
        ]);
    }

    public function update(Request $request, DossierClientInfo $client)
    {
        $request->validate([
            'client_type' => 'sometimes|required|in:locataire,proprietaire,proprietaire_non_occupant,professionnel',
            'nom' => 'sometimes|required|string|max:255',
            'prenom' => 'nullable|string|max:255',
            'telephone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'adresse_client' => 'nullable|string|max:500',
            'adresse_sinistre' => 'nullable|string|max:500',
            'adresse_identique_sinistre' => 'nullable|boolean',
            'type_sinistre' => 'nullable|string|max:255',
            'date_sinistre' => 'nullable|date',
            'compagnie_assurance' => 'nullable|string|max:255',
            'numero_police' => 'nullable|string|max:255',
            'montant_dommage_batiment' => 'nullable|numeric|decimal:0,2',
            'montant_demolition_deblayage' => 'nullable|numeric|decimal:0,2',
            'montant_mise_conformite' => 'nullable|numeric|decimal:0,2',
            'nom_proprietaire' => 'nullable|string|max:255',
            'prenom_proprietaire' => 'nullable|string|max:255',
            'telephone_proprietaire' => 'nullable|string|max:20',
            'email_proprietaire' => 'nullable|email|max:255',
            'adresse_proprietaire' => 'nullable|string|max:500',
            // New fields for JDE workflow Step 2
            'date_reception' => 'nullable|date',
            'origine' => 'nullable|string|in:Email,Téléphone,Courrier,Plateforme',
            'primary_world_id' => 'nullable|string|exists:worlds,id',
            'metadata' => 'nullable|array',
        ]);

        $client->update($request->all());

        return response()->json([
            'message' => 'Client mis à jour avec succès',
            'client' => [
                'id' => $client->id,
                'client_type' => $client->client_type,
                'nom' => $client->nom,
                'prenom' => $client->prenom,
                'telephone' => $client->telephone,
                'email' => $client->email,
                'adresse_client' => $client->adresse_client,
                'adresse_sinistre' => $client->adresse_sinistre,
                'adresse_identique_sinistre' => $client->adresse_identique_sinistre,
                'type_sinistre' => $client->type_sinistre,
                'date_sinistre' => $client->date_sinistre ?
                    \Carbon\Carbon::createFromFormat('Y-m-d H:i:s', $client->date_sinistre)->format('Y-m-d') : null,
                'compagnie_assurance' => $client->compagnie_assurance,
                'numero_police' => $client->numero_police,
                'montant_dommage_batiment' => $client->montant_dommage_batiment,
                'montant_demolition_deblayage' => $client->montant_demolition_deblayage,
                'montant_mise_conformite' => $client->montant_mise_conformite,
                'proprietaire_nom' => $client->nom_proprietaire,
                'proprietaire_prenom' => $client->prenom_proprietaire,
                'proprietaire_telephone' => $client->telephone_proprietaire,
                'proprietaire_email' => $client->email_proprietaire,
                'proprietaire_adresse' => $client->adresse_proprietaire,
                // New fields for JDE workflow Step 2
                'date_reception' => $client->date_reception ?
                    \Carbon\Carbon::parse($client->date_reception)->format('Y-m-d') : null,
                'origine' => $client->origine,
                'primary_world_id' => $client->primary_world_id,
                'metadata' => $client->metadata,
                'dossiers_count' => $client->dossiers_count,
                'created_at' => $client->created_at,
                'updated_at' => $client->updated_at,
            ]
        ]);
    }

    public function destroy(Request $request, DossierClientInfo $client)
    {
        // Check if client has active dossiers (for both embedded and linked clients)
            $dossierCount = $client->dossier_id ?
                ($client->dossier ? 1 : 0) :
                $client->dossiers_count;

        if ($dossierCount > 0) {
            return response()->json([
                'message' => 'Impossible de supprimer un client qui a des dossiers actifs'
            ], 422);
        }

        $client->delete();

        return response()->json([
            'message' => 'Client supprimé avec succès'
        ]);
    }

    public function getByWorld(Request $request, $worldId)
    {
        // Ensure user has access to the world
        $world = World::findOrFail($worldId);
        if (!$request->user()->hasWorldAccess($world->code) && !$request->user()->hasRole('superadmin')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $perPage = $request->get('per_page', 15);
        $search = $request->get('search');

        $query = DossierClientInfo::whereNull('dossier_id');

        // For now, return all clients - but in future could filter by world-specific clients
        // when client-world relationship is implemented

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('nom', 'like', "%{$search}%")
                  ->orWhere('prenom', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('telephone', 'like', "%{$search}%");
            });
        }

            $clients = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'clients' => $clients->map(function ($client) {
                return [
                    'id' => $client->id,
                    'client_type' => $client->client_type,
                    'nom' => $client->nom,
                    'prenom' => $client->prenom,
                    'telephone' => $client->telephone,
                    'email' => $client->email,
                    'adresse_sinistre' => $client->adresse_sinistre,
                    // New fields for JDE workflow Step 2
                    'date_reception' => $client->date_reception ?
                        \Carbon\Carbon::parse($client->date_reception)->format('Y-m-d') : null,
                    'origine' => $client->origine,
                    'dossiers_count' => $client->dossiers_count,
                    'created_at' => $client->created_at,
                ];
            }),
            'pagination' => [
                'current_page' => $clients->currentPage(),
                'last_page' => $clients->lastPage(),
                'per_page' => $clients->perPage(),
                'total' => $clients->total(),
            ]
        ]);
    }

    public function myClients(Request $request)
    {
        $perPage = $request->get('per_page', 15);
        $userWorldIds = $request->user()->worldAccess()->pluck('worlds.id');

        $clients = DossierClientInfo::whereHas('dossier', function ($query) use ($userWorldIds) {
            $query->whereIn('world_id', $userWorldIds);
        })->with(['dossier' => function ($query) {
            $query->select('id', 'title', 'status');
        }])->orderBy('updated_at', 'desc')->paginate($perPage);

        return response()->json([
            'clients' => $clients->map(function ($client) {
                return [
                    'id' => $client->id,
                    'client_type' => $client->client_type,
                    'nom' => $client->nom,
                    'prenom' => $client->prenom,
                    'telephone' => $client->telephone,
                    'email' => $client->email,
                    'adresse_sinistre' => $client->adresse_sinistre,
                    'dossier_id' => $client->dossier_id,
                    'dossier_title' => $client->dossier?->title,
                    'dossier_status' => $client->dossier?->status,
                    'created_at' => $client->created_at,
                ];
            }),
            'pagination' => [
                'current_page' => $clients->currentPage(),
                'last_page' => $clients->lastPage(),
                'per_page' => $clients->perPage(),
                'total' => $clients->total(),
            ]
        ]);
    }
}
