import React from "react";
// next imports
import Image from "next/image";
// next types
import type { NextPage } from "next";
// layouts
import DefaultLayout from "layouts/default-layout";
// hooks
import useUserAuth from "hooks/use-user-auth";
import useToast from "hooks/use-toast";
// services
import authenticationService from "services/authentication.service";
// social auth buttons
import {
  GoogleLoginButton,
  GithubLoginButton,
  EmailCodeForm,
  EmailPasswordForm,
} from "components/account";
// ui
import { Spinner } from "components/ui";
// icons
import Logo from "public/logo.png";
// types
type EmailPasswordFormValues = {
  email: string;
  password?: string;
  medium?: string;
};

const HomePage: NextPage = () => {
  const { user, isLoading, mutateUser } = useUserAuth("sign-in");

  const { setToastAlert } = useToast();

  const handleGoogleSignIn = async ({ clientId, credential }: any) => {
    try {
      if (clientId && credential) {
        const socialAuthPayload = {
          medium: "google",
          credential,
          clientId,
        };
        const response = await authenticationService.socialAuth(socialAuthPayload);
        if (response && response?.user) mutateUser();
      } else {
        throw Error("Cant find credentials");
      }
    } catch (err: any) {
      setToastAlert({
        title: "Error signing in!",
        type: "error",
        message:
          err?.error || "Something went wrong. Please try again later or contact the support team.",
      });
    }
  };

  const handleGithubSignIn = async (credential: string) => {
    try {
      if (process.env.NEXT_PUBLIC_GITHUB_ID && credential) {
        const socialAuthPayload = {
          medium: "github",
          credential,
          clientId: process.env.NEXT_PUBLIC_GITHUB_ID,
        };
        const response = await authenticationService.socialAuth(socialAuthPayload);
        if (response && response?.user) mutateUser();
      } else {
        throw Error("Cant find credentials");
      }
    } catch (err: any) {
      setToastAlert({
        title: "Error signing in!",
        type: "error",
        message:
          err?.error || "Something went wrong. Please try again later or contact the support team.",
      });
    }
  };

  const handlePasswordSignIn = async (formData: EmailPasswordFormValues) => {
    await authenticationService
      .emailLogin(formData)
      .then((response) => {
        try {
          if (response) mutateUser();
        } catch (err: any) {
          setToastAlert({
            type: "error",
            title: "Error!",
            message:
              err?.error ||
              "Something went wrong. Please try again later or contact the support team.",
          });
        }
      })
      .catch((err) =>
        setToastAlert({
          type: "error",
          title: "Error!",
          message:
            err?.error ||
            "Something went wrong. Please try again later or contact the support team.",
        })
      );
  };

  const handleEmailCodeSignIn = async (response: any) => {
    try {
      if (response) mutateUser();
    } catch (err: any) {
      setToastAlert({
        type: "error",
        title: "Error!",
        message:
          err?.error || "Something went wrong. Please try again later or contact the support team.",
      });
    }
  };

  return (
    <DefaultLayout>
      {isLoading ? (
        <div className="flex flex-col gap-3 w-full h-screen justify-center items-center">
          <div>
            <Spinner />
          </div>
        </div>
      ) : (
        <div className="flex h-screen w-full items-center justify-center overflow-auto">
          <div className="flex min-h-full w-full flex-col justify-center py-12 px-6 lg:px-8">
            <div className="flex flex-col gap-10 sm:mx-auto sm:w-full sm:max-w-md">
              <div className="flex flex-col items-center justify-center gap-10">
                <Image src={Logo} height={80} width={80} alt="Plane Web Logo" />
                <div className="text-center text-xl font-medium text-brand-base">
                  Sign In to your Plane Account
                </div>
              </div>

              <div className="flex flex-col rounded-[10px] bg-brand-base shadow-md">
                {parseInt(process.env.NEXT_PUBLIC_ENABLE_OAUTH || "0") ? (
                  <>
                    <EmailCodeForm handleSignIn={handleEmailCodeSignIn} />
                    <div className="flex flex-col items-center justify-center gap-3 border-t border-brand-base py-5 px-5">
                      <GoogleLoginButton handleSignIn={handleGoogleSignIn} />
                      <GithubLoginButton handleSignIn={handleGithubSignIn} />
                    </div>
                  </>
                ) : (
                  <EmailPasswordForm onSubmit={handlePasswordSignIn} />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DefaultLayout>
  );
};

export default HomePage;
