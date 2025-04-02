/**
 * Representa un usuario administrativo en el sistema.
 * Contiene información de autenticación y pertenencia a grupos.
 */
export class AdmUsr {
    /**
     * Nombre de usuario único (identificador principal)
     * @pattern ^[a-zA-Z0-9]{10}$ - Debe contener exactamente 10 caracteres alfanuméricos
     * @example "usr_5A9b42"
     */
    username: string;

    /**
     * Nombre completo o descriptivo del usuario
     * @maxLength 32 - Longitud máxima permitida
     * @example "María González López"
     */
    descripcion: string;

    /**
     * Credencial de acceso (debe almacenarse cifrada)
     * @security - Nunca debería exponerse en respuestas API
     * @format password
     */
    password: string;

    /**
     * Referencia al grupo de permisos asignado
     * @pattern ^grp_[a-zA-Z0-9]{12}$ - Formato: 'grp_' + 12 caracteres alfanuméricos
     * @example "grp_adm1nX9f4s2"
     */
    grupoId: string;

    /**
     * Crea una nueva instancia de usuario administrativo
     * @param username - Identificador único (10 caracteres)
     * @param descripcion - Nombre descriptivo (hasta 32 caracteres)
     * @param password - Contraseña (debe cifrarse antes de persistir)
     * @param grupoId - Identificador de grupo (16 caracteres)
     */
    constructor(username: string, descripcion: string, password: string, grupoId: string) {
        this.username = username;
        this.descripcion = descripcion;
        this.password = password;
        this.grupoId = grupoId;
    }
}