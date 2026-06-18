declare module 'html2pdf.js' {
  interface Html2PdfOptions {
    margin?: number | number[];
    filename?: string;
    image?: { type?: string; quality?: number };
    html2canvas?: Record<string, any>;
    jsPDF?: { unit?: string; format?: string; orientation?: string };
    pagebreak?: Record<string, any>;
    // Top-level render-container sizing. html2pdf.js uses these to set the
    // clone container width (see toContainer); both must be set for windowWidth
    // to take effect, otherwise it falls back to the source element width.
    width?: number;
    windowWidth?: number;
  }

  interface Html2PdfInstance {
    set(options: Html2PdfOptions): Html2PdfInstance;
    from(element: HTMLElement | string): Html2PdfInstance;
    save(): Promise<void>;
    toPdf(): Html2PdfInstance;
    output(type: string): Promise<any>;
  }

  function html2pdf(): Html2PdfInstance;
  export default html2pdf;
}
