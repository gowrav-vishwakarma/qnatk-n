import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({
    tableName: 'q_roles',
    timestamps: false,
})
export default class QRoles extends Model<QRoles> {
    @Column
    name: string;

    @Column({
        type: DataType.JSON,
        allowNull: true,
    })
    permissions: {
        menus: string[];
        routes: string[];
    };
}
