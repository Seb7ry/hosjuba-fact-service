import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import * as dotenv from 'dotenv';

/**
 * Carga las variables de entorno desde el archivo .env
 */ 
dotenv.config();

/**
 * Define un tipo de documento de Mongoose basado en la clase Token
 */
export type TokenDocument = Token & Document;

/**
 * Esquema de la colección 'tokens' en MongoDB.
 * Esta colección almacena los refresh tokens y access tokens de los usuarios autenticados.
 */
@Schema({ collection: 'tokens' })
export class Token {

    @Prop({ required: true })
    _id: string;

    @Prop({ required: true })
    refreshToken?: string;

    @Prop({ required: true })
    accessToken?: string;

    @Prop({ required: true })
    expiresAtRefresh: Date;

    @Prop({ required: true })
    expiresAtAccess: Date;
}
export const TokenSchema = SchemaFactory.createForClass(Token);
TokenSchema.index({expiresAtRefresh: 1}, {expireAfterSeconds: 0});