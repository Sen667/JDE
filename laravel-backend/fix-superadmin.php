<?php

require_once 'vendor/autoload.php';

$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "🔍 Checking current role assignments for user ID 1...\n";

// Get user with roles
$user = App\Models\User::with('roles')->find(1);

if (!$user) {
    die("❌ User ID 1 not found!\n");
}

echo "👤 User: {$user->name} ({$user->email})\n";
echo "🎭 Current roles: " . ($user->roles->count() > 0 ? $user->roles->pluck('name')->implode(', ') : 'None') . "\n";

// Check roles table
$roles = \Spatie\Permission\Models\Role::all();
echo "\n📋 Available roles:\n";
foreach ($roles as $role) {
    echo "  {$role->id}: {$role->name}\n";
}

// Find super-admin role
$superAdminRole = \Spatie\Permission\Models\Role::where('name', 'super-admin')->first();
if (!$superAdminRole) {
    die("❌ 'super-admin' role not found in roles table!\n");
}

echo "\n⚡ Assigning super-admin role to user ID 1...\n";

try {
    $user->assignRole('super-admin');
    echo "✅ Role assignment successful!\n";

    // Verify assignment
    $user->load('roles'); // Reload roles
    echo "🎯 Final roles: " . $user->roles->pluck('name')->implode(', ') . "\n";

    // Check world access
    $worldCount = $user->accessibleWorlds()->count();
    echo "🌍 World access count: {$worldCount}\n";

    echo "\n🚀 Superadmin setup complete! The sidebar should now show the superadmin section.\n";

} catch (Exception $e) {
    echo "❌ Role assignment failed: " . $e->getMessage() . "\n";
}

