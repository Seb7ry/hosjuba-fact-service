import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { LogService } from 'src/service/log.service';

@Controller('logs')
export class LogController {
    constructor(private readonly logService: LogService) {}

    // Consultar todos los logs
    @Get('all')
    @UseGuards(JwtAuthGuard)
    async getAllLogs() {
        return await this.logService.getAllLogs();
    }

    // Consultar logs por fecha
    @Get('by-date')
    @UseGuards(JwtAuthGuard)
    async getLogsByDate(
        @Query('start') start: string,  // Fecha de inicio (en formato ISO)
        @Query('end') end: string,      // Fecha de fin (en formato ISO)
        @Query('level') level: string   // Nivel de log (opcional)
    ) {
        return await this.logService.getLogsByDate(start, end, level);
    }

    // Consultar logs por intervalo de horas
    @Get('by-interval')
    @UseGuards(JwtAuthGuard)
    async getLogsByInterval(
        @Query('startTime') startTime: string,  // Hora de inicio (formato HH:mm:ss)
        @Query('endTime') endTime: string,      // Hora de fin (formato HH:mm:ss)
        @Query('level') level: string           // Nivel de log (opcional)
    ) {
        return await this.logService.getLogsByInterval(startTime, endTime, level);
    }
}
