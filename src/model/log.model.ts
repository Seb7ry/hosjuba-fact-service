import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type LogDocument = Log & Document;

/**
 * Esquema para almacenar logs de la aplicación en MongoDB.
 */
@Schema({ collection: 'logs', timestamps: true }) // `timestamps` añade `createdAt` automáticamente
export class Log {
    @Prop({ required: true })
    level: 'info' | 'warn' | 'error' | 'debug';

    @Prop({ required: true })
    message: string;

    @Prop()
    context?: string; // Contexto del log (ej. "AuthService")

    @Prop({ default: new Date() })
    timestamp?: Date;
}

export const LogSchema = SchemaFactory.createForClass(Log);
