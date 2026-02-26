export interface IFlipbookConfig {
  pagesFolderUrl: string;
  filePrefix: string;
  fileExtension: string;
  startIndex: number;
  zeroPad: number;
  maxPages: number;
  forcePageCount: number;
}

export interface IPageProbeResult {
  index: number;
  url: string;
  status: number;
  contentType: string;
  valid: boolean;
}

export type FlipDirection = 'forward' | 'backward';

export type FlipState = 'idle' | 'animating' | 'dragging';
