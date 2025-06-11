async function prismaInsert(ctx, birthdayStr) {
  const [day, month] = birthdayStr.split('-');
  const date = new Date();
  date.setDate(parseInt(day));
  date.setMonth(parseInt(month) - 1);

  await prisma.birthday.upsert({
    where: { userId: ctx.from.id.toString() },
    update: { date },
    create: {
      userId: ctx.from.id.toString(),
      name: ctx.from.first_name || 'Друг',
      date,
    },
  });
}

async function prismaGet(ctx) {
  return await prisma.birthday.findUnique({
    where: { userId: ctx.from.id.toString() },
  });
}


module.exports = {
  prismaInsert,
  prismaGet,
};
