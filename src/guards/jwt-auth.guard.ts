import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { JwtService, TokenExpiredError, JsonWebTokenError } from "@nestjs/jwt";
import * as dotenv from 'dotenv';

/**
 * Carga las variables de entorno desde el archivo .env
 * Esta configuración asegura que las variables de entorno estén disponibles
 * en el momento de la inicialización del archivo, permitiendo que el
 * acceso a configuraciones sensibles (como las credenciales de la base de datos)
 * se realice de forma segura.
 */
dotenv.config(); 

/**
 * Guard que verifica la validez del token JWT en las solicitudes entrantes.
 * 
 * El `JwtAuthGuard` asegura que el token de autenticación sea válido y no haya expirado.
 * Este guard es utilizado para proteger rutas y garantizar que solo los usuarios autenticados
 * puedan acceder a ciertos recursos del sistema.
 * 
 * Si el token es inválido o no está presente, se lanza una excepción `UnauthorizedException`.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
    
    /**
     * Logger para registrar eventos relacionados con la autenticación
     */
    private readonly logger = new Logger(JwtAuthGuard.name);

    /**
     * Constructor que inyecta el servicio de JWT.
     * 
     * @param jwtService Servicio de JWT para verificar y decodificar el token.
     */
    constructor(private readonly jwtService: JwtService) {}

    /**
     * Método que verifica si la solicitud está autenticada.
     * 
     * Extrae el token de la cabecera `Authorization`, lo valida y verifica si el token está
     * asociado a un usuario válido. Si la validación es exitosa, permite que la solicitud continúe,
     * de lo contrario, lanza una excepción `UnauthorizedException`.
     * 
     * @param context Contexto de la solicitud actual.
     * @returns {boolean} `true` si la solicitud está autenticada, `false` si no lo está.
     * @throws {UnauthorizedException} Si no se encuentra el token o es inválido.
     */
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;

        if (!authHeader) {
            this.logger.warn('Intento de acceso sin token de autenticación.');
            throw new UnauthorizedException('No se proporcionó un token de acceso.');
        }

        const tokenParts = authHeader.split(' ');
        if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
            this.logger.warn(`Formato incorrecto en el token de autenticación. Header recibido: ${authHeader}`);
            throw new UnauthorizedException('Formato de token inválido. Debe ser "Bearer <TOKEN>".');
        }

        const token = tokenParts[1];

        if (!token) {
            this.logger.warn('Token vacío recibido en la cabecera de autorización.');
            throw new UnauthorizedException('El token de acceso no puede estar vacío.');
        }

        try {
            const decoded = this.jwtService.verify(token, { secret: process.env.JWT_SECRET });
            if (decoded.type === 'refresh') {
                this.logger.warn(`Intento de uso de token de refresco en autenticación. Usuario: ${decoded.username}`);
                throw new UnauthorizedException('No puedes usar el token de refrescar para generar autorización a una solicitud.');
            }

            request.user = decoded;
            this.logger.log(`✅ Autenticación exitosa para el usuario: ${decoded.username}`);
            return true;
        } catch (error) {
            if (error instanceof TokenExpiredError) {
                this.logger.warn(`⚠️ Token expirado para la solicitud. Usuario desconocido. Detalles: ${error.message}`);
                throw new UnauthorizedException('Token de acceso expirado. Debes solicitar un nuevo access token.');
            } else if (error instanceof JsonWebTokenError) {
                this.logger.warn(`🚫 Token inválido o manipulado. Detalles: ${error.message}`);
                throw new UnauthorizedException('Token de acceso inválido o manipulado.');
            } else {
                this.logger.error(`❌ Error desconocido en la autenticación. Detalles: ${error.message}`);
                throw new UnauthorizedException('Error en la autenticación.');
            }
        }
    }
}
