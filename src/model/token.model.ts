import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import * as dotenv from 'dotenv';

dotenv.config();
export type TokenDocument = Token & Document;

@Schema({ collection: 'tokens' })
export class Token {
    @Prop({ required: true, unique: true })
    _id: string;

    @Prop({ required: true })
    refreshToken?: string;

    @Prop({
        required: true,
        expires: parseInt(process.env.TOKEN_EXPIRATION_DB, 10), 
        default: () => new Date()
    })
    expiresAt: Date;
}

export const TokenSchema = SchemaFactory.createForClass(Token);