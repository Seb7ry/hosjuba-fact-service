import { Controller, Get, Param, Request, UseGuards } from '@nestjs/common';
import { AdmUsrService } from '../service/admusr.service';
import { JwtAuthGuard } from 'src/guards/jwt-auth.guard';

@Controller('admusr')
export class AdmUsrController {
    constructor(private readonly admUserService: AdmUsrService) { }

    @Get()
    @UseGuards(JwtAuthGuard)
    async getAllUsers(@Request() req): Promise<any[]> {
        console.log("Usuario autenticado:", req.user);
        return this.admUserService.findAll();
    }

    @Get(':id')
    async getUserById(@Request() req, @Param('id') id:string): Promise<any | null> {
        console.log("Usuario autenticado:", req.user);
        return this.admUserService.findById(id);
    }

    @Get(':user')
    async getUserByUsername(@Request() req, @Param('username') username:string): Promise<any | null> {
        console.log("Usuario autenticado:", req.user);
        return this.admUserService.findByUser(username);
    }
}

