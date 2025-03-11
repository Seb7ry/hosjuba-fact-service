import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

/**
 * Tipo de documento para un registro de historial de acciones en MongoDB.
 * 
 * Este tipo extiende la clase `HistoryUsr` y permite interactuar con los
 * registros de actividades de los usuarios almacenados en la colección 'historyusr'.
 * 
 * @extends HistoryUsr
 */
export type HistoryUsrDocument = HistoryUsr & Document;

/**
 * Modelo de la colección 'historyusr' en MongoDB.
 * 
 * Este modelo representa el historial de acciones de los usuarios dentro del sistema.
 * Se almacena información sobre qué acción realizó cada usuario, cuándo la hizo y
 * detalles adicionales sobre la acción.
 */
@Schema({ collection: 'historyusr', timestamps: true })
export class HistoryUsr {

    /**
     * Identificador único del usuario que realizó la acción.
     * 
     * Este campo almacena el ID del usuario asociado a la acción realizada.
     * 
     * @type {string}
     */
    @Prop({ required: true })
    userId: string;

    /**
     * Descripción de la acción realizada por el usuario.
     * 
     * Este campo almacena una breve descripción de la acción (ej. "Actualizó su perfil", "Eliminó un usuario").
     * 
     * @type {string}
     */
    @Prop({ required: true })
    action: string;

    /**
     * Fecha y hora en que ocurrió la acción.
     * 
     * Este campo almacena el timestamp de cuándo el usuario realizó la acción.
     * Se genera automáticamente gracias a la opción `timestamps: true` en el esquema.
     * 
     * @type {Date}
     */
    @Prop({ default: () => new Date() })
    timestamp: Date;

    /**
     * Detalles adicionales sobre la acción realizada.
     * 
     * Este campo almacena información extra sobre la acción, como el ID del recurso afectado,
     * el nombre de la entidad modificada, o cualquier otro detalle relevante.
     * 
     * @type {string}
     */
    @Prop({ required: false })
    details?: string;

    /**
     * Página o ruta del frontend donde se realizó la acción.
     * 
     * Este campo almacena la URL o ruta exacta dentro de la aplicación donde el usuario hizo la acción.
     * 
     * @type {string}
     */
    @Prop({ required: false })
    pageUrl?: string;
}

/**
 * Esquema de Mongoose para la entidad 'HistoryUsr'.
 * 
 * Este esquema se crea a partir de la clase `HistoryUsr` utilizando `SchemaFactory.createForClass()`.
 */
export const HistoryUsrSchema = SchemaFactory.createForClass(HistoryUsr);
