    import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
    import { ConnectionPool, Request } from 'mssql';
    import { Log, LogDocument } from "src/model/log.model";
    import { InjectModel } from "@nestjs/mongoose";
    import { Model } from "mongoose";
    import { ConfigService } from "@nestjs/config";
    import { JwtService } from "@nestjs/jwt";
import { start } from "repl";

    /**
     * Servicio para manejar los logs del sistema.
     * 
     * Este servicio se encarga de registrar los logs en la base de datos y de imprimirlos en consola según su nivel 
     * (info, warn, error). También lanza excepciones `UnauthorizedException` cuando se utiliza el método `logAndThrow`.
    */
    @Injectable()
    export class LogService {
        private readonly logger = new Logger(LogService.name);

        /**
         * Constructor del servicio `LogService`.
         * @param logModel - Modelo de Mongoose para los logs.
         * @param configService - Servicio para obtener configuraciones de la aplicación.
         */
        constructor(
            @InjectModel(Log.name) private logModel: Model<LogDocument>,
            private readonly configService: ConfigService,
            private readonly jwtService: JwtService,) {}

        /**
         * Registra un log en la base de datos y luego lanza una excepción con el mensaje dado.
         * Este método es útil para cuando se quiere registrar un evento en los logs y lanzar una excepción en el mismo paso.
         * 
         * @param level - Nivel del log (info, warn, error).
         * @param message - El mensaje del log.
         * @param context - El contexto donde se produjo el log.
         * 
         * @throws {UnauthorizedException} - Lanza una excepción con el mensaje registrado.
         */
        async logAndThrow(level: 'info' | 'warn' | 'error', message: string, context: string) {
            await this.log(level, message, context); 
            throw new UnauthorizedException(message);
        }

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
                await this.log('info', `Buscando logs mediante filtro. ${message}`, 'LogService', undefined, req.user.username)
                return await this.logModel.find(query).sort({ timestamp: -1 });
            } catch (error) {
                this.logger.error(`Error al obtener los logs: ${error.message}`);
                throw new UnauthorizedException('No se pudieron obtener los logs.');
            }
        }
        
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