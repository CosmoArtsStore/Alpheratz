using Alpheratz.Contracts.Services;
using System.Diagnostics;
using System.Runtime.InteropServices;

namespace Alpheratz.Infrastructure.Services;

/// <summary>
/// Service for opening external URLs in the default web browser.
/// </summary>
public class ExternalLinkService : IExternalLinkService
{
    /// <inheritdoc/>
    public async Task OpenWorldUrlAsync(string worldId)
    {
        var url = $"https://vrchat.com/home/launch?worldId={worldId}";
        await Task.Run(() => OpenUrl(url));
    }

    /// <inheritdoc/>
    public async Task OpenTweetIntentAsync(string text, IEnumerable<string> imagePaths)
    {
        // Twitter Intent URL doesn't support local images directly.
        // We open the intent URL with the text. Image handling is usually manual or via clipboard.
        var encodedText = System.Net.WebUtility.UrlEncode(text);
        var url = $"https://twitter.com/intent/tweet?text={encodedText}";
        await Task.Run(() => OpenUrl(url));
    }

    private void OpenUrl(string url)
    {
        if (string.IsNullOrWhiteSpace(url)) return;

        try
        {
            // Windows-specific way to open default browser
            Process.Start(new ProcessStartInfo
            {
                FileName = url,
                UseShellExecute = true
            });
        }
        catch
        {
            // Fallback for some windows configurations where UseShellExecute fails for specific URL types
            if (RuntimeInformation.IsOSPlatform(OSPlatform.Windows))
            {
                url = url.Replace("&", "^&");
                Process.Start(new ProcessStartInfo("cmd", $"/c start {url}") { CreateNoWindow = true });
            }
        }
    }
}
