import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

/**
 * Representa un documento de registro (log) en MongoDB.
 * Combina las propiedades de la clase Log con los métodos de Document de Mongoose.
 */
export type LogDocument = Log & Document;

/**
 * Esquema para registros de log del sistema
 * @Schema - Configuración automática de timestamps (createdAt, updatedAt)
 *           y colección personalizada 'logs'
 */
@Schema({ collection: 'logs', timestamps: true })
export class Log {
    /**
     * Nivel de severidad del log
     * @enum {'info'|'warn'|'error'|'debug'} - Niveles disponibles
     * @example 'error' - Para registrar fallos críticos
     */
    @Prop({ required: true })
    level: 'info' | 'warn' | 'error' | 'debug';

    /**
     * Mensaje descriptivo del evento
     * @example "Failed to connect to database"
     */
    @Prop({ required: true })
    message: string;

    /**
     * Contexto adicional del log (opcional)
     * @example "DatabaseModule"
     */
    @Prop()
    context?: string;

    /**
     * Fecha y hora del evento (auto-generado por defecto)
     * @default Date.now()
     */
    @Prop({ default: new Date() })
    timestamp?: Date;

    /**
     * Fecha de expiración para eliminación automática (TTL Index)
     * @default Date.now() - Requiere índice TTL configurado
     */
    @Prop({ default: new Date() })
    expiresAtLogT?: Date;

    /**
     * Identificador de usuario relacionado (opcional)
     * @example "user_12345"
     */
    @Prop()
    user?: string;
}

/**
 * SchemaFactory para la clase Log
 * Exportado para su uso en módulos de NestJS
 */
export const LogSchema = SchemaFactory.createForClass(Log);

// Configuración de índices
LogSchema.index({ expiresAtLogT: 1 }, { expireAfterSeconds: 0 });  // Índice TTL para eliminación automática
LogSchema.index({ timestamp: -1, level: 1, user: 1 });            // Índice compuesto para consultas frecuentes