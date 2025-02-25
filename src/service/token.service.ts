import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import * as bcrypt from 'bcrypt';
import { Token, TokenDocument } from "src/model/token.model";
import { Injectable } from "@nestjs/common";

@Injectable()
export class TokenService {
    constructor(@InjectModel(Token.name) private tokenModel: Model<TokenDocument>){ }

    async findUserByName(username: string): Promise<Token | null>{
        return this.tokenModel.findOne({username}).exec();
    }

    async updateRefreshToken(username: string, refreshToken: string): Promise<void>{
        const hashedToken = await bcrypt.hash(refreshToken, 10);
        await this.tokenModel.updateOne(
            {_id: username}, 
            {refreshToken: hashedToken},
            {upsert: true},
        );

        console.log("✅ Token guardado en MongoDB correctamente.");
    }

    async validateRefreshToken(username: string, refreshToken: string): Promise<boolean> {
        const tokenRecord = await this.tokenModel.findById(username).exec();
        if (!tokenRecord || !tokenRecord.refreshToken) return false;

        return bcrypt.compare(refreshToken, tokenRecord.refreshToken);
    }
}