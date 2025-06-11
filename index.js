import prisma from './lib/prisma.js';
import { prismaInsert, prismaGet } from './helpres/db.js';

const { Telegraf, Scenes, session } = require('telegraf');
const fs = require('fs');
const cron = require('node-cron');
const { format } = require('date-fns');
require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);

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

        await prismaInsert(ctx, birthday);

        ctx.reply(`Отлично! Запомнил дату рождения: ${birthday}`);

        return ctx.scene.leave();
    }
);

const stage = new Scenes.Stage([birthdayWizard]);
bot.use(session());
bot.use(stage.middleware());

bot.command('set_birthday', (ctx) => {
    if (ctx.chat.type !== 'private') {
        return ctx.reply('Пожалуйста, напиши мне в личку для установки даты рождения.');
    }
    ctx.scene.enter('birthday-wizard');
});

// Команда для добавления группового чата в список
bot.command('join_chat', async (ctx) => {
    const chatId = ctx.chat?.id;

    if (ctx.chat.type === 'group' || ctx.chat.type === 'supergroup') {
        const existing = await prisma.chat.findUnique({ where: { id: chatId } });

        if (!existing) {
            await prisma.chat.create({ data: { id: chatId } });
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
        const d = format(user.date, 'dd-MM');
        return d === today;
    });

    const chats = await prisma.chat.findMany();

    for (const user of todayUsers) {
        const age = new Date().getFullYear() - new Date(user.date).getFullYear();
        for (const chat of chats) {
            bot.telegram.sendMessage(
                chat.id,
                `🎉 Сегодня день рождения у ${user.name}! Поздравляем! 🎂 Тебе сегодня ${age} лет и ты ещё ближе к смерти на один год!`
            ).catch(console.error);
        }
    }
});


bot.launch();
console.log('Бот запущен');
