import { useEffect, useState, useRef } from "react";

import { useRouter } from "next/router";
import Link from "next/link";

import { mutate } from "swr";

// react-hook-form
import { useForm } from "react-hook-form";
// react-beautiful-dnd
import { Draggable } from "react-beautiful-dnd";
// services
import pagesService from "services/pages.service";
import issuesService from "services/issues.service";
import aiService from "services/ai.service";
// hooks
import useToast from "hooks/use-toast";
import useOutsideClickDetector from "hooks/use-outside-click-detector";
// components
import { GptAssistantModal } from "components/core";
import { CreateUpdateBlockInline } from "components/pages";
// ui
import { CustomMenu, TextArea } from "components/ui";
// icons
import { LayerDiagonalIcon } from "components/icons";
import { ArrowPathIcon, LinkIcon } from "@heroicons/react/20/solid";
import {
  BoltIcon,
  CheckIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  SparklesIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
// helpers
import { copyTextToClipboard } from "helpers/string.helper";
// types
import { ICurrentUserResponse, IIssue, IPageBlock, IProject } from "types";
// fetch-keys
import { PAGE_BLOCKS_LIST } from "constants/fetch-keys";

type Props = {
  block: IPageBlock;
  projectDetails: IProject | undefined;
  index: number;
  user: ICurrentUserResponse | undefined;
};

export const SinglePageBlock: React.FC<Props> = ({ block, projectDetails, index, user }) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [createBlockForm, setCreateBlockForm] = useState(false);
  const [iAmFeelingLucky, setIAmFeelingLucky] = useState(false);

  const [gptAssistantModal, setGptAssistantModal] = useState(false);

  const [isMenuActive, setIsMenuActive] = useState(false);
  const actionSectionRef = useRef<HTMLDivElement | null>(null);

  const router = useRouter();
  const { workspaceSlug, projectId, pageId } = router.query;

  const { setToastAlert } = useToast();

  const { handleSubmit, watch, reset, setValue, register } = useForm<IPageBlock>({
    defaultValues: {
      name: "",
      description: {},
      description_html: "<p></p>",
    },
  });

  const updatePageBlock = async (formData: Partial<IPageBlock>) => {
    if (!workspaceSlug || !projectId || !pageId) return;

    if (!formData.name || formData.name.length === 0 || formData.name === "") return;

    if (block.issue && block.sync) setIsSyncing(true);

    mutate<IPageBlock[]>(
      PAGE_BLOCKS_LIST(pageId as string),
      (prevData) =>
        prevData?.map((p) => {
          if (p.id === block.id) return { ...p, ...formData };

          return p;
        }),
      false
    );

    await pagesService
      .patchPageBlock(
        workspaceSlug as string,
        projectId as string,
        pageId as string,
        block.id,
        {
          name: formData.name,
          description: formData.description,
          description_html: formData.description_html,
        },
        user
      )
      .then((res) => {
        mutate(PAGE_BLOCKS_LIST(pageId as string));
        if (block.issue && block.sync)
          issuesService
            .patchIssue(
              workspaceSlug as string,
              projectId as string,
              block.issue,
              {
                name: res.name,
                description: res.description,
                description_html: res.description_html,
              },
              user
            )
            .finally(() => setIsSyncing(false));
      });
  };

  const pushBlockIntoIssues = async () => {
    if (!workspaceSlug || !projectId || !pageId) return;

    await pagesService
      .convertPageBlockToIssue(
        workspaceSlug as string,
        projectId as string,
        pageId as string,
        block.id,
        user
      )
      .then((res: IIssue) => {
        mutate<IPageBlock[]>(
          PAGE_BLOCKS_LIST(pageId as string),
          (prevData) =>
            (prevData ?? []).map((p) => {
              if (p.id === block.id) return { ...p, issue: res.id, issue_detail: res };

              return p;
            }),
          false
        );

        setToastAlert({
          type: "success",
          title: "Success!",
          message: "Page block converted to issue successfully.",
        });
      })
      .catch((res) => {
        setToastAlert({
          type: "error",
          title: "Error!",
          message: "Page block could not be converted to issue. Please try again.",
        });
      });
  };

  const deletePageBlock = async () => {
    if (!workspaceSlug || !projectId || !pageId) return;

    mutate<IPageBlock[]>(
      PAGE_BLOCKS_LIST(pageId as string),
      (prevData) => (prevData ?? []).filter((p) => p.id !== block.id),
      false
    );

    await pagesService
      .deletePageBlock(
        workspaceSlug as string,
        projectId as string,
        pageId as string,
        block.id,
        user
      )
      .catch(() => {
        setToastAlert({
          type: "error",
          title: "Error!",
          message: "Page could not be deleted. Please try again.",
        });
      });
  };

  const handleAutoGenerateDescription = async () => {
    if (!workspaceSlug || !projectId) return;

    setIAmFeelingLucky(true);

    aiService
      .createGptTask(
        workspaceSlug as string,
        projectId as string,
        {
          prompt: block.name,
          task: "Generate a proper description for this issue.",
        },
        user
      )
      .then((res) => {
        if (res.response === "")
          setToastAlert({
            type: "error",
            title: "Error!",
            message:
              "Block title isn't informative enough to generate the description. Please try with a different title.",
          });
        else handleAiAssistance(res.response_html);
      })
      .catch((err) => {
        if (err.status === 429)
          setToastAlert({
            type: "error",
            title: "Error!",
            message:
              "You have reached the maximum number of requests of 50 requests per month per user.",
          });
        else
          setToastAlert({
            type: "error",
            title: "Error!",
            message: "Some error occurred. Please try again.",
          });
      })
      .finally(() => setIAmFeelingLucky(false));
  };

  const handleAiAssistance = async (response: string) => {
    if (!workspaceSlug || !projectId) return;

    setValue("description", {});
    setValue("description_html", `${watch("description_html")}<p>${response}</p>`);
    handleSubmit(updatePageBlock)()
      .then(() => {
        setToastAlert({
          type: "success",
          title: "Success!",
          message: "Block description updated successfully.",
        });
      })
      .catch(() => {
        setToastAlert({
          type: "error",
          title: "Error!",
          message: "Block description could not be updated. Please try again.",
        });
      });
  };

  const handleBlockSync = () => {
    if (!workspaceSlug || !projectId || !pageId) return;

    mutate<IPageBlock[]>(
      PAGE_BLOCKS_LIST(pageId as string),
      (prevData) =>
        (prevData ?? []).map((p) => {
          if (p.id === block.id) return { ...p, sync: !block.sync };

          return p;
        }),
      false
    );

    pagesService.patchPageBlock(
      workspaceSlug as string,
      projectId as string,
      pageId as string,
      block.id,
      {
        sync: !block.sync,
      },
      user
    );
  };

  const handleCopyText = () => {
    const originURL =
      typeof window !== "undefined" && window.location.origin ? window.location.origin : "";

    copyTextToClipboard(
      `${originURL}/${workspaceSlug}/projects/${projectId}/issues/${block.issue}`
    ).then(() => {
      setToastAlert({
        type: "success",
        title: "Link Copied!",
        message: "Issue link copied to clipboard.",
      });
    });
  };

  useEffect(() => {
    if (!block) return;

    reset({ ...block });
  }, [reset, block]);

  useOutsideClickDetector(actionSectionRef, () => setIsMenuActive(false));
  return (
    <Draggable draggableId={block.id} index={index} isDragDisabled={createBlockForm}>
      {(provided, snapshot) => (
        <>
          {createBlockForm ? (
            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
              <CreateUpdateBlockInline
                handleAiAssistance={handleAiAssistance}
                handleClose={() => setCreateBlockForm(false)}
                data={block}
                setIsSyncing={setIsSyncing}
                focus="name"
                user={user}
              />
            </div>
          ) : (
            <div
              className={`group relative w-full rounded bg-brand-surface-2 text-brand-secondary ${
                snapshot.isDragging ? "bg-brand-base p-4 shadow" : ""
              }`}
              ref={provided.innerRef}
              {...provided.draggableProps}
            >
              <button
                type="button"
                className="absolute top-4 -left-0 hidden rounded p-0.5 group-hover:!flex"
                {...provided.dragHandleProps}
              >
                <EllipsisVerticalIcon className="h-[18px]" />
                <EllipsisVerticalIcon className="-ml-2.5 h-[18px]" />
              </button>
              <div
                ref={actionSectionRef}
                className={`absolute top-4 right-2 hidden items-center gap-2 bg-brand-surface-2 pl-4 group-hover:!flex ${
                  isMenuActive ? "!flex" : ""
                }`}
              >
                {block.issue && block.sync && (
                  <div className="flex flex-shrink-0 cursor-default items-center gap-1 rounded py-1 px-1.5 text-xs">
                    {isSyncing ? (
                      <ArrowPathIcon className="h-3 w-3 animate-spin" />
                    ) : (
                      <CheckIcon className="h-3 w-3" />
                    )}
                    {isSyncing ? "Syncing..." : "Synced"}
                  </div>
                )}
                <button
                  type="button"
                  className={`flex items-center gap-1 rounded px-1.5 py-1 text-xs hover:bg-brand-surface-1 ${
                    iAmFeelingLucky ? "cursor-wait" : ""
                  }`}
                  onClick={handleAutoGenerateDescription}
                  disabled={iAmFeelingLucky}
                >
                  {iAmFeelingLucky ? (
                    "Generating response..."
                  ) : (
                    <>
                      <SparklesIcon className="h-4 w-4" />I{"'"}m feeling lucky
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="-mr-2 flex items-center gap-1 rounded px-1.5 py-1 text-xs hover:bg-brand-surface-1"
                  onClick={() => setGptAssistantModal((prevData) => !prevData)}
                >
                  <SparklesIcon className="h-4 w-4" />
                  AI
                </button>
                <button
                  type="button"
                  className="-mr-2 flex items-center gap-1 rounded px-1.5 py-1 text-xs hover:bg-brand-surface-1"
                  onClick={() => setCreateBlockForm(true)}
                >
                  <PencilIcon className="h-3.5 w-3.5" />
                </button>
                <CustomMenu
                  customButton={
                    <button
                      className="flex w-full cursor-pointer items-center justify-between gap-1 rounded px-2.5 py-1 text-left text-xs duration-300 hover:bg-brand-surface-1"
                      onClick={() => setIsMenuActive(!isMenuActive)}
                    >
                      <BoltIcon className="h-4.5 w-3.5" />
                    </button>
                  }
                >
                  {block.issue ? (
                    <>
                      <CustomMenu.MenuItem onClick={handleBlockSync}>
                        <span className="flex items-center gap-1">
                          <ArrowPathIcon className="h-4 w-4" />
                          <span>Turn sync {block.sync ? "off" : "on"}</span>
                        </span>
                      </CustomMenu.MenuItem>
                      <CustomMenu.MenuItem onClick={handleCopyText}>
                        <span className="flex items-center gap-1">
                          <LinkIcon className="h-4 w-4" />
                          Copy issue link
                        </span>
                      </CustomMenu.MenuItem>
                    </>
                  ) : (
                    <CustomMenu.MenuItem onClick={pushBlockIntoIssues}>
                      <span className="flex items-center gap-1">
                        <LayerDiagonalIcon className="h-4 w-4" />
                        Push into issues
                      </span>
                    </CustomMenu.MenuItem>
                  )}
                  <CustomMenu.MenuItem onClick={deletePageBlock}>
                    <span className="flex items-center gap-1">
                      <TrashIcon className="h-4 w-4" />
                      Delete block
                    </span>
                  </CustomMenu.MenuItem>
                </CustomMenu>
              </div>
              <div className={`flex items-start gap-2 px-3 ${snapshot.isDragging ? "" : "py-4"}`}>
                <div
                  className="w-full cursor-pointer overflow-hidden break-words px-4"
                  onClick={() => setCreateBlockForm(true)}
                >
                  <div className="flex items-center">
                    {block.issue && (
                      <div className="mr-1.5 flex">
                        <Link
                          href={`/${workspaceSlug}/projects/${projectId}/issues/${block.issue}`}
                        >
                          <a className="flex h-6 flex-shrink-0 items-center gap-1 rounded bg-brand-surface-2 px-1.5 py-1 text-xs">
                            <LayerDiagonalIcon height="16" width="16" />
                            {projectDetails?.identifier}-{block.issue_detail?.sequence_id}
                          </a>
                        </Link>
                      </div>
                    )}
                    <TextArea
                      name="blockName"
                      value={block.name}
                      className="min-h-[20px] block w-full resize-none overflow-hidden border-none bg-transparent text-sm text-brand-base"
                      noPadding
                    />
                  </div>
                  {block?.description_stripped.length > 0 && (
                    <p className="mt-3 h-5 truncate text-sm font-normal text-brand-secondary">
                      {block.description_stripped}
                    </p>
                  )}
                </div>
              </div>
              <GptAssistantModal
                block={block}
                isOpen={gptAssistantModal}
                handleClose={() => setGptAssistantModal(false)}
                inset="top-8 left-0"
                content={block.description_stripped}
                htmlContent={block.description_html}
                onResponse={handleAiAssistance}
                projectId={projectId as string}
              />
            </div>
          )}
        </>
      )}
    </Draggable>
  );
};
