import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize';
import { conection } from '../connections'
import { Sellers } from './sellers.model';

class Bases extends Model<InferAttributes<Bases>,InferCreationAttributes<Bases>> {
  declare VINCULADO: string;
  declare BASE: number;
  declare RASPE: number;
  declare EXCP2: number;
  declare EXCP3: number;
  declare CATEGORIA: number | null;
  declare LOGIN: string;
  declare OBSERVACION: string;
  declare VERSION: string;
}

Bases.init({
  VINCULADO: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
  BASE: { type: DataTypes.INTEGER, allowNull: true },
  RASPE: { type: DataTypes.INTEGER, allowNull: true },
  EXCP2: { type: DataTypes.INTEGER, allowNull: true },
  EXCP3: { type: DataTypes.INTEGER, allowNull: true },
  CATEGORIA: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  LOGIN: { type: DataTypes.STRING, allowNull: true },
  OBSERVACION: { type: DataTypes.STRING, allowNull: true },
  VERSION: { type: DataTypes.STRING, allowNull: true },
}, {
  sequelize: conection,
  modelName: 'Bases',
  tableName: 'BASES',
  timestamps: false
});

Bases.belongsTo(Sellers, { foreignKey: 'VINCULADO', targetKey: 'DOCUMENTO'});

export { Bases }