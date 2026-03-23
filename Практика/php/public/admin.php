<?php

if (!extension_loaded("soap")) {
    http_response_code(500);
    header("Content-Type: text/plain; charset=utf-8");
    echo "Ошибка: расширение PHP SOAP (ext-soap) не включено.\n";
    exit;
}

$scheme = (!empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off") ? "https" : "http";
$host = $_SERVER["HTTP_HOST"] ?? "localhost:8001";
$wsdlPath = __DIR__ . "/wsdl/library.wsdl";
$soapEndpoint = "http://127.0.0.1:8001/soap-server.php";

ini_set("default_socket_timeout", "10"); 
set_time_limit(30);

$action = $_POST["action"] ?? "";
$inv = trim($_POST["inventory_number"] ?? "");
$author = trim($_POST["author_name"] ?? "");
$reader = trim($_POST["reader_card"] ?? "");

$result = null;
$error = null;
$lastReq = null;
$lastRes = null;

try {
    if ($action !== "") {
		$client = new SoapClient($wsdlPath, [
			"trace" => 1,
			"exceptions" => true,
			"cache_wsdl" => WSDL_CACHE_NONE,
			"encoding" => "UTF-8",
			"location" => $soapEndpoint,
			"connection_timeout" => 10,
		]);

        if ($action === "getBookByInventory") {
            $result = $client->getBookByInventory(["inventory_number" => $inv]);
        } elseif ($action === "searchBooksByAuthor") {
            $result = $client->searchBooksByAuthor(["author_name" => $author]);
        } elseif ($action === "registerLoan") {
            $result = $client->registerLoan([
                "inventory_number" => $inv,
                "reader_card" => $reader,
            ]);
        } elseif ($action === "returnBook") {
            $result = $client->returnBook(["inventory_number" => $inv]);
        }
        $lastReq = $client->__getLastRequest();
        $lastRes = $client->__getLastResponse();
    }
} catch (Exception $e) {
    $error = $e->getMessage();
}
function h($s) { return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, "UTF-8"); }

?>
<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Админ-панель (SOAP клиент)</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 16px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .card { border: 1px solid #ddd; border-radius: 8px; padding: 12px; }
    label { display:block; margin-top: 8px; }
    input { width: 100%; padding: 8px; box-sizing: border-box; }
    button { padding: 8px 10px; margin-top: 10px; cursor: pointer; }
    pre { background: #f6f6f6; padding: 10px; overflow:auto; }
    .muted { color:#666; }
  </style>
</head>
<body>

<h2>Админ-панель (SOAP клиент)</h2>
<div class="muted">WSDL: <?=h($wsdlPath)?></div>

<div class="grid">

  <div class="card">
    <h3>1) Найти книгу по номеру</h3>
    <form method="post">
      <input type="hidden" name="action" value="getBookByInventory">
      <label>inventory_number</label>
      <input name="inventory_number" value="<?=h($inv)?>" placeholder="LIB-2024-001">
      <button type="submit">Выполнить getBookByInventory</button>
    </form>
  </div>
  <div class="card">
    <h3>2) Поиск книг по автору</h3>
    <form method="post">
      <input type="hidden" name="action" value="searchBooksByAuthor">
      <label>author_name</label>
      <input name="author_name" value="<?=h($author)?>" placeholder="Гоголь">
      <button type="submit">Выполнить searchBooksByAuthor</button>
    </form>
  </div>
  <div class="card">
    <h3>3) Выдать книгу</h3>
    <form method="post">
      <input type="hidden" name="action" value="registerLoan">
      <label>inventory_number</label>
      <input name="inventory_number" value="<?=h($inv)?>" placeholder="LIB-2024-001">
      <label>reader_card</label>
      <input name="reader_card" value="<?=h($reader)?>" placeholder="R-12345">
      <button type="submit">Выполнить registerLoan</button>
    </form>
  </div>
  <div class="card">
    <h3>4) Вернуть книгу</h3>
    <form method="post">
      <input type="hidden" name="action" value="returnBook">
      <label>inventory_number</label>
      <input name="inventory_number" value="<?=h($inv)?>" placeholder="LIB-2024-001">
      <button type="submit">Выполнить returnBook</button>
    </form>
  </div>
</div>
<div class="card" style="margin-top:16px;">
  <h3>Результат</h3>
  <?php if ($error): ?>
    <div style="color:#b00020;"><b>Ошибка:</b> <?=h($error)?></div>
  <?php elseif ($result === null): ?>
    <div class="muted">Сначала выполните одну из операций.</div>
  <?php else: ?>
    <div><b>action:</b> <?=h($action)?></div>
    <pre><?php
		$payload = $result;
		if (is_object($result) && isset($result->return)) {
			$payload = $result->return;
		} elseif (is_array($result) && isset($result["return"])) {
			$payload = $result["return"];
		}
		if (is_string($payload)) {
			echo h($payload);
		} else {
			echo h(print_r($payload, true));
		}
    ?></pre>
  <?php endif; ?>

  <?php if ($lastReq): ?>
    <h4>SOAP Last Request</h4>
    <pre><?=h($lastReq)?></pre>
  <?php endif; ?>

  <?php if ($lastRes): ?>
    <h4>SOAP Last Response</h4>
    <pre><?=h($lastRes)?></pre>
  <?php endif; ?>
</div>

</body>
</html>