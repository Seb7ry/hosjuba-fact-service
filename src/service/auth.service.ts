import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Request } from 'mssql';

import { AdmUsrService } from "./admusr.service";
import { TokenService } from "./token.service";
import { LogService } from "./log.service";

/**
 * Servicio de autenticación que maneja el inicio y cierre de sesión de los usuarios.
 * 
 * Este servicio proporciona funcionalidades para manejar el proceso de autenticación de los usuarios, 
 * como la verificación de credenciales y la generación de tokens de acceso y refresco. Además, mantiene 
 * un registro de los eventos relacionados con la autenticación en los logs.
 */
@Injectable()
export class AuthService {
    
    /*{}
     * Constructor del servicio `AuthService`.
     * 
     * @param tokenService - Servicio encargado de la generación y validación de tokens.
     * @param jwtService - Servicio que maneja la creación de los JWTs.
     * @param logService - Servicio encargado de registrar eventos en los logs.
     * @param admUsrService - Servicio que gestiona la información de los usuarios administrativos.
     */
    constructor(
        private readonly tokenService: TokenService,
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
    async login(username: string, password: string): Promise<{ access_token: string; refresh_token: string; grupo: string }> {
        let user;

        try {
            user = await this.admUsrService.findByUser(username);
        } catch (error) {
            await this.logService.log('warn', `Usuario no encontrado: ${username}`, 'AuthService');
            throw new HttpException('Usuario no encontrado', HttpStatus.NOT_FOUND);
        }
    
        if (password !== user.password.trim()) {
            await this.logService.logAndThrow('warn', `Contraseña incorrecta para usuario: ${username}`, 'AuthService');
            throw new HttpException('Credenciales incorrectas', HttpStatus.UNAUTHORIZED);
        }
    
        const { access_token } = await this.tokenService.generateAccessToken(user.username);
        const { refresh_token } = await this.tokenService.generateRefreshToken(user.username);

        await this.logService.log('info', 'Inicio de sesión.', 'Login', undefined, username);
        await this.tokenService.saveUserGroup(user.username , user.grupoId);
        return { 
            access_token, 
            refresh_token, 
            grupo: user.grupoId || 'SIN_GRUPO' 
        };
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
    async logout(req: Request, username: string): Promise<string> {
        const result = await this.tokenService.deleteToken(username);
        if (result) {
            await this.logService.log('info', `Cierre de sesión.`, 'Login', undefined, req.user.username);
            return `Sesión cerrada exitosamente para el usuario: ${username}`;
        } else {
            await this.logService.logAndThrow('warn', `No se encontró un refresh token para el usuario: ${username}`, 'AuthService');
        }
    }
}
