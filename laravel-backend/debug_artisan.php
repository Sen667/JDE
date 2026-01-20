<?php

echo "Starting debug_artisan.php\n";

define('LARAVEL_START', microtime(true));

echo "Loading autoloader...\n";
require __DIR__ . '/vendor/autoload.php';
echo "Autoloader loaded.\n";

echo "Loading bootstrap/app.php...\n";
$app = require_once __DIR__ . '/bootstrap/app.php';
echo "Bootstrap loaded.\n";

echo "Handling command...\n";
$status = $app->handleCommand(new \Symfony\Component\Console\Input\ArgvInput);
echo "Command handled with status: $status\n";

exit($status);
