import React, { useCallback, useEffect, useState } from "react";

import { useRouter } from "next/router";
import dynamic from "next/dynamic";

import { mutate } from "swr";

import { SparklesIcon } from "@heroicons/react/24/outline";

// react-hook-form
import { Controller, useForm } from "react-hook-form";
// services
import pagesService from "services/pages.service";
import issuesService from "services/issues.service";
import aiService from "services/ai.service";
// hooks
import useToast from "hooks/use-toast";
// components
import { GptAssistantModal } from "components/core";
// ui
import { Loader, PrimaryButton, SecondaryButton, TextArea } from "components/ui";
// types
import { ICurrentUserResponse, IPageBlock } from "types";
// fetch-keys
import { PAGE_BLOCKS_LIST } from "constants/fetch-keys";

type Props = {
  handleClose: () => void;
  data?: IPageBlock;
  handleAiAssistance?: (response: string) => void;
  setIsSyncing?: React.Dispatch<React.SetStateAction<boolean>>;
  focus?: keyof IPageBlock;
  user: ICurrentUserResponse | undefined;
};

const defaultValues = {
  name: "",
  description: null,
  description_html: null,
};

const RemirrorRichTextEditor = dynamic(() => import("components/rich-text-editor"), {
  ssr: false,
  loading: () => (
    <Loader className="mx-4 mt-6">
      <Loader.Item height="100px" width="100%" />
    </Loader>
  ),
});
import { IRemirrorRichTextEditor } from "components/rich-text-editor";

const WrappedRemirrorRichTextEditor = React.forwardRef<
  IRemirrorRichTextEditor,
  IRemirrorRichTextEditor
>((props, ref) => <RemirrorRichTextEditor {...props} forwardedRef={ref} />);

WrappedRemirrorRichTextEditor.displayName = "WrappedRemirrorRichTextEditor";

export const CreateUpdateBlockInline: React.FC<Props> = ({
  handleClose,
  data,
  handleAiAssistance,
  setIsSyncing,
  focus,
  user,
}) => {
  const [iAmFeelingLucky, setIAmFeelingLucky] = useState(false);
  const [gptAssistantModal, setGptAssistantModal] = useState(false);

  const editorRef = React.useRef<any>(null);

  const router = useRouter();
  const { workspaceSlug, projectId, pageId } = router.query;

  const { setToastAlert } = useToast();

  const {
    handleSubmit,
    register,
    control,
    watch,
    setValue,
    setFocus,
    reset,
    formState: { isSubmitting },
  } = useForm<IPageBlock>({
    defaultValues,
  });

  const onClose = useCallback(() => {
    if (data) handleClose();

    reset();
  }, [handleClose, reset, data]);

  const createPageBlock = useCallback(
    async (formData: Partial<IPageBlock>) => {
      if (!workspaceSlug || !projectId || !pageId) return;

      await pagesService
        .createPageBlock(
          workspaceSlug as string,
          projectId as string,
          pageId as string,
          {
            name: formData.name,
            description: formData.description ?? "",
            description_html: formData.description_html ?? "<p></p>",
          },
          user
        )
        .then((res) => {
          mutate<IPageBlock[]>(
            PAGE_BLOCKS_LIST(pageId as string),
            (prevData) => [...(prevData as IPageBlock[]), res],
            false
          );
          editorRef.current?.clearEditor();
        })
        .catch(() => {
          setToastAlert({
            type: "error",
            title: "Error!",
            message: "Page could not be created. Please try again.",
          });
        })
        .finally(() => onClose());
    },
    [workspaceSlug, projectId, pageId, onClose, setToastAlert, user]
  );

  const updatePageBlock = useCallback(
    async (formData: Partial<IPageBlock>) => {
      if (!workspaceSlug || !projectId || !pageId || !data) return;

      if (data.issue && data.sync && setIsSyncing) setIsSyncing(true);

      mutate<IPageBlock[]>(
        PAGE_BLOCKS_LIST(pageId as string),
        (prevData) =>
          prevData?.map((p) => {
            if (p.id === data.id) return { ...p, ...formData };

            return p;
          }),
        false
      );

      await pagesService
        .patchPageBlock(
          workspaceSlug as string,
          projectId as string,
          pageId as string,
          data.id,
          {
            name: formData.name,
            description: formData.description,
            description_html: formData.description_html,
          },
          user
        )
        .then((res) => {
          mutate(PAGE_BLOCKS_LIST(pageId as string));
          editorRef.current?.setEditorValue(res.description_html);
          if (data.issue && data.sync)
            issuesService
              .patchIssue(
                workspaceSlug as string,
                projectId as string,
                data.issue,
                {
                  name: res.name,
                  description: res.description,
                  description_html: res.description_html,
                },
                user
              )
              .finally(() => {
                if (setIsSyncing) setIsSyncing(false);
              });
        })
        .finally(() => onClose());
    },
    [workspaceSlug, projectId, pageId, data, onClose, setIsSyncing, user]
  );

  const handleAutoGenerateDescription = async () => {
    if (!workspaceSlug || !projectId) return;

    setIAmFeelingLucky(true);

    aiService
      .createGptTask(
        workspaceSlug as string,
        projectId as string,
        {
          prompt: watch("name"),
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
        else {
          setValue("description", {});
          setValue("description_html", `${watch("description_html") ?? ""}<p>${res.response}</p>`);
          editorRef.current?.setEditorValue(watch("description_html") ?? "");
        }
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

  useEffect(() => {
    if (focus) setFocus(focus);

    if (!data) return;

    reset({
      ...defaultValues,
      name: data.name,
      description:
        !data.description || data.description === ""
          ? {
              type: "doc",
              content: [{ type: "paragraph" }],
            }
          : data.description,
      description_html: data.description_html ?? "<p></p>",
    });
  }, [reset, data, focus, setFocus]);

  useEffect(() => {
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    });

    return () => {
      window.removeEventListener("keydown", (e: KeyboardEvent) => {
        if (e.key === "Escape") handleClose();
      });
    };
  }, [handleClose]);

  useEffect(() => {
    const submitForm = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        if (data) handleSubmit(updatePageBlock)();
        else handleSubmit(createPageBlock)();
      }
    };

    window.addEventListener("keydown", submitForm);

    return () => {
      window.removeEventListener("keydown", submitForm);
    };
  }, [createPageBlock, updatePageBlock, data, handleSubmit]);

  return (
    <div className="relative">
      <form
        className="divide-y divide-brand-base rounded border border-brand-base shadow"
        onSubmit={data ? handleSubmit(updatePageBlock) : handleSubmit(createPageBlock)}
      >
        <div className="pt-2">
          <div className="flex justify-between">
            <TextArea
              id="name"
              name="name"
              placeholder="Title"
              register={register}
              className="min-h-10 font medium block w-full resize-none overflow-hidden border-none bg-transparent py-1 text-base"
              autoComplete="off"
              maxLength={255}
            />
          </div>
          <div className="page-block-section relative -mt-2 text-brand-secondary">
            <Controller
              name="description"
              control={control}
              render={({ field: { value } }) => {
                if (!data)
                  return (
                    <WrappedRemirrorRichTextEditor
                      value={{
                        type: "doc",
                        content: [{ type: "paragraph" }],
                      }}
                      onJSONChange={(jsonValue) => setValue("description", jsonValue)}
                      onHTMLChange={(htmlValue) => setValue("description_html", htmlValue)}
                      placeholder="Write something..."
                      customClassName="text-sm"
                      noBorder
                      borderOnFocus={false}
                      ref={editorRef}
                    />
                  );
                else if (!value || !watch("description_html"))
                  return (
                    <div className="h-32 w-full flex items-center justify-center text-brand-secondary text-sm" />
                  );

                return (
                  <WrappedRemirrorRichTextEditor
                    value={
                      value && value !== "" && Object.keys(value).length > 0
                        ? value
                        : watch("description_html") && watch("description_html") !== ""
                        ? watch("description_html")
                        : { type: "doc", content: [{ type: "paragraph" }] }
                    }
                    onJSONChange={(jsonValue) => setValue("description", jsonValue)}
                    onHTMLChange={(htmlValue) => setValue("description_html", htmlValue)}
                    placeholder="Write something..."
                    customClassName="text-sm"
                    noBorder
                    borderOnFocus={false}
                    ref={editorRef}
                  />
                );
              }}
            />
            <div className="m-2 mt-6 flex">
              <button
                type="button"
                className={`flex items-center gap-1 rounded px-1.5 py-1 text-xs hover:bg-brand-surface-2 ${
                  iAmFeelingLucky ? "cursor-wait bg-brand-surface-1" : ""
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
                className="ml-2 flex items-center gap-1 rounded px-1.5 py-1 text-xs hover:bg-brand-surface-2"
                onClick={() => setGptAssistantModal(true)}
              >
                <SparklesIcon className="h-4 w-4" />
                AI
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 p-4">
          <SecondaryButton onClick={handleClose}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={watch("name") === ""} loading={isSubmitting}>
            {data
              ? isSubmitting
                ? "Updating..."
                : "Update block"
              : isSubmitting
              ? "Adding..."
              : "Add block"}
          </PrimaryButton>
        </div>
      </form>
      <GptAssistantModal
        block={data ? data : undefined}
        isOpen={gptAssistantModal}
        handleClose={() => setGptAssistantModal(false)}
        inset="top-8 left-0"
        content={watch("description_html")}
        htmlContent={watch("description_html")}
        onResponse={(response) => {
          if (data && handleAiAssistance) {
            handleAiAssistance(response);
            editorRef.current?.setEditorValue(
              `${watch("description_html")}<p>${response}</p>` ?? ""
            );
          } else {
            setValue("description", {});
            setValue("description_html", `${watch("description_html")}<p>${response}</p>`);

            editorRef.current?.setEditorValue(watch("description_html") ?? "");
          }
        }}
        projectId={projectId?.toString() ?? ""}
      />
    </div>
  );
};
