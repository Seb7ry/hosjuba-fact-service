import { Body, Controller, Post, UnauthorizedException, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/guards/jwt-auth.guard";
import { AuthService } from "src/service/auth.service";
import { LogService } from "src/service/log.service";
import { LoginDto } from "src/dto/login.dto";

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly logService: LogService,
    ) {}

    @Post('login')
    async login(@Body() loginDto: LoginDto) {
        await this.logService.log('info', `🔐 Intento de inicio de sesión para el usuario: ${loginDto.username}`, 'AuthController');

        try {
            const userTokens = await this.authService.login(loginDto.username, loginDto.password);
            await this.logService.log('info', `✅ Inicio de sesión exitoso para el usuario: ${loginDto.username}`, 'AuthController');
            return userTokens;
        } catch (error) {
            await this.logService.log('warn', `❌ Fallo en inicio de sesión para el usuario: ${loginDto.username} - Motivo: ${error.message}`, 'AuthController');
            throw new UnauthorizedException('Credenciales inválidas.');
        }
    }

    @Post('logout')
    @UseGuards(JwtAuthGuard)
    async logout(@Body() body: { username: string }) {
        if (!body.username) {
            throw new UnauthorizedException('Username requerido');
        }

        try {
            const message = await this.authService.logout(body.username);
            return { message };
        } catch (error) {
            throw new UnauthorizedException('No se pudo cerrar la sesión.');
        }
    }
}