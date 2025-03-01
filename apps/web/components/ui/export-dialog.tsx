'use client';

import * as React from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { ProductivityPDF } from '@/app/[locale]/dashboard/app-url/components/ProductivityPDF';
import { PDFDownloadLink } from '@react-pdf/renderer';

interface ExportDialogProps {
	isOpen: boolean;
	onClose: () => void;
	exportType?: string;
	reportData?: any[] | undefined;
}

export function ExportDialog({ isOpen, onClose, exportType, reportData }: ExportDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="flex flex-col gap-y-4 items-center">
          <CheckCircle2 className="w-12 h-12 text-primary" />
          <DialogTitle className="text-xl text-center">Export Successful!</DialogTitle>
          <DialogDescription className="text-center">
            Your export is complete. Click below to download your file.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
       {reportData && exportType === 'pdf' && (
            <PDFDownloadLink
              document={<ProductivityPDF data={reportData} title={'Productivity Report by Date'} />}
              fileName="productivity-report.pdf"
            >
              {({ loading }) => (
                <Button variant="outline" size="sm" disabled={loading}>
                  {loading ? 'Loading PDF...' : 'Download PDF'}
                </Button>
              )}
            </PDFDownloadLink>
          )}
         {reportData && exportType === 'xlsx' && (
           <Button variant="outline" size="sm" >
             Download XLSX
           </Button>
         )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
