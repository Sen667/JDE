<?php

use App\Models\User;
use App\Models\World;
use App\Models\Dossier;
use App\Models\DossierClientInfo;

// Find the user from the screenshot
$user = User::where('email', 'Test12345@gmail.com')->first();

if (!$user) {
    echo "User Test12345@gmail.com not found. Creating default dossiers for first user found.\n";
    $user = User::first();
}

if (!$user) {
    echo "No users found in database.\n";
    exit(1);
}

echo "Creating dossiers for user: " . $user->email . "\n";

$worlds = World::all();

foreach ($worlds as $world) {
    echo "Creating dossier in world: " . $world->code . "\n";

    // Create a dossier
    $dossier = Dossier::create([
        'title' => 'Dossier Test ' . $world->code,
        'world_id' => $world->id,
        'owner_id' => $user->id,
        'status' => 'nouveau',
        'tags' => ['test', 'demo'],
    ]);

    // Add client info
    DossierClientInfo::create([
        'dossier_id' => $dossier->id,
        'nom' => 'Dupont',
        'prenom' => 'Jean',
        'email' => 'jean.dupont@example.com',
        'telephone' => '0123456789',
        'client_type' => 'locataire',
        'type_sinistre' => 'Dégât des eaux',
        'date_sinistre' => now()->subDays(rand(1, 30)),
        'metadata' => '{}',
    ]);

    echo "Created dossier: " . $dossier->reference . "\n";
}

echo "Done!\n";
