<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\World;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Create Super Admin User
        $superAdmin = User::create([
            'name' => 'Super Admin',
            'email' => 'admin@example.com',
            'password' => Hash::make('admin123'),
        ]);

        // Create some sample users
        $users = [
            [
                'name' => 'John Doe',
                'email' => 'john@example.com',
                'password' => Hash::make('password'),
            ],
            [
                'name' => 'Jane Smith',
                'email' => 'jane@example.com',
                'password' => Hash::make('password'),
            ],
        ];

        foreach ($users as $userData) {
            User::create($userData);
        }

        // Create Worlds - using auto-increment IDs (1, 2, 3) as per migration schema
        $worlds = [
            [
                'id' => 1, // Use integer IDs to match auto-increment primary key
                'code' => 'JDE',
                'name' => 'Justice et Droit des Expertises',
                'description' => 'Service Justice et Droit des Expertises',
                'theme_colors' => json_encode([
                    'primary' => '#3B82F6',
                    'secondary' => '#1D4ED8',
                    'accent' => '#60A5FA'
                ])
            ],
            [
                'id' => 2,
                'code' => 'JDMO',
                'name' => 'Justice des Mineurs et de la Famille',
                'description' => 'Service de justice des mineurs et familiale',
                'theme_colors' => json_encode([
                    'primary' => '#F59E0B',
                    'secondary' => '#D97706',
                    'accent' => '#FCD34D'
                ])
            ],
            [
                'id' => 3,
                'code' => 'DBCS',
                'name' => 'Directions des Bâtiments et Constructions Scolaires',
                'description' => 'Service des constructions scolaires',
                'theme_colors' => json_encode([
                    'primary' => '#EF4444',
                    'secondary' => '#DC2626',
                    'accent' => '#F87171'
                ])
            ]
        ];

        foreach ($worlds as $worldData) {
            World::updateOrCreate(
                ['code' => $worldData['code']], // Find by code
                $worldData // Create or update with these values
            );
        }

        // Create roles and permissions
        $superAdminRole = Role::create(['name' => 'super-admin']);
        $adminRole = Role::create(['name' => 'admin']);
        $userRole = Role::create(['name' => 'user']);

        // Basic permissions
        $permissions = [
            'view_dashboard',
            'manage_users',
            'manage_worlds',
            'manage_dossiers',
            'manage_tasks',
            'manage_appointments',
            'view_analytics',
            'manage_permissions'
        ];

        foreach ($permissions as $permission) {
            Permission::create(['name' => $permission]);
        }

        // Assign permissions to roles
        $superAdminRole->givePermissionTo(Permission::all());
        $adminRole->givePermissionTo(['view_dashboard', 'manage_users', 'manage_dossiers', 'manage_tasks', 'manage_appointments']);
        $userRole->givePermissionTo(['view_dashboard', 'manage_dossiers', 'manage_tasks', 'manage_appointments']);

        // Assign super-admin role to super admin user
        $superAdmin->assignRole('super-admin');

        // Assign some users to roles and worlds
        $john = User::where('email', 'john@example.com')->first();
        $jane = User::where('email', 'jane@example.com')->first();

        $john->assignRole('admin');
        $jane->assignRole('user');

        // Assign worlds to users (world access)
        $jdeWorld = World::where('code', 'JDE')->first();
        $jdmoWorld = World::where('code', 'JDMO')->first();
        $dbcsWorld = World::where('code', 'DBCS')->first();

        $superAdmin->accessibleWorlds()->attach([$jdeWorld->id, $jdmoWorld->id, $dbcsWorld->id]);
        $john->accessibleWorlds()->attach([$jdeWorld->id]);
        $jane->accessibleWorlds()->attach([$jdmoWorld->id, $dbcsWorld->id]);

        // Seed workflows for all worlds
        $this->call(WorkflowSeeder::class);

        $this->command->info('Database seeded successfully!');
        $this->command->info('Super Admin credentials:');
        $this->command->info('Email: admin@example.com');
        $this->command->info('Password: admin123');
        $this->command->info('Workflows has been seeded for all worlds');
    }
}
