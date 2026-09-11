import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Role } from "@prisma/client";
import { UsersService } from "../users/users.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { AUTH_MODULE_OPTIONS, AuthModuleOptions } from "./interfaces/auth-module-options.interface";
import { JwtPayload } from "./interfaces/jwt-payload.interface";

interface IssuedUser {
  id: string;
  email: string;
  name?: string | null;
  role: Role;
}

// Инфраструктурный сервис аутентификации — не знает, как хранится
// пароль (эта доменная логика остаётся внутри UsersService, поддомен
// "Участники"), отвечает только за проверку учётных данных, выдачу и
// формат JWT. Именно это разделение имелось в виду в задании ЛР7 под
// "модулем, который отвечает за предоставление прав в рамках
// пользовательской сессии".
@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    @Inject(AUTH_MODULE_OPTIONS) private readonly options: AuthModuleOptions,
  ) {}

  // Публичная самостоятельная регистрация посетителя сайта. Переиспользует
  // UsersService.create (единственное место, где хешируется пароль и
  // создаётся запись User) — без выбора абонемента/роли, в отличие от
  // формы UsersController, доступной только администратору.
  async register(dto: RegisterDto) {
    const user = await this.usersService.create({
      email: dto.email,
      password: dto.password,
      name: dto.name,
      phone: dto.phone,
    });

    return this.issueToken(user);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.validateCredentials(dto.email, dto.password);

    if (!user) {
      throw new UnauthorizedException("Неверный email или пароль");
    }

    return this.issueToken(user);
  }

  issueToken(user: IssuedUser) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name ?? null,
      role: user.role,
    };

    // Секрет и срок жизни токена уже заданы при регистрации JwtModule
    // (см. AuthModule.register) — здесь достаточно передать только payload.
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: { id: user.id, email: user.email, name: user.name ?? null, role: user.role },
    };
  }

  get cookieName(): string {
    return this.options.cookieName;
  }

  // Общие опции cookie для set/clear — один источник правды для
  // AuthController (MVC) и AuthApiController (REST), чтобы значения httpOnly/
  // sameSite/secure не разъехались между двумя точками входа.
  get cookieOptions() {
    return {
      httpOnly: true,
      sameSite: "lax" as const,
      // secure — только по HTTPS; на Render прод всегда за HTTPS, а
      // локальная разработка идёт по http://localhost, где secure-cookie
      // браузер молча отбросит.
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: this.options.cookieMaxAgeMs,
    };
  }
}
