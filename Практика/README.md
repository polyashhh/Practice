Hybrid Library
Гибридная система управления библиотекой — учебное веб-приложение, демонстрирующее интеграцию Legacy PHP (SOAP + XML/XSLT) с современным REST API (Node.js + Express + TinyDB) и фронтендом.

Структура проекта
text
Практика/
  php/                                # Legacy-часть
    config/
      config.php                      # Настройки подключения к SQLite
    db/
      init_sqlite.sql                 # Скрипт инициализации БД
      library.sqlite                  # Файл базы данных 
    public/
      soap-server.php                 # SOAP-сервер
      admin.php                       # SOAP-клиент(админка)
      report.php                      # Генерация отчёта
      wsdl/
        library.wsdl                  #Описание SOAP-сервиса
    src/
      Db.php                          # Подключение к SQLite
      LegacyLibraryService.php        # Реализация SOAP-методов
    xsl/
      report.xsl                      # XSLT-шаблон для отчёта
  node/                               # Node.js REST API + SOAP-клиент + TinyDB
    package.json                      # Зависимости и скрипты
    .env                              # Переменные окружения
    src/
      app.js                          # Express-сервер, маршруты API
      config.js                       # Конфигурация 
      soap.js                         # SOAP-клиент 
      xml.js                          # Парсинг XML → JSON
      tinydb.js                       # Работа с TinyDB 
    data/
      tinydb/
        digital_resources.json        # Коллекция цифровых ресурсов
        download_log.json             # Коллекция логов скачиваний
  frontend/                          
    index.html                        # Интерфейс 
    styles.css                        # Стили
    app.js                            # Логика

Запуск проекта (локально)

SOAP-сервер и отчёт (порт 8001)
bash
cd php
php -S 127.0.0.1:8001 -t public

Админка SOAP-клиента (порт 8002)
bash
cd php
php -S 127.0.0.1:8002 -t public

Node.js 
bash
cd node
npm i
npm start

Фронтенд
bash
cd frontend
python -m http.server 8080
Проверка работоспособности
Открыть фронтенд: http://127.0.0.1:8080