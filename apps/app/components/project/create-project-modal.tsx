import React, { useState, useEffect } from "react";

import { useRouter } from "next/router";

import useSWR, { mutate } from "swr";

import { useForm, Controller } from "react-hook-form";

import { Dialog, Transition } from "@headlessui/react";

// services
import projectServices from "services/project.service";
import workspaceService from "services/workspace.service";
// hooks
import useToast from "hooks/use-toast";
// ui
import { Input, TextArea, CustomSelect, PrimaryButton, SecondaryButton } from "components/ui";
// icons
import { XMarkIcon } from "@heroicons/react/24/outline";
// components
import { ImagePickerPopover } from "components/core";
import EmojiIconPicker from "components/emoji-icon-picker";
// helpers
import { getRandomEmoji } from "helpers/common.helper";
// types
import { ICurrentUserResponse, IProject } from "types";
// fetch-keys
import { PROJECTS_LIST, WORKSPACE_MEMBERS_ME } from "constants/fetch-keys";
// constants
import { NETWORK_CHOICES } from "constants/project";

type Props = {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  user: ICurrentUserResponse | undefined;
};

const defaultValues: Partial<IProject> = {
  name: "",
  identifier: "",
  description: "",
  network: 2,
  emoji_and_icon: getRandomEmoji(),
  cover_image:
    "https://images.unsplash.com/photo-1575116464504-9e7652fddcb3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=MnwyODUyNTV8MHwxfHNlYXJjaHwxOHx8cGxhbmV8ZW58MHx8fHwxNjgxNDY4NTY5&ixlib=rb-4.0.3&q=80&w=1080",
};

const IsGuestCondition: React.FC<{
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}> = ({ setIsOpen }) => {
  const { setToastAlert } = useToast();

  useEffect(() => {
    setIsOpen(false);
    setToastAlert({
      title: "Error",
      type: "error",
      message: "You don't have permission to create project.",
    });
  }, [setIsOpen, setToastAlert]);

  return null;
};

export const CreateProjectModal: React.FC<Props> = (props) => {
  const { isOpen, setIsOpen, user } = props;

  const [isChangeIdentifierRequired, setIsChangeIdentifierRequired] = useState(true);

  const { setToastAlert } = useToast();

  const {
    query: { workspaceSlug },
  } = useRouter();

  const { data: myWorkspaceMembership } = useSWR(
    workspaceSlug ? WORKSPACE_MEMBERS_ME(workspaceSlug as string) : null,
    workspaceSlug ? () => workspaceService.workspaceMemberMe(workspaceSlug as string) : null,
    {
      shouldRetryOnError: false,
    }
  );

  const {
    register,
    formState: { errors, isSubmitting },
    handleSubmit,
    reset,
    setError,
    control,
    watch,
    setValue,
  } = useForm<IProject>({
    defaultValues,
    mode: "all",
    reValidateMode: "onChange",
  });

  const projectName = watch("name") ?? "";
  const projectIdentifier = watch("identifier") ?? "";

  useEffect(() => {
    if (projectName && isChangeIdentifierRequired)
      setValue("identifier", projectName.replace(/ /g, "").toUpperCase().substring(0, 3));
  }, [projectName, projectIdentifier, setValue, isChangeIdentifierRequired]);

  useEffect(() => () => setIsChangeIdentifierRequired(true), [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    reset(defaultValues);
  };

  const onSubmit = async (formData: IProject) => {
    if (!workspaceSlug) return;

    const { emoji_and_icon, ...payload } = formData;

    if (typeof formData.emoji_and_icon === "object") payload.icon_prop = formData.emoji_and_icon;
    else payload.emoji = formData.emoji_and_icon;

    await projectServices
      .createProject(workspaceSlug as string, payload, user)
      .then((res) => {
        mutate<IProject[]>(
          PROJECTS_LIST(workspaceSlug as string),
          (prevData) => [res, ...(prevData ?? [])],
          false
        );
        setToastAlert({
          type: "success",
          title: "Success!",
          message: "Project created successfully.",
        });
        handleClose();
      })
      .catch((err) => {
        if (err.status === 403) {
          setToastAlert({
            type: "error",
            title: "Error!",
            message: "You don't have permission to create project.",
          });
          handleClose();
          return;
        }
        err = err.data;
        Object.keys(err).map((key) => {
          const errorMessages = err[key];
          setError(key as keyof IProject, {
            message: Array.isArray(errorMessages) ? errorMessages.join(", ") : errorMessages,
          });
        });
      });
  };

  if (myWorkspaceMembership && isOpen) {
    if (myWorkspaceMembership.role <= 10) return <IsGuestCondition setIsOpen={setIsOpen} />;
  }

  return (
    <Transition.Root show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-20" onClose={handleClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-brand-backdrop bg-opacity-50 transition-opacity" />
        </Transition.Child>

        <div className="fixed inset-0 z-20 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <Dialog.Panel className="transform rounded-lg bg-brand-surface-2 text-left shadow-xl transition-all sm:w-full sm:max-w-2xl">
                <div className="relative h-36 w-full rounded-t-lg bg-brand-surface-2">
                  {watch("cover_image") !== null && (
                    <img
                      src={watch("cover_image")!}
                      className="absolute top-0 left-0 h-full w-full object-cover rounded-t-lg"
                      alt="Cover Image"
                    />
                  )}

                  <div className="absolute right-2 top-2 p-2">
                    <button type="button" onClick={handleClose}>
                      <XMarkIcon className="h-5 w-5 text-white" />
                    </button>
                  </div>
                  <div className="absolute bottom-0 left-0 flex w-full justify-between px-6 py-5">
                    <div className="absolute left-0 bottom-0 h-16 w-full bg-gradient-to-t from-black opacity-60" />
                    <h3 className="z-[1] text-xl text-white">Create Project</h3>
                    <div>
                      <ImagePickerPopover
                        label="Change Cover"
                        onChange={(image) => {
                          setValue("cover_image", image);
                        }}
                        value={watch("cover_image")}
                      />
                    </div>
                  </div>
                </div>
                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="mt-5 space-y-4 px-4 py-3">
                    <div className="flex items-center gap-x-2">
                      <div>
                        <Controller
                          name="emoji_and_icon"
                          control={control}
                          render={({ field: { value, onChange } }) => (
                            <EmojiIconPicker
                              label={
                                value ? (
                                  typeof value === "object" ? (
                                    <span
                                      style={{ color: value.color }}
                                      className="material-symbols-rounded text-lg"
                                    >
                                      {value.name}
                                    </span>
                                  ) : (
                                    String.fromCodePoint(parseInt(value))
                                  )
                                ) : (
                                  "Icon"
                                )
                              }
                              onChange={onChange}
                              value={value}
                            />
                          )}
                        />
                      </div>

                      <div className="flex-shrink-0 flex-grow">
                        <Input
                          id="name"
                          name="name"
                          type="name"
                          placeholder="Enter name"
                          error={errors.name}
                          register={register}
                          className="text-xl"
                          validations={{
                            required: "Name is required",
                            maxLength: {
                              value: 255,
                              message: "Name should be less than 255 characters",
                            },
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-3">
                        <Input
                          id="identifier"
                          name="identifier"
                          type="text"
                          className="text-sm"
                          placeholder="Enter Project Identifier"
                          error={errors.identifier}
                          register={register}
                          onChange={() => setIsChangeIdentifierRequired(false)}
                          validations={{
                            required: "Identifier is required",
                            validate: (value) =>
                              /^[A-Z]+$/.test(value) || "Identifier must be uppercase text.",
                            minLength: {
                              value: 1,
                              message: "Identifier must at least be of 1 character",
                            },
                            maxLength: {
                              value: 5,
                              message: "Identifier must at most be of 5 characters",
                            },
                          }}
                        />
                      </div>
                      <Controller
                        name="network"
                        control={control}
                        render={({ field: { onChange, value } }) => (
                          <CustomSelect
                            value={value}
                            onChange={onChange}
                            label={
                              Object.keys(NETWORK_CHOICES).find((k) => k === value.toString())
                                ? NETWORK_CHOICES[value.toString() as keyof typeof NETWORK_CHOICES]
                                : "Select network"
                            }
                            width="w-full"
                            input
                          >
                            {Object.keys(NETWORK_CHOICES).map((key) => (
                              <CustomSelect.Option key={key} value={parseInt(key)}>
                                {NETWORK_CHOICES[key as keyof typeof NETWORK_CHOICES]}
                              </CustomSelect.Option>
                            ))}
                          </CustomSelect>
                        )}
                      />
                    </div>

                    <div>
                      <TextArea
                        id="description"
                        name="description"
                        className="text-sm"
                        placeholder="Enter description"
                        error={errors.description}
                        register={register}
                      />
                    </div>
                  </div>

                  <div className="mt-5 flex justify-end gap-2 border-t-2 border-brand-base px-4 py-3">
                    <SecondaryButton onClick={handleClose}>Cancel</SecondaryButton>
                    <PrimaryButton type="submit" size="sm" loading={isSubmitting}>
                      {isSubmitting ? "Adding project..." : "Add Project"}
                    </PrimaryButton>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};
