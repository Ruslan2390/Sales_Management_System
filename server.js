const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const app = express();




const connection = mysql.createConnection(process.env.JAWSDB_URL || {
  host: 'localhost',
  user: 'admin',
  password: 'three',
  database: 'sales_management_system'});

  connection.connect((err) => {
    if (err) {
      console.error('Ошибка подключения: ' + err.stack);
      return;
    }
    console.log('Подключено как id ' + connection.threadId);
  
    // Добавляем запрос для создания таблицы после успешного подключения
    connection.query(`
      CREATE TABLE IF NOT EXISTS objects (
        id INT AUTO_INCREMENT PRIMARY KEY,
        object_name VARCHAR(255) NOT NULL,
        object_type VARCHAR(100),
        object_quantity INT,
        purchase_date DATE,
        purchase_amount DECIMAL(15, 2),
        buyer_fullname VARCHAR(255),
        buyer_phone VARCHAR(15),
        buyer_passport_id VARCHAR(50),
        buyer_address TEXT,
        registered_to_owner BOOLEAN,
        guarantor_fullname VARCHAR(255),
        guarantor_phone VARCHAR(15),
        guarantor_passport_id VARCHAR(50),
        guarantor_address TEXT,
        contract_number VARCHAR(100),
        contract_date DATE,
        term_months INT,
        months_elapsed INT,
        completion_date DATE,
        sale_price DECIMAL(15, 2),
        discount DECIMAL(10, 2),
        profit_amount DECIMAL(15, 2),
        profit_percent DECIMAL(5, 2),
        total_payment_due DECIMAL(15, 2),
        initial_payment DECIMAL(15, 2),
        monthly_payment DECIMAL(15, 2),
        payment_term DATE,
        overdue_payments INT,
        overdue_report_period INT,
        total_paid DECIMAL(15, 2),
        paid_report_period DECIMAL(15, 2),
        total_remaining DECIMAL(15, 2),
        remaining_report_period DECIMAL(15, 2),
        total_overdue DECIMAL(15, 2),
        overdue_report_period_sum DECIMAL(15, 2),
        status VARCHAR(50)
      );
    `, (err, results) => {
      if (err) {
        console.error('Ошибка создания таблицы: ', err);
        return;
      }
      console.log('Таблица успешно создана (или уже существует)');
    });
  });




// Логирование запросов
app.use((req, res, next) => {
  console.log(`Received request for ${req.url} with method ${req.method}`);
  next();
});

// Middleware для парсинга куки и тел запросов
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Пути к файлу с данными пользователей
const usersFilePath = path.join(__dirname, 'usersData.json'); // Путь к файлу с данными пользователей

// Функция для загрузки данных пользователей из JSON-файла
const loadUsers = () => {
  try {
    if (fs.existsSync(usersFilePath)) {
      const usersData = fs.readFileSync(usersFilePath);
      return JSON.parse(usersData);
    } else {
      return [];
    }
  } catch (error) {
    console.error('Ошибка чтения файла:', error);
    return [];
  }
};

// Функция для сохранения пользователей в JSON-файл
const saveUsers = (users) => {
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error('Ошибка записи файла:', error);
  }
};

// Middleware для проверки авторизации пользователя
const checkAuth = (req, res, next) => {
  if (req.cookies.role) {
    next(); // Если авторизован, передаем управление следующему middleware или маршруту
  } else {
    res.redirect('/login'); // Перенаправляем на страницу логина
  }
};

// Основной маршрут, защищённый проверкой авторизации
app.get('/', checkAuth, (req, res) => {
  res.redirect('/index.html'); // Перенаправляем на главную страницу
});

// Маршрут для получения роли пользователя
app.get('/user-role', (req, res) => {
  if (req.cookies.role) {
    res.json({ role: req.cookies.role });
  } else {
    res.status(401).json({ role: null }); // Если нет роли, отправляем статус 401 (не авторизован)
  }
});





// Маршрут для отображения главной страницы
app.get('/index.html', checkAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Маршрут для отображения страницы логина
app.get('/login', (req, res) => {
  console.log('Handling /login GET request');
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Маршрут для обработки данных при логине
app.post('/login', (req, res) => {
  console.log('Handling /login POST request');
  const { username, password } = req.body;
  const users = loadUsers();

  const user = users.find(u => u.username === username);
  if (user) {
    bcrypt.compare(password, user.passwordHash, (err, result) => {
      if (err) {
        console.error('Ошибка проверки пароля:', err);
        return res.status(500).send('Ошибка проверки пароля.');
      }
      if (result) {
        res.cookie('role', user.role, { httpOnly: true, secure: true }); // Use secure: true in production
        res.redirect('/');
      } else {
        res.status(401).send('Неверное имя пользователя или пароль.');
      }
    });
  } else {
    res.status(401).send('Неверное имя пользователя или пароль.');
  }
});





// Маршрут для выхода из системы
app.post('/logout', (req, res) => {
  console.log('Handling /logout POST request');
  res.clearCookie('role'); // Удаляем куку с ролью
  res.redirect('/login'); // Перенаправляем на страницу логина
});





// Настройка сервера
app.use(express.static(path.join(__dirname, 'public')));

// Основной маршрут
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Запуск сервера
app.listen(process.env.PORT || 3000, () => {
  console.log(`Сервер запущен на порту ${process.env.PORT || 3000}`);
});