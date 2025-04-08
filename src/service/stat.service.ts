import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Admission } from 'src/model/admission.model';

@Injectable()
export class StatService {
  constructor(
    @InjectModel(Admission.name)
    private readonly admissionModel: Model<Admission>,
  ) {}

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

