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

    async logAndThrow(level: 'info' | 'warn' | 'error', message: string, context: string) {
        await this.log(level, message, context); 
        throw new UnauthorizedException(message);
    }

    async log(level: 'info' | 'warn' | 'error', message: string, context: string, expiration?: string) {
        try {
            const expiration = this.configService.get<string>('LOG_EXPIRATION');
            const expiresAtLogT = expiration ? this.calculateExpiration(expiration): undefined;

            await this.logModel.create({ level, message, context, timestamp: new Date(), expiresAtLogT });

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

    async getAllLogs() {
        return await this.logModel.find();
    }

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
