'use client';
import React from 'react';
import { MainLayout } from '../../../components/layouts';
import { HeroSection, QuickStart, ApiReference, IntegrationGuides, Examples } from '../../../components/sections/plasmic';

export default function AuthDocsPage() {
  return (
    <MainLayout>
      <HeroSection />
      <QuickStart />
      <ApiReference />
      <IntegrationGuides />
      <Examples />
    </MainLayout>
  );
}
