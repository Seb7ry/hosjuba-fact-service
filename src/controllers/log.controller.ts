import { Controller, Get, Query, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { LogService } from 'src/service/log.service';

@Controller('log')
export class LogController {
    constructor(private readonly logService: LogService) { }

    @Get()
    @UseGuards(JwtAuthGuard)
    async getLogs(
        @Query('start') start: string,
        @Query('end') end: string,
        @Query('level') level: string[] = ['info', 'warn', 'error'], 
    ) {
        try {
            const logs = await this.logService.getLogs(start, end, level);
            return logs;
        } catch (error) {
            throw new UnauthorizedException('Error en la busqueda de logs.',error);
        }
    }
}