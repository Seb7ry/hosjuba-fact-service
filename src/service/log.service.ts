import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { ConnectionPool, Request } from 'mssql';
import { Log, LogDocument } from "src/model/log.model";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

/**
 * Servicio para manejo centralizado de logs del sistema.
 * 
 * Proporciona funcionalidades para:
 * - Registrar logs en base de datos MongoDB
 * - Mostrar logs en consola según nivel de severidad
 * - Consultar logs con diversos filtros
 * - Manejar expiración automática de registros
 */
@Injectable()
export class LogService {
    private readonly logger = new Logger(LogService.name);

    /**
     * Constructor del servicio de logs
     * @param logModel Modelo de Mongoose para la colección Log
     * @param configService Servicio para acceder a variables de entorno
     * @param jwtService Servicio para operaciones con JWT (inyectado pero no utilizado actualmente)
     */
    constructor(
        @InjectModel(Log.name) private logModel: Model<LogDocument>,
        private readonly configService: ConfigService,
        private readonly jwtService: JwtService,) {}

    /**
     * Registra un log y lanza una excepción UnauthorizedException
     * @param level Nivel de severidad del log (info/warn/error)
     * @param message Mensaje descriptivo del evento
     * @param context Contexto/modulo donde ocurrió el evento
     * @throws UnauthorizedException con el mensaje proporcionado
     */
    async logAndThrow(level: 'info' | 'warn' | 'error', message: string, context: string) {
        await this.log(level, message, context); 
        throw new UnauthorizedException(message);
    }

    /**
     * Registra un log en base de datos y consola
     * @param level Nivel de severidad
     * @param message Mensaje descriptivo
     * @param context Contexto/origen
     * @param expiration Tiempo de expiración (opcional)
     * @param user Usuario relacionado (opcional)
     */
    async log(level: 'info' | 'warn' | 'error', message: string, context: string, expiration?: string, user?: string) {
        try {
            const expirationTime = this.configService.get<string>('LOG_EXPIRATION');
            const expiresAtLogT = expirationTime ? this.calculateExpiration(expirationTime) : undefined;

            await this.logModel.create({
                level, 
                message, 
                context, 
                timestamp: new Date(), 
                expiresAtLogT,
                user
            });

            // Output to console based on level
            if (level === 'error') {
                this.logger.error(message, context);
            } else if (level === 'warn') {
                this.logger.warn(message, context);
            } else {
                this.logger.log(message, context);
            }
        } catch (error) {
            this.logger.error(`No se pudo guardar el log en la base de datos: ${error.message}`);
        }
    }

    /**
     * Obtiene logs filtrados por niveles de severidad
     * @param levels Array de niveles a filtrar (info/warn/error)
     * @returns Promesa con array de logs ordenados por fecha descendente
     * @throws UnauthorizedException si ocurre un error en la consulta
     */
    async getLogsByLevels(levels: Array<'info' | 'warn' | 'error'>) {
        try {
            const query = { level: { $in: levels } };                
            return await this.logModel.find(query)
                .sort({ timestamp: -1 })
                .exec();
        } catch (error) {
            this.logger.error(`Error al obtener logs por niveles (${levels}): ${error.message}`);
            throw new UnauthorizedException(`No se pudieron obtener los logs para los niveles especificados`);
        }
    }        
    
    /**
     * Obtiene logs técnicos (warn/error por defecto) con filtros opcionales por fecha
     * @param req Objeto Request de Express
     * @param level Niveles de log a incluir (default: ['warn', 'error'])
     * @param startDate Fecha inicial para filtrar (opcional)
     * @param endDate Fecha final para filtrar (opcional)
     * @returns Promesa con array de logs filtrados
     * @throws UnauthorizedException si ocurre un error en la consulta
     */
    async getLogsTec(req: Request, level: string[] = ['warn', 'error'], startDate?: string, endDate?: string) {            
        let message = 'Filtro(s): ';

        const query: any = {
            level: { $in: level }
        };

        if(level) message += ` nivel(es): ${level}`;
    
        if (startDate) {
            message += ` fechaInicial: ${startDate}`;
            const start = new Date(startDate);
            start.setUTCHours(0, 0, 0, 0); 
    
            if (endDate) {
                message += ` fechaFinal: ${endDate}`;
                const end = new Date(endDate);
                end.setUTCHours(23, 59, 59, 999); 
                query.timestamp = { $gte: start.toISOString(), $lte: end.toISOString() };
            } else {
                const endOfDay = new Date(start);
                endOfDay.setUTCHours(23, 59, 59, 999);
                query.timestamp = { $gte: start.toISOString(), $lte: endOfDay.toISOString() };
            }
        }
    
        try {
            await this.log('info', `Buscando registros mediante filtro. ${message}`, 'Registros', undefined, req.user.username)
            return await this.logModel.find(query).sort({ timestamp: -1 });
        } catch (error) {
            this.logger.error(`Error al obtener los registros: ${error.message}`);
            throw new UnauthorizedException('No se pudieron obtener los logs.');
        }
    }

    /**
     * Obtiene logs de tipo 'info' con filtros opcionales por usuario y fecha
     * @param req Objeto Request de Express
     * @param startDate Fecha inicial para filtrar (opcional)
     * @param endDate Fecha final para filtrar (opcional)
     * @param user Usuario específico para filtrar (opcional)
     * @returns Promesa con array de logs de historial
     * @throws UnauthorizedException si ocurre un error en la consulta
     */
    async getLogsHistory(req: Request, startDate?: string, endDate?: string, user?: string) {
        let message = 'Filtro(s): nivel: info';
        
        const query: any = {
            level: 'info'
        };

        if (user) {
            query.user = user;
            message += ` user: ${user}`;
        }

        if (startDate) {
            message += ` fechaInicial: ${startDate}`;
            const start = new Date(startDate);
            start.setUTCHours(0, 0, 0, 0);

            if (endDate) {
                message += ` fechaFinal: ${endDate}`;
                const end = new Date(endDate);
                end.setUTCHours(23, 59, 59, 999);
                query.timestamp = { 
                    $gte: start.toISOString(), 
                    $lte: end.toISOString() 
                };
            } else {
                const endOfDay = new Date(start);
                endOfDay.setUTCHours(23, 59, 59, 999);
                query.timestamp = { 
                    $gte: start.toISOString(), 
                    $lte: endOfDay.toISOString() 
                };
            }
        }

        try {
            await this.log('info', `Buscando historial mediante filtro. ${message}`, 'Historial', undefined, req.user.username)
            return await this.logModel.find(query)
                .sort({ timestamp: -1 })
                .exec();
        } catch (error) {
            this.logger.error(`Error al obtener el historial: ${error.message}`);
            throw new UnauthorizedException('No se pudieron obtener los logs de información');
        }
    }
    
    /**
     * Calcula fecha de expiración para registros de log
     * @param expiration Cadena con tiempo de expiración (ej: "30m" para 30 minutos)
     * @returns Fecha de expiración calculada
     * @throws Error si la unidad de tiempo no es soportada
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