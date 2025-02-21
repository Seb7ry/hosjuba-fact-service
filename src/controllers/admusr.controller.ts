import { Controller, Get, Param } from '@nestjs/common';
import { AdmUsrService } from '../service/admusr.service';
import { AdmUsr } from '../entities/admusr.entity';

@Controller('admusr')
export class AdmUsrController {
    constructor(private readonly admUserService: AdmUsrService) { }

    @Get()
    async getAllUsers(): Promise<any[]> {
        return this.admUserService.findAll();
    }

    @Get(':id')
    async getUserById(@Param('id') id:string): Promise<any | null> {
        return this.admUserService.findById(id);
    }
}

