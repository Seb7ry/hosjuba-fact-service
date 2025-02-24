import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AdmUsr } from '../entities/admusr.entity'

@Injectable()
export class AdmUsrService {
    
    constructor( private readonly datasource: DataSource, 
    ) { }

    async findAll(): Promise<any[]> {
        const query = `SELECT 
            dbo.desencriptar(AUsrId) AS AUsrId,
            AUsrDsc,
            dbo.desencriptar(AUsrPsw) AS AUsrPsw,
            AgrpId
        FROM ADMUSR`;
    return this.datasource.query(query);
    }

    async findById(id: string): Promise<any | null> {
        const query = `SELECT 
            dbo.desencriptar(AUsrId) AS AUsrId,
            AUsrDsc,
            dbo.desencriptar(AUsrPsw) AS AUsrPsw,
            AgrpId
        FROM ADMUSR WHERE AUsrId = @0`;
        return this.datasource.query(query, [id]);
    }

    async findByUser(username: string): Promise<any | null> {
        const query =  `SELECT
            dbo.desencriptar(AUsrId) AS AUsrId,
            AUsrDsc,
            dbo.desencriptar(AUsrPsw) AS AUsrPsw,
            AgrpId
        FROM ADMUSR 
        WHERE dbo.desencriptar(AUsrId) = @0`;
        const user = await this.datasource.query(query, [username]);
        return user.length > 0 ? user[0] : null;
    }
}

