import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { AdmUsrService } from "./admusr.service";
import { JwtService } from "@nestjs/jwt";
import { TokenService } from "./token.service";
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Servicio de autenticación para manejar el inicio de sesión y la renovación de tokens.
 */
@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        private readonly admUsrService: AdmUsrService,
        private readonly tokenService: TokenService,
        private readonly jwtService: JwtService,
    ) {}

    /**
     * Inicia sesión de un usuario y genera tokens de acceso y refresco.
     * 
     * @param username Nombre de usuario ingresado.
     * @param password Contraseña ingresada.
     * @returns Un objeto con `access_token` y `refresh_token`.
     * @throws UnauthorizedException si las credenciales son inválidas.
     */
    async login(username: string, password: string): Promise<{ access_token: string; refresh_token: string }> {

        // Buscar usuario en la base de datos del hospital
        const user = await this.admUsrService.findByUser(username);
        if (!user) {
            this.logger.warn(`🔴 Usuario no encontrado: ${username}`);
            throw new UnauthorizedException(`Usuario no encontrado.`);
        }

        // Validar contraseña
        if (password.trim() !== user.AUsrPsw.toString().trim()) {
            this.logger.warn(`🔴 Contraseña incorrecta para usuario: ${username}`);
            throw new UnauthorizedException(`Contraseña incorrecta.`);
        }

        // Generar payload para los tokens
        const payload = { sub: user.AUsrId, username: user.AUsrId };

        // Generar Access Token y Refresh Token con los tiempos definidos en .env
        const accessToken = this.jwtService.sign(payload, { expiresIn: process.env.ACCESS_TOKEN_EXPIRATION });
        const refreshToken = this.jwtService.sign(
            { sub: user.AUsrId, type: 'refresh' },
            { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION }
        );

        // Guardar el Refresh Token en la base de datos
        await this.tokenService.updateRefreshToken(user.AUsrId.trim(), refreshToken);

        return { access_token: accessToken, refresh_token: refreshToken };
    }

    /**
     * Renueva el access token utilizando un refresh token válido.
     * 
     * @param username Nombre de usuario.
     * @param refreshToken Token de refresco proporcionado.
     * @returns Un nuevo access token.
     * @throws UnauthorizedException si el refresh token es inválido o ha expirado.
     */
    async refreshToken(username: string, refreshToken: string): Promise<{ access_token: string }> {

        // Validar que el Refresh Token sea válido y no haya expirado
        const isValid = await this.tokenService.validateRefreshToken(username, refreshToken);
        if (!isValid) {
            this.logger.warn(`🔴 Intento de refrescar token fallido para usuario: ${username}`);
            throw new UnauthorizedException('Refresh Token inválido');
        }

        // Buscar usuario en la base de datos del hospital
        const user = await this.admUsrService.findByUser(username);
        if (!user) {
            this.logger.warn(`🔴 Usuario no encontrado al intentar refrescar token: ${username}`);
            throw new UnauthorizedException('Usuario no encontrado.');
        }

        // Generar un nuevo Access Token
        const payload = { sub: user.AUsrId, username: user.AUsrId };
        const newAccessToken = this.jwtService.sign(payload, { expiresIn: process.env.ACCESS_TOKEN_EXPIRATION });

        return { access_token: newAccessToken };
    }
}