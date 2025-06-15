const prisma = require('./lib/prisma');
const cron = require('node-cron');
const { prismaInsert, prismaGetBirthDay, prismaGetChat } = require('./helpers/db');
const { Telegraf, Scenes, session } = require('telegraf');
const { format } = require('date-fns');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

const validateDate = (date) => {
    const {d, m} = date;
    return !(!d || !m ||
    isNaN(d) || isNaN(m) ||
    +d < 1 || +d > 31 ||
    +m < 1 || +m > 12);
}

// Wizard сцена для ввода даты рождения
const birthdayWizard = new Scenes.WizardScene(
    'birthday-wizard',
    (ctx) => {
        ctx.reply('Пожалуйста, введи дату рождения в формате ДД-ММ (например, 08-06)');
        return ctx.wizard.next();
    },
    async (ctx) => {
        const text = ctx.message.text.trim();
        const [d, m] = text.split('-');

        if (!validateDate({d, m})) {
            ctx.reply('Неверный формат даты. Попробуй ещё раз (ДД-ММ).');
            return;
        }

        const birthday = `${d.padStart(2, '0')}-${m.padStart(2, '0')}`;

        await prismaInsert(ctx, birthday);

        ctx.reply(`Отлично! Запомнил дату рождения: ${birthday}`);

        return ctx.scene.leave();
    }
);

const stage = new Scenes.Stage([birthdayWizard]);
bot.use(session());
bot.use(stage.middleware());

bot.start((ctx) => {
    const payload = ctx.startPayload;
    if (payload && payload.startsWith('set_')) {
        const chatId = payload.replace('set_', '');
        ctx.session.chatId = chatId;
        return ctx.scene.enter('birthday-wizard');
    }

    ctx.reply('Привет! Напиши /set_birthday в группе, чтобы указать дату рождения.');
});


bot.command('set_birthday', async (ctx) => {
    if (ctx.chat.type === 'private') {
        return ctx.scene.enter('birthday-wizard');
    }

    const chatId = ctx.chat.id.toString();
    const button = {
        text: 'Установить дату рождения',
        url: `https://t.me/${ctx.me}?start=set_${chatId}`,
    };

    await ctx.reply('Нажми на кнопку, чтобы установить дату рождения:', {
        reply_markup: {
            inline_keyboard: [[button]],
        },
    });
});

// Команда для добавления группового чата в список
bot.command('join_chat', async (ctx) => {
    const { id, title } = ctx.chat;

    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        const existing = await prismaGetChat(ctx);

        if (!existing) {
            await prisma.chat.create({ data: { id, title } });
            ctx.reply('Этот чат добавлен в список для поздравлений!');
        } else {
            ctx.reply('Этот чат уже в списке.');
        }
    } else {
        ctx.reply('Эта команда работает только в группах.');
    }
});

bot.command('show_data', async (ctx) => {
    const userId = ctx.from.id.toString();

    if (userId !== process.env.ADMIN_ID) {
        return ctx.reply('У тебя нет доступа к этой команде.');
    }

    const users = await prisma.birthday.findMany();
    const chats = await prisma.chat.findMany();

    if (users.length === 0 && chats.length === 0) {
        return ctx.reply('Нет данных в базе.');
    }

    const usersText = users.map(u => `👤 ${u.userId}: ${format(u.date, 'dd-MM-yyyy')}`).join('\n');
    const chatsText = chats.map(c => `💬 Chat ID: ${c.id}`).join('\n');

    ctx.reply(`🎂 Дни рождения:\n${usersText || 'Пусто'}`);
    ctx.reply(`📢 Чаты:\n${chatsText || 'Пусто'}`);
});

cron.schedule('0 9 * * *', async () => {
    const today = format(new Date(), 'dd-MM');
    const users = await prisma.birthday.findMany();
    const todayUsers = users.filter(user => {
        // TODO: check format
        const d = format(user.date, 'dd-MM');
        return d === today;
    });

    const chats = await prisma.chat.findMany();

    for (const user of todayUsers) {
        const age = new Date().getFullYear() - new Date(user.date).getFullYear();
        bot.telegram.sendMessage(
            user.chatId,
            `🎉 Сегодня день рождения у ${user.name}! Поздравляем! 🎂 Тебе сегодня ${age} лет и ты ещё ближе к смерти на один год!`
        ).catch(console.error);

        // for (const chat of chats) {
        //     if (chat.id !== user.chatId) continue;
        //     bot.telegram.sendMessage(
        //         chat.id,
        //         `🎉 Сегодня день рождения у ${user.name}! Поздравляем! 🎂 Тебе сегодня ${age} лет и ты ещё ближе к смерти на один год!`
        //     ).catch(console.error);
        // }
    }
});

(async() => {
    await bot.telegram.deleteWebhook();
    await bot.launch();
    console.log('Бот успешно запущен!');
})();

