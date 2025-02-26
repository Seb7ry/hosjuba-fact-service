import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { TokenService } from "./token.service";
import { LogService } from "./log.service";
import { AdmUsrService } from "./admusr.service";

@Injectable()
export class AuthService {
    constructor(
        private readonly tokenService: TokenService,
        private readonly jwtService: JwtService,
        private readonly logService: LogService,
        private readonly admUsrService: AdmUsrService
    ) {}

    private async logAndThrow(level: 'info' | 'warn' | 'error', message: string, context: string) {
        await this.logService.log(level, message, context);
        throw new UnauthorizedException(message);
    }

    /**
     * Inicia sesión de un usuario y genera tokens de acceso y refresco.
     * @param username Nombre de usuario.
     * @param password Contraseña ingresada.
     * @returns Un objeto con `access_token` y `refresh_token`.
     */
    async login(username: string, password: string): Promise<{ access_token: string; refresh_token: string }> {
        const user = await this.admUsrService.findByUser(username);
        if (!user) {
            await this.logAndThrow('warn', `Usuario no encontrado: ${username}`, 'AuthService');
        }

        if (password.trim() !== user.AUsrPsw.toString().trim()) {
            console.log(password.trim());
            console.log(user.AUsrPsw.toString().trim());
            await this.logAndThrow('warn', `Contraseña incorrecta para usuario: ${username}`, 'AuthService');
        }

        // Generar los tokens (Accesos y refresh)
        const { accessToken, refreshToken } = await this.tokenService.generateTokens(username);

        await this.logService.log('info', `Tokens generados y almacenados para el usuario: ${username}`, 'AuthService');

        return { access_token: accessToken, refresh_token: refreshToken };
    }

    /**
     * Renueva el access token utilizando un refresh token válido.
     * @param username Nombre de usuario.
     * @param refreshToken Token de refresco.
     * @returns Un nuevo access token.
     */
    async refreshToken(username: string, refreshToken: string): Promise<{ access_token: string }> {
        const isValid = await this.tokenService.validateRefreshToken(username, refreshToken);
        if (!isValid) {
            await this.logAndThrow('warn', `Refresh token inválido o expirado para el usuario: ${username}`, 'AuthService');
        }

        const newAccessToken = await this.tokenService.generateAccessToken(username);
        await this.logService.log('info', `Nuevo access token generado para el usuario: ${username}`, 'AuthService');
        return { access_token: newAccessToken };
    }

    /**
     * Cierra sesión del usuario y elimina el refresh token de la base de datos.
     * @param username Nombre del usuario.
     * @returns Mensaje indicando que se ha cerrado sesión.
     */
    async logout(username: string): Promise<string> {
        const result = await this.tokenService.deleteRefreshToken(username);
        if (result) {
            await this.logService.log('info', `Refresh token eliminado correctamente para el usuario: ${username}`, 'AuthService');
            return `Sesión cerrada exitosamente para el usuario: ${username}`;
        } else {
            await this.logAndThrow('warn', `No se encontró un refresh token para el usuario: ${username}`, 'AuthService');
        }
    }
}
