import { DataTypes, Model, InferAttributes, InferCreationAttributes } from 'sequelize'
import { conection } from '../connections'

class LogGestionCartera extends Model<InferAttributes<LogGestionCartera>, InferCreationAttributes<LogGestionCartera>> {
  declare ID?: number
  declare EMPRESA?: string | null
  declare CEDULA?: string | null
  declare NOMBRES?: string | null
  declare CARGO?: string | null
  declare ZONA?: string | null
  declare BASE?: string | null
  declare SALDO_ANT?: number | null
  declare DEBITO?: number | null
  declare CREDITO?: number | null
  declare SALDO?: number | null
  declare CARTERA?: number | null
  declare RECHAZADOS?: number | null
  declare ACEPTADOS?: number | null
  declare PENDIENTE_CONTEO?: number | null
  declare VENTA_BNET?: number | null
  declare CUADRE_WEB?: number | null
  declare ANULADOS?: number | null
  declare WHATSAPP?: string | null
  declare MENSAJE_ENVIADO?: string | null
  declare FECHA_HORA_ENVIO?: Date | null
  declare ESTADO_ENVIO?: string | null
  declare API_MENSAJE_ID?: string | null
  declare FECHA_RECEPCION?: Date | null
  declare ERROR_ENVIO?: string | null
  declare NUMERO_INTENTOS?: number | null
  declare USUARIO_ENVIO?: string | null
  declare FECHA_REGISTRO?: Date
}

LogGestionCartera.init({
  ID: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  EMPRESA: { type: DataTypes.STRING(100), allowNull: true },
  CEDULA: { type: DataTypes.STRING(20), allowNull: true },
  NOMBRES: { type: DataTypes.STRING(200), allowNull: true },
  CARGO: { type: DataTypes.STRING(100), allowNull: true },
  ZONA: { type: DataTypes.STRING(50), allowNull: true },
  BASE: { type: DataTypes.STRING(50), allowNull: true },
  SALDO_ANT: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  DEBITO: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  CREDITO: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  SALDO: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  CARTERA: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  RECHAZADOS: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  ACEPTADOS: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  PENDIENTE_CONTEO: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  VENTA_BNET: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  CUADRE_WEB: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  ANULADOS: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  WHATSAPP: { type: DataTypes.STRING(20), allowNull: true },
  MENSAJE_ENVIADO: { type: DataTypes.TEXT, allowNull: true },
  FECHA_HORA_ENVIO: { type: DataTypes.DATE, allowNull: true },
  ESTADO_ENVIO: { type: DataTypes.ENUM('PENDIENTE', 'ENVIADO', 'RECIBIDO', 'ERROR'), allowNull: true, defaultValue: 'PENDIENTE' },
  API_MENSAJE_ID: { type: DataTypes.STRING(150), allowNull: true },
  FECHA_RECEPCION: { type: DataTypes.DATE, allowNull: true },
  ERROR_ENVIO: { type: DataTypes.TEXT, allowNull: true },
  NUMERO_INTENTOS: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 1 },
  USUARIO_ENVIO: { type: DataTypes.STRING(50), allowNull: true },
  FECHA_REGISTRO: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  sequelize: conection,
  modelName: 'LogGestionCartera',
  tableName: 'LOG_GESTION_CARTERA',
  timestamps: false,
});

export { LogGestionCartera }
