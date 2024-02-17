import { Column, HasMany, Model, Table } from 'sequelize-typescript';
import QRolePermissions from './QRolePermissions';

@Table({
  tableName: 'q_entity_actions',
  timestamps: false,
})
export default class QEntityActions extends Model<QEntityActions> {
  @Column
  BaseModel: string;

  @Column
  Action: string;

  @HasMany(() => QRolePermissions, 'entity_action_id')
  permissions: QRolePermissions[];
}
