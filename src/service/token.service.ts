import { Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Token, TokenDocument } from "src/model/token.model"; 
import * as bcrypt from 'bcrypt';
import { LogService } from "./log.service";
import { AdmUsrService } from "./admusr.service";

@Injectable()
export class TokenService {
    constructor(
        @InjectModel(Token.name) private tokenModel: Model<TokenDocument>,  
        private readonly jwtService: JwtService,
        private readonly logService: LogService,
        private readonly admUsrService: AdmUsrService
    ) {}

    private generatePayload(user: any, type: string) {
        return { sub: user.AUsrId, username: user.AUsrId, type }; // Agrega el 'type' aquí
    }

    async findTokenByName(username: string): Promise<Token | null> {
        await this.logService.log('info', `🔍 Buscando token para usuario: ${username}`, 'TokenService');
        return this.tokenModel.findOne({ _id: username }).exec();
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

    async saveRefreshToken(username: string, refreshToken: string, expiresAt: Date): Promise<void> {
        const hashedToken = await bcrypt.hash(refreshToken, 10);
        await this.tokenModel.updateOne(
            { _id: username }, 
            { refreshToken: hashedToken, expiresAt: expiresAt },
            { upsert: true }
        );
    }

    async saveAccessToken(username: string, accessToken: string, accessTokenExpiresAt: Date): Promise<void> {
        await this.tokenModel.updateOne(
            { _id: username }, 
            { accessToken: accessToken, accessTokenExpiresAt: accessTokenExpiresAt },
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

    async deleteRefreshToken(username: string): Promise<boolean> {
        const result = await this.tokenModel.deleteOne({ _id: username });
        return result.deletedCount > 0;
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