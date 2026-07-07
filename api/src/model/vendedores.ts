// DOCUMENTO	varchar(20)	utf8mb4_0900_ai_ci	NO	PRI	(null)		select
// NOMBRES	varchar(60)	utf8mb4_0900_ai_ci	YES		(null)		select
// GRPVTAS_CODIGO	varchar(30)	utf8mb4_0900_ai_ci	YES		(null)		select
// CARGO	varchar(30)	utf8mb4_0900_ai_ci	YES		(null)		select
// VERSION	varchar(20)	utf8mb4_0900_ai_ci	YES		(null)		select
// NOMBRECARGO	varchar(30)	utf8mb4_0900_ai_ci	YES		(null)		select
// CCOSTO	varchar(10)	utf8mb4_0900_ai_ci	YES		(null)		select

import { Model, InferAttributes, InferCreationAttributes, DataTypes } from 'sequelize';
import { conection } from '../connections'

class Vendedor extends Model<InferAttributes<Vendedor>, InferCreationAttributes<Vendedor>>{
    declare DOCUMENTO: string;
    declare NOMBRES: string;
    declare GRPVTAS_CODIGO: string;
    declare CARGO: string;
    declare VERSION: string;
    declare NOMBRECARGO: string;
    declare CCOSTO: string;
} 

Vendedor.init({
    DOCUMENTO: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
    NOMBRES: { type: DataTypes.STRING, allowNull: true },
    GRPVTAS_CODIGO: { type: DataTypes.STRING, allowNull: true },
    CARGO: { type: DataTypes.STRING, allowNull: true },
    VERSION: { type: DataTypes.STRING, allowNull: true },
    NOMBRECARGO: { type: DataTypes.STRING, allowNull: true },
    CCOSTO: { type: DataTypes.STRING, allowNull: true }
}, {
  sequelize: conection,
  modelName: 'Vendedor',
  tableName: 'VENDEDORES',
  timestamps: false
})


export { Vendedor }