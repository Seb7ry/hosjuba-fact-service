import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

/**
 * Tipo de documento para un registro de Token en MongoDB.
 */
export type TokenDocument = Token & Document;

/**
 * Modelo de la colección 'tokens' en MongoDB.
 */
@Schema({ collection: 'tokens' })
export class Token {
    
    @Prop()
    _id: string;

    @Prop({ required: true })
    username: string;

    @Prop({ required: true })
    group: string;

    @Prop({ required: true })
    refreshToken?: string;

    @Prop({ required: true })
    accessToken?: string;

    @Prop({ required: true })
    expiresAtRefresh: Date;

    @Prop({ required: true })
    expiresAtAccess: Date;
}

/**
 * Esquema de Mongoose para la entidad 'Token'.
 */
export const TokenSchema = SchemaFactory.createForClass(Token);

// ✅ Índices en `username` y `_id` para mejorar búsquedas
TokenSchema.index({ username: 1 });

// ✅ Expiración automática de los tokens
TokenSchema.index({ expiresAtRefresh: 1 }, { expireAfterSeconds: 0 });
