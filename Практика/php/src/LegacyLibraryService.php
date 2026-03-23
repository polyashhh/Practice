<?php
final class LegacyLibraryService
{
    /** @var PDO */
    private $pdo;
    public function __construct($pdo)
    {
        $this->pdo = $pdo;
    }
    private function getParam($arg, $name, $fallback = null)
    {
        if (is_object($arg) && isset($arg->$name)) {
            return $arg->$name;
        }
        if (is_array($arg) && array_key_exists($name, $arg)) {
            return $arg[$name];
        }
        return $fallback;
    }
    private function today()
    {
        return date("Y-m-d");
    }
    private function isValidReaderCard($readerCard)
    {
        $readerCard = trim((string)$readerCard);
        if ($readerCard === "") return false;
        return (bool)preg_match('/^[A-Za-z0-9][A-Za-z0-9-]{2,49}$/', $readerCard);
    }
    private function bookRowByInventory($inventoryNumber)
    {
        $st = $this->pdo->prepare(
            "SELECT id, inventory_number, title, author, year, location, status
             FROM physical_books
             WHERE inventory_number = :inv
             LIMIT 1"
        );
        $st->execute(array(":inv" => $inventoryNumber));
        $row = $st->fetch(PDO::FETCH_ASSOC);
        return $row ? $row : null;
    }
    private function xmlDocToString($doc)
    {
        $doc->formatOutput = true;
        return $doc->saveXML();
    }
    public function getBookByInventory($inventory_number)
    {
        $inv = trim((string)$this->getParam($inventory_number, "inventory_number", $inventory_number));
        $doc = new DOMDocument("1.0", "UTF-8");
        $root = $doc->createElement("book");
        $doc->appendChild($root);
        $root->appendChild($doc->createElement("inventory_number", $inv));
        if ($inv === "") {
            $root->setAttribute("found", "false");
            $root->appendChild($doc->createElement("message", "Пустой инвентарный номер."));
            $xml = $this->xmlDocToString($doc);
			return array("return" => $xml);
        }
        $book = $this->bookRowByInventory($inv);
        if (!$book) {
            $root->setAttribute("found", "false");
            $root->appendChild($doc->createElement("message", "Книга не найдена."));
            $xml = $this->xmlDocToString($doc);
			return array("return" => $xml);
        }
        $root->setAttribute("found", "true");
        $root->appendChild($doc->createElement("id", (string)$book["id"]));
        $root->appendChild($doc->createElement("title", (string)$book["title"]));
        $root->appendChild($doc->createElement("author", (string)$book["author"]));
        $root->appendChild($doc->createElement("year", (string)$book["year"]));
        $root->appendChild($doc->createElement("location", (string)$book["location"]));
        $root->appendChild($doc->createElement("status", (string)$book["status"]));

        $xml = $this->xmlDocToString($doc);
		return array("return" => $xml);
    }
    public function searchBooksByAuthor($author_name)
    {
        $q = trim((string)$this->getParam($author_name, "author_name", $author_name));
        $doc = new DOMDocument("1.0", "UTF-8");
        $root = $doc->createElement("books");
        $doc->appendChild($root);
        $root->setAttribute("authorQuery", $q);
        if ($q === "") {
            $root->appendChild($doc->createElement("message", "Пустой запрос автора."));
            $xml = $this->xmlDocToString($doc);
			return array("return" => $xml);
        }
        $st = $this->pdo->prepare(
            "SELECT id, inventory_number, title, author, year, location, status
             FROM physical_books
             WHERE author LIKE :q
             ORDER BY author, title"
        );
        $st->execute(array(":q" => "%" . $q . "%"));
        $rows = $st->fetchAll(PDO::FETCH_ASSOC);
        $root->setAttribute("count", (string)count($rows));
        foreach ($rows as $r) {
            $b = $doc->createElement("book");
            $b->appendChild($doc->createElement("id", (string)$r["id"]));
            $b->appendChild($doc->createElement("inventory_number", (string)$r["inventory_number"]));
            $b->appendChild($doc->createElement("title", (string)$r["title"]));
            $b->appendChild($doc->createElement("author", (string)$r["author"]));
            $b->appendChild($doc->createElement("year", (string)$r["year"]));
            $b->appendChild($doc->createElement("location", (string)$r["location"]));
            $b->appendChild($doc->createElement("status", (string)$r["status"]));
            $root->appendChild($b);
        }
        $xml = $this->xmlDocToString($doc);
		return array("return" => $xml);
    }
    public function registerLoan($inventory_number, $reader_card = null)
    {
        $inv = trim((string)$this->getParam($inventory_number, "inventory_number", $inventory_number));
        $rc = (string)$this->getParam($inventory_number, "reader_card", $reader_card);
        $rc = trim((string)$this->getParam($reader_card, "reader_card", $rc));
        if ($inv === "") {
            $res = array("success" => false, "message" => "Пустой инвентарный номер.", "loan_id" => null, "inventory_number" => null, "date_taken" => null);
			return array("return" => $res);
        }
        if (!$this->isValidReaderCard($rc)) {
            $res = array("success" => false, "message" => "Неверный номер читательского билета.", "loan_id" => null, "inventory_number" => null, "date_taken" => null);
			return array("return" => $res);
        }
        $book = $this->bookRowByInventory($inv);
        if (!$book) {
            $res = array("success" => false, "message" => "Книга с таким инвентарным номером не найдена.", "loan_id" => null, "inventory_number" => null, "date_taken" => null);
			return array("return" => $res);
        }
        if ($book["status"] !== "available") {
            $res = array("success" => false, "message" => "Книга уже выдана или недоступна.", "loan_id" => null, "inventory_number" => $inv, "date_taken" => null);
			return array("return" => $res);
        }
        $date = $this->today();
        try {
            $this->pdo->beginTransaction();
            $st1 = $this->pdo->prepare(
                "INSERT INTO physical_loans (book_id, reader_card, date_taken, date_returned)
                 VALUES (:book_id, :reader_card, :date_taken, NULL)"
            );
            $st1->execute(array(
                ":book_id" => (int)$book["id"],
                ":reader_card" => $rc,
                ":date_taken" => $date,
            ));
            $loanId = (int)$this->pdo->lastInsertId();
            $st2 = $this->pdo->prepare("UPDATE physical_books SET status='borrowed' WHERE id=:id");
            $st2->execute(array(":id" => (int)$book["id"]));
            $this->pdo->commit();
            $res = array(
                "success" => true,
                "message" => "Книга успешно выдана читателю " . $rc,
                "loan_id" => $loanId,
                "inventory_number" => $inv,
                "date_taken" => $date,
            );
			return array("return" => $res);
        } catch (Exception $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            $res = array("success" => false, "message" => "Ошибка выдачи: " . $e->getMessage(), "loan_id" => null, "inventory_number" => $inv, "date_taken" => null);
			return array("return" => $res);
        }
    }
    public function returnBook($inventory_number)
    {
        $inv = trim((string)$this->getParam($inventory_number, "inventory_number", $inventory_number));
        if ($inv === "") {
            $res = array("success" => false, "message" => "Пустой инвентарный номер.", "inventory_number" => null, "date_returned" => null);
			return array("return" => $res);
        }
        $book = $this->bookRowByInventory($inv);
        if (!$book) {
            $res = array("success" => false, "message" => "Книга не найдена.", "inventory_number" => null, "date_returned" => null);
			return array("return" => $res);
        }
        $date = $this->today();
        try {
            $this->pdo->beginTransaction();
            $st = $this->pdo->prepare(
                "SELECT id
                 FROM physical_loans
                 WHERE book_id = :book_id AND date_returned IS NULL
                 ORDER BY date_taken DESC
                 LIMIT 1"
            );
            $st->execute(array(":book_id" => (int)$book["id"]));
            $loan = $st->fetch(PDO::FETCH_ASSOC);
            if (!$loan) {
                $this->pdo->rollBack();
                $res = array("success" => false, "message" => "Активной выдачи не найдено.", "inventory_number" => $inv, "date_returned" => null);
				return array("return" => $res);
            }
            $st1 = $this->pdo->prepare("UPDATE physical_loans SET date_returned=:d WHERE id=:loan_id");
            $st1->execute(array(":d" => $date, ":loan_id" => (int)$loan["id"]));
            $st2 = $this->pdo->prepare("UPDATE physical_books SET status='available' WHERE id=:id");
            $st2->execute(array(":id" => (int)$book["id"]));
            $this->pdo->commit();
            $res = array("success" => true, "message" => "Книга возвращена.", "inventory_number" => $inv, "date_returned" => $date);
			return array("return" => $res);
        } catch (Exception $e) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            $res = array("success" => false, "message" => "Ошибка возврата: " . $e->getMessage(), "inventory_number" => $inv, "date_returned" => null);
			return array("return" => $res);
        }
    }
}