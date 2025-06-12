const prisma = require('../lib/prisma');

async function prismaInsert(ctx, birthdayStr) {
  const [day, month] = birthdayStr.split('-');
  const date = new Date();
  date.setDate(parseInt(day));
  date.setMonth(parseInt(month) - 1);

  return await prisma.birthday.upsert({
    where: { userId: ctx.from.id.toString() },
    update: { date },
    create: {
      userId: ctx.from.id.toString(),
      name: ctx.from.first_name || 'Абобус',
      date,
    },
  });
}

async function prismaGetBirthDay(ctx) {
  return await prisma.birthday.findUnique({
    where: { userId: ctx.from.id.toString() },
  });
}

async function prismaGetChat(ctx) {
  return await prisma.chat.findUnique({
    where: { id: ctx.chat?.id },
  });
}


module.exports = {
  prismaInsert,
  prismaGetBirthDay,
  prismaGetChat
};
