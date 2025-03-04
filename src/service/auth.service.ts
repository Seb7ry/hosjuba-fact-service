import { AdmUsrService } from "./admusr.service";
import { TokenService } from "./token.service";
import { Injectable } from "@nestjs/common";
import { LogService } from "./log.service";
import { JwtService } from "@nestjs/jwt";

/**
 * Servicio de autenticación que maneja el inicio y cierre de sesión de los usuarios.
 * 
 * - Verifica las credenciales del usuario.
 * - Genera tokens de acceso y de refresco.
 * - Realiza el registro de los eventos relevantes en los logs.
 */
@Injectable()
export class AuthService {
    constructor(
        private readonly tokenService: TokenService,
        private readonly jwtService: JwtService,
        private readonly logService: LogService,
        private readonly admUsrService: AdmUsrService
    ) {}

    /**
     * Método para iniciar sesión en el sistema.
     * 
     * Este método verifica las credenciales del usuario, genera los tokens de acceso
     * y de refresco si las credenciales son correctas y retorna dichos tokens.
     * 
     * @param username - Nombre de usuario que el usuario proporciona para iniciar sesión.
     * @param password - Contraseña que el usuario proporciona para iniciar sesión.
     * 
     * @returns { access_token: string; refresh_token: string } - Tokens de acceso y refresco generados.
     * 
     * @throws {InternalServerErrorException} - Si el usuario no existe o la contraseña es incorrecta.
     */
    async login(username: string, password: string): Promise<{ access_token: string; refresh_token: string }> {
        const user = await this.admUsrService.findByUser(username);
        if (!user) {
            await this.logService.logAndThrow('warn', `Usuario no encontrado: ${username}`, 'AuthService');
        }

        if (password !== user.password.trim()) {
            await this.logService.logAndThrow('warn', `Contraseña incorrecta para usuario: ${username}`, 'AuthService');
        }

        const { access_token, access_token_expires_at } = await this.tokenService.generateAccessToken(username);
        const { refresh_token, refresh_token_expires_at } = await this.tokenService.generateRefreshToken(username);

        await this.logService.log('info', `Tokens generados y almacenados para el usuario: ${username}`, 'AuthService');
        
        return { access_token, refresh_token };
    }

    /**
     * Método para cerrar la sesión de un usuario.
     * 
     * Este método elimina el refresh token asociado al usuario, lo que invalida la sesión activa.
     * 
     * @param username - Nombre de usuario para el cual se desea cerrar la sesión.
     * 
     * @returns {string} - Mensaje confirmando que la sesión fue cerrada correctamente.
     * 
     * @throws {InternalServerErrorException} - Si no se encuentra un refresh token para el usuario.
     */
    async logout(username: string): Promise<string> {
        const result = await this.tokenService.deleteToken(username);
        if (result) {
            await this.logService.log('info', `Refresh token eliminado correctamente para el usuario: ${username}`, 'AuthService');
            return `Sesión cerrada exitosamente para el usuario: ${username}`;
        } else {
            await this.logService.logAndThrow('warn', `No se encontró un refresh token para el usuario: ${username}`, 'AuthService');
        }
    }
}
