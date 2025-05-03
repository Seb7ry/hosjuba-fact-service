import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Admission } from 'src/model/admission.model';

/**
 * Servicio encargado de obtener estadísticas relacionadas con las admisiones en la base de datos.
 */
@Injectable()
export class StatService {
  
   /**
   * Constructor del servicio donde se inyecta el modelo de admisiones desde Mongoose.
   * 
   * @param admissionModel - Modelo de Mongoose que representa el esquema de admisión.
   */
  constructor(
    @InjectModel(Admission.name)
    private readonly admissionModel: Model<Admission>,
  ) {}

  /**
   * Obtiene estadísticas de las admisiones clasificadas por tipo:
   * - '1'  → Urgencias
   * - '9'  → Triage
   * - '99' → Consulta externa
   * - Otros → Hospitalización
   * 
   * @returns Un objeto con el conteo total y los conteos por tipo de admisión.
   */
  async getStats() {
    const total = await this.admissionModel.countDocuments();

    const urgencias = await this.admissionModel.countDocuments({ typeAdmission: '1' });
    const triage = await this.admissionModel.countDocuments({ typeAdmission: '9' });
    const consultaExterna = await this.admissionModel.countDocuments({ typeAdmission: '99' });

    const hospitalizacion = await this.admissionModel.countDocuments({
      typeAdmission: { $nin: ['1', '9', '99'] },
    });

    return {
      total,
      urgencias,
      triage,
      consultaExterna,
      hospitalizacion,
    };
  }
}

