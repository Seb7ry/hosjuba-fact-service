import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Log, LogDocument } from "src/model/log.model";

@Injectable()
export class LogService {
    private readonly logger = new Logger(LogService.name);

    constructor(@InjectModel(Log.name) private logModel: Model<LogDocument>) {}

    /**
     * Registra un log en la base de datos y en la consola.
     * @param level Nivel del log (`info`, `warn`, `error`).
     * @param message Mensaje del log.
     * @param context Contexto donde ocurre (ejemplo: "AuthService").
     */
    async log(level: 'info' | 'warn' | 'error', message: string, context?: string) {
        try {
            await this.logModel.create({ level, message, context, timestamp: new Date() });

            if (level === 'error') this.logger.error(message, context);
            else if (level === 'warn') this.logger.warn(message, context);
            else this.logger.log(message, context);
        } catch (error) {
            this.logger.error(`❌ No se pudo guardar el log en la base de datos: ${error.message}`);
        }
    }

    /**
     * Obtiene todos los logs de la base de datos.
     */
    async getAllLogs(){
        return await this.logModel.find();
    }

    /**
     * Obtiene logs por un rango de fechas.
     * @param start Fecha de inicio (en formato ISO).
     * @param end Fecha de fin (en formato ISO).
     * @param level Nivel de log (opcional).
     */
    async getLogsByDate(start: string, end: string, level?: string) {
        const query: any = {
            timestamp: {
                $gte: new Date(start),
                $lte: new Date(end), 
            },
        };

        if (level) {
            query.level = level;
        }

        return await this.logModel.find(query);
    }

    /**
     * Obtiene logs por un intervalo de horas.
     * @param startTime Hora de inicio (formato HH:mm:ss).
     * @param endTime Hora de fin (formato HH:mm:ss).
     * @param level Nivel de log (opcional).
     */
    async getLogsByInterval(startTime: string, endTime: string, level?: string) {
        const query: any = {
            timestamp: {
                $gte: new Date(`1970-01-01T${startTime}Z`), 
                $lte: new Date(`1970-01-01T${endTime}Z`), 
            },
        };

        if (level) {
            query.level = level;
        }

        return await this.logModel.find(query);
    }
}
