import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";
import { Log, LogDocument } from "src/model/log.model";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";

@Injectable()
export class LogService {
    private readonly logger = new Logger(LogService.name);

    constructor(@InjectModel(Log.name) private logModel: Model<LogDocument>) {}

    async logAndThrow(level: 'info' | 'warn' | 'error', message: string, context: string) {
        await this.log(level, message, context); 
        throw new UnauthorizedException(message);
    }

    async log(level: 'info' | 'warn' | 'error', message: string, context: string) {
        try {
            await this.logModel.create({ level, message, context, timestamp: new Date() });

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
}
