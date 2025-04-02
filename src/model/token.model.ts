import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

/**
 * Representa un documento de Token en MongoDB.
 * Combina las propiedades de la clase Token con los métodos de Document de Mongoose.
 */
export type TokenDocument = Token & Document;

/**
 * Modelo para gestión de tokens de autenticación
 * @Schema - Configuración específica para la colección 'tokens'
 */
@Schema({ collection: 'tokens' })
export class Token {
    /**
     * Identificador único del registro
     * @type {string} - Usualmente corresponde al ID del usuario
     */
    @Prop()
    _id: string;

    /**
     * Nombre de usuario asociado al token
     * @required - Siempre debe estar presente
     * @example "usuario123"
     */
    @Prop({ required: true })
    username: string;

    /**
     * Grupo o rol del usuario (para control de acceso)
     * @required - Necesario para autorización
     * @example "admin"
     */
    @Prop({ required: true })
    group: string;

    /**
     * Token de refresco (JWT)
     * @required - Necesario para renovación de credenciales
     * @security - Debe almacenarse cifrado
     */
    @Prop({ required: true })
    refreshToken?: string;

    /**
     * Token de acceso (JWT)
     * @required - Para autenticación en requests
     * @security - Almacenamiento temporal
     */
    @Prop({ required: true })
    accessToken?: string;

    /**
     * Fecha de expiración del refresh token
     * @required - Para control de validez
     * @type {Date}
     */
    @Prop({ required: true })
    expiresAtRefresh: Date;

    /**
     * Fecha de expiración del access token
     * @required - Para invalidación automática
     * @type {Date}
     */
    @Prop({ required: true })
    expiresAtAccess: Date;
}

/**
 * SchemaFactory para la entidad Token
 */
export const TokenSchema = SchemaFactory.createForClass(Token);

// Configuración de índices
TokenSchema.index({ username: 1 });  // Índice para búsquedas por usuario
TokenSchema.index({ expiresAtRefresh: 1 }, { expireAfterSeconds: 0 });  // TTL para limpieza automática