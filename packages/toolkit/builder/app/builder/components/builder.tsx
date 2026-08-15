"use client";
import { ComponentProps } from "react";
import { BuilderComponent, useIsPreviewing } from "@builder.io/react";
import { builder } from "@builder.io/sdk";
import DefaultErrorPage from "next/error";
import "../builder-registry";
import { useEffect } from "react";

type BuilderPageProps = ComponentProps<typeof BuilderComponent>;

// Add these configurations
builder.canTrack = false;
builder.allowCustomFonts = true;

// Initialize with stored API key if available
if (typeof window !== 'undefined') {
  const storedApiKey = localStorage.getItem('builder_api_key');
  if (storedApiKey) {
    builder.init(storedApiKey);
  }
}

// Configure preview settings
const isPreviewingInBuilder = () => {
  // Check if we're in builder.io's iframe
  return (
    typeof window !== 'undefined' &&
    (window.location.search.includes('builder.preview=') ||
      window.location.search.includes('builder.frameEditing='))
  );
};

export function RenderBuilderContent({ content, model }: BuilderPageProps) {
  // Call the useIsPreviewing hook to determine if
  // the page is being previewed in Builder
  const isPreviewing = useIsPreviewing();
  
  // If previewing in Builder.io, bypass authentication
  if (isPreviewing || isPreviewingInBuilder()) {
    return (
      <BuilderComponent 
        content={content} 
        model={model}
        // Add these props to help with preview
        isStatic={true}
        context={{
          isPreviewMode: true,
          skipAuth: true  // You can use this in your auth logic
        }}
      />
    );
  }

  // If "content" has a value or the page is being previewed in Builder,
  // render the BuilderComponent with the specified content and model props.
  if (content) {
    return <BuilderComponent content={content} model={model} />;
  }
  // If the "content" is falsy and the page is
  // not being previewed in Builder, render the
  // DefaultErrorPage with a 404.
  return <DefaultErrorPage statusCode={404} />;
}
