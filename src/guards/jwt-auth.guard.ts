import { CanActivate, ExecutionContext, Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { JwtService, TokenExpiredError, JsonWebTokenError } from "@nestjs/jwt";

/**
 * Guardián de autenticación que protege rutas al verificar el token de acceso JWT.
 * 
 * - Se asegura de que la solicitud tenga un token válido en la cabecera `Authorization`.
 * - Evita que se usen tokens de refresco en rutas protegidas.
 * - Lanza excepciones si el token es inválido o ha expirado.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
    private readonly logger = new Logger(JwtAuthGuard.name);

    constructor(private readonly jwtService: JwtService){}

    /**
     * Método que determina si la solicitud puede continuar o no.
     * 
     * @param context - Contexto de ejecución de la solicitud.
     * @returns `true` si el token es válido y pertenece a un access token, de lo contrario, lanza un error.
     */
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;

        if (!authHeader) {
            this.logger.warn('Intento de acceso sin token de autenticación.');
            throw new UnauthorizedException('No se proporcionó un token de acceso.');
        }

        // Validamos que el formato del token sea correcto (debe comenzar con "Bearer ")
        if (!authHeader.startsWith('Bearer ')) {
            this.logger.warn('Formato incorrecto en el token de autenticación.');
            throw new UnauthorizedException('Formato de token inválido. Debe ser "Bearer <TOKEN>".');
        }

        // Extraemos el token
        const token = authHeader.split(' ')[1];

        try {
            // Verificamos y decodificamos el token
            const decoded = this.jwtService.verify(token);

            // Verificamos que el token no sea de refresco
            if (decoded.type === 'refresh') {
                this.logger.warn(`Intento de uso de token de refresco en autenticación. Usuario: ${decoded.username}`);
                throw new UnauthorizedException('No puedes usar el token de refrescar para generar autorización a una solicitud.');
            }

            // Si el token es válido, lo agregamos a la solicitud
            request.user = decoded;
            this.logger.log(`Autenticación exitosa para el usuario: ${decoded.username}`);
            return true;
        } catch (error) {
            if (error instanceof TokenExpiredError) {
                this.logger.warn(`Token expirado para la solicitud. Error: ${error.message}`);
                throw new UnauthorizedException('Token de acceso expirado. Debes solicitar un nuevo access token.');
            } else if (error instanceof JsonWebTokenError) {
                this.logger.warn(`Token inválido o manipulado. Error: ${error.message}`);
                throw new UnauthorizedException('Token de acceso inválido o manipulado.');
            } else {
                this.logger.error(`Error desconocido en la autenticación. Error: ${error.message}`);
                throw new UnauthorizedException('Error en la autenticación.');
            }
        }
    }
}