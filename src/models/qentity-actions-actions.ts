import { ActionDTO, ActionListDTO } from '../dto/ActionListDTO';

export const QEntityActionsActions: ActionListDTO = {
  updateActions: {
    name: 'updateActions',
    mode: 'NoRecord',
    loadBy: 'id',
  } as ActionDTO,

  togglePermission: {
    name: 'togglePermission',
    mode: 'NoRecord',
    loadBy: 'id',
  } as ActionDTO,
};
