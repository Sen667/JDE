<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class ExecuteWorkflowScript extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'workflow:execute-script {--file= : The SQL file to execute}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Execute a workflow SQL script to update the database';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $file = $this->option('file') ?: base_path('../scripts/insert-jde-workflow-refactor.sql');

        if (!file_exists($file)) {
            $this->error("SQL file not found: {$file}");
            return 1;
        }

        $this->info('Reading SQL script...');
        $sql = file_get_contents($file);

        if (empty($sql)) {
            $this->error('SQL file is empty');
            return 1;
        }

        $this->info('Executing workflow script...');

        try {
            DB::unprepared($sql);
            $this->info('✅ JDE workflow script executed successfully!');
            return 0;
        } catch (\Exception $e) {
            $this->error('❌ Failed to execute workflow script: ' . $e->getMessage());
            return 1;
        }
    }
}
