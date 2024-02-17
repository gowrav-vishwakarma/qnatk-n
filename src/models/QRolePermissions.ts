import {
  BelongsTo,
  Column,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import QRoles from './QRoles';
import QEntityActions from './QEntityActions';

@Table({
  tableName: 'q_permissions',
  timestamps: false,
})
export default class QRolePermissions extends Model<QRolePermissions> {
  @ForeignKey(() => QEntityActions)
  @Column
  entity_action_id: number;

  @BelongsTo(() => QEntityActions, 'entity_action_id')
  entityAction: QEntityActions;

  @ForeignKey(() => QRoles)
  @Column
  role_id: number;

  @Column({
    defaultValue: 0,
  })
  status: number;

  @Column
  from_ips: string;
}

// create sql to generate this table
