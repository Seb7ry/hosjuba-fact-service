import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity({ name:'ADMUSR', schema:'dbo'})
export class AdmUsr {

    @PrimaryColumn({ name:'AUsrId', type:'char', length:10})
    id: string;

    @Column({ name: 'AUsrDsc', type: 'char', length: 32 })
    descripcion: string;
  
    @Column({ name: 'AUsrPsw', type: 'char', length: 10 })
    password: string;
  
    @Column({ name: 'AgrpId', type: 'char', length: 16 })
    grupoId: string;
}