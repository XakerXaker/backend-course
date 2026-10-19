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
