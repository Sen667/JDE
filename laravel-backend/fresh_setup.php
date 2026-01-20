<?php

// Fresh setup script for Laravel backend
echo "Starting fresh migration and seeding...\n";

// Run fresh migrations
echo "Running fresh migrations...\n";
echo shell_exec('cd ' . __DIR__ . ' && php artisan migrate:fresh');

// Run seeders
echo "\nRunning seeders...\n";
echo shell_exec('cd ' . __DIR__ . ' && php artisan db:seed');

// Verify workflow steps
echo "\nVerifying workflow steps...\n";
require_once 'bootstrap/app.php';

$jdeSteps = \App\Models\WorkflowStep::whereHas('template', function ($q) {
    $q->where('world_id', 1)->where('is_active', true);
})->orderBy('step_number')->get();

echo "\nJDE Workflow Steps Created:\n";
foreach ($jdeSteps as $step) {
    echo "  - {$step->name}: " . count(json_decode($step->form_fields, true)) . " form fields\n";
}

$firstStep = \App\Models\WorkflowStep::where('name', 'Réception du dossier')->first();
if ($firstStep) {
    echo "\n'Réception du dossier' form_fields:\n";
    echo $firstStep->form_fields . "\n";

    $fields = json_decode($firstStep->form_fields, true);
    echo "\nParsed fields:\n";
    foreach ($fields as $field) {
        $req = $field['required'] ? '[required]' : '[optional]';
        echo "  - {$field['name']} ({$field['type']}) $req\n";
    }
}

echo "\n✅ Fresh setup complete!\n";
echo "Your workflow system is now in a known, clean state with proper form fields.\n";

?>