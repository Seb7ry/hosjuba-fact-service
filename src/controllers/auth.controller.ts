import { Body, Controller, Post, UnauthorizedException } from "@nestjs/common";
import { LoginDto } from "src/dto/login.dto";
import { AuthService } from "src/service/auth.service";

@Controller('auth')
export class AuthContoller {
    constructor( private readonly authService: AuthService ){ }

    @Post('login')
    async login(@Body() loginDto: LoginDto){
        const user = await this.authService.login(loginDto.username, loginDto.password);
        if(!user) throw new UnauthorizedException('Credenciales inválidas.');

        return user;
    }

    @Post('refresh')
    async refreshToken(@Body() body: { username: string, refreshToken: string }) {
        if (!body.username || !body.refreshToken) throw new UnauthorizedException('Username y Refresh Token requerido');

        return this.authService.refreshToken(body.username, body.refreshToken);
    }
}