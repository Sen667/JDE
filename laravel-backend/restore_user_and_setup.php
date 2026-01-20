<?php

use App\Models\User;
use App\Models\World;
use App\Models\Dossier;
use App\Models\DossierClientInfo;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\Hash;

// 1. Restore User
$email = 'Test12345@gmail.com';
$user = User::where('email', $email)->first();

if (!$user) {
    echo "Creating user $email...\n";
    $user = User::create([
        'name' => 'Test User',
        'email' => $email,
        'password' => Hash::make('password123'), // Setting a known password
    ]);

    // Assign role if exists
    if (Role::where('name', 'user')->exists()) {
        $user->assignRole('user');
    }
} else {
    echo "User $email already exists.\n";
}

// 2. Grant Access to Worlds
echo "Granting world access...\n";
$worlds = World::all();
$user->worldAccess()->syncWithoutDetaching($worlds->pluck('id'));

// 3. Create Sample Dossiers
echo "Creating sample dossiers...\n";
foreach ($worlds as $world) {
    $dossier = Dossier::create([
        'title' => 'Dossier Test ' . $world->code,
        'world_id' => $world->id,
        'owner_id' => $user->id,
        'status' => 'nouveau',
        'tags' => ['test', 'docker'],
    ]);

    DossierClientInfo::create([
        'dossier_id' => $dossier->id,
        'nom' => 'Dupont',
        'prenom' => 'Jean',
        'email' => 'jean.dupont@example.com',
        'telephone' => '0600000000',
        'client_type' => 'locataire',
        'date_sinistre' => now(),
        'metadata' => '{}',
    ]);

    echo "Created dossier " . $dossier->reference . " in " . $world->code . "\n";
}

echo "\nSetup Complete!\n";
echo "Login: $email\n";
echo "Password: password123\n";
