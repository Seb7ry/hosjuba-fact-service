import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AdmUsr } from '../entities/admusr.entity'

@Injectable()
export class AdmUsrService {
    
    constructor(@InjectRepository(AdmUsr) private readonly admUserRepository: Repository<AdmUsr>,
                private readonly datasource: DataSource, 
    ) { }

    async findAll(): Promise<any[]> {
        const query = `SELECT 
            dbo.desencriptar(AUsrId) AS AUsrId,
            dbo.desencriptar(AUsrDsc) AS AUsrDsc,
            dbo.desencriptar(AUsrPsw) AS AUsrPsw,
            dbo.desencriptar(AgrpId) AS AgrpId
        FROM ADMUSR`;
    return this.datasource.query(query);
    }

    async findById(id: string): Promise<any | null> {
        const query = `SELECT 
            dbo.desencriptar(AUsrId) AS AUsrId,
            dbo.desencriptar(AUsrDsc) AS AUsrDsc,
            dbo.desencriptar(AUsrPsw) AS AUsrPsw,
            dbo.desencriptar(AgrpId) AS AgrpId
        FROM ADMUSR WHERE AUsrId = @0`;
        const result = await this.datasource.query(query, [id]);
        return result.length > 0 ? result[0] : null;
      }
}

