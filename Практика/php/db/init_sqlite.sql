PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS physical_loans;
DROP TABLE IF EXISTS physical_books;

CREATE TABLE physical_books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  inventory_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  year INTEGER NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'borrowed', 'lost'))
);

CREATE TABLE physical_loans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  book_id INTEGER NOT NULL,
  reader_card TEXT NOT NULL,
  date_taken TEXT NOT NULL,     
  date_returned TEXT NULL,       
  FOREIGN KEY (book_id) REFERENCES physical_books(id)
);

CREATE INDEX idx_books_inventory ON physical_books(inventory_number);
CREATE INDEX idx_books_author ON physical_books(author);
CREATE INDEX idx_loans_book ON physical_loans(book_id);
CREATE INDEX idx_loans_active ON physical_loans(date_returned);

INSERT INTO physical_books (inventory_number, title, author, year, location, status) VALUES
('LIB-2024-001', 'Закат в городе', 'Булгаков Михаил Афанасьевич', 1966, 'Секция А, стеллаж 1, полка 2', 'available'),
('LIB-2024-002', 'Тени прошлого', 'Достоевский Фёдор Михайлович', 1866, 'Секция А, стеллаж 1, полка 3', 'available'),
('LIB-2024-003', 'На перепутье', 'Толстой Лев Николаевич', 1869, 'Секция А, стеллаж 2, полка 1', 'available'),
('LIB-2024-004', 'Осенний вальс', 'Пушкин Александр Сергеевич', 1833, 'Секция А, стеллаж 2, полка 2', 'available'),
('LIB-2024-005', 'Один в степи', 'Лермонтов Михаил Юрьевич', 1840, 'Секция А, стеллаж 2, полка 3', 'available'),
('LIB-2024-006', 'Новые голоса', 'Тургенев Иван Сергеевич', 1862, 'Секция А, стеллаж 3, полка 1', 'available'),
('LIB-2024-007', 'Городской смотритель', 'Гоголь Николай Васильевич', 1836, 'Секция А, стеллаж 3, полка 2', 'available'),
('LIB-2024-008', 'Живые тени', 'Гоголь Николай Васильевич', 1842, 'Секция А, стеллаж 3, полка 3', 'available'),

('ENG-2008-001', 'Code That Matters', 'Robert C. Martin', 2008, 'Зал иностранной литературы, стеллаж 12', 'available'),
('ENG-1994-001', 'Software Design Essentials', 'Erich Gamma; Richard Helm; Ralph Johnson; John Vlissides', 1994, 'Зал иностранной литературы, стеллаж 12', 'available'),
('ENG-2018-001', 'Building Modern Systems', 'Robert C. Martin', 2018, 'Зал иностранной литературы, стеллаж 11', 'available'),
('ENG-2010-001', 'The Mindful Developer', 'Andrew Hunt; David Thomas', 1999, 'Зал иностранной литературы, стеллаж 10', 'available'),
('ENG-2002-001', 'Enterprise Solutions', 'Martin Fowler', 2002, 'Зал иностранной литературы, стеллаж 10', 'available'),
('ENG-2011-001', 'JS: The Core Concepts', 'Douglas Crockford', 2008, 'Зал иностранной литературы, стеллаж 9', 'available'),
('ENG-2015-001', 'Deep JavaScript', 'Kyle Simpson', 2015, 'Зал иностранной литературы, стеллаж 9', 'available'),
('ENG-2013-001', 'Modern Java Practices', 'Joshua Bloch', 2008, 'Зал иностранной литературы, стеллаж 8', 'available'),

('MAG-2023-001', 'Мир технологий №1', 'Редакция', 2023, 'Периодика, стеллаж 2', 'available'),
('MAG-2023-002', 'Мир технологий №2', 'Редакция', 2023, 'Периодика, стеллаж 2', 'available'),
('MAG-2024-001', 'Tech Today №1', 'Редакция', 2024, 'Периодика, стеллаж 3', 'available'),
('MAG-2024-002', 'Tech Today №2', 'Редакция', 2024, 'Периодика, стеллаж 3', 'available'),

('LIB-2024-009', 'Человек из глубин', 'Беляев Александр Романович', 1928, 'Секция Б, стеллаж 1, полка 1', 'available'),
('LIB-2024-010', 'Привал на обочине', 'Стругацкие Аркадий и Борис', 1972, 'Секция Б, стеллаж 1, полка 2', 'available'),
('LIB-2024-011', 'Четвероногий друг', 'Булгаков Михаил Афанасьевич', 1925, 'Секция Б, стеллаж 1, полка 3', 'lost'),
('LIB-2024-012', 'Единое государство', 'Замятин Евгений Иванович', 1924, 'Секция Б, стеллаж 2, полка 1', 'available');

INSERT INTO physical_loans (book_id, reader_card, date_taken, date_returned) VALUES
((SELECT id FROM physical_books WHERE inventory_number='LIB-2024-001'), 'R-12345', '2025-10-10', NULL),
((SELECT id FROM physical_books WHERE inventory_number='ENG-2008-001'), 'STUDENT-2024-001', '2025-11-01', NULL),
((SELECT id FROM physical_books WHERE inventory_number='LIB-2024-010'), 'R-77777', '2025-12-15', NULL);

UPDATE physical_books SET status='borrowed' WHERE inventory_number IN ('LIB-2024-001','ENG-2008-001','LIB-2024-010');

INSERT INTO physical_loans (book_id, reader_card, date_taken, date_returned) VALUES
((SELECT id FROM physical_books WHERE inventory_number='LIB-2024-002'), 'R-54321', '2025-09-01', '2025-09-20'),
((SELECT id FROM physical_books WHERE inventory_number='ENG-1994-001'), 'R-22222', '2025-08-10', '2025-08-25');