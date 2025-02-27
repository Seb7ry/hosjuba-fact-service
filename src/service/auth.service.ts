import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { TokenService } from "./token.service";
import { LogService } from "./log.service";
import { AdmUsrService } from "./admusr.service";

@Injectable()
export class AuthService {
    constructor(
        private readonly tokenService: TokenService,
        private readonly jwtService: JwtService,
        private readonly logService: LogService,
        private readonly admUsrService: AdmUsrService
    ) {}

    async login(username: string, password: string): Promise<{ access_token: string; refresh_token: string }> {
        const user = await this.admUsrService.findByUser(username);
        if (!user) {
            await this.logService.logAndThrow('warn', `Usuario no encontrado: ${username}`, 'AuthService');
        }

        if (password.trim() !== user.AUsrPsw.toString().trim()) {
            await this.logService.logAndThrow('warn', `Contraseña incorrecta para usuario: ${username}`, 'AuthService');
        }

        const { access_token, access_token_expires_at } = await this.tokenService.generateAccessToken(username);
        const { refresh_token, refresh_token_expires_at } = await this.tokenService.generateRefreshToken(username);

        await this.logService.log('info', `Tokens generados y almacenados para el usuario: ${username}`, 'AuthService');
        
        return { access_token, refresh_token };
    }

    async logout(username: string): Promise<string> {
        const result = await this.tokenService.deleteRefreshToken(username);
        if (result) {
            await this.logService.log('info', `Refresh token eliminado correctamente para el usuario: ${username}`, 'AuthService');
            return `Sesión cerrada exitosamente para el usuario: ${username}`;
        } else {
            await this.logService.logAndThrow('warn', `No se encontró un refresh token para el usuario: ${username}`, 'AuthService');
        }
    }
}
