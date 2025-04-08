import { Body, Controller, InternalServerErrorException, NotFoundException, Post, Request, UnauthorizedException, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "src/guards/jwt-auth.guard";
import { AuthService } from "src/service/auth.service";
import { LoginDto } from "src/dto/login.dto";

/**
 * Controlador para manejar operaciones de autenticación
 * 
 * Proporciona endpoints para:
 * - Inicio de sesión (login)
 * - Cierre de sesión (logout)
 * 
 * Rutas:
 * - POST /auth/login
 * - POST /auth/logout (protegido por JWT)
 */
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
    ) {}

    /**
     * Endpoint para realizar el login de un usuario.
     * 
     * - Ruta: `POST /auth/login`
     * - Recibe el nombre de usuario y la contraseña del usuario.
     * - Si las credenciales son correctas, devuelve los tokens de acceso y refresco.
     * 
     * @param loginDto - Objeto que contiene el nombre de usuario y la contraseña.
     * @returns {Object} Los tokens generados (access_token y refresh_token).
     * @throws {UnauthorizedException} Si las credenciales son inválidas o el login falla.
     */
    @Post('login')
    async login(@Body() loginDto: LoginDto) {

        try {
            const userTokens = await this.authService.login(loginDto.username, loginDto.password);
            return userTokens;
        } catch (error) {
            if (error.message.includes('Usuario no encontrado')) {
                throw new NotFoundException('Usuario no encontrado.');
            } else if (error.message.includes('Contraseña incorrecta')) {
                throw new UnauthorizedException('Contraseña incorrecta.');
            } else if (error.message.includes('Usuario no encontrado')) {
                console.log(error.message)
                throw new NotFoundException('Usuario no encontrado o inactivo.')
            } else {
                throw new InternalServerErrorException('Error interno del servidor. Inténtalo más tarde.');
            }
        }
    }

    /**
     * Endpoint para cerrar la sesión de un usuario.
     * 
     * - Ruta: `POST /auth/logout`
     * - Requiere autenticación mediante el guard `JwtAuthGuard`.
     * - Si el token es válido, elimina el refresh token asociado al usuario.
     * 
     * @param body - Objeto que contiene el nombre de usuario (`username`).
     * @returns {Object} Un mensaje indicando que la sesión fue cerrada exitosamente.
     * @throws {UnauthorizedException} Si no se proporciona el nombre de usuario o si no se puede cerrar la sesión.
     */
    @Post('logout')
    @UseGuards(JwtAuthGuard)
    async logout(
        @Request() req: Request,
        @Body() body: { username: string }) {
        if (!body.username) {
            throw new UnauthorizedException('Username requerido');
        }

        try {
            const message = await this.authService.logout(req, body.username);
            return { message };
        } catch (error) {
            throw new UnauthorizedException('No se pudo cerrar la sesión.');
        }
    }
}