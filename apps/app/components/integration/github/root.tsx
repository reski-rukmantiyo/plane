import React, { useState } from "react";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";

import useSWR, { mutate } from "swr";

// react-hook-form
import { useForm } from "react-hook-form";
// services
import IntegrationService from "services/integration";
import GithubIntegrationService from "services/integration/github.service";
// hooks
import useToast from "hooks/use-toast";
// components
import {
  GithubImportConfigure,
  GithubImportData,
  GithubRepoDetails,
  GithubImportUsers,
  GithubImportConfirm,
} from "components/integration";
// icons
import { CogIcon, CloudUploadIcon, UsersIcon, CheckIcon } from "components/icons";
import { ArrowLeftIcon, ListBulletIcon } from "@heroicons/react/24/outline";
// images
import GithubLogo from "public/services/github.png";
// types
import { ICurrentUserResponse, IGithubRepoCollaborator, IGithubServiceImportFormData } from "types";
// fetch-keys
import {
  APP_INTEGRATIONS,
  IMPORTER_SERVICES_LIST,
  WORKSPACE_INTEGRATIONS,
} from "constants/fetch-keys";

export type TIntegrationSteps =
  | "import-configure"
  | "import-data"
  | "repo-details"
  | "import-users"
  | "import-confirm";
export interface IIntegrationData {
  state: TIntegrationSteps;
}

export interface IUserDetails {
  username: string;
  import: any;
  email: string;
}

export type TFormValues = {
  github: any;
  project: string | null;
  sync: boolean;
  collaborators: IGithubRepoCollaborator[];
  users: IUserDetails[];
};

const defaultFormValues = {
  github: null,
  project: null,
  sync: false,
};

const integrationWorkflowData = [
  {
    title: "Configure",
    key: "import-configure",
    icon: CogIcon,
  },
  {
    title: "Import Data",
    key: "import-data",
    icon: CloudUploadIcon,
  },
  { title: "Issues", key: "repo-details", icon: ListBulletIcon },
  {
    title: "Users",
    key: "import-users",
    icon: UsersIcon,
  },
  {
    title: "Confirm",
    key: "import-confirm",
    icon: CheckIcon,
  },
];

type Props = {
  user: ICurrentUserResponse | undefined;
};

export const GithubImporterRoot: React.FC<Props> = ({ user }) => {
  const [currentStep, setCurrentStep] = useState<IIntegrationData>({
    state: "import-configure",
  });
  const [users, setUsers] = useState<IUserDetails[]>([]);

  const router = useRouter();
  const { workspaceSlug, provider } = router.query;

  const { setToastAlert } = useToast();

  const { handleSubmit, control, setValue, watch } = useForm<TFormValues>({
    defaultValues: defaultFormValues,
  });

  const { data: appIntegrations } = useSWR(APP_INTEGRATIONS, () =>
    IntegrationService.getAppIntegrationsList()
  );

  const { data: workspaceIntegrations } = useSWR(
    workspaceSlug ? WORKSPACE_INTEGRATIONS(workspaceSlug as string) : null,
    workspaceSlug
      ? () => IntegrationService.getWorkspaceIntegrationsList(workspaceSlug as string)
      : null
  );

  const activeIntegrationState = () => {
    const currentElementIndex = integrationWorkflowData.findIndex(
      (i) => i?.key === currentStep?.state
    );

    return currentElementIndex;
  };

  const handleStepChange = (value: TIntegrationSteps) => {
    setCurrentStep((prevData) => ({ ...prevData, state: value }));
  };

  // current integration from all the integrations available
  const integration =
    appIntegrations &&
    appIntegrations.length > 0 &&
    appIntegrations.find((i) => i.provider === provider);

  // current integration from workspace integrations
  const workspaceIntegration =
    integration &&
    workspaceIntegrations?.find((i: any) => i.integration_detail.id === integration.id);

  const createGithubImporterService = async (formData: TFormValues) => {
    if (!formData.github || !formData.project) return;

    const payload: IGithubServiceImportFormData = {
      metadata: {
        owner: formData.github.owner.login,
        name: formData.github.name,
        repository_id: formData.github.id,
        url: formData.github.html_url,
      },
      data: {
        users: users,
      },
      config: {
        sync: formData.sync,
      },
      project_id: formData.project,
    };

    await GithubIntegrationService.createGithubServiceImport(workspaceSlug as string, payload, user)
      .then(() => {
        router.push(`/${workspaceSlug}/settings/import-export`);
        mutate(IMPORTER_SERVICES_LIST(workspaceSlug as string));
      })
      .catch(() =>
        setToastAlert({
          type: "error",
          title: "Error!",
          message: "Import was unsuccessful. Please try again.",
        })
      );
  };

  return (
    <form onSubmit={handleSubmit(createGithubImporterService)}>
      <div className="space-y-2">
        <Link href={`/${workspaceSlug}/settings/import-export`}>
          <div className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-brand-secondary hover:text-brand-base">
            <ArrowLeftIcon className="h-3 w-3" />
            <div>Cancel import & go back</div>
          </div>
        </Link>

        <div className="space-y-4 rounded-[10px] border border-brand-base bg-brand-base p-4">
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 flex-shrink-0">
              <Image src={GithubLogo} alt="GithubLogo" />
            </div>
            <div className="flex h-full w-full items-center justify-center">
              {integrationWorkflowData.map((integration, index) => (
                <React.Fragment key={integration.key}>
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border ${
                      index <= activeIntegrationState()
                        ? `border-brand-accent bg-brand-accent ${
                            index === activeIntegrationState()
                              ? "border-opacity-100 bg-opacity-100"
                              : "border-opacity-80 bg-opacity-80"
                          }`
                        : "border-brand-base"
                    }`}
                  >
                    <integration.icon
                      width="18px"
                      height="18px"
                      color={index <= activeIntegrationState() ? "#ffffff" : "#d1d5db"}
                    />
                  </div>
                  {index < integrationWorkflowData.length - 1 && (
                    <div
                      key={index}
                      className={`border-b px-7 ${
                        index <= activeIntegrationState() - 1
                          ? `border-brand-accent`
                          : `border-brand-base`
                      }`}
                    >
                      {" "}
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <div className="relative w-full space-y-4">
            <div className="w-full">
              {currentStep?.state === "import-configure" && (
                <GithubImportConfigure
                  handleStepChange={handleStepChange}
                  provider={provider as string}
                  appIntegrations={appIntegrations}
                  workspaceIntegrations={workspaceIntegrations}
                />
              )}
              {currentStep?.state === "import-data" && (
                <GithubImportData
                  handleStepChange={handleStepChange}
                  integration={workspaceIntegration}
                  control={control}
                  watch={watch}
                />
              )}
              {currentStep?.state === "repo-details" && (
                <GithubRepoDetails
                  selectedRepo={watch("github")}
                  handleStepChange={handleStepChange}
                  setUsers={setUsers}
                  setValue={setValue}
                />
              )}
              {currentStep?.state === "import-users" && (
                <GithubImportUsers
                  handleStepChange={handleStepChange}
                  users={users}
                  setUsers={setUsers}
                  watch={watch}
                />
              )}
              {currentStep?.state === "import-confirm" && (
                <GithubImportConfirm handleStepChange={handleStepChange} watch={watch} />
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};
