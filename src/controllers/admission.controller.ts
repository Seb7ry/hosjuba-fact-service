import { Controller, Get, NotFoundException, Query } from "@nestjs/common";
import { NotFoundError } from "rxjs";
import { Admission } from "src/model/admission.model";
import { AdmissionService } from "src/service/admission.service";

@Controller('admissions')
export class AdmissionController {
    constructor(private readonly admissionService: AdmissionService) { }

    @Get()
    async getAllAdmissions(): Promise<Admission[]>{
        try{
            return await this.admissionService.getAllAdmissions();
        }catch(error){
            throw new NotFoundException('No se pudieron obtener las admisiones.');
        }
    }

    @Get('id')
    async getAdmissionByKeys(
        @Query('documentPatient') documentPatient: string,
        @Query('consecutiveAdmission') consecutiveAdmission: string): Promise<Admission>{
            
        const admission = await this.admissionService.getAdmissionByKeys(documentPatient, consecutiveAdmission);

        if(!admission) throw new NotFoundException("Admisión no encontrada.");

        return admission;
    }
}