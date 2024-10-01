const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const fs = require('fs');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();




// Настройка подключения к MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) {
    console.error('Ошибка подключения к базе данных:', err);
    return;
  }
  console.log('Подключение к базе данных успешно!');
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
    if (fs.existsSync(usersFilePath)) { // Проверяем, существует ли файл с данными пользователей
      const usersData = fs.readFileSync(usersFilePath); // Читаем данные из файла
      return JSON.parse(usersData); // Возвращаем данные как объект JavaScript
    } else {
      return []; // Если файл не существует, возвращаем пустой массив
    }
  } catch (error) {
    console.error('Ошибка чтения файла:', error);
    return []; // Возвращаем пустой массив в случае ошибки
  }
};




// Функция для сохранения пользователей в JSON-файл
const saveUsers = (users) => {
  try {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2)); // Записываем массив пользователей в файл
  } catch (error) {
    console.error('Ошибка записи файла:', error);
  }
};



// Middleware для проверки авторизации пользователя
const checkAuth = (req, res, next) => {
  console.log('Checking auth. Cookies:', req.cookies); // Логируем куки для отладки
  if (req.cookies.role) { // Проверяем, есть ли кука с ролью
    console.log('User is authenticated with role:', req.cookies.role);
    next(); // Если авторизован, передаем управление следующему middleware или маршруту
  } else {
    console.log('User is not authenticated');
    res.redirect('/login'); // Перенаправляем на страницу логина
  }
};

// Маршрут для получения роли пользователя
app.get('/user-role', (req, res) => {
  if (req.cookies.role) {
    res.json({ role: req.cookies.role });
  } else {
    res.status(401).json({ role: null }); // Если нет роли, отправляем статус 401 (не авторизован)
  }
});

// Основной маршрут
app.get('/', (req, res) => {
  console.log('Cookies on /:', req.cookies);
  if (req.cookies.role) {
    console.log('Authenticated user accessing /');
    res.redirect('/index.html'); // Перенаправляем на основную страницу
  } else {
    console.log('Redirecting to login for unauthenticated user');
    res.redirect('/login'); // Перенаправляем на страницу логина
  }
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
        res.cookie('role', user.role, { httpOnly: true, secure: false }); // Use secure: true in production
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