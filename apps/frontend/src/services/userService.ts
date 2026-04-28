import api from "./api";

import type { ApiResponse, QuotaPayload, StatsPayload } from "../types";

export const userService = {
  stats: async (): Promise<StatsPayload> => {
    const response = await api.get<ApiResponse<StatsPayload>>("/user/stats");
    return response.data.data;
  },
  quota: async (): Promise<QuotaPayload["quota"]> => {
    const response = await api.get<ApiResponse<QuotaPayload>>("/user/quota");
    return response.data.data.quota;
  }
};

