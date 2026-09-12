// Разовый скрипт для назначения ПЕРВОГО администратора — классическая
// проблема курицы и яйца: выдать роль ADMIN через приложение
// (PATCH /api/users/:id/role, форма на /users/:id) может только тот, у
// кого эта роль уже есть (см. @Roles(Role.ADMIN) на UsersController/
// UsersApiController). Пользователь при этом должен уже существовать —
// сначала зарегистрируйтесь обычным способом через /register, потом
// выполните этот скрипт по его email.
//
// Переиспользует UsersService.changeRole(...) — тот же метод, что вызывает
// форма в админ-панели, — а не дублирует его логику: одним вызовом
// синхронизирует и SuperTokens (UserRoles.addRoleToUser), и зеркальное
// поле User.role в Prisma.
//
// Запуск (после npm run build):
//   npm run make-admin -- ivan@example.com
import "dotenv/config";
import { NestFactory } from "@nestjs/core";
import { Role } from "@prisma/client";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";

async function bootstrap() {
  const email = process.argv[2];

  if (!email) {
    console.error("Использование: npm run make-admin -- <email>");
    process.exit(1);
  }

  // createApplicationContext — поднимает тот же DI-граф, что и обычный
  // запуск (в т.ч. AuthModule.forRoot() → supertokens.init()), но без
  // HTTP-сервера: для одноразового скрипта он не нужен.
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ["error", "warn"],
  });

  try {
    const prisma = app.get(PrismaService);
    const usersService = app.get(UsersService);

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      console.error(
        `Пользователь с email "${email}" не найден. Сначала зарегистрируйтесь через /register.`,
      );
      process.exitCode = 1;
      return;
    }

    if (user.role === Role.ADMIN) {
      console.log(`${email} уже администратор.`);
      return;
    }

    await usersService.changeRole(user.id, Role.ADMIN);

    console.log(
      `Готово: ${email} теперь ADMIN. Не забудьте перелогиниться — роль зашита в уже выданный токен и не обновляется "на лету".`,
    );
  } finally {
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error("Не удалось назначить администратора:", error);
  process.exit(1);
});
