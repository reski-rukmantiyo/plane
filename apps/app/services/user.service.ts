// services
import APIService from "services/api.service";
import trackEventServices from "services/track-event.service";

import type {
  ICurrentUserResponse,
  IUser,
  IUserActivityResponse,
  IUserWorkspaceDashboard,
} from "types";

const { NEXT_PUBLIC_API_BASE_URL } = process.env;

const trackEvent =
  process.env.NEXT_PUBLIC_TRACK_EVENTS === "true" || process.env.NEXT_PUBLIC_TRACK_EVENTS === "1";

class UserService extends APIService {
  constructor() {
    super(NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000");
  }

  currentUserConfig() {
    return {
      url: `${this.baseURL}/api/users/me/`,
      headers: this.getHeaders(),
    };
  }

  async userIssues(workspaceSlug: string): Promise<any> {
    return this.get(`/api/workspaces/${workspaceSlug}/my-issues/`)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async currentUser(): Promise<ICurrentUserResponse> {
    return this.get("/api/users/me/")
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response;
      });
  }

  async updateUser(data: Partial<IUser>): Promise<any> {
    return this.patch("/api/users/me/", data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async updateUserOnBoard({ userRole }: any, user: ICurrentUserResponse | undefined): Promise<any> {
    return this.patch("/api/users/me/onboard/", {
      is_onboarded: true,
    })
      .then((response) => {
        if (trackEvent)
          trackEventServices.trackUserOnboardingCompleteEvent(
            {
              user_role: userRole ?? "None",
            },
            user
          );
        return response?.data;
      })
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async getUserActivity(): Promise<IUserActivityResponse> {
    return this.get("/api/users/activities/")
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async userWorkspaceDashboard(
    workspaceSlug: string,
    month: number
  ): Promise<IUserWorkspaceDashboard> {
    return this.get(`/api/users/me/workspaces/${workspaceSlug}/dashboard/`, {
      params: {
        month: month,
      },
    })
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }

  async forgotPassword(data: { email: string }): Promise<any> {
    return this.post(`/api/forgot-password/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response;
      });
  }

  async resetPassword(
    uidb64: string,
    token: string,
    data: {
      new_password: string;
      confirm_password: string;
    }
  ): Promise<any> {
    return this.post(`/api/reset-password/${uidb64}/${token}/`, data)
      .then((response) => response?.data)
      .catch((error) => {
        throw error?.response?.data;
      });
  }
}

export default new UserService();
