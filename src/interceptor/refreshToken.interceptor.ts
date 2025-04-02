// src/common/interceptors/refresh-token.interceptor.ts
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { TokenService } from '../service/token.service';

/**
 * Interceptor para manejar la renovación automática de tokens de acceso.
 * 
 * Este interceptor verifica la presencia de un usuario autenticado y, si existe,
 * intenta renovar su token de acceso utilizando el refresh token almacenado.
 * 
 * @example
 * // Uso en controlador:
 * @UseInterceptors(RefreshTokenInterceptor)
 * @Controller('protected-route')
 */
@Injectable()
export class RefreshTokenInterceptor implements NestInterceptor {
  /**
   * Constructor que inyecta el TokenService
   * @param tokenService - Servicio para manejar operaciones con tokens
   */
  constructor(private readonly tokenService: TokenService) {}

  /**
   * Implementación del método intercept del interceptor
   * @param context - Contexto de ejecución de NestJS
   * @param next - Manejador para continuar el flujo de la solicitud
   * @returns Observable con el flujo de la solicitud
   */
  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Verifica si hay un usuario autenticado en la solicitud
    if (request.user?.username) {
      try {
        const { username } = request.user;
        
        // Busca el registro de token en la base de datos
        const tokenRecord = await this.tokenService.findTokenByName(username);
        
        // Valida la existencia del refresh token
        if (!tokenRecord?.refreshToken) {
          throw new Error(`No se encontró refreshToken para ${username}`);
        }

        // Renueva el token de acceso
        const { access_token } = await this.tokenService.refreshAccessToken(
          username,
          tokenRecord.refreshToken,
        );
        
        // Agrega el nuevo token a los headers de respuesta
        response.setHeader('New-Access-Token', access_token);
      } catch (error) {
        // Manejo no crítico de errores (no interrumpe el flujo normal)
        console.warn('Error al refrescar token (no crítico):', error.message);
      }
    }

    // Continúa con el flujo normal de la solicitud
    return next.handle();
  }
}