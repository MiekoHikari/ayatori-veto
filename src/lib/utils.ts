import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { toast } from "sonner"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Copy text to clipboard with toast feedback
 * @param text - The text to copy to clipboard
 * @param label - Optional label for the toast message (e.g., "Team A Link")
 * @returns Promise<boolean> - Returns true if successful, false otherwise
 */
export async function copyToClipboard(text: string, label?: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    const message = label ? `${label} copied to clipboard` : 'Copied to clipboard';
    toast.success(message);
    return true;
  } catch (error) {
    console.error('Failed to copy:', error);

    // Fallback for browsers that don't support clipboard API
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const success = document.execCommand('copy');
      document.body.removeChild(textArea);

      if (success) {
        const message = label ? `${label} copied to clipboard` : 'Copied to clipboard';
        toast.success(message);
        return true;
      } else {
        throw new Error('Fallback copy failed');
      }
    } catch (fallbackError) {
      console.error('Fallback copy failed:', fallbackError);
      toast.error('Failed to copy to clipboard');
      return false;
    }
  }
}
