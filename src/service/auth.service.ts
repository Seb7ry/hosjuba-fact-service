import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AdmUsrService } from "./admusr.service";
import { JwtService } from "@nestjs/jwt";
import { UserService } from "./user.service";

@Injectable()
export class AuthService {
    constructor(
        private readonly admUsrService: AdmUsrService,
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
    ) {}

    async login(username: string, password: string): Promise<{ access_token: string; refresh_token: string }> {
        const user = await this.admUsrService.findByUser(username);

        if(password.trim() !== user.AUsrPsw.toString().trim()) throw new UnauthorizedException(`Contraseña incorrecta.}`);
    
        const payload = { sub: user._id, username: user.username };
        const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' }); 
        const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' }); 
    
        await this.userService.updateRefreshToken(user._id, refreshToken);
    
        return { access_token: accessToken, refresh_token: refreshToken };
    }

    async refreshToken(username: string, refreshToken: string): Promise<{ access_token: string }> {
        const isValid = await this.userService.validateRefreshToken(username, refreshToken);
        if (!isValid) throw new UnauthorizedException('Refresh Token inválido');
    
        const user = await this.admUsrService.findByUser(username);
        const payload = { sub: user._id, username: user.username };
        const newAccessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    
        return { access_token: newAccessToken };
    }
}