/**
 * Automatically downloads a JSON payload directly to the user's device.
 * Used for automated database backups before deletion or manual export.
 *
 * @param {object|string} data - JSON object or string to download
 * @param {string} defaultFilename - Desired name for the downloaded file
 */
export function downloadBackupToDevice(data, defaultFilename) {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = defaultFilename || `properties-db-backup-${timestamp}.json`;

    const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up memory
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);

    console.log(`[Device Backup] ✅ Backup automatically downloaded to device: ${filename}`);
    return { success: true, filename };
  } catch (error) {
    console.error('[Device Backup] ❌ Failed to download backup to device:', error);
    return { success: false, error: error.message };
  }
}
