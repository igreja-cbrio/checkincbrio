interface LabelPrintProps {
  volunteerName: string;
  teamName?: string;
  date: string;
  fontSize?: number;
}

function buildPrintUrl(props: LabelPrintProps): string {
  const params = new URLSearchParams({
    name: props.volunteerName,
    team: props.teamName || '',
    date: props.date,
    fs: String(props.fontSize || 14),
  });
  return `/print/training-label?${params.toString()}`;
}

/**
 * Opens a dedicated print page in a new tab with only the label content.
 * Must be called synchronously from a user gesture to avoid popup blockers.
 * Returns the window reference (or null if blocked).
 */
export function openPrintWindow(): Window | null {
  return window.open('about:blank', '_blank');
}

/**
 * Navigates a previously opened print window to the label print route.
 */
export function navigatePrintWindow(
  printWindow: Window,
  props: LabelPrintProps
): void {
  printWindow.location.href = buildPrintUrl(props);
}

/**
 * Opens a new tab and navigates to the print page.
 * For use when called synchronously (no prior await).
 */
export function printLabel(props: LabelPrintProps): boolean {
  const win = window.open(buildPrintUrl(props), '_blank');
  if (!win) {
    alert('Não foi possível abrir a janela de impressão. Verifique se popups estão permitidos.');
    return false;
  }
  return true;
}
