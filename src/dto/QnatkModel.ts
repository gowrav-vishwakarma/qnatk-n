import { Model } from 'sequelize-typescript';

export interface QnatkModel extends Model {
  QnatkActions?(): any; // Adjust the return type as needed
}
