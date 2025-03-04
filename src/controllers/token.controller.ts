import { Controller, Get, Param, Req, UnauthorizedException, UseGuards } from "@nestjs/common";
import { TokenService } from "src/service/token.service";
import { JwtAuthGuard } from "src/guards/jwt-auth.guard";
import { Request } from 'express';

/**
 * Controlador para gestionar las operaciones de tokens asignados a los 
 * usuarios.
 */
@Controller('token')
export class TokenController{
    constructor(
        private readonly tokenService: TokenService,
    ){ }
    
    /**
     * Obtiene todos los tokens almacenados en la base de datos.
     * Ruta: `GET /token/all`
     * @returns Lista de todos los tokens almacenados en la base de datos.
     */
    @Get('all')
    @UseGuards(JwtAuthGuard)
    async getAllTokens(@Req() req: Request) {
        try {
            const tokens = await this.tokenService.findAllTokens();
            return tokens;
        } catch (error) {
            throw new UnauthorizedException('No se pudo obtener la lista de tokens.');
        }
    }

    /**
     * Busca un token específico por el ID de usuario.
     * Ruta: `GET /token/:id`
     * @param id - El ID del usuario para el cual se busca el token.
     * @returns El token encontrado para el usuario.
     */
    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async getTokenByUserId(@Param('id') id: string) {
        try {
            const token = await this.tokenService.findTokenByName(id);
            if (!token) {
                throw new UnauthorizedException('Token no encontrado.');
            }
            return token;
        } catch (error) {
            throw new UnauthorizedException('No se pudo obtener el token.');
        }
    }
}