import { Entity, Column, PrimaryColumn } from 'typeorm';

/**
 * Entidad que representa la tabla `ADMUSR` dentro del esquema `dbo` en la base de datos SQL Server.
 * Esta entidad almacena información sobre los usuarios del sistema.
 */
@Entity({ name:'ADMUSR', schema:'dbo'})
export class AdmUsr {

    /**
     * Identificador único del usuario.
     * - Se almacena en la columna `AUsrId`.
     * - Tipo `CHAR(10)`, lo que significa que siempre tiene 10 caracteres.
     * - Actúa como la clave primaria de la tabla.
     */
    @PrimaryColumn({ name:'AUsrId', type:'char', length:10})
    id: string;

    /**
     * Descripción o nombre del usuario.
     * - Se almacena en la columna `AUsrDsc`.
     * - Tipo `CHAR(32)`, lo que indica que la longitud máxima es de 32 caracteres.
     */
    @Column({ name: 'AUsrDsc', type: 'char', length: 32 })
    descripcion: string;

    /**
     * Contraseña del usuario almacenada en la base de datos.
     * - Se almacena en la columna `AUsrPsw`.
     * - Tipo `CHAR(10)`, lo que significa que solo puede contener 10 caracteres.
     * - **Nota importante:** Idealmente, esta contraseña debería ser encriptada en la base de datos para mayor seguridad.
     */
    @Column({ name: 'AUsrPsw', type: 'char', length: 10 })
    password: string;

    /**
     * Identificador del grupo al que pertenece el usuario.
     * - Se almacena en la columna `AgrpId`.
     * - Tipo `CHAR(16)`, lo que significa que puede almacenar hasta 16 caracteres.
     * - Permite clasificar a los usuarios dentro de diferentes grupos dentro del sistema.
     */
    @Column({ name: 'AgrpId', type: 'char', length: 16 })
    grupoId: string;
}