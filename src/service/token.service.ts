import { Token, TokenDocument } from "src/model/token.model"; 
import { AdmUsrService } from "./admusr.service";
import { InjectModel } from "@nestjs/mongoose";
import { Injectable } from "@nestjs/common";
import { LogService } from "./log.service";
import { JwtService } from "@nestjs/jwt";
import { Model } from "mongoose";
import * as bcrypt from 'bcrypt';

@Injectable()
export class TokenService {
    constructor(
        @InjectModel(Token.name) private tokenModel: Model<TokenDocument>,  
        private readonly jwtService: JwtService,
        private readonly logService: LogService,
        private readonly admUsrService: AdmUsrService
    ) {}

    private generatePayload(user: any, type: string) {
        return { sub: user.AUsrId, username: user.AUsrId, type }; 
    }

    async findTokenByName(_id: string): Promise<Token | null> {
        const token = await this.tokenModel.findOne({ _id: _id.trim() }).exec(); 
    
        if (!token) {
            await this.logService.log('warn', `❌ No se encontró un token para el usuario: ${_id}`, 'TokenService');
        }
        return token;
    }    

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

    async generateAccessToken(username: string): Promise<{ access_token: string; access_token_expires_at: Date }> {
        const user = await this.admUsrService.findByUser(username);
        if (!user) {
            await this.logService.logAndThrow('warn', `Usuario no encontrado: ${username}`, 'TokenService');
        }
        const payload = this.generatePayload(user, 'access');
        const { token: accessToken, tokenExpiresAt } = this.generateTimeToken(payload, process.env.ACCESS_TOKEN_EXPIRATION);
        
        await this.saveAccessToken(username, accessToken, tokenExpiresAt);
        return { access_token: accessToken, access_token_expires_at: tokenExpiresAt };
    }

    async generateRefreshToken(username: string): Promise<{ refresh_token: string; refresh_token_expires_at: Date }> {
        const user = await this.admUsrService.findByUser(username);
        if (!user) {
            await this.logService.logAndThrow('warn', `Usuario no encontrado: ${username}`, 'TokenService');
        }
    
        const payload = this.generatePayload(user, 'refresh');
        const { token: refreshToken, tokenExpiresAt: refreshTokenExpiresAt } = this.generateTimeToken(payload, process.env.REFRESH_TOKEN_EXPIRATION);
    
        await this.saveRefreshToken(username, refreshToken, refreshTokenExpiresAt);
        return { refresh_token: refreshToken, refresh_token_expires_at: refreshTokenExpiresAt };
    }

    async saveRefreshToken(username: string, refreshToken: string, expiresAtRefresh: Date): Promise<void> {
        const hashedToken = await bcrypt.hash(refreshToken, 10);
        await this.tokenModel.updateOne(
            { _id: username.trim() }, 
            { refreshToken: hashedToken, expiresAtRefresh: expiresAtRefresh },
            { upsert: true }
        );
    }

    async saveAccessToken(username: string, accessToken: string, expiresAtAccess: Date): Promise<void> {
        const hashedToken = await bcrypt.hash(accessToken, 10);
        await this.tokenModel.updateOne(
            { _id: username.trim() }, 
            { accessToken: hashedToken, expiresAtAccess: expiresAtAccess },
            { upsert: true }
        );
    }

    async validateRefreshToken(username: string, refreshToken: string): Promise<boolean> {
        const tokenRecord = await this.tokenModel.findById(username).exec();
        if (!tokenRecord || !tokenRecord.refreshToken) {
            await this.logService.log('warn', `No se encontró refresh token para usuario: ${username}`, 'TokenService');
            return false;
        }

        const isValid = await bcrypt.compare(refreshToken, tokenRecord.refreshToken);
        if (!isValid) {
            await this.logService.log('warn', `❌ Refresh token inválido para usuario: ${username}`, 'TokenService');
            return false;
        }
        
        const now = new Date();
        if (tokenRecord.expiresAtRefresh <= now) {
            await this.logService.log('warn', `❌ Refresh token expirado para usuario: ${username}`, 'TokenService');
            return false;
        }

        await this.logService.log('info', `✅ Refresh token válido para usuario: ${username}`, 'TokenService');
        return true;
    }

    async deleteToken(username: string): Promise<boolean> {
        // Verificamos que el username sea un string válido y sin espacios
        if (typeof username !== 'string' || username.trim() === '') {
            await this.logService.log('warn', `❌ El username proporcionado no es válido: ${username}`, 'TokenService');
            return false;
        }
    
        // Realizamos la búsqueda antes de intentar eliminar
        const token = await this.findTokenByName(username);
        if (!token) {
            await this.logService.log('warn', `❌ No se encontró el token para el usuario: ${username}`, 'TokenService');
            return false;
        }
    
        // Procedemos con la eliminación
        const result = await this.tokenModel.deleteOne({ _id: username.trim() });
        if (result.deletedCount > 0) {
            await this.logService.log('info', `✅ Token eliminado exitosamente para el usuario: ${username}`, 'TokenService');
            return true;
        }
    
        await this.logService.log('warn', `❌ No se pudo eliminar el token para el usuario: ${username}`, 'TokenService');
        return false;
    }
    
    async refreshAccessToken(username: string, refreshToken: string): Promise<{ access_token: string }> {
        const isValid = await this.validateRefreshToken(username, refreshToken);
        if (!isValid) {
            await this.logService.logAndThrow('warn', `Refresh token inválido o expirado para el usuario: ${username}`, 'TokenService');
        }

        const { access_token } = await this.generateAccessToken(username);
        await this.saveAccessToken(username, access_token, new Date(Date.now() + parseInt(process.env.ACCESS_TOKEN_EXPIRATION) * 60000));
        await this.logService.log('info', `Nuevo access token generado para el usuario: ${username}`, 'TokenService');
        return { access_token };
    }
}