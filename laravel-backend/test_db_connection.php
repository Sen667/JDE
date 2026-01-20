<?php
$host = '127.0.0.1';
$port = 3307;
$db = 'jde_database';
$user = 'root';
$pass = 'password';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;port=$port;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    echo "Connected successfully to database '$db' on $host:$port\n";
    $stmt = $pdo->query('SHOW TABLES');
    while ($row = $stmt->fetch()) {
        echo $row[0] . "\n";
    }
} catch (\PDOException $e) {
    throw new \PDOException($e->getMessage(), (int) $e->getCode());
}
