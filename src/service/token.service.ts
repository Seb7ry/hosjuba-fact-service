import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Token, TokenDocument } from "src/model/token.model";  // Asegúrate de importar el Token y TokenDocument
import * as bcrypt from 'bcrypt';
import { LogService } from "./log.service";
import * as moment from 'moment';

@Injectable()
export class TokenService {
    constructor(
        @InjectModel(Token.name) private tokenModel: Model<TokenDocument>,  // Aquí se inyecta el modelo Token
        private readonly jwtService: JwtService,
        private readonly logService: LogService,
    ) {}

    /**
     * Genera los tokens (Access y Refresh) para el usuario.
     * @param username Nombre del usuario.
     * @returns Un objeto con `accessToken` y `refreshToken`.
     */
    async generateTokens(username: string): Promise<{ accessToken: string; refreshToken: string }> {
        const payload = { sub: username, username };

        // Generar Access Token
        const accessToken = this.jwtService.sign(payload, { expiresIn: process.env.ACCESS_TOKEN_EXPIRATION });

        // Generar Refresh Token
        const refreshToken = this.jwtService.sign(payload, { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION });

        // Almacenar el refresh token en la base de datos
        await this.updateRefreshToken(username, refreshToken);

        return { accessToken, refreshToken };
    }

    /**
     * Genera un Access Token para un usuario.
     * @param username Nombre del usuario.
     * @returns El nuevo access token.
     */
    async generateAccessToken(username: string): Promise<string> {
        const payload = { sub: username, username };
        return this.jwtService.sign(payload, { expiresIn: process.env.ACCESS_TOKEN_EXPIRATION });
    }

    /**
     * Valida un refresh token.
     * @param username Nombre del usuario.
     * @param refreshToken Token de refresco.
     * @returns `true` si el token es válido, de lo contrario `false`.
     */
    async validateRefreshToken(username: string, refreshToken: string): Promise<boolean> {
        // Lógica de validación de refresh token en la base de datos
        const tokenRecord = await this.tokenModel.findById(username).exec();  // Usando el modelo inyectado para la consulta

        if (!tokenRecord || !tokenRecord.refreshToken) {
            await this.logService.log('warn', `⚠️ No se encontró refresh token para usuario: ${username}`, 'TokenService');
            return false;
        }

        const isValid = await bcrypt.compare(refreshToken, tokenRecord.refreshToken);
        
        if (!isValid) {
            await this.logService.log('warn', `❌ Refresh token inválido para usuario: ${username}`, 'TokenService');
            return false;
        }
        
        const now = new Date();
        if (tokenRecord.expiresAt <= now) {
            await this.logService.log('warn', `❌ Refresh token expirado para usuario: ${username}`, 'TokenService');
            return false;
        }
    
        await this.logService.log('info', `✅ Refresh token válido para usuario: ${username}`, 'TokenService');
        return true;
    }

    /**
     * Almacena o actualiza el refresh token en la base de datos.
     * @param username Nombre del usuario.
     * @param refreshToken Token de refresco.
     */
    async updateRefreshToken(username: string, refreshToken: string): Promise<void> {
        // Lógica para almacenar o actualizar el refresh token en la base de datos
        // Ejemplo: hashing y almacenamiento en MongoDB
        const hashedToken = await bcrypt.hash(refreshToken, 10);
        const expiresAt = new Date(Date.now() + parseInt(process.env.REFRESH_TOKEN_EXPIRATION) * 1000);

        await this.tokenModel.updateOne(
            { _id: username }, 
            { refreshToken: hashedToken, expiresAt: expiresAt },
            { upsert: true } 
        );
    }

    /**
     * Elimina el refresh token de la base de datos.
     * @param username Nombre del usuario.
     * @returns `true` si el token fue eliminado correctamente.
     */
    async deleteRefreshToken(username: string): Promise<boolean> {
        const result = await this.tokenModel.deleteOne({ _id: username });
        return result.deletedCount > 0;
    }
}
