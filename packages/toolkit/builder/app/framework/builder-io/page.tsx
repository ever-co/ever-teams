'use client';
import React from 'react';
import { MainLayout } from '../../../components/layouts';
import { 
  HeroSection,
  SetupSteps,
  QuickStart,
  ComponentUsage,
  DeployGuide,
  ApiReference,
  Examples 
} from '../../../components/sections/builder-io';

export default function BuilderDocsPage() {
  return (
    <MainLayout>
      <HeroSection />
      <QuickStart />
      <ComponentUsage />
      <SetupSteps />
      <DeployGuide />
      {/* <ApiReference /> */}
      <Examples />
    </MainLayout>
  );
}
