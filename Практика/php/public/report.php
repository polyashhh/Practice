<?php

require __DIR__ . "/../src/Db.php";

$type = isset($_GET["type"]) ? (string)$_GET["type"] : "overdue";
$raw = (isset($_GET["raw"]) && (string)$_GET["raw"] === "1")
    || (isset($_GET["format"]) && (string)$_GET["format"] === "xml");

$allowedDays = isset($_GET["days"]) ? (int)$_GET["days"] : 30;
if ($allowedDays <= 0) $allowedDays = 30;

if ($type !== "overdue") {
    http_response_code(400);
    header("Content-Type: text/plain; charset=utf-8");
    echo "Поддерживается только type=overdue\n";
    exit;
}

if (!extension_loaded("xsl") && !$raw) {
    http_response_code(500);
    header("Content-Type: text/plain; charset=utf-8");
    echo "Ошибка: расширение XSL (ext-xsl) не включено. Для XML используйте &raw=1\n";
    exit;
}

$pdo = Db::pdo();

$st = $pdo->prepare(
    "SELECT
        l.id AS loan_id,
        l.reader_card,
        l.date_taken,
        b.inventory_number,
        b.title,
        b.author,
        b.year,
        b.location
     FROM physical_loans l
     JOIN physical_books b ON b.id = l.book_id
     WHERE l.date_returned IS NULL
     ORDER BY l.date_taken ASC"
);
$st->execute();
$rows = $st->fetchAll(PDO::FETCH_ASSOC);

$today = new DateTime(date("Y-m-d"));

$items = array();
foreach ($rows as $r) {
    $dtTaken = DateTime::createFromFormat("Y-m-d", (string)$r["date_taken"]);
    if (!$dtTaken) continue;

    $diffDays = (int)$dtTaken->diff($today)->format("%a"); 
    $overdue = $diffDays - $allowedDays;
    if ($overdue <= 0) continue;

    $due = clone $dtTaken;
    $due->modify("+" . $allowedDays . " days");

    $items[] = array(
        "loan_id" => (string)$r["loan_id"],
        "inventory_number" => (string)$r["inventory_number"],
        "title" => (string)$r["title"],
        "author" => (string)$r["author"],
        "year" => (string)$r["year"],
        "location" => (string)$r["location"],
        "reader_card" => (string)$r["reader_card"],
        "date_taken" => (string)$r["date_taken"],
        "due_date" => $due->format("Y-m-d"),
        "days_overdue" => (string)$overdue,
        "days_since_taken" => (string)$diffDays
    );
}

$doc = new DOMDocument("1.0", "UTF-8");
$doc->formatOutput = true;

$root = $doc->createElement("report");
$root->setAttribute("type", "overdue");
$root->setAttribute("generated_at", gmdate("c"));
$root->setAttribute("allowed_days", (string)$allowedDays);
$doc->appendChild($root);

$summary = $doc->createElement("summary");
$summary->appendChild($doc->createElement("total_overdue", (string)count($items)));
$root->appendChild($summary);

$itemsNode = $doc->createElement("items");
$root->appendChild($itemsNode);

foreach ($items as $it) {
    $item = $doc->createElement("item");

    foreach ($it as $k => $v) {
        $item->appendChild($doc->createElement($k, $v));
    }

    $itemsNode->appendChild($item);
}

$xml = $doc->saveXML();

if ($raw) {
    header("Content-Type: application/xml; charset=utf-8");
    echo $xml;
    exit;
}

$xslPath = __DIR__ . "/../xsl/report.xsl";
if (!file_exists($xslPath)) {
    http_response_code(500);
    header("Content-Type: text/plain; charset=utf-8");
    echo "Не найден XSL файл: " . $xslPath . "\n";
    exit;
}

$xsl = new DOMDocument();
$xsl->load($xslPath);

$proc = new XSLTProcessor();
$proc->importStylesheet($xsl);

header("Content-Type: text/html; charset=utf-8");
echo $proc->transformToXML($doc);