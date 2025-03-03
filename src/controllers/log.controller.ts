import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { LogService } from 'src/service/log.service';

@Controller('logs')
export class LogController {
    constructor(private readonly logService: LogService) {}

    @Get('all')
    //@UseGuards(JwtAuthGuard)
    async getAllLogs() {
        return await this.logService.getAllLogs();
    }

    @Get('by-date')
    //@UseGuards(JwtAuthGuard)
    async getLogsByDate(
        @Query('start') start: string,  
        @Query('end') end: string,      
        @Query('level') level: string = 'info'  
    ) {
        return await this.logService.getLogsByDate(start, end, level);
    }

    @Get('by-interval')
    //@UseGuards(JwtAuthGuard)
    async getLogsByInterval(
        @Query('startTime') startTime: string,  
        @Query('endTime') endTime: string,      
        @Query('level') level: string = 'info'  
    ) {
        return await this.logService.getLogsByInterval(startTime, endTime, level);
    }
}