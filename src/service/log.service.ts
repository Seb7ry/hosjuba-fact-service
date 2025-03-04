import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { Log, LogDocument } from "src/model/log.model";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class LogService {
    private readonly logger = new Logger(LogService.name);

    constructor(
        @InjectModel(Log.name) private logModel: Model<LogDocument>,
        private readonly configService: ConfigService) {}

    /**
     * Registra un log y lanza una excepción con el mensaje dado.
     * Este método registra el log en la base de datos y luego lanza una excepción `UnauthorizedException`.
     * 
     * @param level - Nivel del log (info, warn, error).
     * @param message - El mensaje del log.
     * @param context - El contexto donde se produjo el log.
     */
    async logAndThrow(level: 'info' | 'warn' | 'error', message: string, context: string) {
        await this.log(level, message, context); 
        throw new UnauthorizedException(message);
    }

    /**
     * Registra un log en la base de datos y lo imprime en consola según su nivel.
     * 
     * @param level - Nivel del log (info, warn, error).
     * @param message - El mensaje del log.
     * @param context - El contexto donde se produjo el log.
     * @param expiration - Tiempo de expiración del log.
     */
    async log(level: 'info' | 'warn' | 'error', message: string, context: string, expiration?: string) {
        try {
            const expirationTime = this.configService.get<string>('LOG_EXPIRATION');
            const expiresAtLogT = expirationTime ? this.calculateExpiration(expirationTime) : undefined;

            await this.logModel.create({
                level, 
                message, 
                context, 
                timestamp: new Date(), 
                expiresAtLogT
            });

            if (level === 'error') {
                this.logger.error(message, context);
            } else if (level === 'warn') {
                this.logger.warn(message, context);
            } else {
                this.logger.log(message, context);
            }
        } catch (error) {
            this.logger.error(`❌ No se pudo guardar el log en la base de datos: ${error.message}`);
        }
    }

    /**
     * Obtiene los logs almacenados en la base de datos filtrados por rango de fechas y niveles.
     * 
     * @param start - Fecha de inicio en formato `YYYY-MM-DD` o hora en formato `HH:mm`.
     * @param end - Fecha de fin en formato `YYYY-MM-DD` o hora en formato `HH:mm`.
     * @param levels - Array de niveles de log a filtrar (opcional). Ejemplo: ['info', 'warn'].
     * @returns Una lista de logs filtrados según los criterios proporcionados.
     */
    async getLogs(start: string, end: string, level: string[] = ['info', 'warn', 'error']) {
        const query: any = {
            level: { $in: level }
        };
    
        if (start && end) {
            const startDate = new Date(start);
            const endDate = new Date(end);
    
            if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
                throw new UnauthorizedException('Fechas inválidas proporcionadas.');
            }
    
            query.timestamp = {
                $gte: startDate,
                $lte: endDate
            };
        }
    
        try {
            return await this.logModel.find(query);
        } catch (error) {
            this.logger.error(`❌ Error al obtener los logs: ${error.message}`);
            throw new UnauthorizedException('No se pudieron obtener los logs.');
        }
    }
    

    /**
     * Calcula la fecha de expiración a partir de una duración dada (por ejemplo, '5m', '1h').
     * 
     * @param expiration - La duración de expiración en formato de texto (por ejemplo, '5m', '1h').
     * @returns La fecha de expiración calculada.
     */
    private calculateExpiration(expiration: string): Date {
        const now = Date.now();
        const [value, unit] = expiration.split(/(\d+)/).filter(Boolean);
        let timeToAdd: number;

        if (unit === 'm') {
            timeToAdd = parseInt(value) * 60000;
        } else if (unit === 'h') {
            timeToAdd = parseInt(value) * 3600000;
        } else {
            throw new Error('Unidad de tiempo no soportada');
        }

        return new Date(now + timeToAdd);
    }      
}