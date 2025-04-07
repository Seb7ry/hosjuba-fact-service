import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, from, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { TokenService } from '../service/token.service';
import { LogService } from 'src/service/log.service';

/**
 * Interceptor para manejo automático de refresh tokens
 * 
 * Funcionalidades:
 * - Detecta peticiones autenticadas (con usuario en request)
 * - Automáticamente refresca el access token si es necesario
 * - Agrega el nuevo token como cookie segura
 * - Continúa el flujo normal aunque falle el refresh
 * 
 * Uso:
 * @UseInterceptors(RefreshTokenInterceptor)
 */
@Injectable()
export class RefreshTokenInterceptor implements NestInterceptor {
  constructor(private readonly tokenService: TokenService, private readonly logService: LogService) {}

  /**
   * Método principal del interceptor
   * @param context Contexto de ejecución
   * @param next Manejador del siguiente paso
   * @returns Observable con el flujo de la petición
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    if (!request.user?.username) {
      return next.handle();
    }

    const { username } = request.user;

    return next.handle().pipe(
      mergeMap((data) => {
        return from(this.refreshToken(username, response)).pipe(
          mergeMap(() => of(data)) 
        );
      })
    );
  }

  /**
   * Lógica para refrescar el token de acceso
   * @param username Nombre de usuario autenticado
   * @param response Objeto Response para setear cookies
   * @returns Promesa vacía (operación asíncrona)
   */
  private async refreshToken(username: string, response: any): Promise<void> {
    try {
      const tokenRecord = await this.tokenService.findTokenByName(username);

      if (!tokenRecord?.refreshToken) {
        throw new Error(`No se encontró refreshToken para ${username}`);
      }

      const { access_token } = await this.tokenService.refreshAccessToken(
        username,
        tokenRecord.refreshToken,
      );

      response.cookie('access_token', access_token, {
        httpOnly: true,    
        secure: true,      
        sameSite: 'strict', 
        maxAge: parseInt(process.env.ACCESS_TOKEN_EXPIRATION) * 1000
      });
    } catch (error) {
      this.logService.logAndThrow('warn', `Error al refrescar token (no crítico): ${error.mesage}`, 'RefreshTokenInterceptor');
    }
  }
}