<?php

use App\Models\User;
use App\Models\World;

// Find the user
$user = User::where('email', 'Test12345@gmail.com')->first();

if (!$user) {
    echo "User Test12345@gmail.com not found.\n";
    exit(1);
}

echo "Updating access for user: " . $user->email . "\n";

$worlds = World::all();
$worldIds = $worlds->pluck('id')->toArray();

// Sync worlds (this will add them if missing, and remove others if not in the list)
// Using syncWithoutDetaching to be safe, or just sync to enforce all.
$user->worldAccess()->syncWithoutDetaching($worldIds);

echo "Granted access to worlds: " . implode(', ', $worlds->pluck('code')->toArray()) . "\n";
echo "Done!\n";
