namespace Alpheratz.Contracts.Services;

public interface IExternalLinkService
{
    Task OpenWorldUrlAsync(string worldId);
    Task OpenTweetIntentAsync(string text, IEnumerable<string> imagePaths);
}
