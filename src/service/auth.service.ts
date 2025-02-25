import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AdmUsrService } from "./admusr.service";
import { JwtService } from "@nestjs/jwt";
import { TokenService } from "./token.service";
import * as dotenv from 'dotenv';

dotenv.config();

@Injectable()
export class AuthService {
    constructor(
        private readonly admUsrService: AdmUsrService,
        private readonly tokenService: TokenService,
        private readonly jwtService: JwtService,
    ) {}

    async login(username: string, password: string): Promise<{ access_token: string; refresh_token: string }> {
        const user = await this.admUsrService.findByUser(username);
        if (password.trim() !== user.AUsrPsw.toString().trim()) {
            throw new UnauthorizedException(`Contraseña incorrecta.`);
        }

        const payload = { sub: user.AUsrId, username: user.AUsrId };
        const accessToken = this.jwtService.sign(payload, { expiresIn: process.env.ACCESS_TOKEN_EXPIRATION });
        const refreshToken = this.jwtService.sign(
            { sub: user.AUsrId, type: 'refresh' },
            { expiresIn: process.env.REFRESH_TOKEN_EXPIRATION }
        );

        await this.tokenService.updateRefreshToken(user.AUsrId.trim(), refreshToken);

        return { access_token: accessToken, refresh_token: refreshToken };
    }

    async refreshToken(username: string, refreshToken: string): Promise<{ access_token: string }> {
        const isValid = await this.tokenService.validateRefreshToken(username, refreshToken);
        if (!isValid) throw new UnauthorizedException('Refresh Token inválido');

        const user = await this.admUsrService.findByUser(username);
        const payload = { sub: user.AUsrId, username: user.AUsrId };
        const newAccessToken = this.jwtService.sign(payload, { expiresIn: process.env.ACCESS_TOKEN_EXPIRATION });

        return { access_token: newAccessToken };
    }
}