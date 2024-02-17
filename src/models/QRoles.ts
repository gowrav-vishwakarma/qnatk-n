import { Column, Model, Table } from 'sequelize-typescript';

@Table({
  tableName: 'q_roles',
  timestamps: false,
})
export default class QRoles extends Model<QRoles> {
  @Column
  name: string;
}

// create sql to generate this tabel

// create sql to generate this table

//
