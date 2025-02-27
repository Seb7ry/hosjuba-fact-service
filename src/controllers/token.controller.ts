import { Body, Controller, Post, UnauthorizedException } from "@nestjs/common";
import { LogService } from "src/service/log.service";
import { TokenService } from "src/service/token.service";

@Controller('token')
export class TokenController{
    constructor(
        private readonly tokenService: TokenService,
        private readonly logService: LogService,
    ){}

    @Post('refresh')
    async refreshToken(@Body() body: { username: string, refreshToken: string }) {
        await this.logService.log('info', `🔄 Intento de renovación de token para el usuario: ${body.username}`, 'TokenController');

        if (!body.username || !body.refreshToken) {
            await this.logService.log('warn', `⚠️ Renovación fallida: Faltan parámetros en la solicitud.`, 'TokenController');
            throw new UnauthorizedException('Username y Refresh Token requerido');
        }

        try {
            const newAccessToken = await this.tokenService.refreshAccessToken(body.username, body.refreshToken);
            await this.logService.log('info', `✅ Token de acceso renovado correctamente para el usuario: ${body.username}`, 'TokenController');
            return newAccessToken;
        } catch (error) {
            await this.logService.log('warn', `❌ Fallo en la renovación del token para el usuario: ${body.username} - Motivo: ${error.message}`, 'TokenController');
            throw new UnauthorizedException('No se pudo renovar el token de acceso.');
        }
    }
}