<?php

require __DIR__ . "/../src/Db.php";
require __DIR__ . "/../src/LegacyLibraryService.php";

if (!extension_loaded("soap")) {
    http_response_code(500);
    header("Content-Type: text/plain; charset=utf-8");
    echo "Ошибка: расширение PHP SOAP (ext-soap) не включено.\n";
    exit;
}

$wsdlPath = __DIR__ . "/wsdl/library.wsdl";
if (!file_exists($wsdlPath)) {
    http_response_code(500);
    header("Content-Type: text/plain; charset=utf-8");
    echo "WSDL не найден: " . $wsdlPath . "\n";
    exit;
}

$server = new SoapServer($wsdlPath, [
    "cache_wsdl" => WSDL_CACHE_NONE,
    "exceptions" => true,
    "encoding" => "UTF-8",
]);

$pdo = Db::pdo();
$service = new LegacyLibraryService($pdo);

$server->setObject($service);

try {
    $server->handle();
} catch (Exception $e) {
    $server->fault("Server", $e->getMessage());
}