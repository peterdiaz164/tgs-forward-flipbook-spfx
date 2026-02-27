import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
  PropertyPaneDropdown,
  PropertyPaneSlider,
  PropertyPaneToggle
} from '@microsoft/sp-property-pane';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';

import TgsForwardFlipbook from './components/TgsForwardFlipbook';
import { ITgsForwardFlipbookProps } from './components/ITgsForwardFlipbookProps';
import * as strings from 'TgsForwardFlipbookWebPartStrings';

export interface ITgsForwardFlipbookWebPartProps {
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
}

export default class TgsForwardFlipbookWebPart extends BaseClientSideWebPart<ITgsForwardFlipbookWebPartProps> {

  public render(): void {
    const forceCount = typeof this.properties.forcePageCount === 'string'
      ? parseInt(this.properties.forcePageCount as unknown as string, 10) || 0
      : this.properties.forcePageCount || 0;

    const element: React.ReactElement<ITgsForwardFlipbookProps> = React.createElement(
      TgsForwardFlipbook,
      {
        pagesFolderUrl: this.properties.pagesFolderUrl || '',
        filePrefix: this.properties.filePrefix || 'page-',
        fileExtension: this.properties.fileExtension || 'webp',
        startIndex: this.properties.startIndex ?? 1,
        zeroPad: this.properties.zeroPad ?? 3,
        maxPages: this.properties.maxPages ?? 200,
        forcePageCount: forceCount,
        singlePageOnDesktop: !!this.properties.singlePageOnDesktop,
        pdfUrl: this.properties.pdfUrl || '',
        showDownloadButton: this.properties.showDownloadButton !== false,
        spHttpClient: this.context.spHttpClient,
        webUrl: this.context.pageContext.web.absoluteUrl
      }
    );

    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField('pagesFolderUrl', {
                  label: 'Pages folder URL',
                  description: 'Absolute or server-relative URL to the folder containing page images.',
                  placeholder: '/sites/SiteName/SiteAssets/tgs-forward/Feb-2026/pages/'
                }),
                PropertyPaneTextField('filePrefix', {
                  label: 'File prefix',
                  description: 'Filename prefix before the zero-padded index.',
                  placeholder: 'page-'
                }),
                PropertyPaneDropdown('fileExtension', {
                  label: 'File extension',
                  options: [
                    { key: 'webp', text: 'webp' },
                    { key: 'png', text: 'png' },
                    { key: 'jpg', text: 'jpg' },
                    { key: 'jpeg', text: 'jpeg' }
                  ]
                }),
                PropertyPaneSlider('startIndex', {
                  label: 'Start index',
                  min: 0,
                  max: 10,
                  step: 1
                }),
                PropertyPaneSlider('zeroPad', {
                  label: 'Zero-padding digits',
                  min: 1,
                  max: 5,
                  step: 1
                }),
                PropertyPaneSlider('maxPages', {
                  label: 'Max pages to detect',
                  min: 10,
                  max: 500,
                  step: 10
                }),
                PropertyPaneTextField('forcePageCount', {
                  label: 'Force page count (0 = auto-detect)',
                  description: 'Set a non-zero value to skip the discovery loop.'
                }),
                PropertyPaneToggle('singlePageOnDesktop', {
                  label: 'Single page mode on desktop',
                  onText: 'Single page',
                  offText: 'Two-page spread'
                }),
                PropertyPaneTextField('pdfUrl', {
                  label: 'PDF download URL (optional)',
                  description: 'Full or server-relative URL to a downloadable PDF.',
                  placeholder: '/sites/SiteName/SiteAssets/newsletter.pdf'
                }),
                PropertyPaneToggle('showDownloadButton', {
                  label: 'Show download / PDF button',
                  onText: 'Show',
                  offText: 'Hide'
                })
              ]
            }
          ]
        }
      ]
    };
  }
}
