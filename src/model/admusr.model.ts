export class AdmUsr {
    /**
     * Identificador único del usuario.
     * - Este campo es una cadena de 10 caracteres.
     * - Se almacena como un campo de tipo `String` en MongoDB.
     */
    username: string;

    /**
     * Descripción o nombre del usuario.
     * - Se almacena como un campo de tipo `String`.
     * - Se puede almacenar hasta 32 caracteres.
     */
    descripcion: string;

    /**
     * Contraseña del usuario almacenada en la base de datos.
     * - Este campo se debe almacenar como un `String`.
     * - **Nota importante:** La contraseña debería ser cifrada.
     */
    password: string;

    /**
     * Identificador del grupo al que pertenece el usuario.
     * - Este campo es una cadena de 16 caracteres.
     * - Representa el grupo de usuarios a los que se asigna el usuario.
     */
    grupoId: string;

    constructor(username: string, descripcion: string, password: string, grupoId: string) {
        this.username = username;
        this.descripcion = descripcion;
        this.password = password;
        this.grupoId = grupoId;
    }
}
