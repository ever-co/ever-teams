'use client';

import { useEffect, useState } from "react";
import Head from "next/head";
import DefaultErrorPage from "next/error";
import { RenderBuilderContent } from "../components/builder";
import { LoadingState } from "./loading-state";
import { useBuilderPreview } from "../hooks/use-builder-preview";
import { BuilderPageClientProps, MetaData } from "../../../types";
import { BUILDER_CONFIG } from "../../constants";

const BuilderPageClient = ({ content, builderModelName }: BuilderPageClientProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const { isPreviewMode } = useBuilderPreview();

  useEffect(() => {
    const timer = setTimeout(
      () => setIsLoading(false),
      BUILDER_CONFIG.LOADING_DELAY
    );

    return () => clearTimeout(timer);
  }, [content]);
  if (isPreviewMode) {
    return <RenderBuilderContent content={content || undefined} model={builderModelName} />;
  }

  const getMetaData = (): MetaData => ({
    title: content?.data?.title ?? BUILDER_CONFIG.DEFAULT_META.title,
    description: content?.data?.description ?? BUILDER_CONFIG.DEFAULT_META.description
  });

  const renderContent = () => {
    if (isLoading) return <LoadingState />;
    if (!content) return <DefaultErrorPage statusCode={404} />;
    return <RenderBuilderContent content={content} model={builderModelName} />;
  };

  const { title, description } = getMetaData();

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
      </Head>
      {renderContent()}
    </>
  );
};

export default BuilderPageClient;
