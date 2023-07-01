import React, { useState } from "react";

import { useRouter } from "next/router";

import useSWR, { mutate } from "swr";

// services
import estimatesService from "services/estimates.service";
import projectService from "services/project.service";
// hooks
import useProjectDetails from "hooks/use-project-details";
// layouts
import { ProjectAuthorizationWrapper } from "layouts/auth-layout";
// components
import { CreateUpdateEstimateModal, SingleEstimate } from "components/estimates";
import { SettingsHeader } from "components/project";
//hooks
import useToast from "hooks/use-toast";
import useUserAuth from "hooks/use-user-auth";
// ui
import { EmptyState, Loader, SecondaryButton } from "components/ui";
import { BreadcrumbItem, Breadcrumbs } from "components/breadcrumbs";
// icons
import { PlusIcon } from "@heroicons/react/24/outline";
// images
import emptyEstimate from "public/empty-state/empty-estimate.svg";
// types
import { IEstimate, IProject } from "types";
import type { NextPage } from "next";
// fetch-keys
import { ESTIMATES_LIST, PROJECT_DETAILS } from "constants/fetch-keys";

const EstimatesSettings: NextPage = () => {
  const [estimateFormOpen, setEstimateFormOpen] = useState(false);

  const [estimateToUpdate, setEstimateToUpdate] = useState<IEstimate | undefined>();

  const router = useRouter();
  const { workspaceSlug, projectId } = router.query;

  const { user } = useUserAuth();

  const { setToastAlert } = useToast();

  const { projectDetails } = useProjectDetails();

  const { data: estimatesList } = useSWR<IEstimate[]>(
    workspaceSlug && projectId ? ESTIMATES_LIST(projectId as string) : null,
    workspaceSlug && projectId
      ? () => estimatesService.getEstimatesList(workspaceSlug as string, projectId as string)
      : null
  );

  const editEstimate = (estimate: IEstimate) => {
    setEstimateToUpdate(estimate);
    setEstimateFormOpen(true);
  };

  const removeEstimate = (estimateId: string) => {
    if (!workspaceSlug || !projectId) return;

    mutate<IEstimate[]>(
      ESTIMATES_LIST(projectId as string),
      (prevData) => (prevData ?? []).filter((p) => p.id !== estimateId),
      false
    );

    estimatesService
      .deleteEstimate(workspaceSlug as string, projectId as string, estimateId, user)
      .catch(() => {
        setToastAlert({
          type: "error",
          title: "Error!",
          message: "Error: Estimate could not be deleted. Please try again",
        });
      });
  };

  const disableEstimates = () => {
    if (!workspaceSlug || !projectId) return;

    mutate<IProject>(
      PROJECT_DETAILS(projectId as string),
      (prevData) => {
        if (!prevData) return prevData;

        return { ...prevData, estimate: null };
      },
      false
    );

    projectService
      .updateProject(workspaceSlug as string, projectId as string, { estimate: null }, user)
      .catch(() =>
        setToastAlert({
          type: "error",
          title: "Error!",
          message: "Estimate could not be disabled. Please try again",
        })
      );
  };

  return (
    <>
      <CreateUpdateEstimateModal
        isOpen={estimateFormOpen}
        data={estimateToUpdate}
        handleClose={() => {
          setEstimateFormOpen(false);
          setEstimateToUpdate(undefined);
        }}
        user={user}
      />
      <ProjectAuthorizationWrapper
        breadcrumbs={
          <Breadcrumbs>
            <BreadcrumbItem
              title={`${projectDetails?.name ?? "Project"}`}
              link={`/${workspaceSlug}/projects/${projectDetails?.id}/issues`}
            />
            <BreadcrumbItem title="Estimates Settings" />
          </Breadcrumbs>
        }
      >
        <div className="p-8">
          <SettingsHeader />
          <section className="flex items-center justify-between">
            <h3 className="text-2xl font-semibold">Estimates</h3>
            <div className="col-span-12 space-y-5 sm:col-span-7">
              <div className="flex items-center gap-2">
                <span
                  className="flex cursor-pointer items-center gap-2 text-theme"
                  onClick={() => {
                    setEstimateToUpdate(undefined);
                    setEstimateFormOpen(true);
                  }}
                >
                  <PlusIcon className="h-4 w-4" />
                  Create New Estimate
                </span>
                {projectDetails?.estimate && (
                  <SecondaryButton onClick={disableEstimates}>Disable Estimates</SecondaryButton>
                )}
              </div>
            </div>
          </section>
          {estimatesList ? (
            estimatesList.length > 0 ? (
              <section className="mt-5 divide-y divide-brand-base rounded-xl border border-brand-base bg-brand-base px-6">
                {estimatesList.map((estimate) => (
                  <SingleEstimate
                    key={estimate.id}
                    estimate={estimate}
                    editEstimate={(estimate) => editEstimate(estimate)}
                    handleEstimateDelete={(estimateId) => removeEstimate(estimateId)}
                    user={user}
                  />
                ))}
              </section>
            ) : (
              <div className="mt-5">
                <EmptyState
                  type="estimate"
                  title="Create New Estimate"
                  description="Estimates help you communicate the complexity of an issue. You can create your own estimate and communicate with your team."
                  imgURL={emptyEstimate}
                  action={() => {
                    setEstimateToUpdate(undefined);
                    setEstimateFormOpen(true);
                  }}
                />
              </div>
            )
          ) : (
            <Loader className="mt-5 space-y-5">
              <Loader.Item height="40px" />
              <Loader.Item height="40px" />
              <Loader.Item height="40px" />
              <Loader.Item height="40px" />
            </Loader>
          )}
        </div>
      </ProjectAuthorizationWrapper>
    </>
  );
};

export default EstimatesSettings;
