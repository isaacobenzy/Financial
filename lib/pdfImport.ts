/** PDF statement import is not implemented. Picking a file must not look like success. */
export function describePdfPick(fileName: string | null): {
  imported: false;
  fileName: string | null;
  message: string;
} {
  return {
    imported: false,
    fileName,
    message: 'That PDF was not imported. No transactions were added.',
  };
}
