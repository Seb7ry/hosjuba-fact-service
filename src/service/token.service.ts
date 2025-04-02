import { Token, TokenDocument } from "src/model/token.model"; 
import { AdmUsrService } from "./admusr.service";
import { InjectModel } from "@nestjs/mongoose";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { LogService } from "./log.service";
import { JwtService } from "@nestjs/jwt";
import { Model } from "mongoose";

/**
 * TokenService maneja la generación, validación, almacenamiento y eliminación de tokens de acceso
 * y refresh tokens en la base de datos MongoDB.
 * 
 * Principales funcionalidades:
 * - Generación de `access` y `refresh` tokens.
 * - Validación de `refresh` tokens para generar nuevos `access` tokens.
 * - Almacenamiento seguro de tokens en la base de datos utilizando encriptación.
 * - Eliminación de tokens y manejo de sesiones de usuario.
 */
@Injectable()
export class TokenService {
    
    /**
     * Constructor del servicio `TokenService`.
     * Este servicio se encarga de la generación, almacenamiento y validación de tokens.
     * Se inyectan los servicios necesarios como el servicio de administración de usuarios, 
     * el servicio de JWT, el servicio de logs y el modelo de tokens.
     */
    constructor(
        @InjectModel(Token.name) private tokenModel: Model<TokenDocument>,  
        private readonly jwtService: JwtService,
        private readonly logService: LogService,
        private readonly admUsrService: AdmUsrService
    ) { }

    /**
     * Genera el payload para el token con la información del usuario y el tipo de token (acceso o refresco).
     * @param user - El usuario para el cual se generará el token.
     * @param type - El tipo de token ('access' o 'refresh').
     * @returns El payload generado para el token.
     */
    private generatePayload(user: any, type: string) {
        return { 
            sub: user.AUsrId, 
            username: user.username, 
            group: user.grupoId,
            type 
        };
    }    

    /**
    * Busca todos los tokens almacenados en la base de datos para todos los usuarios.
    * @returns Un array de tokens de todos los usuarios almacenados en la base de datos.
    */
    async findAllTokens(): Promise<Token[] | null> {
        try {
            const tokens = await this.tokenModel.find().exec();

            if(tokens.length === 0){
                await this.logService.logAndThrow('warn', `No se encontraron tokens en la base de datos.`, 'TokenService');
            }

            return tokens;
        } catch (error) {
            await this.logService.logAndThrow('error', `Error al obtener los tokens: ${error.message}`, 'TokenService');
            throw new InternalServerErrorException('No se pudo obtener la lista de tokens.');
        }
    }

    /**
     * Busca un token en la base de datos MongoDB por su ID de usuario.
     * @param _id - El ID del usuario para el que se busca el token.
     * @returns El documento del token si se encuentra, o `null` si no se encuentra.
     */
    async findTokenByName(username: string): Promise<Token | null> {
        const token = await this.tokenModel.findOne({ username: username.trim() }).exec(); 
    
        if (!token) {
            await this.logService.logAndThrow('warn', `No se encontró un token para el usuario: ${username}`, 'TokenService');
        }
        return token;
    }    

    /**
     * Genera un token con fecha de expiración a partir del payload y la duración del token.
     * @param payload - El payload que se firmará en el token.
     * @param expiration - El tiempo de expiración del token (por ejemplo, '1h' o '30m').
     * @returns El token generado y su fecha de expiración.
     */
    private generateTimeToken(payload: any, expiration: string) {
        const now = Date.now();
        const [value, unit] = expiration.split(/(\d+)/).filter(Boolean);

        let timeToAdd: number;
        if (unit === 'm') {
            timeToAdd = parseInt(value) * 60000;
        } else if (unit === 'h') {
            timeToAdd = parseInt(value) * 3600000;
        } else {
            throw new Error('Unidad de tiempo no soportada en el token');
        }

        const tokenExpiresAt = new Date(now + timeToAdd);
        const token = this.jwtService.sign(payload, { expiresIn: expiration });

        return { token, tokenExpiresAt };
    }

    /**
     * Genera un access token para el usuario.
     * @param username - El nombre de usuario para el que se generará el token.
     * @returns El access token y su fecha de expiración.
     */
    async generateAccessToken(username: string): Promise<{ access_token: string; access_token_expires_at: Date }> {
        const user = await this.admUsrService.findByUser(username);
        if (!user) {
            await this.logService.logAndThrow('warn', `No se puede generar token de acceso, usuario no encontrado: ${username}`, 'TokenService');
        }
        const payload = this.generatePayload(user, 'access');
        const { token: accessToken, tokenExpiresAt } = this.generateTimeToken(payload, process.env.ACCESS_TOKEN_EXPIRATION);
        
        await this.saveAccessToken(username, accessToken, tokenExpiresAt);
        await this.saveUserGroup(username, user.grupoId);
        return { access_token: accessToken, access_token_expires_at: tokenExpiresAt };
    }

    /**
     * Genera un refresh token para el usuario.
     * @param username - El nombre de usuario para el que se generará el token.
     * @returns El refresh token y su fecha de expiración.
     */
    async generateRefreshToken(username: string): Promise<{ refresh_token: string; refresh_token_expires_at: Date }> {
        const user = await this.admUsrService.findByUser(username);
        if (!user) {
            await this.logService.logAndThrow('warn', `No se puede generar token de refresco, usuario no encontrado: ${username}`, 'TokenService');
        }
    
        const payload = this.generatePayload(user, 'refresh');
        const { token: refreshToken, tokenExpiresAt: refreshTokenExpiresAt } = this.generateTimeToken(payload, process.env.REFRESH_TOKEN_EXPIRATION);
    
        await this.saveRefreshToken(username, refreshToken, refreshTokenExpiresAt);
        await this.saveUserGroup(username, user.grupoId);
        return { refresh_token: refreshToken, refresh_token_expires_at: refreshTokenExpiresAt };
    }

    /**
     * Guarda el refresh token de un usuario en la base de datos.
     * @param username - El nombre de usuario para el que se guarda el refresh token.
     * @param refreshToken - El refresh token generado.
     * @param expiresAtRefresh - La fecha de expiración del refresh token.
     */
    async saveRefreshToken(username: string, refreshToken: string, expiresAtRefresh: Date): Promise<void> {
        await this.tokenModel.updateOne(
            { username: username.trim() }, 
            { refreshToken: refreshToken, expiresAtRefresh: expiresAtRefresh },
            { upsert: true }
        );
    }

    /**
     * Guarda el access token de un usuario en la base de datos.
     * @param username - El nombre de usuario para el que se guarda el access token.
     * @param accessToken - El access token generado.
     * @param expiresAtAccess - La fecha de expiración del access token.
     */
    async saveAccessToken(username: string, accessToken: string, expiresAtAccess: Date): Promise<void> {
        await this.tokenModel.updateOne(
            { username: username.trim() }, 
            { accessToken: accessToken, expiresAtAccess: expiresAtAccess },
            { upsert: true }
        );
    }

    /**
     * Guarda el `groupId` de un usuario en la base de datos.
     * 
     * @param username - El nombre de usuario para el cual se actualizará el `groupId`.
     * @param groupId - El ID del grupo al que pertenece el usuario.
     */
    async saveUserGroup(username: string, groupId: string): Promise<void> {
        if (!groupId) {
            return;
        }
    
        await this.tokenModel.updateOne(
            { username: username.trim() }, 
            { group: groupId }, 
            { upsert: true }           
        );
    
    }

    /**
     * Valida el refresh token de un usuario.
     * @param username - El nombre de usuario del que se valida el refresh token.
     * @param refreshToken - El refresh token a validar.
     * @returns `true` si el refresh token es válido, `false` si no lo es.
     */
    async validateRefreshToken(username: string, refreshToken: string): Promise<boolean> {
        const tokenRecord = await this.tokenModel.findOne({username: username.trim()}).exec();
        if (!tokenRecord || !tokenRecord.refreshToken) {
            await this.logService.log('warn', `No se encontró refresh token para usuario: ${username}`, 'TokenService');
            return false;
        }

        const isValid = refreshToken == tokenRecord.refreshToken;
        if (!isValid) {
            await this.logService.log('warn', `Refresh token inválido para usuario: ${username}`, 'TokenService');
            return false;
        }
        
        const now = new Date();
        if (tokenRecord.expiresAtRefresh <= now) {
            await this.logService.log('warn', `Refresh token expirado para usuario: ${username}`, 'TokenService');
            return false;
        }
        return true;
    }

    /**
     * Valida el access token de un usuario.
     * @param username - El nombre de usuario del que se valida el access token.
     * @param accessToken - El access token a validar.
     * @returns `true` si el access token es válido, `false` si no lo es.
     */
    async validateAccessToken(username: string, accessToken: string): Promise<boolean> {
        const tokenRecord = await this.tokenModel.findOne({username: username.trim() }).exec();
        if (!tokenRecord || !tokenRecord.accessToken) {
            await this.logService.log('warn', `No se encontró access token para usuario: ${username}`, 'TokenService');
            return false;
        }

        const isValid = accessToken === tokenRecord.accessToken;
        if (!isValid) {
            await this.logService.log('warn', `Access token inválido para usuario: ${username}`, 'TokenService');
            return false;
        }
        
        const now = new Date();
        if (tokenRecord.expiresAtAccess <= now) {
            await this.logService.log('warn', `Access token expirado para usuario: ${username}`, 'TokenService');
            return false;
        }
        return true;
    }

    /**
     * Elimina el token de un usuario.
     * @param username - El nombre de usuario cuyo token se eliminará.
     * @returns `true` si se eliminó exitosamente, `false` si no se pudo eliminar.
     */
    async deleteToken(username: string): Promise<boolean> {
        if (typeof username !== 'string' || username.trim() === '') {
            await this.logService.log('warn', `El username proporcionado no es válido: ${username}`, 'TokenService');
            return false;
        }

        const token = await this.findTokenByName(username);
        if (!token) {
            await this.logService.log('warn', `No se encontró el token para el usuario: ${username}`, 'TokenService');
            return false;
        }
        const result = await this.tokenModel.deleteOne({ username: username.trim() });
    
        if (result.deletedCount > 0) {
            return true;
        }
    
        await this.logService.log('warn', `No se pudo eliminar el token para el usuario: ${username}`, 'TokenService');
        return false;
    }
    
    
    /**
     * Refresca el access token de un usuario utilizando su refresh token.
     * @param username - El nombre de usuario para el que se generará un nuevo access token.
     * @param refreshToken - El refresh token utilizado para generar el nuevo access token.
     * @returns El nuevo access token.
     */
    async refreshAccessToken(username: string, refreshToken: string): Promise<{ access_token: string }> {
        const isValid = await this.validateRefreshToken(username, refreshToken);
        if (!isValid) {
            await this.logService.logAndThrow('warn', `Refresh token inválido o expirado para el usuario: ${username}`, 'TokenService');
        }

        const { access_token } = await this.generateAccessToken(username);
        await this.saveAccessToken(username, access_token, new Date(Date.now() + parseInt(process.env.ACCESS_TOKEN_EXPIRATION) * 60000));
        return { access_token };
    }
}