import React, { useState } from "react";

import Link from "next/link";
import { useRouter } from "next/router";

// react-hook-form
import { UseFormWatch } from "react-hook-form";
// hooks
import useToast from "hooks/use-toast";
import useProjectDetails from "hooks/use-project-details";
// components
import { ExistingIssuesListModal } from "components/core";
// icons
import { XMarkIcon } from "@heroicons/react/24/outline";
import { BlockerIcon } from "components/icons";
// types
import { BlockeIssue, IIssue, ISearchIssueResponse, UserAuth } from "types";

type Props = {
  issueId?: string;
  submitChanges: (formData: Partial<IIssue>) => void;
  watch: UseFormWatch<IIssue>;
  userAuth: UserAuth;
};

export const SidebarBlockerSelect: React.FC<Props> = ({
  issueId,
  submitChanges,
  watch,
  userAuth,
}) => {
  const [isBlockerModalOpen, setIsBlockerModalOpen] = useState(false);

  const { setToastAlert } = useToast();
  const { projectDetails } = useProjectDetails();

  const router = useRouter();
  const { workspaceSlug, projectId } = router.query;

  const handleClose = () => {
    setIsBlockerModalOpen(false);
  };

  const onSubmit = async (data: ISearchIssueResponse[]) => {
    if (data.length === 0) {
      setToastAlert({
        type: "error",
        title: "Error!",
        message: "Please select at least one issue.",
      });

      return;
    }

    const selectedIssues: BlockeIssue[] = data.map((i) => ({
      blocker_issue_detail: {
        id: i.id,
        name: i.name,
        sequence_id: i.sequence_id,
      },
    }));

    const newBlockers = [...watch("blocker_issues"), ...selectedIssues];

    submitChanges({
      blocker_issues: newBlockers,
      blockers_list: newBlockers.map((i) => i.blocker_issue_detail?.id ?? ""),
    });
    handleClose();
  };

  const isNotAllowed = userAuth.isGuest || userAuth.isViewer;

  return (
    <>
      <ExistingIssuesListModal
        isOpen={isBlockerModalOpen}
        handleClose={() => setIsBlockerModalOpen(false)}
        searchParams={{ blocker_blocked_by: true, issue_id: issueId }}
        handleOnSubmit={onSubmit}
      />
      <div className="flex flex-wrap items-start py-2">
        <div className="flex items-center gap-x-2 text-sm text-brand-secondary sm:basis-1/2">
          <BlockerIcon height={16} width={16} />
          <p>Blocking</p>
        </div>
        <div className="space-y-1 sm:basis-1/2">
          <div className="flex flex-wrap gap-1">
            {watch("blocker_issues") && watch("blocker_issues").length > 0
              ? watch("blocker_issues").map((issue) => (
                  <div
                    key={issue.blocker_issue_detail?.id}
                    className="group flex cursor-pointer items-center gap-1 rounded-2xl border border-brand-base px-1.5 py-0.5 text-xs text-yellow-500 duration-300 hover:border-yellow-500/20 hover:bg-yellow-500/20"
                  >
                    <Link
                      href={`/${workspaceSlug}/projects/${projectId}/issues/${issue.blocker_issue_detail?.id}`}
                    >
                      <a className="flex items-center gap-1">
                        <BlockerIcon height={10} width={10} />
                        {`${projectDetails?.identifier}-${issue.blocker_issue_detail?.sequence_id}`}
                      </a>
                    </Link>
                    <button
                      type="button"
                      className="opacity-0 duration-300 group-hover:opacity-100"
                      onClick={() => {
                        const updatedBlockers = watch("blocker_issues").filter(
                          (i) => i.blocker_issue_detail?.id !== issue.blocker_issue_detail?.id
                        );

                        submitChanges({
                          blocker_issues: updatedBlockers,
                          blockers_list: updatedBlockers.map(
                            (i) => i.blocker_issue_detail?.id ?? ""
                          ),
                        });
                      }}
                    >
                      <XMarkIcon className="h-2 w-2" />
                    </button>
                  </div>
                ))
              : null}
          </div>
          <button
            type="button"
            className={`flex w-full text-brand-secondary ${
              isNotAllowed ? "cursor-not-allowed" : "cursor-pointer hover:bg-brand-surface-2"
            } items-center justify-between gap-1 rounded-md border border-brand-base px-2 py-1 text-xs shadow-sm duration-300 focus:outline-none`}
            onClick={() => setIsBlockerModalOpen(true)}
            disabled={isNotAllowed}
          >
            Select issues
          </button>
        </div>
      </div>
    </>
  );
};
