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
 * Esta colección almacena los refresh tokens de los usuarios autenticados.
 */
@Schema({ collection: 'tokens' })
export class Token {

    /**
     * Identificador único del token, en este caso, se usa el username del usuario.
     * Este campo es obligatorio y debe ser único.
     */
    @Prop({ required: true, unique: true })
    _id: string;

    /**
     * Refresh token encriptado del usuario.
     * Se almacena para validar futuras solicitudes de renovación del access token.
     */
    @Prop({ required: true })
    refreshToken?: string;

    /**
     * Campo que determina la fecha de expiración del documento en la base de datos.
     * - `required: true` -> Es un campo obligatorio.
     * - `expires` -> Define el tiempo de vida del documento en la base de datos en segundos.
     *   Este valor se toma desde la variable de entorno `TOKEN_EXPIRATION_DB` definida en `.env`.
     * - `default` -> Se asigna automáticamente la fecha de creación del documento.
     *   MongoDB usará esta fecha junto con `expires` para eliminar el documento cuando expire.
     */
    @Prop({
        required: true,
        expires: parseInt(process.env.TOKEN_EXPIRATION_DB, 10), 
        default: () => new Date()
    })
    expiresAt: Date;
}

/** 
 * Crea el esquema de Mongoose basado en la clase Token
 * */ 
export const TokenSchema = SchemaFactory.createForClass(Token);