import { Body, Controller, Post, UnauthorizedException } from "@nestjs/common";
import { LoginDto } from "src/dto/login.dto";
import { AuthService } from "src/service/auth.service";
import { LogService } from "src/service/log.service";

/**
 * Controlador de autenticación (`/auth`).
 * 
 * Maneja el inicio de sesión y la renovación de tokens de acceso.
 */
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly logService: LogService
    ) {}

    /**
     * **Inicio de sesión**
     * 
     * - Ruta: `POST /auth/login`
     * - Requiere credenciales (`username` y `password`) en el cuerpo de la solicitud.
     * - Devuelve un `access_token` y un `refresh_token` si las credenciales son correctas.
     * 
     * @param loginDto - DTO con los datos de inicio de sesión.
     * @returns `{ access_token, refresh_token }`
     * @throws `UnauthorizedException` si las credenciales son inválidas.
     */
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

    /**
     * **Renovación de token**
     * 
     * - Ruta: `POST /auth/refresh`
     * - Requiere `username` y un `refresh_token` válido en el cuerpo de la solicitud.
     * - Devuelve un nuevo `access_token` si el `refresh_token` es válido.
     * 
     * @param body - Objeto con `username` y `refreshToken`.
     * @returns `{ access_token }`
     * @throws `UnauthorizedException` si el `refreshToken` es inválido o ha expirado.
     */
    @Post('refresh')
    async refreshToken(@Body() body: { username: string, refreshToken: string }) {
        await this.logService.log('info', `🔄 Intento de renovación de token para el usuario: ${body.username}`, 'AuthController');

        if (!body.username || !body.refreshToken) {
            await this.logService.log('warn', `⚠️ Renovación fallida: Faltan parámetros en la solicitud.`, 'AuthController');
            throw new UnauthorizedException('Username y Refresh Token requerido');
        }

        try {
            const newAccessToken = await this.authService.refreshToken(body.username, body.refreshToken);
            await this.logService.log('info', `✅ Token de acceso renovado correctamente para el usuario: ${body.username}`, 'AuthController');
            return newAccessToken;
        } catch (error) {
            await this.logService.log('warn', `❌ Fallo en la renovación del token para el usuario: ${body.username} - Motivo: ${error.message}`, 'AuthController');
            throw new UnauthorizedException('No se pudo renovar el token de acceso.');
        }
    }

    @Post('logout')
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