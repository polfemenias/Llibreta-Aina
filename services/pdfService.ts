import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Presentation } from '../types';

/**
 * Sanitizes a string to be used as a valid filename.
 * Replaces invalid characters and trims length.
 * @param name The original string (e.g., presentation topic).
 * @returns A sanitized string safe for use as a filename.
 */
const sanitizeFilename = (name: string): string => {
  return name.replace(/[^a-z0-9_-\s]/gi, '').trim().replace(/\s+/g, '_').substring(0, 50) || 'presentacio';
}

/**
 * Exports a presentation to a PDF file and triggers a download.
 * It renders each slide off-screen, captures it as an image, and adds it to the PDF.
 * @param presentation The presentation object to export.
 */
export const exportPresentationToPdf = async (presentation: Presentation): Promise<void> => {
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'px',
    format: 'a4', // Standard A4 size provides a good aspect ratio
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  // Create an off-screen container to render each slide for capturing
  const container = document.createElement('div');
  document.body.appendChild(container);
  
  // Style the container to match PDF page dimensions and hide it from view
  Object.assign(container.style, {
    position: 'absolute',
    left: '-9999px', // Position it way off-screen
    top: '0px',
    width: `${pdfWidth}px`,
    height: `${pdfHeight}px`,
    backgroundColor: 'white',
    display: 'flex',
    overflow: 'hidden',
    fontFamily: "'Quicksand', sans-serif",
    color: '#192A41',
  });

  for (let i = 0; i < presentation.slides.length; i++) {
    const slide = presentation.slides[i];
    
    // Clear the container and render the current slide's HTML structure
    // Using a div with background-image for better aspect ratio handling (cover)
    container.innerHTML = `
      <div style="width: 100%; height: 100%; position: relative; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; background: #192A41;">
        <div style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-image: url('${slide.imageUrl}'); background-size: cover; background-position: center center; z-index: 1;"></div>
        <div style="position: relative; z-index: 2; color: white; text-align: center; padding: 20px 30px; width: 100%; background: linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 50%, transparent 100%);">
          <h2 style="font-size: 28px; margin: 0 0 10px; font-weight: 700; text-shadow: 0 2px 4px rgba(0,0,0,0.7);">${slide.title}</h2>
          <p style="font-size: 16px; margin: 0; line-height: 1.5; text-shadow: 0 1px 3px rgba(0,0,0,0.8); max-width: 90%; margin-left: auto; margin-right: auto;">${slide.content}</p>
        </div>
      </div>
    `;

    // IMPORTANT: Preload the image to ensure it's rendered by html2canvas
    if (slide.imageUrl) {
        await new Promise(resolve => {
            const img = new Image();
            img.src = slide.imageUrl!;
            if (img.complete) {
                resolve(true);
            } else {
                img.onload = () => resolve(true);
                img.onerror = () => {
                    console.warn(`Could not load image for slide ${i}, proceeding without it.`);
                    resolve(false);
                };
            }
        });
    }


    // Capture the container using html2canvas
    const canvas = await html2canvas(container, {
      useCORS: true, // Needed for images from other origins
      scale: 2,      // Increase resolution for better quality
      logging: false,
    });
    
    const imgData = canvas.toDataURL('image/jpeg', 0.92); // Use high-quality JPEG

    // Add a new page for the second slide onwards
    if (i > 0) {
      pdf.addPage();
    }
    
    // Add the captured image to the PDF, fitting it to the page size
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
  }

  // Clean up by removing the off-screen container from the DOM
  document.body.removeChild(container);

  // Trigger the browser to download the generated PDF
  pdf.save(`${sanitizeFilename(presentation.topic)}.pdf`);
};