import { SPHttpClient } from '@microsoft/sp-http';

export interface ITgsForwardFlipbookProps {
  pagesFolderUrl: string;
  filePrefix: string;
  fileExtension: string;
  startIndex: number;
  zeroPad: number;
  maxPages: number;
  forcePageCount: number;
  singlePageOnDesktop: boolean;
  pdfUrl: string;
  showDownloadButton: boolean;
  spHttpClient: SPHttpClient;
  webUrl: string;
  domElement: HTMLElement;
}
