const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser'); // Добавлено для парсинга JSON
const app = express();
const PORT = 3000;

// Логирование запросов
app.use((req, res, next) => {
    console.log(`Received request for ${req.url} with method ${req.method}`);
    next();
});

// Устанавливаем статическую папку
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // Для обработки JSON данных
app.use(express.urlencoded({ extended: true })); // Для обработки URL-кодированных данных
app.use(cookieParser());
app.use(bodyParser.json()); // Добавлено для парсинга JSON

// Пути к файлу с данными пользователей
const usersFilePath = path.join(__dirname, 'usersData.json');

// Загружаем данные пользователей из JSON-файла
const loadUsers = () => {
    if (fs.existsSync(usersFilePath)) {
        const usersData = fs.readFileSync(usersFilePath);
        return JSON.parse(usersData);
    } else {
        return [];
    }
};

// Сохранение пользователей
const saveUsers = (users) => {
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));
};

// Проверка авторизации
const checkAuth = (req, res, next) => {
    console.log('Checking auth. Cookies:', req.cookies); // Логируем куки для отладки
    if (req.cookies.role) {
        console.log('User is authenticated with role:', req.cookies.role);
        next();
    } else {
        console.log('User is not authenticated');
        res.redirect('/login'); // Если не авторизован, перенаправляем на логин
    }
};

// Получение роли пользователя
app.get('/user-role', (req, res) => {
    if (req.cookies.role) {
        res.json({ role: req.cookies.role });
    } else {
        res.status(401).json({ role: null });
    }
});

// Основной маршрут для защиты
app.get('/', (req, res) => {
    console.log('Cookies on /:', req.cookies); // Логируем куки для отладки
    if (req.cookies.role) {
        console.log('Authenticated user accessing /');
        res.redirect('/index.html'); // Перенаправление на основную страницу
    } else {
        console.log('Redirecting to login for unauthenticated user');
        res.redirect('/login'); // Если не авторизован, перенаправляем на логин
    }
});

// Маршрут для получения данных из objectData.json
app.get('/api/data', checkAuth, (req, res) => {
    const dataPath = path.join(__dirname, 'objectData.json');
    fs.readFile(dataPath, 'utf8', (err, data) => {
        if (err) {
            console.error("Ошибка при чтении файла", err);
            res.status(500).json({ error: 'Не удалось прочитать данные' });
        } else {
            try {
                const jsonData = JSON.parse(data);
                res.json(jsonData);
            } catch (parseErr) {
                console.error("Ошибка при парсинге JSON", parseErr);
                res.status(500).json({ error: 'Некорректный формат данных' });
            }
        }
    });
});

// Обновлённый маршрут для сохранения данных в objectData.json
app.post('/api/data', checkAuth, (req, res) => {
    const dataPath = path.join(__dirname, 'objectData.json');
    
    // Читаем текущие данные
    fs.readFile(dataPath, 'utf8', (err, data) => {
        let jsonData = [];
        if (err) {
            if (err.code === 'ENOENT') {
                // Файл не существует, начнём с пустого массива
                jsonData = [];
            } else {
                console.error("Ошибка при чтении файла", err);
                return res.status(500).json({ error: 'Не удалось прочитать данные' });
            }
        } else {
            try {
                jsonData = JSON.parse(data);
                if (!Array.isArray(jsonData)) {
                    jsonData = [];
                }
            } catch (parseErr) {
                console.error("Ошибка при парсинге JSON", parseErr);
                jsonData = [];
            }
        }

        // Добавляем новый объект
        jsonData.push(req.body);

        // Записываем обновлённые данные обратно в файл
        fs.writeFile(dataPath, JSON.stringify(jsonData, null, 2), (writeErr) => {
            if (writeErr) {
                console.error("Ошибка при записи файла", writeErr);
                return res.status(500).json({ error: 'Не удалось сохранить данные' });
            }
            res.status(200).json({ message: 'Данные успешно сохранены' });
        });
    });
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

    // Поиск пользователя по имени
    const user = users.find(u => u.username === username);
    if (user) {
        // Проверка пароля
        bcrypt.compare(password, user.passwordHash, (err, result) => {
            if (err) {
                console.error('Ошибка проверки пароля:', err);
                return res.status(500).send('Ошибка проверки пароля.');
            }
            if (result) {
                // Успешный вход, сохраняем роль в куки
                res.cookie('role', user.role, { httpOnly: true, maxAge: 3600000, sameSite: 'lax' }); // Устанавливаем куки на 1 час
                console.log('Login successful. Redirecting to /index.html');
                res.redirect('/index.html'); // Перенаправление на основную страницу
            } else {
                console.log('Invalid password for user:', username);
                res.status(401).send('Неверный пароль.');
            }
        });
    } else {
        console.log('User not found:', username);
        res.status(401).send('Пользователь не найден.');
    }
});

// Маршрут для регистрации нового пользователя (если нужно)
app.post('/register', (req, res) => {
    console.log('Handling /register POST request');
    const { username, password, role } = req.body;
    const users = loadUsers();

    // Проверка, существует ли пользователь
    const userExists = users.find(u => u.username === username);
    if (userExists) {
        return res.status(400).send('Пользователь уже существует.');
    }

    // Хешируем пароль
    bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
            console.error('Ошибка при хешировании пароля:', err);
            return res.status(500).send('Ошибка при хешировании пароля.');
        }

        // Создаем нового пользователя
        const newUser = { username, passwordHash: hash, role };
        users.push(newUser);
        saveUsers(users);

        res.send('Регистрация успешна.');
    });
});

// Маршрут для завершения сеанса
app.post('/logout', (req, res) => {
    // Удаляем куки
    res.clearCookie('role', { path: '/' });
    // Перенаправляем на страницу входа
    res.redirect('/login');
});

// Маршрут для смены пароля
app.post('/change-password', (req, res) => {
    const { oldPassword, newPassword } = req.body;
    
    // Логика проверки старого пароля и обновления пароля
    // Не забудьте хешировать новый пароль перед сохранением
    // Пример с использованием bcrypt:
    // Предполагается, что у вас есть способ получить текущего пользователя и его хешированный пароль
    const users = loadUsers();
    const user = users.find(u => u.role === req.cookies.role); // Пример поиска пользователя по роли
    if (!user) {
        return res.status(404).send('Пользователь не найден.');
    }

    bcrypt.compare(oldPassword, user.passwordHash, (err, result) => {
        if (err) {
            console.error('Ошибка проверки пароля:', err);
            return res.status(500).send('Ошибка проверки пароля.');
        }
        if (result) {
            bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
                if (err) {
                    console.error('Ошибка при хешировании пароля:', err);
                    return res.status(500).send('Ошибка при хешировании пароля.');
                }
                
                // Обновляем пароль пользователя
                user.passwordHash = hashedPassword;
                saveUsers(users);

                res.status(200).send('Пароль успешно изменён');
            });
        } else {
            res.status(400).send('Неверный старый пароль');
        }
    });
});

// Маршрут для изменения роли пользователя
app.post('/change-role', (req, res) => {
    const { username, role } = req.body;
    
    const users = loadUsers();
    const user = users.find(u => u.username === username);
    if (!user) {
        return res.status(404).send('Пользователь не найден.');
    }

    user.role = role;
    saveUsers(users);

    res.status(200).send('Роль успешно изменена');
});

// Маршрут для добавления нового пользователя
app.post('/add-user', (req, res) => {
    const { username, password, role } = req.body;
    
    const users = loadUsers();
    const userExists = users.find(u => u.username === username);
    if (userExists) {
        return res.status(400).send('Пользователь уже существует.');
    }

    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            console.error('Ошибка при хешировании пароля:', err);
            return res.status(500).send('Ошибка при хешировании пароля.');
        }
        
        const newUser = { username, passwordHash: hashedPassword, role };
        users.push(newUser);
        saveUsers(users);

        res.status(200).send('Пользователь успешно добавлен');
    });
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});




// После парсинга существующих данных и до добавления нового объекта
const existingObject = jsonData.find(obj => obj.objectId === req.body.objectId);
if (existingObject) {
    return res.status(400).json({ error: 'Объект с таким ID уже существует.' });
}
