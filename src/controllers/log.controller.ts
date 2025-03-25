import { Controller, Get, Query, UnauthorizedException, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { LogService } from 'src/service/log.service';

@Controller('log')
export class LogController {
    constructor(private readonly logService: LogService) { }

    @Get('all')
    @UseGuards(JwtAuthGuard)
    async getLogsByLevels(@Query('level') level: string | string[]) {
        const levels = Array.isArray(level) ? level : [level];

        const validLevels = ['info', 'warn', 'error'];
        const filteredLevels = levels.filter(lvl => validLevels.includes(lvl));

        return this.logService.getLogsByLevels(filteredLevels as Array<'info' | 'warn' | 'error'>);
    }

    @Get('filtrerTec')
    @UseGuards(JwtAuthGuard)
    async getLogsTec(
        @Request() req: Request,
        @Query('level') level?: string | string[], 
        @Query('startDate') startDate?: string,  
        @Query('endDate') endDate?: string,  
    ) {
        try {
            const levels = Array.isArray(level) ? level : [level].filter(l => l);

            const logs = await this.logService.getLogsTec(req, levels.length ? levels : ['warn', 'error'], startDate, endDate);
            return logs;
        } catch (error) {
            throw new UnauthorizedException('Error en la búsqueda de logs.', error);
        }
    }

    @Get('filtrerHis')
    @UseGuards(JwtAuthGuard)
    async getHistory(
        @Request() req: Request,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('user') user?: string
    ) {
        try {
            return await this.logService.getLogsHistory(req, startDate, endDate, user);
        } catch (error) {
            throw new UnauthorizedException('Error al obtener el historial de logs.', error)
        }
    }
}