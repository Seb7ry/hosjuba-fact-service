import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

/**
 * Tipo de documento para un registro de Log técnico.
 * 
 * Este tipo extiende de la clase Log, representando los registros técnicos
 * almacenados en la colección 'logsTec' en la base de datos MongoDB.
 * 
 * @extends Log
 */
export type LogDocument = Log & Document;

/**
* Modelo de la Entidad Log* * Este modelo representa un registro de log técnico almacenado en la colección
* 'logsTec'. Cada log incluye información sobre el nivel del log, el
* mensaje, el contexto y las fechas de creación y expiración.
* 
* El decorador @Schema() define la colección como 'logsTec' y habilita
* la opción `timestamps` para crear automáticamente los campos `createdAt`
* y `updatedAt`.
*/
@Schema({ collection: 'logs', timestamps: true }) 
export class Log {

    /**
     * Nivel de gravedad del log.
     * 
     * Este campo representa el nivel del registro de log y puede ser uno de
     * los siguientes valores: 'info', 'warn', 'error' o 'debug'.
     * 
     * @type {'info' | 'warn' | 'error' | 'debug'}
     */
    @Prop({ required: true })
    level: 'info' | 'warn' | 'error' | 'debug';

    /**
     * Mensaje del log.
     * 
     * Este campo almacena el mensaje principal del registro de log. Es
     * obligatorio y describe la acción o evento que ha sido registrado.
     * 
     * @type {string}
     */
    @Prop({ required: true })
    message: string;

    /**
     * Contexto adicional del log.
     * 
     * Este campo es opcional y almacena el contexto en el que se genera el
     * log (por ejemplo, el nombre del servicio o componente donde ocurrió
     * el evento). Si no se proporciona, se puede omitir.
     * 
     * @type {string}
     */
    @Prop()
    context?: string; 

    /**
     * Fecha y hora de la creación del log.
     * 
     * Este campo es opcional y almacena la fecha y hora en que el log fue
     * creado. Si no se proporciona, el valor por defecto es la fecha y hora
     * actual en el momento de la creación del registro.
     * 
     * @type {Date}
     */
    @Prop({ default: new Date() })
    timestamp?: Date;

    /**
     * Fecha de expiración del log.
     * 
     * Este campo es opcional y almacena la fecha de expiración del log. 
     * Si no se proporciona, el valor por defecto será la fecha y hora actual.
     * Este campo es utilizado por MongoDB para eliminar automáticamente los
     * registros después de un tiempo determinado.
     * 
     * @type {Date}
     */
    @Prop({ default: new Date() })
    expiresAtLogT?: Date;
}

/**
 * Esquema de Mongoose para la entidad 'Log'.
 * 
 * Este esquema se crea a partir de la clase Log utilizando la función
 * SchemaFactory de Mongoose. El esquema está configurado para tener un
 * índice en el campo `expiresAtLogT` que eliminará automáticamente los
 * registros de log cuando haya expirado.
 */
export const LogSchema = SchemaFactory.createForClass(Log);
LogSchema.index({expiresAtLogT: 1}, {expireAfterSeconds: 0});
