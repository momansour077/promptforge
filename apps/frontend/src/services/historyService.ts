import { promptService } from "./promptService";

export const historyService = {
  list: promptService.history,
  regenerate: promptService.regenerate,
  toggleFavorite: promptService.toggleFavorite,
  remove: promptService.remove
};
