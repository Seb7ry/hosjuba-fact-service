import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from 'bcrypt';
import { Token, TokenDocument } from "src/model/token.model";
import { Injectable, Logger } from "@nestjs/common";
import * as dotenv from 'dotenv';
import { Interval } from "@nestjs/schedule";
import * as crypto from 'crypto';


dotenv.config();

@Injectable()
export class TokenService {
    private readonly logger = new Logger(TokenService.name);

    constructor(@InjectModel(Token.name) private tokenModel: Model<TokenDocument>) {}

    async findUserByName(username: string): Promise<Token | null> {
        return this.tokenModel.findOne({ _id: username }).exec();
    }

    async updateRefreshToken(username: string, refreshToken: string): Promise<void> {
        const hashedToken = await bcrypt.hash(refreshToken, 10);
        await this.tokenModel.updateOne(
            { _id: username }, 
            { refreshToken: hashedToken, expiresAt: new Date() },
            { upsert: true },
        );

        this.logger.log(`✅ Token guardado para usuario: ${username}`);
    }

    async validateRefreshToken(username: string, refreshToken: string): Promise<boolean> {
        const tokenRecord = await this.tokenModel.findById(username).exec();
        if (!tokenRecord || !tokenRecord.refreshToken) return false;

        return bcrypt.compare(refreshToken, tokenRecord.refreshToken);
    }

    async cleanupExpiredTokens(): Promise<void> {
        const deleted = await this.tokenModel.deleteMany({
            expiresAt: { $lte: new Date() }
        }).exec();

        if (deleted.deletedCount > 0) {
            this.logger.log(`🗑️ Eliminados ${deleted.deletedCount} tokens expirados.`);
        }
    }

    @Interval(parseInt(process.env.REFRESH_CLEANUP_INTERVAL, 10) * 1000)
    async handleCleanup() {
        this.logger.log("⏳ Ejecutando limpieza de tokens expirados...");
        await this.cleanupExpiredTokens();
    }
}