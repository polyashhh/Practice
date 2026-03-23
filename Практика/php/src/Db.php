<?php
final class Db
{
    public static function pdo(): PDO
    {
        $config = require __DIR__ . "/../config/config.php";
        $db = $config["db"] ?? [];
        if (($db["driver"] ?? "") !== "sqlite") {
            throw new RuntimeException("Поддерживается только sqlite.");
        }
        $path = $db["sqlite_path"] ?? "";
        if ($path === "" || !file_exists($path)) {
            throw new RuntimeException("SQLite файл не найден: " . $path);
        }
        $pdo = new PDO("sqlite:" . $path, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
        $pdo->exec("PRAGMA foreign_keys = ON;");
        return $pdo;
    }
}