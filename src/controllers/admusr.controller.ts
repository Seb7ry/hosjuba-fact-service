import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { AdmUsrService } from '../service/admusr.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';  // Asegúrate de que el guard de JWT esté activado
import { LogService } from '../service/log.service';

/**
 * Controlador para gestionar las operaciones de usuarios administrativos (`ADMUSR`).
 */
@Controller('admusr')
export class AdmUsrController {
    constructor(
        private readonly admUserService: AdmUsrService,
        private readonly logService: LogService
    ) {}

    /**
     * Obtiene todos los usuarios registrados en la base de datos.
     * 
     * - Ruta: `GET /admusr`
     * - Requiere autenticación mediante `JwtAuthGuard`.
     * 
     * @param req - Objeto de la solicitud, contiene información del usuario autenticado.
     * @returns Lista de usuarios disponibles en la base de datos.
     */
    @Get()
    @UseGuards(JwtAuthGuard)  // Descomentar esto para proteger la ruta
    async getAllUsers(@Request() req): Promise<any[]> {
        console.log(req.user)
        await this.logService.log('info', `📢 Solicitud de lista de usuarios por: ${req.user.username}`, 'AdmUsrController');
        return this.admUserService.findAll();
    }

    /**
     * Obtiene un usuario específico por su `id`.
     * 
     * - Ruta: `GET /admusr/:id`
     * - No requiere autenticación.
     * 
     * @param req - Objeto de la solicitud (solo para depuración).
     * @param id - Identificador del usuario a buscar.
     * @returns Datos del usuario si se encuentra, `null` en caso contrario.
     */
    @Get(':id')
    @UseGuards(JwtAuthGuard)  // Descomentar esto para proteger la ruta
    async getUserById(@Request() req, @Param('id') id: string): Promise<any | null> {
        await this.logService.log('info', `🔍 Buscando usuario por ID: ${id}`, 'AdmUsrController');
        return this.admUserService.findById(id);
    }

    /**
     * Obtiene un usuario específico por su nombre de usuario.
     * 
     * - Ruta: `GET /admusr/:username`
     * - No requiere autenticación.
     * 
     * @param req - Objeto de la solicitud (solo para depuración).
     * @param username - Nombre de usuario a buscar.
     * @returns Datos del usuario si se encuentra, `null` en caso contrario.
     */
    @Get(':user')
    @UseGuards(JwtAuthGuard)  // Descomentar esto para proteger la ruta
    async getUserByUsername(@Request() req, @Param('username') username: string): Promise<any | null> {
        await this.logService.log('info', `🔍 Buscando usuario por nombre: ${username}`, 'AdmUsrController');
        return this.admUserService.findByUser(username);
    }
}
