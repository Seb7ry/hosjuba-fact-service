import { AdmUsrService } from "./admusr.service";
import { TokenService } from "./token.service";
import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { LogService } from "./log.service";
import { JwtService } from "@nestjs/jwt";

/**
 * Servicio de autenticación que maneja el inicio y cierre de sesión de los usuarios.
 * 
 * Este servicio proporciona funcionalidades para manejar el proceso de autenticación de los usuarios, 
 * como la verificación de credenciales y la generación de tokens de acceso y refresco. Además, mantiene 
 * un registro de los eventos relacionados con la autenticación en los logs.
 */
@Injectable()
export class AuthService {
    
    /**
     * Constructor del servicio `AuthService`.
     * 
     * @param tokenService - Servicio encargado de la generación y validación de tokens.
     * @param jwtService - Servicio que maneja la creación de los JWTs.
     * @param logService - Servicio encargado de registrar eventos en los logs.
     * @param admUsrService - Servicio que gestiona la información de los usuarios administrativos.
     */
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
            throw new HttpException('', HttpStatus.NOT_FOUND)
        }

        if (password !== user.password.trim()) {
            await this.logService.logAndThrow('warn', `Contraseña incorrecta para usuario: ${username}`, 'AuthService');
            throw new HttpException('', HttpStatus.UNAUTHORIZED)
        }
        
        const { access_token } = await this.tokenService.generateAccessToken(username);
        const { refresh_token } = await this.tokenService.generateRefreshToken(username);
        await this.tokenService.saveUserGroup(username, user.AGrpId);
        await this.logService.log('info', `Usuario ${username} autenticado con éxito y asignado al grupo ${user.AGrpId}`, 'AuthService');

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
            return `Sesión cerrada exitosamente para el usuario: ${username}`;
        } else {
            await this.logService.logAndThrow('warn', `No se encontró un refresh token para el usuario: ${username}`, 'AuthService');
        }
    }
}
