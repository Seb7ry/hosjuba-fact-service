    import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
    import { Log, LogDocument } from "src/model/log.model";
    import { InjectModel } from "@nestjs/mongoose";
    import { Model } from "mongoose";
    import { ConfigService } from "@nestjs/config";

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
            private readonly configService: ConfigService) {}

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

        /**
         * Registra un log en la base de datos y lo imprime en consola según su nivel.
         * 
         * Este método almacena el log en la base de datos y luego imprime el mensaje en la consola dependiendo del nivel 
         * del log (info, warn o error). Si se especifica un tiempo de expiración, se calcula y se asigna a la entrada del log.
         * 
         * @param level - Nivel del log (info, warn, error).
         * @param message - El mensaje del log.
         * @param context - El contexto donde se produjo el log.
         * @param expiration - Tiempo de expiración del log (opcional).
         * 
         * @throws {Error} - Si ocurre un error al guardar el log en la base de datos.
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
         * Obtiene los logs almacenados en la base de datos filtrados por niveles.
         * 
         * Este método permite obtener los logs almacenados en la base de datos, filtrando por los niveles 
         * de log proporcionados (info, warn, error).
         * 
         * @param levels - Array de niveles de log a filtrar (opcional). Ejemplo: ['info', 'warn'].
         * @returns Una lista de logs filtrados según los criterios proporcionados.
         * @throws {UnauthorizedException} - Si ocurre un error al obtener los logs de la base de datos.
         */
        async getLogs( level: string[] = ['info', 'warn', 'error']) {
            const query: any = {
                level: { $in: level }
            };
        
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
         * Este método calcula la fecha de expiración sumando la duración proporcionada a la fecha y hora actual.
         * 
         * @param expiration - La duración de expiración en formato de texto (por ejemplo, '5m', '1h').
         * @returns La fecha de expiración calculada.
         * @throws {Error} - Si la unidad de tiempo proporcionada no es soportada.
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