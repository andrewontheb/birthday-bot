const { Telegraf, Scenes, session } = require('telegraf');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const { format } = require('date-fns');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

// Путь к файлам с данными
const BIRTHDAYS_PATH = path.join(__dirname, 'birthdays.json');
const CHATS_PATH = path.join(__dirname, 'chats.json');

// Функции для чтения и записи JSON
function readJson(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const data = fs.readFileSync(filePath);
    return JSON.parse(data);
  } catch (e) {
    console.error('Ошибка чтения файла', filePath, e);
    return [];
  }
}

function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Ошибка записи файла', filePath, e);
  }
}

// Загружаем данные
let birthdays = readJson(BIRTHDAYS_PATH); // массив объектов { id, name, birthday }
let chats = readJson(CHATS_PATH);         // массив ID групповых чатов

// Сохраняем данные в файлы
function saveBirthdays() {
  writeJson(BIRTHDAYS_PATH, birthdays);
}

function saveChats() {
  writeJson(CHATS_PATH, chats);
}

// Wizard сцена для ввода даты рождения
const birthdayWizard = new Scenes.WizardScene(
  'birthday-wizard',
  (ctx) => {
    ctx.reply('Пожалуйста, введи дату рождения в формате ДД-ММ (например, 08-06)');
    return ctx.wizard.next();
  },
  (ctx) => {
    const text = ctx.message.text.trim();
    const [d, m] = text.split('-');

    if (
      !d || !m ||
      isNaN(d) || isNaN(m) ||
      +d < 1 || +d > 31 ||
      +m < 1 || +m > 12
    ) {
      ctx.reply('Неверный формат даты. Попробуй ещё раз (ДД-ММ).');
      return; // остаёмся на этом шаге, ждём следующего сообщения
    }

    const birthday = `${d.padStart(2, '0')}-${m.padStart(2, '0')}`;
    const userId = ctx.from.id;
    const userName = ctx.from.first_name || 'Друг';

    // Обновляем или добавляем
    const idx = birthdays.findIndex(u => u.id === userId);
    if (idx !== -1) {
      birthdays[idx] = { id: userId, name: userName, birthday };
    } else {
      birthdays.push({ id: userId, name: userName, birthday });
    }
    saveBirthdays();

    ctx.reply(`Отлично! Запомнил дату рождения: ${birthday}`);

    return ctx.scene.leave();
  }
);

const stage = new Scenes.Stage([birthdayWizard]);
bot.use(session());
bot.use(stage.middleware());

// Команда для начала ввода даты в ls
bot.command('set_birthday', (ctx) => {
  if (ctx.chat.type !== 'private') {
    return ctx.reply('Пожалуйста, напиши мне в личку для установки даты рождения.');
  }
  ctx.scene.enter('birthday-wizard');
});

// Команда для добавления группового чата в список
bot.command('join_chat', (ctx) => {
    console.log('Command from chat id:', ctx.chat?.id);
    ctx.reply('chat.id = ' + ctx.chat?.id);
  if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
    if (!chats.includes(ctx.chat.id)) {
      chats.push(ctx.chat.id);
      saveChats();
      ctx.reply('Этот чат добавлен в список для поздравлений!');
    } else {
      ctx.reply('Этот чат уже в списке.');
    }
  } else {
    ctx.reply('Эта команда работает только в группах.');
  }
});

bot.command('show_data', (ctx) => {
    ctx.reply(ctx.from.id);
    if (ctx.from.id !== process.env.ADMIN_ID) {
      return ctx.reply('У тебя нет доступа к этой команде.');
    }
  
    const bdData = fs.readFileSync('birthdays.json', 'utf-8');
    const chatsData = fs.readFileSync('chats.json', 'utf-8');
    ctx.reply('Содержимое файла birthdays.json:\n' + bdData);
    ctx.reply('Содержимое файла chats.json:\n' + chatsData);
  });

// Ежедневная проверка и отправка поздравлений в 9 утра
cron.schedule('0 9 * * *', () => {
  const today = format(new Date(), 'dd-MM');

  birthdays.forEach(user => {
    if (user.birthday === today) {
      chats.forEach(chatId => {
        bot.telegram.sendMessage(
          chatId,
          `🎉 Сегодня день рождения у ${user.name}! Поздравляем! 🎂 Тебе сегодня ${age} лет и ты ещё ближе к смерти на один год!`
        ).catch(console.error);
      });
    }
  });
});

bot.launch();
console.log('Бот запущен');
