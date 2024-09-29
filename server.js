const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const db = process.env.MONGODB_URI;

// Модели MongoDB
const User = require('./models/User');
const ObjectData = require('./models/ObjectData');

const app = express();
const PORT = process.env.PORT || 3000;


mongoose.connect('mongodb+srv://user:Password123@cluster0.t29dm.mongodb.net/sales_management_db', {
    // Удаляем устаревшие опции
})
.then(() => console.log('Connected to MongoDB Atlas'))
.catch((error) => console.error('Error connecting to MongoDB Atlas:', error));



mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));




// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(bodyParser.json());

// Регистрация
app.post('/register', async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).send('Пользователь уже существует.');
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = new User({ username, passwordHash, role });
        await newUser.save();
        res.send('Регистрация успешна.');
    } catch (error) {
        res.status(500).send('Ошибка при регистрации.');
    }
});

// Логин
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).send('Пользователь не найден.');
        }

        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(401).send('Неверный пароль.');
        }

        res.cookie('role', user.role, { httpOnly: true, maxAge: 3600000 });
        res.redirect('/index.html');
    } catch (error) {
        res.status(500).send('Ошибка при логине.');
    }
});

// Изменение пароля
app.post('/change-password', async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    try {
        const user = await User.findOne({ role: req.cookies.role });
        if (!user) {
            return res.status(404).send('Пользователь не найден.');
        }

        const isPasswordValid = await bcrypt.compare(oldPassword, user.passwordHash);
        if (!isPasswordValid) {
            return res.status(400).send('Неверный старый пароль.');
        }

        user.passwordHash = await bcrypt.hash(newPassword, 10);
        await user.save();
        res.status(200).send('Пароль успешно изменён.');
    } catch (error) {
        res.status(500).send('Ошибка при изменении пароля.');
    }
});

// Добавление нового пользователя
app.post('/add-user', async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const userExists = await User.findOne({ username });
        if (userExists) {
            return res.status(400).send('Пользователь уже существует.');
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = new User({ username, passwordHash, role });
        await newUser.save();
        res.status(200).send('Пользователь успешно добавлен.');
    } catch (error) {
        res.status(500).send('Ошибка при добавлении пользователя.');
    }
});

// Получение данных объектов
app.get('/api/data', async (req, res) => {
    try {
        const data = await ObjectData.find();
        res.json(data);
    } catch (error) {
        res.status(500).send('Ошибка при получении данных.');
    }
});

// Добавление данных объекта
app.post('/api/data', async (req, res) => {
    const { objectId, name, description } = req.body;
    try {
        const existingObject = await ObjectData.findOne({ objectId });
        if (existingObject) {
            return res.status(400).send('Объект с таким ID уже существует.');
        }

        const newObject = new ObjectData({ objectId, name, description });
        await newObject.save();
        res.status(200).send('Данные успешно сохранены.');
    } catch (error) {
        res.status(500).send('Ошибка при сохранении данных.');
    }
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});
