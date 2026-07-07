import { Model, InferAttributes, InferCreationAttributes, DataTypes } from 'sequelize';
import { conection } from '../connections'

class Ifocontacto extends Model<InferAttributes<Ifocontacto>, InferCreationAttributes<Ifocontacto>>{
    declare DOCUMENTO: string;
    declare CELULAR: string;
    declare TELEFONO: string;
    declare EMAIL: string
    declare DOCALTERNO: string;
    declare NOMBREALTERNO: string;
    declare CELALTERNO: string;
    declare VERSION: string;
    declare FECHACREATE: Date;
    declare FECHAUPDATE: Date;
    declare LOGINUPD: string;
} 

Ifocontacto.init({
    DOCUMENTO: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
    CELULAR: { type: DataTypes.STRING, allowNull: false },
    TELEFONO: { type: DataTypes.STRING, allowNull: true },
    EMAIL: { type: DataTypes.STRING, allowNull: true },
    DOCALTERNO: { type: DataTypes.STRING, allowNull: true },
    NOMBREALTERNO: { type: DataTypes.STRING, allowNull: true },
    CELALTERNO: { type: DataTypes.STRING, allowNull: true },
    VERSION: { type: DataTypes.STRING, allowNull: true },
    FECHACREATE: { type: DataTypes.DATE, allowNull: true },
    FECHAUPDATE: { type: DataTypes.DATE, allowNull: true },
    LOGINUPD: { type: DataTypes.STRING, allowNull: true }
}, {
  sequelize: conection,
  modelName: 'Ifocontacto',
  tableName: 'INFOCONTACTO',
  timestamps: false
})


export { Ifocontacto }