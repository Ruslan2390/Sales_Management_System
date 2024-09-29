const bcrypt = require('bcrypt');

// Замените на ваш пароль
const plainTextPassword = 'superpassword';  

// Генерация хеша
bcrypt.hash(plainTextPassword, 10, (err, hash) => {
  if (err) {
    console.error('Ошибка при генерации хеша:', err);
  } else {
    console.log('Сгенерированный хеш:', hash);
  }
});
