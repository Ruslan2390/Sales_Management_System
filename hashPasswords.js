const bcrypt = require('bcrypt');

// Пароли пользователей
const passwords = {
  user1: 'one',
  user2: 'two',
  user3: 'three'
};

// Функция для хеширования пароля
const hashPassword = (password, user) => {
  bcrypt.hash(password, 10, (err, hash) => {
    if (err) {
      console.error(`Ошибка при генерации хеша для ${user}:`, err);
    } else {
      console.log(`Сгенерированный хеш для ${user}: ${hash}`);
    }
  });
};

// Хешируем пароли для всех пользователей
Object.keys(passwords).forEach(user => {
  hashPassword(passwords[user], user);
});
