import { Controller, Get, Query, UnauthorizedException, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { LogService } from 'src/service/log.service';

/**
 * Controlador para gestionar las solicitudes relacionadas con los logs del sistema.
 * 
 * El controlador expone un endpoint `GET /log` para consultar los logs almacenados en la base de datos.
 * Solo los usuarios autenticados pueden acceder a este endpoint, gracias al uso del guard `JwtAuthGuard`.
 */
@Controller('log')
export class LogController {
    constructor(private readonly logService: LogService) { }

    /**
     * Endpoint para obtener logs almacenados en la base de datos, filtrados por el nivel de log.
     * 
     * El método `getLogs` permite realizar consultas de logs por su nivel (info, warn, error). 
     * El valor por defecto del nivel es `['info', 'warn', 'error']`, pero se puede especificar
     * un array de niveles a través del parámetro `level` en la consulta.
     * 
     * El uso del guard `JwtAuthGuard` asegura que solo los usuarios autenticados puedan acceder a este recurso.
     * 
     * @param level - Array de niveles de log a filtrar. Ejemplo: `['info', 'warn']`. 
     *                Si no se proporciona, se utilizarán los niveles por defecto: `['info', 'warn', 'error']`.
     * @returns Una lista de logs filtrados según el nivel especificado.
     * @throws UnauthorizedException Si ocurre un error en la búsqueda de logs.
     */
    @Get()
    @UseGuards(JwtAuthGuard)
    async getLogs(@Query('level') level: string[] = ['info', 'warn', 'error'], @Req() req: Request 
    ) {
        try {
            const logs = await this.logService.getLogs(level);
            return logs;
        } catch (error) {
            throw new UnauthorizedException('Error en la búsqueda de logs.', error);
        }
    }
}