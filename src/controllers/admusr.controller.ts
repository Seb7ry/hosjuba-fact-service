import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { AdmUsrService } from '../service/admusr.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

/**
 * Controlador para gestionar las operaciones de usuarios administrativos (`ADMUSR`).
 */
@Controller('admusr')
export class AdmUsrController {
    constructor(
        private readonly admUserService: AdmUsrService,
    ) { }

    /**
     * Obtiene todos los usuarios registrados en la base de datos.
     * 
     * - Ruta: `GET /admusr`
     * - Requiere autenticación mediante `JwtAuthGuard`.
     * 
     * @param req - Objeto de la solicitud, contiene información del usuario autenticado.
     * @returns Lista de usuarios disponibles en la base de datos.
     */
    @Get('all')
    @UseGuards(JwtAuthGuard)
    async getAllUsers(@Request() req): Promise<any[]> {
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
    @UseGuards(JwtAuthGuard)  
    async getUserById(@Request() req, @Param('id') id: string): Promise<any | null> {
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
    @UseGuards(JwtAuthGuard)  
    async getUserByUsername(@Request() req, @Param('username') username: string): Promise<any | null> {
        return this.admUserService.findByUser(username);
    }
}
