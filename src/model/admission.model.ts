import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";


/**
 * Tipo de documento representando una Admisión en la base de datos de MongoDB.
 * 
 * Este tipo extiende de la clase Admission, la cual contiene los campos
 * principales asociados a la entidad Admisión en la base de datos en MongoDB.
 */
export type AdmissionDocument = Admission & Document;

/**
 * Modelo de la Entidad Admisión.
 * 
 * Esta clase define la estructura de un documento de Admisión que se
 * almacenará en MongoDB. Cada campo está documentado con su propósito
 * y tipo de datos. El modelo utiliza decoradores de Mongoose para crear 
 * el esquema necesario para el almacenamiento en la base de datos.
 * 
 * @Schema() indica que esta clase es un modelo de Mongoose, y se mapea
 * a una colección de la base de datos.
 */
@Schema()
export class Admission {
    
    /**
     * Número consecutivo de la admisión.
     * 
     * Este campo es único y se utiliza para identificar la admisión
     * dentro del sistema. Es obligatorio.
     * 
     * @type {string}
     */
    @Prop({required: true})
    consecutiveAdmission: string;

    /**
     * Fecha en que ocurrió la admisión.
     * 
     * Representa la fecha y hora exacta de la admisión del paciente.
     * Este campo es obligatorio para el registro de la admisión.
     * 
     * @type {Date}
     */
    @Prop({required: true})
    dateAdmission: Date;

    /**
     * Tipo de admisión realizada.
     * 
     * Indica el tipo de admisión, por ejemplo, si es una consulta,
     * una emergencia, etc. Es obligatorio.
     * 
     * @type {string}
     */
    @Prop({required: true})
    typeAdmission: string;

    /**
     * Usuario que registró la admisión.
     * 
     * Este campo almacena el identificador o nombre del usuario
     * que registró la admisión. Es obligatorio para todas las admisiones.
     * 
     * @type {string}
     */
    @Prop({required: true})
    userAdmission: string;

    /**
     * Tipo de documento del paciente.
     * 
     * Almacena el tipo de documento del paciente, por ejemplo, Cédula,
     * Pasaporte, etc. Este campo es obligatorio.
     * 
     * @type {string}
     */
    @Prop({required: true})
    typeDocumentPatient: string;

    /**
     * Documento de identidad del paciente.
     * 
     * Contiene el número del documento de identidad del paciente (como su cédula
     * o pasaporte). Es obligatorio y es utilizado para identificar al paciente.
     * 
     * @type {string}
     */
    @Prop({required: true})
    documentPatient: string;

    /**
     * Nombre completo del paciente.
     * 
     * Este campo contiene el nombre completo del paciente. Es obligatorio
     * para poder realizar la admisión.
     * 
     * @type {string}
     */
    @Prop({required: true})
    namePatient: string;

    /**
     * Número de teléfono del paciente.
     * 
     * Este campo almacena el número de contacto del paciente. Es obligatorio
     * y se utiliza para contactar al paciente en caso de necesidad.
     * 
     * @type {string}
     */
    @Prop({required: true})
    phonePatient: string;

    /**
     * Tipo de documento del acompañante.
     * 
     * Este campo es opcional y se utiliza si el paciente tiene un acompañante
     * cuya identidad también necesita ser registrada. Se puede registrar el
     * tipo de documento de dicho acompañante (por ejemplo, Cédula, Pasaporte).
     * 
     * @type {string}
     */
    @Prop({required: false})
    typeDocumentCompanion: string;

    /**
     * Documento de identidad del acompañante.
     * 
     * Este campo es opcional y almacena el número de documento de identidad
     * del acompañante, si es que se proporciona.
     * 
     * @type {string}
     */
    @Prop({required: false})
    documentCompanion: string;

    /**
     * Nombre completo del acompañante.
     * 
     * Este campo es opcional y almacena el nombre del acompañante. Se utilizará
     * si el paciente tiene un acompañante registrado para su admisión.
     * 
     * @type {string}
     */
    @Prop({required: false})
    nameCompanion: string;

    /**
     * Número de teléfono del acompañante.
     * 
     * Este campo es opcional y se utiliza para almacenar el número de teléfono
     * del acompañante, si es que se proporciona.
     * 
     * @type {string}
     */
    @Prop({required: false})
    phoneCompanion: string;

    /**
     * Relación del acompañante con el paciente.
     * 
     * Este campo es opcional y almacena la relación del acompañante con el paciente
     * (por ejemplo, hijo, amigo, esposa, etc.).
     * 
     * @type {string}
     */
    @Prop({required: false})
    relationCompanion: string;

    /**
     * Firma digital asociada a la admisión.
     * 
     * Este campo contiene la firma digital asociada a la admisión del paciente.
     * Es un campo obligatorio para garantizar la validez legal de la admisión
     * registrada. 
     * 
     * @type {string}
     */
    @Prop({required: true, type: String})
    digitalSignature: string;
}

export const AdmissionSchema = SchemaFactory.createForClass(Admission);