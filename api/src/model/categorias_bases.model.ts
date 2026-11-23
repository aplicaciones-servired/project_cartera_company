import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { conection } from '../connections';

class CategoriasBases extends Model<
  InferAttributes<CategoriasBases>,
  InferCreationAttributes<CategoriasBases>
> {
  declare ID: CreationOptional<number>;
  declare NOMBRE: string;
  declare ESTADO: CreationOptional<number>;
  declare USUARIO_CREACION: string;
  declare FECHA_CREACION: CreationOptional<Date>;
  declare USUARIO_MODIFICACION: CreationOptional<string | null>;
  declare FECHA_MODIFICACION: CreationOptional<Date | null>;
}

CategoriasBases.init({
  ID: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
  NOMBRE: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  ESTADO: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
  USUARIO_CREACION: { type: DataTypes.STRING(50), allowNull: false },
  FECHA_CREACION: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  USUARIO_MODIFICACION: { type: DataTypes.STRING(50), allowNull: true },
  FECHA_MODIFICACION: { type: DataTypes.DATE, allowNull: true }
}, {
  sequelize: conection,
  modelName: 'CategoriasBases',
  tableName: 'CATEGORIAS_BASES',
  timestamps: false
});

export { CategoriasBases };
